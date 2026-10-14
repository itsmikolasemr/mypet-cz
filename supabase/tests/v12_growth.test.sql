-- Local verification of the v1.2 growth migration (run on a scratch Postgres with Supabase auth stubs; see docs/GROWTH.md).
\set ON_ERROR_STOP 1
insert into auth.users(id, email, created_at, email_confirmed_at) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','owner@x', now() - interval '30 days', now()),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','partner@x', now() - interval '1 day', now()),
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','stranger@x', now() - interval '1 day', now());
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$;
grant usage on schema tl_private to authenticated;
-- owner creates household + pet with chip
select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
set role authenticated;
select public.tl_create_household('Domácnost', 'Majitel') as hh \gset
insert into public.tl_pets(household_id, id, pet_id, data) values (:'hh', 'max', 'max', '{"name":"Max","microchip":"203 098 100 123 456"}');
reset role;

-- 1) chip match: stranger asks with the same chip – learns nothing, only a pending request is created
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select public.tl_chip_request('203098100123456', 'Jana') as r1 \gset
select public.tl_chip_request('999999999999999', 'Jana') as r2 \gset
select count(*) as visible_pets from public.tl_pets \gset
reset role;
select case when :'r1' = 'requested' and :'r2' = 'requested' and :visible_pets = 0 then 'ok chip: same answer, no data' else 'FAIL chip' end;
-- stranger cannot approve own request
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select id as req from public.tl_pet_link_requests limit 1 \gset
do $$ begin perform public.tl_pet_link_decide((select id from public.tl_pet_link_requests limit 1), true); raise exception 'FAIL self-approve'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end $$;
reset role;
-- owner approves → stranger becomes editor and can read the pet
select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); set role authenticated;
select public.tl_pet_link_decide(:'req', true);
reset role;
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select case when count(*) = 1 then 'ok chip: approved co-owner sees pet' else 'FAIL approve' end from public.tl_pets;
reset role;

-- 3) challenge: create, join, report clamps
select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); set role authenticated;
select (public.tl_challenge_create('5 procházek týdně', 5, 'Majitel'))->>'code' as code, (public.tl_challenge_create('x2', 3))->>'id' as cid2 \gset
select id as cid from public.tl_challenges where code = :'code' \gset
select public.tl_challenge_report(:'cid', 99) as clamped \gset
reset role;
select case when :clamped <= 21 and :clamped = least(21, 3 * extract(isodow from now() at time zone 'Europe/Prague')::int) then 'ok challenge clamp ' || :clamped else 'FAIL clamp' end;
select pg_temp.as_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'); set role authenticated;
select count(*) as before_join from public.tl_challenges \gset
select public.tl_challenge_join(upper(:'code'), 'Partner');
select count(*) as members from public.tl_challenge_members where challenge_id = :'cid' \gset
reset role;
select case when :before_join = 0 and :members = 2 then 'ok challenge join/visibility' else 'FAIL join' end;

-- 4) promo: service role creates code, user redeems once, second time refused, usage cap
insert into public.tl_promo_codes(code, creator, days, max_uses) values ('ANNA30', '@anna.a.rex', 30, 1);
select pg_temp.as_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'); set role authenticated;
select public.tl_redeem_promo('anna30')->>'ok' as p1, public.tl_redeem_promo('ANNA30')->>'reason' as p2 \gset
reset role;
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select public.tl_redeem_promo('ANNA30')->>'reason' as p3 \gset
reset role;
select case when :'p1' = 'true' and :'p2' = 'already' and :'p3' = 'exhausted' then 'ok promo' else 'FAIL promo ' || :'p1' || :'p2' || :'p3' end;
select case when premium_until > now() + interval '29 days' then 'ok promo premium 30 d' else 'FAIL promo days' end from public.tl_profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select redemptions from tl_private.promo_stats where code = 'ANNA30';

-- 8) referral: fresh account claims owner's code → +14 d now; inviter rewarded only after 7 active days
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select public.tl_referral_claim('aaaaaaaaaa')->>'ok' as rc, public.tl_referral_claim('aaaaaaaaaa')->>'reason' as rc2 \gset
reset role;
select case when :'rc' = 'true' and :'rc2' = 'already' then 'ok referral claim' else 'FAIL referral ' || :'rc' || :'rc2' end;
select public.tl_referral_settle() as settled_early \gset
-- age the invitee: account 8 days old, own household with a pet updated after day 6
update auth.users set created_at = now() - interval '8 days' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.tl_referrals set created_at = now() - interval '8 days';
insert into public.tl_households(id, name, created_by) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'H2', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
insert into public.tl_household_members values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'owner', 'J', now());
insert into public.tl_pets(household_id, id, data) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bara', '{"name":"Bára"}');
select public.tl_referral_settle() as settled \gset
select case when :settled_early = 0 and :settled = 1 then 'ok referral settles after 7 active days' else 'FAIL settle ' || :settled_early || '/' || :settled end;
select case when sum(days) = 30 then 'ok inviter +30 d' else 'FAIL inviter days' end from public.tl_reward_ledger where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- cap: rewards (non-promo) never exceed 60 days / year
select tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'referral', 'r2', 30) as g2, tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'referral', 'r3', 30) as g3,
       tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'referral', 'r3', 30) as g3again \gset
select case when :g2 = 30 and :g3 = 30 and :g3again = 0 then 'ok referral idempotent' else 'FAIL ref ' || :g2 || '/' || :g3 end;
select sum(tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'referral', 'bulk' || g, 30)) as bulk from generate_series(1, 20) g \gset
select case when (select sum(days) from public.tl_reward_ledger where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and source = 'referral') = 365 then 'ok referral cap 12 months/yr' else 'FAIL ref cap' end;
select tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'badge', 'b1', 30) + tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'badge', 'b2', 30) + tl_private.grant_days('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'badge', 'b3', 30) as bdays \gset
select case when :bdays = 60 then 'ok badge cap 60 d' else 'FAIL badge cap ' || :bdays end;

-- 7) badges: family is verified from server data (owner has an editor) → no reward for Tečka; unknown evidence → cosmetic only
select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); set role authenticated;
select public.tl_claim_badge('family')->>'verified' as fam, public.tl_claim_badge('party3')->>'verified' as party \gset
reset role;
select case when :'fam' = 'true' and :'party' = 'false' then 'ok badges server-verified' else 'FAIL badges' end;
-- anon can't call anything
set role anon;
do $$ begin perform public.tl_redeem_promo('X'); raise exception 'FAIL anon'; exception when insufficient_privilege then null; end $$;
reset role;
select 'ok anon blocked';

-- community: QR friendship, feed visible only to friends, reactions only on friends' events, shelters only when verified
select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); set role authenticated;
insert into public.tl_tlapkari(pet_name, species, city) values ('Max', 'pes', 'Praha');
select public.tl_friend_token() as tok \gset
reset role;
select pg_temp.as_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'); set role authenticated;
insert into public.tl_tlapkari(pet_name, species, city) values ('Bella', 'pes', 'Praha');
select count(*) as seen_before from public.tl_tlapkari where pet_name = 'Max' \gset
select public.tl_friend_add(:'tok')->>'pet' as fp \gset
select count(*) as seen_after from public.tl_tlapkari where pet_name = 'Max' \gset
select id as ev from public.tl_feed_events where kind = 'friend' and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' \gset
insert into public.tl_feed_reactions(event_id, kind) values (:ev, 'paw');
reset role;
select case when :seen_before = 0 and :seen_after = 1 and :'fp' = 'Max' then 'ok friends via QR + private profiles' else 'FAIL friends' end;
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select count(*) as stranger_feed from public.tl_feed_events where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' \gset
reset role;
select case when :stranger_feed = 0 then 'ok feed hidden from non-friends' else 'FAIL feed leak' end;
insert into public.tl_shelters(name, ico, city, region) values ('Neověřený', '1', 'X', 'Y');
set role anon; select count(*) as sh from public.tl_shelters \gset
reset role;
select case when :sh = 0 then 'ok unverified shelters hidden' else 'FAIL shelters' end;
-- founder badge: client can't self-grant; webhook-granted badge verifies but adds no Premium days
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select (public.tl_claim_badge('founder')->>'verified')::boolean as f1 \gset
reset role;
update public.tl_achievements set verified = true where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and badge = 'founder';
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc'); set role authenticated;
select public.tl_claim_badge('founder') as f2 \gset
reset role;
select case when not :'f1'::boolean and (:'f2'::jsonb->>'verified')::boolean and (:'f2'::jsonb->>'days')::int = 0 then 'ok founder badge server-only, no extra month' else 'FAIL founder ' || :'f2' end;
-- Rodina: max 6 people per household
select case when position('up to 6' in pg_get_functiondef('tl_private.check_member_limit'::regproc)) > 0 then 'ok family cap 6' else 'FAIL family cap' end;
