# MyPet CZ — Status

Poslední aktualizace: 2026-10-13 21:10

## Hotovo
- Repo vytvořeno (itsmikolasemr/mypet-cz)
- BRIEF.md, ROADMAP.md, BRAND.md, TEAM.md, NOTES.md, DESIGN.md (rozšířeno)
- Datové schéma (data/schema.json): Pet, VetVisit, Deworming, Vaccination, Document, Reminder
- Seed katalog zvířat (data/animals-seed.json) — rozšířeno o plemena
- Seed non-stop veterin (data/vets-seed.json) — více měst
- Šablona affiliate e-mailu (templates/email-affiliate.md)
- Sociální obsah (templates/social-content.md)
- UI komponenty: PetCard, ReminderCard, DocumentCard, HealthTimeline, PetForm (funkční)
- SEO.md — rozšířeno
- QA.md — test plán
- Next.js scaffold + **plný CRUD profily mazlíčků s localStorage** (lib/storage.ts, typy, page.tsx interaktivní)

## Běží
- Připomínky CRUD (základní storage hotové, UI doplnit)
- Mapa non-stop veterin (data)
- SEO obsahové stránky
- Dokumenty + OCR (plánováno)

## Otevřené otázky
- Finální název a doména (kandidáti v DESIGN.md — doporučení Mazlík / Mazel)
- Přesná struktura CEP API
- Affiliate smlouvy (ověřit aktuální %)
- Tech stack potvrzení (Next.js + Netlify doporučeno)

## Další krok
Doplnit UI pro připomínky a základní zdravotní záznamy. Poté QA cyklus na MVP profilů. Issues vytvořeny.
