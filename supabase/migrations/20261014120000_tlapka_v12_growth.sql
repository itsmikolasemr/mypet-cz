-- Tlapka v1.2 growth: co-owners (párový režim), group challenges, promo codes, referrals, achievements.
-- All objects NEW, prefixed tl_, RLS on. Reward maths runs ONLY on the server (security definer RPCs / service role).

-- ───────── shared: Premium reward ledger (caps per rolling year: referrals 12 months = 365 d, badges 60 d; promo uncapped) ─────────
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
    select coalesce(sum(days),0) into used from public.tl_reward_ledger where user_id = p_user and source = p_source and granted_at > now() - interval '365 days';
    give := greatest(0, least(p_days, (case p_source when 'referral' then 365 else 60 end) - used));
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

-- ───────── 8) Referrals: both get 1 month (friend on sign-up, inviter after the friend is active 7 days); max 12 months / year ─────────
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

-- referral code = first 10 hex chars of the inviter's uid (stable, shareable); the friend's month starts immediately
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
  perform tl_private.grant_days(me, 'referral', 'welcome', 30);
  return jsonb_build_object('ok', true, 'days', 30);
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
    when 'year365' then 'zlata' when 'founder' then 'zlata' when 'days100' then 'tlapka' when 'days30' then 'bricho' when 'days7' then 'tecka'
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
    when 'founder' then exists (select 1 from public.tl_achievements where user_id = me and badge = 'founder' and verified) -- granted by the RevenueCat webhook only
    else false end;
  insert into public.tl_achievements(user_id, badge, pet_id, rarity, verified) values (me, p_badge, coalesce(p_pet,''), rar, ok)
    on conflict (user_id, badge, pet_id) do update set verified = public.tl_achievements.verified or excluded.verified;
  if ok then
    days := case rar when 'bricho' then 1 when 'tlapka' then 7 when 'zlata' then 30 else 0 end;
    if p_badge = 'founder' then days := 0; end if; -- Zakládající Tlapkař: badge only, no extra Premium month
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


-- ═════════ Kolo 3: komunita „Tlapkaři“ (MVP), útulky + adopční výloha, Dar z Tlapky ═════════
-- Profile: pet-first, city only (never address), private by default ('friends').
create table public.tl_tlapkari (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  pet_name text not null check (length(pet_name) between 1 and 40),
  species text not null default 'pes',
  breed text, city text check (city is null or length(city) <= 60),
  avatar text,                                 -- avatar seed/colour, no photos in MVP
  showcase text[] not null default '{}' check (cardinality(showcase) <= 3),
  level int not null default 1 check (level between 1 and 5),   -- cosmetic only, never unlocks care features
  visibility text not null default 'friends' check (visibility in ('friends','public')),
  birthday date,                               -- month/day used for the friends feed
  updated_at timestamptz not null default now()
);
create table public.tl_friendships (
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b), check (a < b)
);
create table public.tl_friend_tokens (           -- QR in the park: short-lived token, scanned by the other phone
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);
create table public.tl_feed_events (             -- only system events (badge, birthday, new friend, level) – no user text, no comments
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('badge','birthday','friend','level','adoption')),
  ref text,                                    -- badge id / level number / friend pet name
  created_at timestamptz not null default now()
);
create index tl_feed_events_user_idx on public.tl_feed_events(user_id, created_at desc);
create table public.tl_feed_reactions (
  event_id bigint not null references public.tl_feed_events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('paw','dot')),          -- brand: no hearts → tlapka + tečka ("mazlení")
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.tl_tlapkari enable row level security;
alter table public.tl_friendships enable row level security;
alter table public.tl_friend_tokens enable row level security;
alter table public.tl_feed_events enable row level security;
alter table public.tl_feed_reactions enable row level security;
create or replace function tl_private.is_friend(o uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select o = auth.uid() or exists (select 1 from public.tl_friendships where (a = auth.uid() and b = o) or (b = auth.uid() and a = o)) $$;
create policy "tl_tlapkari read" on public.tl_tlapkari for select to authenticated using (visibility = 'public' or (select tl_private.is_friend(user_id)));
create policy "tl_tlapkari own write" on public.tl_tlapkari for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tl_tlapkari own update" on public.tl_tlapkari for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tl_tlapkari own delete" on public.tl_tlapkari for delete to authenticated using (user_id = (select auth.uid()));
create policy "tl_friendships read" on public.tl_friendships for select to authenticated using (a = (select auth.uid()) or b = (select auth.uid()));
create policy "tl_friendships unfriend" on public.tl_friendships for delete to authenticated using (a = (select auth.uid()) or b = (select auth.uid()));
create policy "tl_friend_tokens own" on public.tl_friend_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "tl_feed read friends" on public.tl_feed_events for select to authenticated using ((select tl_private.is_friend(user_id)));
create policy "tl_reactions read" on public.tl_feed_reactions for select to authenticated
  using (exists (select 1 from public.tl_feed_events e where e.id = event_id and tl_private.is_friend(e.user_id)));
create policy "tl_reactions own" on public.tl_feed_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.tl_feed_events e where e.id = event_id and tl_private.is_friend(e.user_id)));
create policy "tl_reactions undo" on public.tl_feed_reactions for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.tl_friend_token() returns text language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.tl_friend_tokens where user_id = auth.uid() or expires_at < now();
  insert into public.tl_friend_tokens(user_id) values (auth.uid()) returning token into t; return t;
end $$;
create or replace function public.tl_friend_add(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o uuid; me uuid := auth.uid(); pn text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select user_id into o from public.tl_friend_tokens where token = p_token and expires_at > now();
  if o is null or o = me then return jsonb_build_object('ok', false); end if;
  insert into public.tl_friendships(a, b) values (least(me, o), greatest(me, o)) on conflict do nothing;
  if found then
    select pet_name into pn from public.tl_tlapkari where user_id = o;
    insert into public.tl_feed_events(user_id, kind, ref) values (me, 'friend', pn);
    insert into public.tl_feed_events(user_id, kind, ref) values (o, 'friend', (select pet_name from public.tl_tlapkari where user_id = me));
  end if;
  return jsonb_build_object('ok', true, 'pet', pn);
end $$;
-- events are written by the server: badges only if the badge row exists for that user; birthdays by the daily job
create or replace function public.tl_feed_badge(p_badge text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tl_achievements where user_id = auth.uid() and badge = p_badge) then raise exception 'no such badge'; end if;
  if exists (select 1 from public.tl_feed_events where user_id = auth.uid() and kind = 'badge' and ref = p_badge) then return; end if;
  insert into public.tl_feed_events(user_id, kind, ref) values (auth.uid(), 'badge', p_badge);
end $$;
create or replace function public.tl_feed_birthdays() returns int language sql security definer set search_path = '' as $$
  with ins as (insert into public.tl_feed_events(user_id, kind, ref)
    select user_id, 'birthday', pet_name from public.tl_tlapkari t
    where to_char(birthday, 'MM-DD') = to_char(now() at time zone 'Europe/Prague', 'MM-DD')
      and not exists (select 1 from public.tl_feed_events e where e.user_id = t.user_id and e.kind = 'birthday' and e.created_at > now() - interval '300 days')
    returning 1) select count(*)::int from ins $$;

-- Shelters (verified manually: IČO in ARES, consent, Darujme/Donio profile) + adoption showcase. Tlapka never handles donor money.
create table public.tl_shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null, ico text not null, city text not null, region text not null,
  web text, donate_url text check (donate_url is null or donate_url ~ '^https://(www\.)?(darujme\.cz|donio\.cz)/'),
  contact_email text, contact_phone text,
  verified_at timestamptz,                      -- null = not shown
  created_at timestamptz not null default now()
);
create table public.tl_adoptions (
  id uuid primary key default gen_random_uuid(),
  shelter_id uuid not null references public.tl_shelters(id) on delete cascade,
  name text not null, species text not null, age_text text, sex text,
  photo_url text, temperament text, kids_ok boolean, dogs_ok boolean, cats_ok boolean,
  active boolean not null default true, created_at timestamptz not null default now()
);
-- Dar z Tlapky: 5 % of Premium revenue each month → shelter of the month (company donation, users never pay here)
create table public.tl_shelter_of_month (
  month date primary key check (extract(day from month) = 1),
  shelter_id uuid not null references public.tl_shelters(id),
  premium_revenue_czk numeric(12,2),            -- net revenue basis, filled after the month closes
  donated_czk numeric(12,2),                    -- = 5 % of basis, filled when paid
  paid_at timestamptz, proof_url text, note text
);
alter table public.tl_shelters enable row level security;
alter table public.tl_adoptions enable row level security;
alter table public.tl_shelter_of_month enable row level security;
create policy "tl_shelters public verified" on public.tl_shelters for select to anon, authenticated using (verified_at is not null);
create policy "tl_adoptions public" on public.tl_adoptions for select to anon, authenticated
  using (active and exists (select 1 from public.tl_shelters s where s.id = shelter_id and s.verified_at is not null));
create policy "tl_som public" on public.tl_shelter_of_month for select to anon, authenticated using (true);

do $$ declare f text; begin
  foreach f in array array['tl_friend_token()','tl_friend_add(text)','tl_feed_badge(text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;
revoke all on function public.tl_feed_birthdays() from public, anon, authenticated;
grant execute on function public.tl_feed_birthdays() to service_role;

-- ───────── pricing v1.2: Rodina = až 6 lidí (free: owner + 1 partner) ─────────
create or replace function tl_private.check_member_limit() returns trigger language plpgsql security definer set search_path = '' as $$
declare n int := (select count(*) from public.tl_household_members where household_id = new.household_id);
begin
  if not tl_private.hh_premium(new.household_id) and n >= 2 then
    raise exception 'tl_limit_members' using hint = 'Free plan: 1 partner. Premium Rodina: up to 6 people.';
  end if;
  if n >= 6 then raise exception 'tl_limit_members' using hint = 'Rodina: up to 6 people.'; end if;
  return new;
end $$;
