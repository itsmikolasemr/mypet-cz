# MyPet CZ — Status

Poslední aktualizace: 2026-10-13 23:15

## Hotovo
- Repo vytvořeno (itsmikolasemr/mypet-cz)
- BRIEF.md, ROADMAP.md, BRAND.md, TEAM.md, NOTES.md, DESIGN.md
- Datové schéma (data/schema.json): Pet, VetVisit, Deworming, Vaccination, Document, Reminder
- Seed katalog zvířat (data/animals-seed.json)
- Seed non-stop veterin (data/vets-seed.json)
- Šablona affiliate e-mailu (templates/email-affiliate.md)
- Sociální obsah (templates/social-content.md)
- UI komponenty: PetCard, ReminderCard, DocumentCard, HealthTimeline, PetForm, ReminderForm, HealthForm, DocumentForm
- SEO.md, QA.md
- Next.js scaffold + plný CRUD profily mazlíčků s localStorage
- CRUD zdravotních záznamů (návštěvy, odčervení, očkování) + timeline
- Plné UI připomínek (přidávání, označení hotovo)
- **Základní nahrávání dokumentů (metadata: typ, název, poznámky) — bez reálného souboru a OCR**

## Běží
- Mapa non-stop veterin (data hotová, UI chybí)
- SEO obsahové stránky
- QR emergency karta
- Export PDF profilu

## Otevřené otázky
- Finální název a doména (kandidáti v DESIGN.md — doporučení Mazlík / Mazel)
- Přesná struktura CEP API
- Affiliate smlouvy (ověřit aktuální %)
- Tech stack potvrzení (Next.js + Netlify doporučeno)

## HOTOVO K TESTOVÁNÍ
MVP (profily, zdravotní záznamy, připomínky, základní dokumenty) je vizuálně a funkčně připravené k lokálnímu testování. 

**Majiteli:** Prosím o kontrolu a testování na lokálním Next.js (`npm run dev`). Nic není nasazeno veřejně. Po schválení pokračujeme mapou a QR.

## Další krok
UI pro mapu non-stop veterin a QR emergency kartu. Issues vytvořeny.
