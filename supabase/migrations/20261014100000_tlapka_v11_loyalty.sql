-- Věrnostní karty: household-shared loyalty cards (same sync shape as other tl_ entity tables)
create table public.tl_loyalty_cards (
  household_id uuid not null references public.tl_households(id) on delete cascade,
  id text not null,
  pet_id text,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (household_id, id)
);
create index tl_loyalty_cards_sync_idx on public.tl_loyalty_cards (household_id, updated_at);
create trigger tl_loyalty_cards_touch before insert or update on public.tl_loyalty_cards for each row execute function tl_private.tl_touch();
alter table public.tl_loyalty_cards enable row level security;
create policy "tl_loyalty_cards read" on public.tl_loyalty_cards for select to authenticated using ((select tl_private.tl_can_read(household_id)));
create policy "tl_loyalty_cards insert" on public.tl_loyalty_cards for insert to authenticated with check ((select tl_private.tl_can_write(household_id)));
create policy "tl_loyalty_cards update" on public.tl_loyalty_cards for update to authenticated using ((select tl_private.tl_can_write(household_id))) with check ((select tl_private.tl_can_write(household_id)));
revoke all on public.tl_loyalty_cards from anon;
alter publication supabase_realtime add table public.tl_loyalty_cards;

create or replace function public.tl_purge_trash() returns void language sql security definer set search_path = '' as $$
  delete from public.tl_pets where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_reminders where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_visits where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_meds where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_allergies where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_documents where deleted and updated_at < now() - interval '30 days';
  delete from public.tl_loyalty_cards where deleted and updated_at < now() - interval '30 days';
$$;
revoke all on function public.tl_purge_trash() from public, anon, authenticated;
grant execute on function public.tl_purge_trash() to service_role;

-- a household holding only loyalty cards is not "empty" when joining with a code
create or replace function tl_private.drop_empty_households(p_user uuid, p_keep uuid) returns int language plpgsql security definer set search_path = '' as $$
declare h uuid; n int := 0;
begin
  for h in select m.household_id from public.tl_household_members m where m.user_id = p_user and m.role = 'owner' and m.household_id <> p_keep loop
    if (select count(*) from public.tl_household_members where household_id = h) = 1
       and not exists (select 1 from public.tl_pets where household_id = h) and not exists (select 1 from public.tl_reminders where household_id = h)
       and not exists (select 1 from public.tl_visits where household_id = h) and not exists (select 1 from public.tl_meds where household_id = h)
       and not exists (select 1 from public.tl_allergies where household_id = h) and not exists (select 1 from public.tl_documents where household_id = h)
       and not exists (select 1 from public.tl_loyalty_cards where household_id = h)
       and not exists (select 1 from public.tl_dose_logs where household_id = h) then
      delete from public.tl_households where id = h; n := n + 1;
    end if;
  end loop;
  return n;
end $$;
