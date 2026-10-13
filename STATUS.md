# MyPet CZ — Status

Poslední aktualizace: 2026-10-13 20:15

## Hotovo
- Repo vytvořeno (itsmikolasemr/mypet-cz)
- BRIEF.md, ROADMAP.md, BRAND.md, TEAM.md, NOTES.md, DESIGN.md (rozšířeno)
- Datové schéma (data/schema.json): Pet, VetVisit, Deworming, Vaccination, Document, Reminder
- Seed katalog zvířat (data/animals-seed.json) — rozšířeno o plemena
- Seed non-stop veterin (data/vets-seed.json) — více měst
- Šablona affiliate e-mailu (templates/email-affiliate.md)
- Sociální obsah (templates/social-content.md)
- UI komponenty: PetCard, ReminderCard, DocumentCard, HealthTimeline, PetForm
- SEO.md — rozšířeno
- QA.md — test plán
- Next.js scaffold (package.json, app/layout.tsx, app/page.tsx, Tailwind)

## Běží
- Základní Next.js appka (CRUD profily) — scaffold hotov, implementace běží
- Mapa non-stop veterin (data)
- SEO obsahové stránky

## Otevřené otázky
- Finální název a doména (kandidáti v DESIGN.md)
- Přesná struktura CEP API
- Affiliate smlouvy (ověřit aktuální %)
- Tech stack potvrzení (Next.js + Netlify?)

## Další krok
Implementovat plný CRUD pro mazlíčky (localStorage pro MVP), poté QA test plán. Issues vytvořeny.
