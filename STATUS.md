# MyPet CZ — Status

Poslední aktualizace: 2026-10-14 10:20

## Hotovo
- Repo vytvořeno (itsmikolasemr/mypet-cz)
- BRIEF.md, ROADMAP.md, BRAND.md, TEAM.md, NOTES.md, DESIGN.md (upřesněno logo/OG + emergency karta)
- Datové schéma (data/schema.json): Pet, VetVisit, Deworming, Vaccination, Document, Reminder
- Seed katalog zvířat (data/animals-seed.json) — rozšířeno o další plemena (Stafford, Malinois, Český fousek, Evropská krátkosrstá atd.)
- Seed non-stop veterin (data/vets-seed.json)
- Šablona affiliate e-mailu (templates/email-affiliate.md)
- Uvítací e-mail šablona (templates/email-welcome.md)
- Sociální obsah (templates/social-content.md)
- UI komponenty: PetCard, ReminderCard, DocumentCard, HealthTimeline, PetForm, ReminderForm, HealthForm, DocumentForm
- **EmergencyVets** (filtr podle města, call tlačítka)
- **EmergencyCard** (pohotovostní karta mazlíčka — QR placeholder vylepšen)
- SEO.md (rozšířeno), QA.md
- Sample SEO obsah: content/pruvodce-odcerveni.md + content/pruvodce-ockovani.md + content/pruvodce-vaha.md + **content/pruvodce-pohotovost.md**
- Next.js scaffold + plný CRUD profily mazlíčků s localStorage
- CRUD zdravotních záznamů (návštěvy, odčervení, očkování) + timeline
- Plné UI připomínek (přidávání, označení hotovo)
- **Základní nahrávání dokumentů (metadata: typ, název, poznámky) — bez reálného souboru a OCR**
- UI mapa non-stop veterin (seznam s filtrem)
- UI emergency karta (klik na mazlíčka)

## Běží
- SEO obsahové stránky (sample průvodce + nový pohotovostní)
- Reálná mapa (Leaflet/Mapbox) + aktuální data klinik — issue navrženo
- Skutečný QR generátor — issue navrženo
- Export PDF profilu — issue navrženo
- OCR dokumentů
- Affiliate ověření

## Otevřené otázky
- Finální název a doména (kandidáti v DESIGN.md — doporučení Mazlík / Mazel)
- Přesná struktura CEP API
- Affiliate smlouvy (ověřit aktuální %)
- Tech stack potvrzení (Next.js + Netlify doporučeno)

## HOTOVO K TESTOVÁNÍ
MVP (profily, zdravotní záznamy, připomínky, základní dokumenty) + seznam non-stop veterin a emergency karta je vizuálně a funkčně připravené k lokálnímu testování. 

**Majiteli:** Prosím o kontrolu a testování na lokálním Next.js (`npm run dev`). Nic není nasazeno veřejně. Klikni na mazlíčka pro emergency kartu, dole je seznam pohotovostních klinik. Nově rozšířen katalog plemen a přidán průvodce pohotovostních veterinářů.

## Další krok
Reálná interaktivní mapa, generování QR kódu, PDF export. Issues navrženy (formuláře k potvrzení).
