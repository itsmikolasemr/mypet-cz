-- Free vs Premium limits enforced in DB. Premium = any owner of the household has tl_profiles.is_premium (set by RevenueCat webhook / service role).
create or replace function tl_private.hh_premium(hh uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tl_household_members m join public.tl_profiles p on p.id = m.user_id
                 where m.household_id = hh and m.role = 'owner' and p.is_premium) $$;

-- free: owner + 1 partner (2 members). Premium: unlimited.
create or replace function tl_private.check_member_limit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not tl_private.hh_premium(new.household_id)
     and (select count(*) from public.tl_household_members where household_id = new.household_id) >= 2 then
    raise exception 'tl_limit_members' using hint = 'Free plan: 1 partner. Premium: unlimited family.';
  end if;
  return new;
end $$;
create trigger tl_member_limit before insert on public.tl_household_members for each row execute function tl_private.check_member_limit();

-- free: 1 active 'pass' link, max 7 days; sitter ('today') links are Premium. Premium: unlimited, max 30 days.
create or replace function tl_private.check_share_limit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not tl_private.hh_premium(new.household_id) then
    if new.scope <> 'pass' then raise exception 'tl_limit_sitter_premium'; end if;
    if new.expires_at > now() + interval '7 days 1 minute' then raise exception 'tl_limit_share_days'; end if;
    if exists (select 1 from public.tl_share_links where household_id = new.household_id and not revoked and expires_at > now()) then
      raise exception 'tl_limit_share_count';
    end if;
  end if;
  return new;
end $$;
create trigger tl_share_limit before insert on public.tl_share_links for each row execute function tl_private.check_share_limit();

-- trash: soft-deleted rows restorable for 30 days; purge older ones (call from pg_cron or edge job)
create or replace function public.tl_purge_trash() returns void language sql security definer set search_path = '' as $$
  delete from public.tl_pets where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_reminders where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_visits where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_meds where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_allergies where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_documents where deleted and updated_at < now() - interval '30 days';
$$;
revoke all on function public.tl_purge_trash() from public, anon, authenticated;

-- files: free plan stores data only; Storage uploads require Premium household
drop policy "tl-docs insert" on storage.objects;
create policy "tl-docs insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'tl-docs' and (select tl_private.tl_can_write(tl_private.hh_from_path(name))) and (select tl_private.hh_premium(tl_private.hh_from_path(name))));

-- owners can see their own premium flag via RPC
create or replace function public.tl_my_premium() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_premium from public.tl_profiles where id = auth.uid()), false) $$;
revoke all on function public.tl_my_premium() from public, anon; grant execute on function public.tl_my_premium() to authenticated;
