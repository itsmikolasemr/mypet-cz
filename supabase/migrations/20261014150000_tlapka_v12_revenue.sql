-- v1.2 doplňkové příjmy. LOKÁLNĚ – na živý projekt aplikovat až po schválení.
-- 3) Placené výpisy veterin a salonů: jen příznak + štítek „Propagováno“, žádná platební brána (zapisuje admin / service role).
create table public.tl_listings (
  osm_id text primary key check (osm_id ~ '^(node|way|relation)/[0-9]+$'),
  kind text not null check (kind in ('vet', 'groomer')),
  name text,
  promoted_until timestamptz,
  contact_email text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.tl_listings enable row level security;
-- veřejně se čte jen to, co appka potřebuje pro štítek (aktivní výpisy); kontakty a poznámky zůstávají adminovi
revoke all on public.tl_listings from anon, authenticated;
grant select (osm_id, kind, promoted_until) on public.tl_listings to anon, authenticated;
create policy "tl_listings read active" on public.tl_listings for select to anon, authenticated using (promoted_until is not null and promoted_until > now());

-- 1) Jednorázové nákupy (non-consumable, např. tlapka_pdf_card_79). Zapisuje jen webhook RevenueCat (service role), uživatel čte své.
create table public.tl_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (product_id in ('tlapka_pdf_card_79')),
  entitlement text not null,
  store text not null check (store in ('app_store', 'play_store', 'stripe', 'test')),
  store_tx_id text unique,
  purchased_at timestamptz not null default now(),
  refunded_at timestamptz
);
create index tl_purchases_user on public.tl_purchases(user_id);
alter table public.tl_purchases enable row level security;
revoke all on public.tl_purchases from anon, authenticated;
grant select on public.tl_purchases to authenticated;
create policy "tl_purchases own read" on public.tl_purchases for select to authenticated using (user_id = (select auth.uid()));
