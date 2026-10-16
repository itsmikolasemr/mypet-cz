# Design Tlapka. — designový systém (v1.2)

Doplňuje `BRAND.md` (logo, paleta, tón). Zdroj pravdy je kód (`tailwind.config.js`, `app/globals.css`).

## Principy
Čisté, přátelské, profesionální. Mobil-first (390 px, kontrola 360/390/430). Hodně bílého prostoru, zaoblené karty, jemné stíny. Žádné emoji, oranžová, srdíčka, fialová.

## Paleta
Baby blue `#7FB3E8`, grafit `#3A3D43`, světle šedá `#ECEFF3`, bílá. Úspěch/varování/chyba v tlumených odstínech (chyba = růžovočervená). Rarita odznaků: 4 stupně, vzácný „Zakládající Tlapkař“ (Zlatá tečka).

## Typografie
Inter. h1 24–32 px / 700, nadpisy sekcí 600, tělo 16 px, malé 14 px, popisky min. 11 px. Čísla `tabular-nums`.

## Motivy
Světlý · Tmavý · Sklo (+ systémový). Každá obrazovka se kontroluje ve všech třech. Sticky lišty: `.hdr`, `.hdr-tabs`, `.hdr-cover` (neprůhledné + safe-area kryt).

## Komponenty
Karty `rounded-2xl`, tlačítka primární (baby blue, grafitový text pro kontrast) / sekundární outline, segmentové přepínače (EN texty kratší: „Docs“), štítky „Premium“, „Propagováno“, „Reklama“, „affiliate odkaz“ (šedé #3A3D43 / #ECEFF3). Vlastní glyfy (40+), bez textových symbolů ✓ ✦ ✎.

## Přístupnost
Kontrast ≥ 4,5:1 (opraveno v tmavých dlaždicích odznaků), cíle ≥ 44 px (kalendář 39×44 záměrně), žádný vodorovný přesah, žádný ořez textu – ověřuje `audit7.mjs`.

## Jazyky
CS (výchozí), EN (1 262 klíčů, lazy-load), DE jen v cestovním pasu PDF.

## Widget a sdílení
Tlapka Den widget (data v `localStorage['tlapka:widget']`, `docs/WIDGETS.md`), Wrapped/Story 9:16 s QR pozvánkou, nálepky.
