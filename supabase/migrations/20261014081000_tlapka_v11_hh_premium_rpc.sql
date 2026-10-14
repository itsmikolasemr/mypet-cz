create or replace function public.tl_household_premium(hh uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select tl_private.tl_can_read(hh) and tl_private.hh_premium(hh) $$;
revoke all on function public.tl_household_premium(uuid) from public, anon; grant execute on function public.tl_household_premium(uuid) to authenticated;
