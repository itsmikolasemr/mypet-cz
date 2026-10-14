-- Tlapka v1.2 growth: co-owners (párový režim), group challenges, promo codes, referrals, achievements.
-- All objects NEW, prefixed tl_, RLS on. Reward maths runs ONLY on the server (security definer RPCs / service role).

-- ───────── shared: Premium reward ledger (cap 60 days / rolling year from rewards) ─────────
create table public.tl_reward_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('referral','badge','promo')),
  ref text not null,                       -- referral id / badge id / promo code
  days int not null check (days between 0 and 31),
  granted_at timestamptz not null default now(),
  unique (user_id, source, ref)
);
alter table public.tl_reward_ledger enable row level security;
create policy "tl_reward_ledger own read" on public.tl_reward_ledger for select to authenticated using (user_id = (select auth.uid()));

-- grants up to p_days of Premium, respecting the yearly reward cap (promo codes are not capped: they are a paid-marketing channel)
create or replace function tl_private.grant_days(p_user uuid, p_source text, p_ref text, p_days int) returns int
language plpgsql security definer set search_path = '' as $$
declare used int; give int; prof public.tl_profiles;
begin
  if p_source <> 'promo' then
    select coalesce(sum(days),0) into used from public.tl_reward_ledger where user_id = p_user and source <> 'promo' and granted_at > now() - interval '365 days';
    give := greatest(0, least(p_days, 60 - used));
  else give := p_days; end if;
  insert into public.tl_reward_ledger(user_id, source, ref, days) values (p_user, p_source, p_ref, give) on conflict do nothing;
  if not found then return 0; end if;           -- idempotent: same reward twice = nothing
  if give = 0 then return 0; end if;
  insert into public.tl_profiles(id) values (p_user) on conflict (id) do nothing;
  select * into prof from public.tl_profiles where id = p_user for update;
  if prof.is_premium and prof.premium_until is null then return give; end if;  -- lifetime/store subscription: nothing to extend
  update public.tl_profiles set is_premium = true,
    premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => give),
    premium_source = coalesce(nullif(premium_source,''), 'reward')
  where id = p_user;
  return give;
end $$;

-- ───────── 1) Párový režim: co-owner via chip match (approval required, nothing exposed) ─────────
create table public.tl_pet_link_requests (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null default auth.uid() references auth.users(id) on delete cascade,
  requester_name text,
  target_household uuid not null references public.tl_households(id) on delete cascade,
  target_pet text not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (requester, target_household, target_pet)
);
alter table public.tl_pet_link_requests enable row level security;
-- the owner side sees requests to their household (only requester display name – no data flows the other way)
create policy "tl_pet_link owner read" on public.tl_pet_link_requests for select to authenticated
  using ((select tl_private.tl_role(target_household)) = 'owner' or requester = (select auth.uid()));

-- Always answers 'requested' – identical whether or not the chip exists, so the chip number alone reveals nothing.
create or replace function public.tl_chip_request(p_chip text, p_name text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare chip text := regexp_replace(coalesce(p_chip,''), '\D', '', 'g'); r record; n int := 0;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(chip) <> 15 then raise exception 'chip must have 15 digits'; end if;
  select count(*) into n from public.tl_pet_link_requests where requester = auth.uid() and created_at > now() - interval '1 day';
  if n >= 5 then return 'requested'; end if;    -- rate limit, silent
  for r in select p.household_id, p.id from public.tl_pets p
           where not p.deleted and regexp_replace(coalesce(p.data->>'microchip',''), '\D', '', 'g') = chip
             and not tl_private.tl_can_read(p.household_id)
  loop
    insert into public.tl_pet_link_requests(requester, requester_name, target_household, target_pet)
      values (auth.uid(), left(p_name, 60), r.household_id, r.id) on conflict do nothing;
  end loop;
  return 'requested';
end $$;

-- owner approves → requester joins the household as editor (sync then shares that pet); decline = silent
create or replace function public.tl_pet_link_decide(p_id uuid, p_approve boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare q public.tl_pet_link_requests;
begin
  select * into q from public.tl_pet_link_requests where id = p_id and status = 'pending' for update;
  if not found then raise exception 'no such request'; end if;
  if tl_private.tl_role(q.target_household) is distinct from 'owner' then raise exception 'only the owner can decide'; end if;
  update public.tl_pet_link_requests set status = case when p_approve then 'approved' else 'declined' end, decided_at = now() where id = p_id;
  if p_approve then
    insert into public.tl_household_members(household_id, user_id, role, display_name) values (q.target_household, q.requester, 'editor', q.requester_name)
      on conflict (household_id, user_id) do nothing;
    return 'approved';
  end if;
  return 'declined';
end $$;

-- ───────── 3) Výzvy s kamarády ─────────
create table public.tl_challenges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default encode(extensions.gen_random_bytes(5), 'hex'),
  title text not null check (length(title) between 2 and 60),
  kind text not null default 'walks' check (kind in ('walks')),       -- only walks: we never gamify meds/vet/food
  goal int not null check (goal between 1 and 21),                     -- per week
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.tl_challenge_members (
  challenge_id uuid not null references public.tl_challenges(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text,
  primary key (challenge_id, user_id)
);
create table public.tl_challenge_progress (
  challenge_id uuid not null references public.tl_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week date not null,                                                    -- monday
  count int not null default 0 check (count between 0 and 21),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, user_id, week)
);
alter table public.tl_challenges enable row level security;
alter table public.tl_challenge_members enable row level security;
alter table public.tl_challenge_progress enable row level security;
create or replace function tl_private.in_challenge(c uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tl_challenge_members where challenge_id = c and user_id = auth.uid()) $$;
create policy "tl_challenges member read" on public.tl_challenges for select to authenticated using ((select tl_private.in_challenge(id)));
create policy "tl_challenge_members member read" on public.tl_challenge_members for select to authenticated using ((select tl_private.in_challenge(challenge_id)));
create policy "tl_challenge_progress member read" on public.tl_challenge_progress for select to authenticated using ((select tl_private.in_challenge(challenge_id)));

create or replace function public.tl_challenge_create(p_title text, p_goal int, p_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.tl_challenges;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if (select count(*) from public.tl_challenges where created_by = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'too many challenges today'; end if;
  insert into public.tl_challenges(title, goal) values (p_title, p_goal) returning * into c;
  insert into public.tl_challenge_members(challenge_id, user_id, display_name) values (c.id, auth.uid(), left(p_name, 40));
  return jsonb_build_object('id', c.id, 'code', c.code);
end $$;
create or replace function public.tl_challenge_join(p_code text, p_name text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into c from public.tl_challenges where code = lower(trim(p_code));
  if c is null then raise exception 'invalid code'; end if;
  if (select count(*) from public.tl_challenge_members where challenge_id = c) >= 20 then raise exception 'challenge is full'; end if;
  insert into public.tl_challenge_members(challenge_id, user_id, display_name) values (c, auth.uid(), left(p_name, 40)) on conflict do nothing;
  return c;
end $$;
-- client reports this week's walk count; server clamps to 3/day elapsed so nobody can post 21 on Monday
create or replace function public.tl_challenge_report(p_challenge uuid, p_count int) returns int
language plpgsql security definer set search_path = '' as $$
declare wk date := date_trunc('week', now() at time zone 'Europe/Prague')::date;
        maxc int := 3 * (extract(isodow from now() at time zone 'Europe/Prague')::int); v int;
begin
  if not tl_private.in_challenge(p_challenge) then raise exception 'not a member'; end if;
  v := greatest(0, least(coalesce(p_count,0), maxc, 21));
  insert into public.tl_challenge_progress(challenge_id, user_id, week, count) values (p_challenge, auth.uid(), wk, v)
    on conflict (challenge_id, user_id, week) do update set count = excluded.count, updated_at = now();
  return v;
end $$;
create or replace function public.tl_challenge_leave(p_challenge uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.tl_challenge_members where challenge_id = p_challenge and user_id = auth.uid() $$;

-- ───────── 4) Influencer / promo codes ─────────
create table public.tl_promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  creator text not null,                     -- influencer handle
  days int not null default 30 check (days between 1 and 31),
  max_uses int,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.tl_promo_redemptions (
  code text not null references public.tl_promo_codes(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (user_id)                      -- one promo per account, ever
);
alter table public.tl_promo_codes enable row level security;        -- no client policies: managed by service role
alter table public.tl_promo_redemptions enable row level security;
create policy "tl_promo_redemptions own read" on public.tl_promo_redemptions for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.tl_redeem_promo(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.tl_promo_codes; used int; got int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into c from public.tl_promo_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active or (c.expires_at is not null and c.expires_at < now()) then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if exists (select 1 from public.tl_promo_redemptions where user_id = auth.uid()) then return jsonb_build_object('ok', false, 'reason', 'already'); end if;
  select count(*) into used from public.tl_promo_redemptions where code = c.code;
  if c.max_uses is not null and used >= c.max_uses then return jsonb_build_object('ok', false, 'reason', 'exhausted'); end if;
  insert into public.tl_promo_redemptions(code, user_id) values (c.code, auth.uid());
  got := tl_private.grant_days(auth.uid(), 'promo', c.code, c.days);
  return jsonb_build_object('ok', true, 'days', got, 'creator', c.creator);
end $$;
-- stats for the creator dashboard (service role / admin only)
create or replace view tl_private.promo_stats as
  select c.code, c.creator, c.days, c.max_uses, count(r.user_id) as redemptions, max(r.redeemed_at) as last_redeemed
  from public.tl_promo_codes c left join public.tl_promo_redemptions r on r.code = c.code group by c.code;

-- ───────── 8) Referrals: inviter +30 days, friend +14 days; counted after friend is active 7 days ─────────
create table public.tl_referrals (
  id uuid primary key default gen_random_uuid(),
  inviter uuid not null references auth.users(id) on delete cascade,
  invitee uuid not null unique references auth.users(id) on delete cascade,   -- one inviter per account
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  status text not null default 'pending' check (status in ('pending','rewarded','rejected'))
);
alter table public.tl_referrals enable row level security;
create policy "tl_referrals own read" on public.tl_referrals for select to authenticated using (inviter = (select auth.uid()) or invitee = (select auth.uid()));

-- referral code = first 10 hex chars of the inviter's uid (stable, shareable); the friend's 14 days start immediately
create or replace function public.tl_referral_claim(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare inv uuid; me uuid := auth.uid(); age interval;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select id into inv from auth.users where replace(id::text, '-', '') like lower(regexp_replace(p_code, '[^0-9a-fA-F]', '', 'g')) || '%' and length(regexp_replace(p_code, '[^0-9a-fA-F]', '', 'g')) = 10 limit 2;
  if inv is null or inv = me then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  select now() - created_at into age from auth.users where id = me;
  if age > interval '3 days' then return jsonb_build_object('ok', false, 'reason', 'not_new'); end if;   -- only fresh accounts
  insert into public.tl_referrals(inviter, invitee) values (inv, me) on conflict (invitee) do nothing;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already'); end if;
  perform tl_private.grant_days(me, 'referral', 'welcome', 14);
  return jsonb_build_object('ok', true, 'days', 14);
end $$;

-- run daily by the service role (Netlify scheduled function): friend qualifies when the account is ≥7 days old,
-- e-mail confirmed, owns a household with ≥1 pet and synced something on a day ≥ 6 days after joining.
create or replace function public.tl_referral_settle() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select f.* from public.tl_referrals f join auth.users u on u.id = f.invitee
           where f.status = 'pending' and u.created_at < now() - interval '7 days' and u.email_confirmed_at is not null
             and exists (select 1 from public.tl_household_members m join public.tl_pets p on p.household_id = m.household_id
                         where m.user_id = f.invitee and not p.deleted)
             and exists (select 1 from public.tl_household_members m join public.tl_pets p on p.household_id = m.household_id
                         where m.user_id = f.invitee and p.updated_at > f.created_at + interval '6 days')
  loop
    update public.tl_referrals set status = 'rewarded', qualified_at = now() where id = r.id;
    perform tl_private.grant_days(r.inviter, 'referral', r.id::text, 30);
    n := n + 1;
  end loop;
  update public.tl_referrals set status = 'rejected' where status = 'pending' and created_at < now() - interval '60 days';
  return n;
end $$;

-- ───────── 7) Achievements (badges) ─────────
create table public.tl_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge text not null,
  pet_id text not null default '',
  rarity text not null check (rarity in ('tecka','bricho','tlapka','zlata','sezonni')),
  verified boolean not null default false,     -- true only when the server could check the evidence itself
  earned_at timestamptz not null default now(),
  primary key (user_id, badge, pet_id)
);
alter table public.tl_achievements enable row level security;
create policy "tl_achievements own read" on public.tl_achievements for select to authenticated using (user_id = (select auth.uid()));

-- Client asks; server decides. Server-checkable badges are verified from server data and earn Premium days
-- (Bříško +1, Tlapka +7, Zlatá +30, within the 60-day cap). Device-only badges are stored as cosmetic (verified = false, no reward).
create or replace function public.tl_claim_badge(p_badge text, p_pet text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); rar text; ok boolean := false; friends int; days int := 0; got int := 0;
begin
  if me is null then raise exception 'not authenticated'; end if;
  rar := case p_badge
    when 'family' then 'tecka' when 'sitter' then 'tecka' when 'party3' then 'bricho' when 'ambassador10' then 'tlapka'
    when 'year365' then 'zlata' when 'days100' then 'tlapka' when 'days30' then 'bricho' when 'days7' then 'tecka'
    else null end;
  if rar is null then rar := coalesce((select 'tecka' where p_badge ~ '^[a-z0-9_]{2,32}$'), null); end if;
  if rar is null then raise exception 'unknown badge'; end if;
  select count(*) into friends from public.tl_referrals where inviter = me and status = 'rewarded';
  ok := case p_badge
    when 'family' then exists (select 1 from public.tl_household_members a join public.tl_household_members b on a.household_id = b.household_id
                               where a.user_id = me and a.role = 'owner' and b.user_id <> me and b.role in ('owner','editor'))
    when 'sitter' then exists (select 1 from public.tl_share_links s join public.tl_household_members m on m.household_id = s.household_id where m.user_id = me)
    when 'party3' then friends >= 3
    when 'ambassador10' then friends >= 10
    else false end;
  insert into public.tl_achievements(user_id, badge, pet_id, rarity, verified) values (me, p_badge, coalesce(p_pet,''), rar, ok)
    on conflict (user_id, badge, pet_id) do update set verified = public.tl_achievements.verified or excluded.verified;
  if ok then
    days := case rar when 'bricho' then 1 when 'tlapka' then 7 when 'zlata' then 30 else 0 end;
    if days > 0 then got := tl_private.grant_days(me, 'badge', p_badge, days); end if;
  end if;
  return jsonb_build_object('badge', p_badge, 'verified', ok, 'days', got);
end $$;

-- ───────── grants ─────────
revoke all on function tl_private.grant_days(uuid, text, text, int) from public, anon, authenticated;
revoke all on function public.tl_referral_settle() from public, anon, authenticated;
grant execute on function public.tl_referral_settle() to service_role;
do $$ declare f text; begin
  foreach f in array array['tl_chip_request(text,text)','tl_pet_link_decide(uuid,boolean)','tl_challenge_create(text,int,text)','tl_challenge_join(text,text)',
                           'tl_challenge_report(uuid,int)','tl_challenge_leave(uuid)','tl_redeem_promo(text)','tl_referral_claim(text)','tl_claim_badge(text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;

-- ───────── daily log (Tlapka Den ticks: feeding / walks, with who did it) – synced like other entities ─────────
create table public.tl_daily (
  household_id uuid not null references public.tl_households(id) on delete cascade,
  id text not null,
  pet_id text,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (household_id, id)
);
create index tl_daily_sync_idx on public.tl_daily (household_id, updated_at);
create trigger tl_daily_touch before insert or update on public.tl_daily for each row execute function tl_private.tl_touch();
alter table public.tl_daily enable row level security;
create policy "tl_daily read" on public.tl_daily for select to authenticated using ((select tl_private.tl_can_read(household_id)));
create policy "tl_daily insert" on public.tl_daily for insert to authenticated with check ((select tl_private.tl_can_write(household_id)));
create policy "tl_daily update" on public.tl_daily for update to authenticated using ((select tl_private.tl_can_write(household_id))) with check ((select tl_private.tl_can_write(household_id)));
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then execute 'alter publication supabase_realtime add table public.tl_daily'; end if;
end $$;
