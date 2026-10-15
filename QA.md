# QA Tlapka. — stav k 15. 10. 2026

Podrobné zprávy: `report5.md` (v1.1 gate), `report6.md` (v1.2 růst), `report7.md` (finální leštění) — ve složce testera mimo repo (`/workspace/tlapka-qa/`).

## Výsledky
**Report 5 (v1.1, 14. 10.)** – 99 záběrů (11 obrazovek × 3 motivy × 3 velikosti) + 13 průchodů. Opraveno: špatné město u detailu místa, ztráta otázky v Aivetu při chybě, useknutý swipe „Hotovo“, ~60 zbylých emoji → 40 vlastních glyfů, oranžová v tmavém motivu a u alergií/zverimexů. 0 JS chyb. Otevřené tehdy: cloudové sady bez hesla testovacích účtů, občasná 403 z dlaždic OSM v headless.
**Report 6 (v1.2, 14. 10.)** – nasazení migrací do Supabase, přepnutí na Inter, 12 chyb UI (ořez dat, 11px štítky, textové symboly místo ikon, odkazy paywallu 15 px, EN směs, přetékající záložky, odznaky, Story/Nálepky, cestovní checklist, patička, útulky, výzvy). 
**Report 7 (15. 10.)** – neprůhledné horní lišty, hlavička Premium tabulky, kontrast odznaků v tmavém (3,9 → ≥ 4,5), 1 262 EN klíčů přeloženo. Audit 360/390/430 × CS/EN × 3 motivy × ~25 obrazovek: bez nálezů. Testy na účtech a/b/c: `v12`, `v11`, `e2e`, `limits`, `db`, `cards.db` = OK. Lighthouse mobil 82–83, LCP 4,2 s, CLS 0,002.

## Známé mezery
- Nelze zkoušet WebKit/Safari (bez sudo se nenainstaluje) → **nutný test na reálném iPhonu** (widget, share sheet .ics, PDF, notifikace, safe-area).
- Notifikace na Xiaomi/Samsung neověřeny.
- Nákupy: bez RevenueCat se platí jen v testovacím režimu; sandbox nákupy a obnova nenatestovány.
- Mazání účtu a Premium z promo/odměn → vyžaduje `SUPABASE_SERVICE_ROLE_KEY` (zatím chybí).
- Premium AI (Aivet, Druhý názor) se ověřuje na klientovi; serverová kontrola nároku (entitlement) je třeba dotáhnout.
- Aivet rate-limit používá Netlify Blobs; na jiném hostingu bez KV se nepersistuje.
- LCP 4,2 s (hydratace celé klientské appky).
- Pet-friendly mapa je prázdná, DE jen v pasu PDF.
- Testy jsou stavové: mezi běhy spustit `cleanup.sql`.

## Testovací účty – postup (bez tajemství)
1. Tři účty `emr+tlapka-a/b/c@itsmedesign.cz` jsou v Supabase potvrzené ručně (e-mailové potvrzování se dočasně obchází, limit odesílání).
2. Heslo je pouze v proměnné prostředí `TLAPKA_TEST_PW` (min. 12 znaků) — **nikdy do repa, issue ani logů**.
3. Spuštění: `npm ci && npm i --no-save playwright`, pak `node tests/…` / sady v QA složce s `TLAPKA_TEST_PW` v env; e2e vyžaduje účet A jako Premium (nastavit SQL).
4. Po běhu `cleanup.sql` (0 domácností). Před veřejným vydáním potvrzení e-mailu zapnout zpět.

## Checklist před vydáním (stručně)
- [ ] Test na iPhonu a Androidu (Xiaomi/Samsung)
- [ ] Sandbox nákupy: měsíc 99 (intro 49), rok 699 (14 dní zdarma), Rodina 999, Zakládající 499, PDF karta 79
- [ ] Právník: VOP, ochrana údajů, pojištění (170/2018 Sb.)
- [ ] `PREMIUM_DEV_MODE` vypnuto, žádné klíče v repu
- [ ] Zapnout Leaked password protection v Supabase Auth
- [ ] Všechny texty v češtině bez tvrdých oranžových/emoji (automatický audit)
