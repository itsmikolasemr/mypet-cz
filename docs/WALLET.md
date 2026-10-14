# Wallet karty (Apple Wallet / Google Wallet) – příprava

> **Apple Wallet je odložený** (rozhodnutí uživatele 14. 10. 2026): žádný Pass Type ID certifikát, v aplikaci žádné tlačítko. Endpoint `/api/wallet/apple` zůstává jen jako kostra a vrací 501.

Stav: **kostra** `netlify/functions/wallet.mjs` (`/api/wallet/apple`, `/api/wallet/google`). Bez certifikátů vrací 501, v UI zatím není tlačítko.

## Apple Wallet (.pkpass)
1. Apple Developer → Identifiers → **Pass Type ID** `pass.cz.tlapka.pet`.
2. Vytvořit certifikát pro Pass Type ID, exportovat jako PEM (cert + klíč) a stáhnout **Apple WWDR G4** certifikát.
3. Netlify env: `APPLE_PASS_CERT_PEM`, `APPLE_PASS_KEY_PEM`, `APPLE_PASS_KEY_PASS` (pokud je klíč šifrovaný), `APPLE_WWDR_PEM`, `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`.
4. `npm i passkit-generator` a do `public/wallet/` přidat `icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png` (Polštářek, bez oranžové/fialové).
5. Karta: jméno, druh, čip, alergie, QR na sdílený pas (`createShareLink(..., 'pass')`).

## Google Wallet
1. Google Pay & Wallet Console → Issuer ID; Google Cloud service account s rolí Wallet Object Issuer.
2. Jednou vytvořit **GenericClass** `<issuer>.tlapka_pet` (REST `walletobjects.googleapis.com`).
3. Netlify env: `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SA_EMAIL`, `GOOGLE_WALLET_SA_KEY_PEM`.
4. Endpoint vrátí `saveUrl` (JWT „Save to Google Wallet“).

## Bezpečnost
- Karta obsahuje jen to, co majitel sám sdílí (jméno, druh, čip, alergie). Žádná zdravotní historie.
- Certifikáty jen v Netlify env, nikdy v repu.
