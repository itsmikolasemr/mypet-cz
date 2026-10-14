-- Advisor: rls_enabled_no_policy on tl_promo_codes. Access is only via tl_redeem_promo (security definer); make the deny explicit.
create policy "tl_promo_codes no direct access" on public.tl_promo_codes for select to authenticated, anon using (false);
