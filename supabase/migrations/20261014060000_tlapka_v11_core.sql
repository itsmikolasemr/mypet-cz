-- Tlapka v1.1 core schema. All objects are NEW and prefixed tl_ (public schema so PostgREST exposes them without config changes).
-- Offline-first sync model: each record = (household_id, id) + jsonb payload, server-stamped updated_at, soft delete.

create table public.tl_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_premium boolean not null default false,   -- set only by service role (RevenueCat webhook)
  created_at timestamptz not null default now()
);

create table public.tl_households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Domácnost',
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.tl_household_members (
  household_id uuid not null references public.tl_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','sitter')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index tl_household_members_user_idx on public.tl_household_members(user_id);

create table public.tl_invites (
  code text primary key default encode(extensions.gen_random_bytes(9), 'hex'),
  household_id uuid not null references public.tl_households(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor','sitter')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id) on delete set null
);
create index tl_invites_household_idx on public.tl_invites(household_id);

-- membership helpers (security definer avoids RLS recursion; stable + (select ...) wrapper for per-statement caching)
create or replace function public.tl_role(hh uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.tl_household_members where household_id = hh and user_id = auth.uid()
$$;
create or replace function public.tl_can_read(hh uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tl_household_members where household_id = hh and user_id = auth.uid())
$$;
create or replace function public.tl_can_write(hh uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tl_household_members where household_id = hh and user_id = auth.uid() and role in ('owner','editor'))
$$;

create or replace function public.tl_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;

-- synced entity tables
do $$
declare t text;
begin
  foreach t in array array['tl_pets','tl_reminders','tl_visits','tl_meds','tl_allergies','tl_documents'] loop
    execute format($f$
      create table public.%1$I (
        household_id uuid not null references public.tl_households(id) on delete cascade,
        id text not null,
        pet_id text,
        data jsonb not null default '{}'::jsonb,
        deleted boolean not null default false,
        updated_at timestamptz not null default now(),
        updated_by uuid references auth.users(id) on delete set null,
        primary key (household_id, id)
      );
      create index %1$s_sync_idx on public.%1$I (household_id, updated_at);
      create trigger %1$s_touch before insert or update on public.%1$I for each row execute function public.tl_touch();
      alter table public.%1$I enable row level security;
      create policy "%1$s read" on public.%1$I for select to authenticated using ((select public.tl_can_read(household_id)));
      create policy "%1$s insert" on public.%1$I for insert to authenticated with check ((select public.tl_can_write(household_id)));
      create policy "%1$s update" on public.%1$I for update to authenticated using ((select public.tl_can_write(household_id))) with check ((select public.tl_can_write(household_id)));
    $f$, t);
  end loop;
end $$;
alter table public.tl_documents add column storage_path text;  -- tl-docs/<household_id>/<doc id>

-- dose log: who gave it and when (sitters may log doses too)
create table public.tl_dose_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tl_households(id) on delete cascade,
  pet_id text not null,
  reminder_id text,
  med_id text,
  given_at timestamptz not null default now(),
  given_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  given_by_name text,
  note text,
  created_at timestamptz not null default now()
);
create index tl_dose_logs_hh_idx on public.tl_dose_logs(household_id, given_at desc);
alter table public.tl_dose_logs enable row level security;
create policy "dose read" on public.tl_dose_logs for select to authenticated using ((select public.tl_can_read(household_id)));
create policy "dose insert" on public.tl_dose_logs for insert to authenticated with check ((select public.tl_can_read(household_id)) and given_by = (select auth.uid()));
create policy "dose delete own" on public.tl_dose_logs for delete to authenticated using (given_by = (select auth.uid()));

-- caretaker share links (no account): token stored hashed, read via tl_shared_view()
create table public.tl_share_links (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tl_households(id) on delete cascade,
  pet_ids text[] not null default '{}',
  token_hash text not null unique,
  scope text not null default 'today' check (scope in ('today','pass')),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index tl_share_links_hh_idx on public.tl_share_links(household_id);
alter table public.tl_share_links enable row level security;
create policy "share read" on public.tl_share_links for select to authenticated using ((select public.tl_can_write(household_id)));
create policy "share insert" on public.tl_share_links for insert to authenticated with check ((select public.tl_can_write(household_id)) and expires_at <= now() + interval '30 days');
create policy "share update" on public.tl_share_links for update to authenticated using ((select public.tl_can_write(household_id)));

-- RLS on base tables
alter table public.tl_profiles enable row level security;
create policy "profile self read" on public.tl_profiles for select to authenticated using (id = (select auth.uid()));
-- no client UPDATE policy: is_premium is written only by the service role (webhook)

alter table public.tl_households enable row level security;
create policy "hh read" on public.tl_households for select to authenticated using ((select public.tl_can_read(id)));
create policy "hh rename" on public.tl_households for update to authenticated using ((select public.tl_role(id)) = 'owner');
create policy "hh delete" on public.tl_households for delete to authenticated using ((select public.tl_role(id)) = 'owner');

alter table public.tl_household_members enable row level security;
create policy "members read" on public.tl_household_members for select to authenticated using ((select public.tl_can_read(household_id)));
create policy "members owner manage" on public.tl_household_members for delete to authenticated using ((select public.tl_role(household_id)) = 'owner' or user_id = (select auth.uid()));
create policy "members owner role" on public.tl_household_members for update to authenticated using ((select public.tl_role(household_id)) = 'owner');

alter table public.tl_invites enable row level security;
create policy "invites read" on public.tl_invites for select to authenticated using ((select public.tl_role(household_id)) = 'owner');
create policy "invites create" on public.tl_invites for insert to authenticated with check ((select public.tl_role(household_id)) = 'owner');
create policy "invites delete" on public.tl_invites for delete to authenticated using ((select public.tl_role(household_id)) = 'owner');

-- RPCs
create or replace function public.tl_create_household(p_name text default 'Domácnost', p_display text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare hh uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.tl_households(name, created_by) values (coalesce(p_name,'Domácnost'), auth.uid()) returning id into hh;
  insert into public.tl_household_members(household_id, user_id, role, display_name) values (hh, auth.uid(), 'owner', p_display);
  insert into public.tl_profiles(id, display_name) values (auth.uid(), p_display) on conflict (id) do nothing;
  return hh;
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
  return inv.household_id;
end $$;

-- public caretaker view by raw token (anon allowed); returns only listed pets, today's reminders/meds and recent doses
create or replace function public.tl_shared_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.tl_share_links;
begin
  select * into l from public.tl_share_links
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and not revoked and expires_at > now();
  if not found then return null; end if;
  return jsonb_build_object(
    'scope', l.scope, 'expires_at', l.expires_at,
    'pets', (select coalesce(jsonb_agg(p.data - 'photo' - 'microchip'), '[]') from public.tl_pets p where p.household_id = l.household_id and p.id = any(l.pet_ids) and not p.deleted),
    'reminders', (select coalesce(jsonb_agg(r.data), '[]') from public.tl_reminders r where r.household_id = l.household_id and r.pet_id = any(l.pet_ids) and not r.deleted
                   and (l.scope = 'pass' or (r.data->>'dueDate')::date <= current_date + 1)),
    'meds', (select coalesce(jsonb_agg(m.data), '[]') from public.tl_meds m where m.household_id = l.household_id and m.pet_id = any(l.pet_ids) and not m.deleted),
    'allergies', (select coalesce(jsonb_agg(a.data), '[]') from public.tl_allergies a where a.household_id = l.household_id and a.pet_id = any(l.pet_ids) and not a.deleted),
    'doses', (select coalesce(jsonb_agg(jsonb_build_object('pet_id', d.pet_id, 'reminder_id', d.reminder_id, 'med_id', d.med_id, 'given_at', d.given_at, 'by', d.given_by_name) order by d.given_at desc), '[]')
              from public.tl_dose_logs d where d.household_id = l.household_id and d.pet_id = any(l.pet_ids) and d.given_at > now() - interval '2 days')
  );
end $$;

-- sitter logs a dose via share link (no account)
create or replace function public.tl_shared_log_dose(p_token text, p_pet text, p_reminder text, p_med text, p_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.tl_share_links;
begin
  select * into l from public.tl_share_links
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and not revoked and expires_at > now() and scope = 'today';
  if not found or not (p_pet = any(l.pet_ids)) then return false; end if;
  insert into public.tl_dose_logs(household_id, pet_id, reminder_id, med_id, given_by, given_by_name, note)
    values (l.household_id, p_pet, p_reminder, p_med, l.created_by, left(coalesce(p_name,'Hlídač'), 40), 'via share link');
  return true;
end $$;

revoke all on function public.tl_create_household(text,text), public.tl_join(text,text) from public, anon;
grant execute on function public.tl_create_household(text,text), public.tl_join(text,text) to authenticated;
revoke all on function public.tl_shared_view(text), public.tl_shared_log_dose(text,text,text,text,text) from public;
grant execute on function public.tl_shared_view(text), public.tl_shared_log_dose(text,text,text,text,text) to anon, authenticated;
revoke all on function public.tl_role(uuid), public.tl_can_read(uuid), public.tl_can_write(uuid) from public, anon;
grant execute on function public.tl_role(uuid), public.tl_can_read(uuid), public.tl_can_write(uuid) to authenticated;
