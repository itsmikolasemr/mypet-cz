# ALERT — MyPet CZ

**Datum a čas:** 2026-10-18 10:10 CEST

## Co je hotové

- MVP: profily mazlíčků (plný CRUD s localStorage), zdravotní záznamy (návštěvy, odčervení, očkování) + timeline, připomínky (přidávání a označení hotovo), základní dokumenty (metadata: typ, název, poznámky — bez reálného souboru a OCR)
- UI komponenty: PetCard, ReminderCard, DocumentCard, HealthTimeline, PetForm, ReminderForm, HealthForm, DocumentForm, EmergencyCard, EmergencyVets (filtr podle města, call tlačítka)
- Seznam non-stop veterinářů + emergency karta s **reálným generováním QR kódu** (qrcode.react)
- Next.js scaffold (app/, package.json, Tailwind, tsconfig), seed data (zvířata, veterináři), datové schéma, podpůrná dokumentace (BRIEF, ROADMAP, DESIGN, SEO, QA atd.), sample SEO průvodce (včetně QR karty), e-mail šablony
- Vizuální identita a základní funkčnost připraveny k lokálnímu testování (`npm install && npm run dev`)

Projekt je ve fázi **funkční, ale ne hotový** — připraven k lokálnímu testování. Chybí reálná interaktivní mapa (Leaflet/Mapbox), PDF export profilu, OCR dokumentů, affiliate ověření, veřejné nasazení a další.

---
*Automaticky aktualizováno dohledovým botem.*