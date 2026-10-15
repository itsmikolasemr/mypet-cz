# Tlapka 1.2 – release checklist

Stav k 15. 10. 2026, větev `v1.2` (lokální commity, nic není pushnuté ani nasazené na web). Web deploy je blokovaný do 23. 10. (kredity Netlify) – viz „Kde testovat“ níže.

## 1. Hotovo (v aplikaci, v kódu)
- **Tlapka Den + widget**, **Wrapped** (Story 9:16 + QR pozvánka), odznaky (31, 4 vzácnosti, bez odměn za zdraví), potvrzení čipu při párování.
- **Párový režim**: spolumajitel přes pozvánku/QR nebo shodné číslo čipu (původní majitel schvaluje).
- **Tlapkaři**: profil (jen město), kamarádi přes QR, feed automatických událostí (reakce **tlapka / tečka**, žádná srdíčka, žádné komentáře), výzvy s kamarády, útulky + **Dar z Tlapky** (5 % z Premium; 12 ověřených útulků), pozvi kamaráda (+1 měsíc Premium, strop 12 měs./rok).
- **Mapa**: veterináři, nonstop, výběhy (check-in), zverimexy (624), pet-friendly (curated, zatím prázdné), štítek „Propagováno“.
- **Cestování**: pas PDF + QR v CS/EN/DE, cestovní checklist (Premium), předávací karta pro hlídače.
- **Ceny**: 99 Kč/měs (1. měsíc 49 Kč), 699 Kč/rok, Rodina 999 Kč/rok (6 lidí), Zakládající Tlapkař 499 Kč/rok napořád (prvních 3 měsíce po vydání), 14 dní zdarma. PDF karta 79 Kč (jednorázově).
- **Doplňkové příjmy**: PDF karta 79 Kč, zásoba krmiva + affiliate odkazy, QR přívěsek 249 Kč (objednávka přes env URL).
- **Vzhled**: Inter, logo Polštářek, 3 motivy (světlý/tmavý/Sklo), CS + EN (+ DE v pasu), navbar s logem bez popisků.
- **Final polish (15. 10.)**: neprůhledné horní lišty ve všech motivech, tabulka Premium (odsazení „999 Kč/rok“), kontrasty, cíle ≥ 44 px, EN texty, lazy-load angličtiny a těžkých obrazovek, `public/_headers` (cache + nosniff). Podrobnosti: `/workspace/tlapka-qa/report7.md`.

## 2. Vypnuto (feature flag / záměrně)
| Funkce | Jak zapnout | Poznámka |
|---|---|---|
| Sponzorovaný obsah (free) | `NEXT_PUBLIC_FLAG_SPONSORED=1` + `NEXT_PUBLIC_SPONSORED_JSON` | až od ~5 000 MAU, vždy štítek „Reklama“ |
| Pojištění (neutrální odkazy) | `NEXT_PUBLIC_FLAG_INSURANCE=1` + `NEXT_PUBLIC_INS_*_URL` | **nejdřív právník** (zák. 170/2018 Sb.) |
| Reklamy AdMob | `NEXT_PUBLIC_ADS=admob` | + ATT plugin, AdMob app id |
| Apple Wallet pas | – | odloženo (chybí certifikát Apple) |
| Sbírky útulků | – | záměrně vynecháno |
| SOS ztracený mazlíček, fyzická známka, moderace | – | nerozhodnuto / odloženo |

## 3. Proměnné prostředí
**Klient (build time, `NEXT_PUBLIC_*`)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE` (nativní appka → URL webu s /api), `NEXT_PUBLIC_RC_KEY` (RevenueCat), `NEXT_PUBLIC_STORE_LAUNCH` (datum vydání → okno Zakládající Tlapkař), affiliate: `NEXT_PUBLIC_AFF_{ZOOHIT,SUPERZOO,DOBRAMISKA,KRMIVOBRIT}_URL`, `NEXT_PUBLIC_QR_TAG_ORDER_URL`, pojištění `NEXT_PUBLIC_INS_{PETEXPERT,DIRECT,GENERALI,CPP,UNIQA,COLONNADE}_URL` (flag off), `NEXT_PUBLIC_FLAG_SPONSORED`, `NEXT_PUBLIC_SPONSORED_JSON`, `NEXT_PUBLIC_FLAG_INSURANCE`, `NEXT_PUBLIC_ADS`.

**Server (Netlify / Cloudflare secrets)**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (smazání účtu, Premium z promo/odměn → entitlement), `AIVET_API_KEY`, `AIVET_BASE_URL`, `AIVET_MODEL`, `AIVET_FALLBACK_MODELS`, `AIVET_ALLOWED_ORIGINS`, `AIVET_FREE_QUESTIONS`, `AIVET_FREE_IP_DAY`, `AIVET_LIMIT_10MIN`, `AIVET_LIMIT_DAY`, `ENTITLEMENT_SECRET`, `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_ENTITLEMENT`, `REVENUECAT_FOUNDER_PRODUCT`, `STRIPE_WEBHOOK_SECRET`, `APPLE_PASS_KEY_PASS` (až Wallet). **`PREMIUM_DEV_MODE` musí být v produkci vypnuté.** (Starší dokumenty uvádějí `GEMINI_API_KEY` – kód ho nečte, používá `AIVET_*`.)

## 4. Kroky před vydáním
1. Doplnit zbylé `[DOPLNIT]` v `components/Legal.tsx` (kontaktní e-mail je dočasně `emr@itsmedesign.cz`), právní kontrola VOP / ochrany údajů.
2. RevenueCat: produkty `tlapka_premium_monthly_99` (intro 49 Kč), `tlapka_premium_yearly_699`, `tlapka_family_yearly_999`, `tlapka_founder_yearly_499`, `tlapka_pdf_card_79` (non-consumable); entitlement `premium` + `pdf_card`; webhook na `/api/billing/revenuecat`.
3. Supabase: migrace jsou nasazené (komunita, příjmy). Zapnout *Leaked password protection* (Auth → Password). Zvážit potvrzení e-mailu zpět (testovací účty jsou potvrzené natvrdo).
4. Apple: App Store Connect (IAP, App Privacy dle `docs/STORE-READINESS.md`), ATT jen při AdMob, Sign in – kontrola 5.1.1(v) smazání účtu (`/smazat-ucet`). Google Play: Data safety, URL pro smazání účtu, interní testování.
5. `npm run build && npx cap sync`; ikony/splash z `assets/`; nativní widgety (WidgetKit / App Widget) – zbývá napsat, data jsou v `localStorage['tlapka:widget']` (`docs/WIDGETS.md`).
6. Test na zařízeních: notifikace (Xiaomi/Samsung), widget, share sheet (.ics), sandbox nákupy, obnovení nákupů.
7. Mockupy a screenshoty pro obchody: `/workspace/tlapka-mockups/`.

## 5. Známá omezení
- Nákupy nativně nefungují, dokud není napojený RevenueCat (test režim jen na webu).
- Premium z promo kódu/odměn odemyká AI funkce až po nastavení `SUPABASE_SERVICE_ROLE_KEY` na serveru.
- Aivet rate-limit a zkušební dotazy používají Netlify Blobs; na jiném hostingu (Cloudflare) se bez KV nepersistují (viz `deploy/cloudflare/`).
- Kalendářní mřížka: buňky dnů jsou 39×44 px na 390 px displeji (7 sloupců) – záměrně.
- Leaflet atribuce a `title` pro odkazy OSM jsou v angličtině (licenční text).
- Pet-friendly mapa je zatím bez dat (curated seznam prázdný).
- Lighthouse (mobil, simulovaný 4G + 4× CPU): LCP ~4,2 s kvůli celé klientské aplikaci (hydratace); skóre 85. Další zlepšení vyžaduje předrenderovat onboarding / rozdělit store.

## 6. Kde testovat mimo Netlify
Viz sekce „Hosting“ v `/workspace/tlapka-qa/report7.md` – doporučení: **Cloudflare Pages/Workers** (připravené `deploy/cloudflare/`, lokálně ověřeno přes `wrangler dev`), pro okamžité sdílení **cloudflared quick tunnel**, pro nativní test **TestFlight / Play internal testing**.
