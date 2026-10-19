# Roadmap MyPet CZ

## Fáze 0 — Okamžitě (tým pracuje)
- [x] Návrh vizuální identity (paleta, typografie, logo, ikony zvířat) — DESIGN.md
- [ ] Pojmenování — 10+ kandidátů, výběr top 3 s odůvodněním (doporučení: Mazlík / Mazel)
- [x] Datový model: Pet, VetVisit, Deworming, Vaccination, Document, Reminder
- [x] Katalog zvířat: druhy, plemena, rasy (rozšířeno o další populární plemena)
- [x] SEO základy (SEO.md)
- [x] Profil mazlíčka: jméno, druh, plemeno, datum narození, pohlaví (localStorage CRUD hotovo)
- [x] Nahrávání dokumentů: základní metadata (faktury, doklady, pas, vyšetření) — bez OCR
- [x] Připomínky: odčervení, očkování, kontroly (storage + UI hotové)
- [x] Základní webová appka (mobil-first) — Next.js + interaktivní CRUD

## Fáze 1 — MVP
- [x] Kompletní CRUD pro mazlíčky (localStorage)
- [x] CRUD zdravotních záznamů (návštěvy, očkování, odčervení)
- [x] Timeline zdravotní historie
- [x] Základní dokumenty (metadata)
- [ ] Export/sdílení profilu (PDF) — issue otevřeno
- [x] QR emergency karta pro mazlíčka (reálné generování QR hotové)

## Fáze 2 — Mapa a komunita
- [x] Seznam non-stop veterin v ČR (seed data + UI filtr + mapové odkazy)
- [ ] Interaktivní mapa (Leaflet/Mapbox) — issue k vytvoření / potvrzení
- [ ] Aktuální pohotovostní čísla (reálná data)
- [ ] Affiliate: Granulebardog, SuperKotlik, Happypet
- [x] SEO obsah: průvodci (sample odčervení + očkování + váha + pohotovost + dokumenty + QR karta + **CEP** hotové)

## Fáze 3 — Integrace
- [ ] CEP (Centrální evidence psů) integrace
- [ ] EU zvířecí pas pravidla
- [ ] Notifikace (e-mail, push)
