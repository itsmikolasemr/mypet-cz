-- Premium source of truth: set only by server (service role) from RevenueCat / Stripe webhooks or the guarded test toggle.
alter table public.tl_profiles add column if not exists premium_until timestamptz, add column if not exists premium_source text,
  add column if not exists backup_device text, add column if not exists backup_device_at timestamptz;
create or replace function tl_private.hh_premium(hh uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tl_household_members m join public.tl_profiles p on p.id = m.user_id
                 where m.household_id = hh and m.role = 'owner' and p.is_premium and (p.premium_until is null or p.premium_until > now())) $$;
create or replace function public.tl_my_premium() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_premium and (premium_until is null or premium_until > now()) from public.tl_profiles where id = auth.uid()), false) $$;

-- service-role only: set premium (webhooks)
create or replace function public.tl_admin_set_premium(p_user uuid, p_on boolean, p_until timestamptz, p_source text) returns void
language sql security definer set search_path = '' as $$
  insert into public.tl_profiles(id, is_premium, premium_until, premium_source) values (p_user, p_on, p_until, p_source)
  on conflict (id) do update set is_premium = excluded.is_premium, premium_until = excluded.premium_until, premium_source = excluded.premium_source $$;
revoke all on function public.tl_admin_set_premium(uuid, boolean, timestamptz, text) from public, anon, authenticated;
grant execute on function public.tl_admin_set_premium(uuid, boolean, timestamptz, text) to service_role;
grant execute on function public.tl_purge_trash() to service_role;

-- free backup on one device: writes carry header x-tlapka-device; non-premium households accept writes only from the owner's registered device
create or replace function public.tl_claim_backup_device(p_device text, p_force boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare cur text; at timestamptz;
begin
  if auth.uid() is null or coalesce(p_device, '') !~ '^[A-Za-z0-9-]{16,64}$' then raise exception 'bad device'; end if;
  insert into public.tl_profiles(id) values (auth.uid()) on conflict (id) do nothing;
  select backup_device, backup_device_at into cur, at from public.tl_profiles where id = auth.uid();
  if public.tl_my_premium() or cur is null or cur = p_device or p_force then
    update public.tl_profiles set backup_device = p_device, backup_device_at = now() where id = auth.uid();
    return 'ok';
  end if;
  return 'other';
end $$;
revoke all on function public.tl_claim_backup_device(text, boolean) from public, anon; grant execute on function public.tl_claim_backup_device(text, boolean) to authenticated;

create or replace function tl_private.tl_touch() returns trigger language plpgsql set search_path = '' as $$
declare dev text; reg text;
begin
  new.updated_at := now(); new.updated_by := auth.uid();
  if auth.uid() is not null and not tl_private.hh_premium(new.household_id) then
    dev := coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-tlapka-device', '');
    select backup_device into reg from public.tl_profiles where id = auth.uid();
    if reg is not null and dev <> reg then raise exception 'tl_limit_device' using hint = 'Free backup runs on one device. Premium: all devices.'; end if;
  end if;
  return new;
end $$;

-- joining with a code: drop the user's own household if it is empty (no data, no other members)
create or replace function tl_private.drop_empty_households(p_user uuid, p_keep uuid) returns int language plpgsql security definer set search_path = '' as $$
declare h uuid; n int := 0;
begin
  for h in select m.household_id from public.tl_household_members m where m.user_id = p_user and m.role = 'owner' and m.household_id <> p_keep loop
    if (select count(*) from public.tl_household_members where household_id = h) = 1
       and not exists (select 1 from public.tl_pets where household_id = h) and not exists (select 1 from public.tl_reminders where household_id = h)
       and not exists (select 1 from public.tl_visits where household_id = h) and not exists (select 1 from public.tl_meds where household_id = h)
       and not exists (select 1 from public.tl_allergies where household_id = h) and not exists (select 1 from public.tl_documents where household_id = h)
       and not exists (select 1 from public.tl_dose_logs where household_id = h) then
      delete from public.tl_households where id = h; n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.tl_join(p_code text, p_display text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.tl_invites;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from public.tl_invites where code = p_code and used_by is null and expires_at > now() for update;
  if not found then raise exception 'invalid or expired invite'; end if;
  insert into public.tl_household_members(household_id, user_id, role, display_name) values (inv.household_id, auth.uid(), inv.role, p_display)
    on conflict (household_id, user_id) do nothing;
  update public.tl_invites set used_by = auth.uid() where code = p_code;
  perform tl_private.drop_empty_households(auth.uid(), inv.household_id);
  return inv.household_id;
end $$;
