# Tlapka v1.2 – růst a komunita

Vše na větvi `v1.2`, jen lokálně. Migrace `supabase/migrations/20261014120000_tlapka_v12_growth.sql` **není aplikovaná** na produkční Supabase (vyžaduje schválení).

## Funkce a kde jsou
| Funkce | UI | Data / server |
|---|---|---|
| Párový režim | Mazlíček › Sdílet › Párový režim (QR pozvánka `#join/KÓD`, žádost podle čipu, schvalování) · Dnes › „Kdo se dnes staral“ | `tl_invites`, `tl_pet_link_requests`, `tl_chip_request` (vždy stejná odpověď), `tl_pet_link_decide` (jen majitel), `tl_daily` |
| Mapa „Se psem“ + Cestovní režim | Mapa: čip ☕ Se psem, banner mimo ČR, check-in ve výběhu (GPS ≤ 100 m, 1×/den) | OSM Overpass, `public/petfriendly-curated.json` |
| Výzvy s kamarády | Tlapkaři › Výzvy | `tl_challenges*`, report max 3/den |
| Promo kódy influencerů | Nastavení › Předplatné › Promo kód | `tl_promo_codes`, `tl_redeem_promo`, `tl_private.promo_stats` |
| Doporučení | Nastavení › Předplatné, Tlapkaři | `tl_referrals`, `tl_referral_claim`, `tl_referral_settle` (oba 30 dní, po 7 aktivních dnech, max 365 dní/rok) |
| Odznaky (31) | Mazlíček › Profil › Odznaky, toast, Nastavení › Vzhled › vypínač, vzpomínkový profil | `lib/badges.ts`, `tl_claim_badge` (odměny jen ze serveru, strop 60 dní/rok; Zakládající Tlapkař bez dní) |
| Story / avatar / nálepky / QR kamarád | Mazlíček › Sdílet › Sdílej a ukaž | `lib/story.ts`, `lib/avatar.ts`, `lib/zip.ts` – vše v telefonu |
| Zdravotní pas EN/DE | Mazlíček › Sdílet › „Na cesty v jazyce“ | `healthPassPdf(data, pet, 'en'|'de')`, `lib/i18n.de.ts` |
| Wallet | zatím jen server kostra | `netlify/functions/wallet.mjs`, `docs/WALLET.md` |
| Tlapkaři | Přehled › Tlapkaři (`#tlapkari`) | `tl_tlapkari` (jen město, viditelné kamarádům), `tl_friendships`, `tl_friend_tokens` (15 min), `tl_feed_events` (jen systémové), `tl_feed_reactions` (paw/dot) |
| Útulky + Dar z Tlapky | Tlapkaři › Hledají domov / Dar z Tlapky | `tl_shelters` (jen `verified_at`), `tl_adoptions`, `tl_shelter_of_month` (5 % příjmů Premium, firma) |

Úrovně (jen kosmetika, podle počtu odznaků 0/5/10/18/26): Štěňátko → Tlapkař → Výběhový štamgast → Parťák party → Legenda tlapek.
Reakce: tlapka + tečka (brand bez srdíček) – čeká na rozhodnutí.

## Testy
```
bash supabase/tests/run_local.sh        # lokální Postgres 17 + Supabase stuby + všechny migrace
psql -h /tmp/pgd -p 5499 -U postgres -d t -q -t -f supabase/tests/v12_growth.test.sql   # každý řádek „ok …“
node tests/v12.test.mjs
```

## Plánované úlohy (po nasazení)
- denně `select public.tl_referral_settle();` (service role) – připíše odměnu pozývajícímu po 7 aktivních dnech
- denně `select public.tl_feed_birthdays();` (service role) – narozeniny do feedu kamarádů
- Netlify Scheduled Function nebo `pg_cron`.

## Seed (ručně, service role)
```sql
insert into tl_promo_codes(code, creator, days, max_uses) values ('ANNA30', 'Anna (IG)', 30, 500);
insert into tl_shelters(name, ico, city, region, web, donate_url, contact_email, verified_at)
  values ('…', '…', '…', '…', 'https://…', 'https://www.darujme.cz/…', '…', now());   -- jen ověřené (IČO v ARES, smlouva)
insert into tl_shelter_of_month(month, shelter_id) values ('2026-11-01', '<id>');  -- donated_czk + proof_url po zaplacení
```
Statistiky promo kódů: `select * from tl_private.promo_stats;`

## AI avatar
Výchozí avatar je deterministický plochý SVG v barvách brandu (`lib/avatar.ts`), bez odesílání fotek. Volitelně lze později přidat
generování z fotky přes obrázkový model (server funkce, souhlas uživatele, smazání vstupu po vygenerování) – zatím neimplementováno.
