-- spustit po run_local.sh: psql ... -f supabase/tests/v12_revenue.test.sql
\set ON_ERROR_STOP 0
insert into public.tl_listings(osm_id, kind, name, promoted_until, contact_email) values ('node/1','vet','A','2099-01-01','x@y.cz'),('node/2','vet','B',now()-interval '1 day',null),('way/3','groomer','C',null,null);
select case when (select count(*) from public.tl_listings where osm_id='bad') = 0 then 'ok seed' end;
set role anon;
select case when count(*) = 1 then 'ok anon sees only active listing' else 'FAIL listings '||count(*) end from (select osm_id, kind, promoted_until from public.tl_listings) s;
do $$ begin perform contact_email from public.tl_listings; raise notice 'FAIL contact readable'; exception when insufficient_privilege then raise notice 'ok contact hidden'; end $$;
do $$ begin insert into public.tl_listings(osm_id, kind) values ('node/9','vet'); raise notice 'FAIL anon insert'; exception when insufficient_privilege then raise notice 'ok anon cannot insert'; end $$;
reset role;
do $$ begin insert into public.tl_listings(osm_id, kind) values ('xyz','vet'); raise notice 'FAIL bad osm id'; exception when check_violation then raise notice 'ok osm id checked'; end $$;
