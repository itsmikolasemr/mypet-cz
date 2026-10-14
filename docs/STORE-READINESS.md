# Tlapka – připravenost na App Store / Google Play

Stav k 14. 10. 2026 (větev v1.1). Tohle se nedá dokončit bez skutečných klíčů, účtů nebo zařízení. Kód je připravený.

## Klíče a účty (nikdy je necommituj)
| Co | Kde | Stav |
|---|---|---|
| `NEXT_PUBLIC_RC_KEY` + plugin `@revenuecat/purchases-capacitor` | RevenueCat, produkty `tlapka_premium_monthly`, `tlapka_premium_yearly`, `tlapka_family_yearly`, entitlement `premium` | provider + `restore()` připravené (lib/premium.tsx), nákup zatím hází „nejsou zapnuté“ |
| `PREMIUM_DEV_MODE` | Netlify env | **v produkci MUSÍ být vypnuté** (testovací Premium zdarma) |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify env (jen server) | potřeba pro `/api/account/delete` – bez něj vrací 503 `not_configured` |
| `GEMINI_API_KEY` | Netlify env | Aivet, sken |
| AdMob app id + `NEXT_PUBLIC_ADS=admob` + ATT plugin | iOS/Android | lib/att.ts + `NSUserTrackingUsageDescription` připravené, ATT se ptá jen když jsou reklamy AdMob zapnuté |

## Firemní údaje
`components/Legal.tsx` → `COMPANY`: všechna místa `[DOPLNIT: …]` (provozovatel, IČO, sídlo, e-mail, DPO) jsou v aplikaci žlutě zvýrazněná. Před vydáním doplnit a nechat zkontrolovat právníkem.

## Smazání účtu (Apple 5.1.1(v), Google Play)
Tok: Nastavení → Účet a záloha → Smazat účet → potvrzení „SMAZAT“ → `POST /api/account/delete`. Maže households, kde je uživatel vlastník (cascade), soubory v `tl-docs/<household>/` a Auth uživatele.
Zkontrolováno v kódu. Na živé DB to bez service-role klíče a testovacího hesla otestovat nešlo.
Storage se prochází rekurzivně (opraveno 14. 10.).
Webová stránka pro Google Play: `/smazat-ucet` (app/smazat-ucet/page.tsx). Doplnit e-mail a provozovatele (`[DOPLNIT`). Mazání souborů ve vnořených složkách opraveno (rekurzivní procházení, test v server.test.mjs).

## Zařízení (nutné otestovat ručně)
- Lokální notifikace: den předem, týdenní souhrn (neděle 18:00), Android (výrobci Xiaomi/Samsung/Huawei: BatteryGuide se ukáže jen na Androidu).
- Widget: data jsou v `localStorage['tlapka:widget']` (`weeklySummary`). Nativní WidgetKit / Android App Widget je potřeba napsat a předávat data přes App Group / SharedPreferences (např. `@capacitor/preferences`).
- Export do kalendáře (.ics) přes share sheet na iOS/Androidu.
- Obnovení nákupů s reálným sandbox Apple ID / testerem Google Play.

## App Privacy (Apple) / Data safety (Google)
Zdraví a fitness (zdraví zvířete, ne uživatele, ale uvést jako „Other user content“), kontaktní údaje (e-mail při přihlášení), identifikátory (device id pro Premium), fotky (volitelně), poloha přibližná (mapa, neukládá se). Sledování: **ne**, dokud nejsou AdMob + ATT. Šifrování při přenosu: ano. Smazání: ano (v aplikaci).
