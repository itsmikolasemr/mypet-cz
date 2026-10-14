# Tlapka – doplňkové příjmy mimo předplatné (v1.2)

Schváleno přes finanční plán (`/workspace/tlapka-finance`, list *Doplňkové příjmy*). Pořadí implementace = priorita. **Žádná partnerská ID nejsou v kódu** – vše přes env; bez env se prvek nezobrazí.

| # | Prvek | Kde v appce | Stav / přepínač |
|---|---|---|---|
| 1 | PDF zdravotní karta 79 Kč (jednorázově) | paywall s důvodem „pdf“ (Mazlíček › Sdílet › Zdravotní pas) | hotovo, viz PRICING.md |
| 2 | Affiliate krmivo (Zoohit přes Awin/Dognet, SUPERZOO přes VIVnetworks, Dobrá miska, Krmivo-Brit přes eHUB) | Mazlíček › Péče › Zásoba krmiva – odkazy jen když krmivo vystačí ≤ 7 dní | env `NEXT_PUBLIC_AFF_ZOOHIT_URL`, `NEXT_PUBLIC_AFF_SUPERZOO_URL`, `NEXT_PUBLIC_AFF_DOBRAMISKA_URL`, `NEXT_PUBLIC_AFF_KRMIVOBRIT_URL` (https, volitelně `{q}` = název krmiva). Štítek „affiliate odkaz“, `rel="sponsored"` |
| 3 | Placené výpisy veterin / salonů | Mapa – štítek „Propagováno“ u výpisu s aktivním `promoted_until` | tabulka `tl_listings` (osm_id `node/123`), zapisuje jen admin/service role, platby zatím ne. Pořadí výsledků se NEMĚNÍ (pořád podle vzdálenosti) |
| 4 | QR přívěsek 249 Kč | Mazlíček › Sdílet › QR přívěsek | jen placeholder objednávky; `NEXT_PUBLIC_QR_TAG_ORDER_URL` (bez něj tlačítko „Brzy“). Bez expedice |
| 5 | Sponzorovaný obsah | Mazlíčci (pod house promo), jen free verze, štítek „Reklama“ | `NEXT_PUBLIC_FLAG_SPONSORED=1` + `NEXT_PUBLIC_SPONSORED_JSON={"brand","title","text","url"}`; **vypnuto do ~5 000 MAU** |
| 6 | Pojištění – neutrální odkazy | Mazlíček › Profil (pod odznaky) | `NEXT_PUBLIC_FLAG_INSURANCE=1` + `NEXT_PUBLIC_INS_{COLONNADE,CPP,DIRECT,GENERALI,PETEXPERT,UNIQA}_URL`; **vypnuto** |

## Pojištění – pravidla a právní kontrola
- Abecedně (Colonnade/Nebudbyval, ČPP HAFAN, Direct, Generali Česká, PetExpert/ČSOB, UNIQA), stejný vzhled, žádné doporučení, srovnání ani hodnocení. Affiliate odkazy (PetExpert, Nebudbyval) mají štítek „affiliate“.
- **Před zapnutím musí text v appce zkontrolovat právník** – doporučování konkrétního pojištění může podle **zákona č. 170/2018 Sb., o distribuci pojištění a zajištění** vyžadovat registraci u ČNB (vázaný zástupce / doplňkový pojišťovací zprostředkovatel). Do té doby `NEXT_PUBLIC_FLAG_INSURANCE` nenastavovat.

## Brand
Inter, baby blue #7FB3E8, štítky šedé (#3A3D43 / #ECEFF3) – žádná oranžová, emoji ani srdíčka. Štítky „affiliate odkaz“, „Propagováno“, „Reklama“ jsou vždy viditelné.
