# SEO Tlapka. (CZ)

Appka je primárně nativní/PWA; SEO nese veřejný web `tlapka.cz` (zatím nenasazen) a průvodci v `content/`.

## Klíčová slova
**Jádro:** odčervení psa / kočky · očkování psa / kočky · zvířecí pas · evidence zdravotních záznamů mazlíčka · připomínka odčervení · aplikace pro majitele psa.
**Mapa:** non-stop veterinář Praha / Brno / Ostrava / Plzeň / Olomouc · veterinární pohotovost v noci · psí výběh Praha · pet-friendly kavárna.
**Cestování:** cestování se psem do zahraničí · pas pro psa EU · čipování psa povinnost · cestovní checklist pes.
**Péče:** váha psa podle plemene · kolik krmiva denně pes · zásoba granulí · alergie u psa · předávací karta pro hlídání psa · kam s mazlíčkem na dovolenou.
**Komunita:** útulky Brno / Praha adopce · adopce psa z útulku · Dar z Tlapky.
**Long-tail (blog):** „jak často odčervovat štěně“, „kdy poprvé očkovat kotě“, „co dělat když pes sní čokoládu“, „kolik váží štěně labradora“, „co zabalit na cestu se psem“, „CEP evidence psů 2026“.

## Meta šablony
**Title:** `{stránka} | Tlapka.` (≤ 60 znaků)
**Description:** „Zdravotní záznamy, připomínky a mapa veterin pro tvého mazlíčka. Odčervení, očkování, pas i cestování na jednom místě. Tlapka.“
OG 1200×630 grafit + baby blue tečka, favicon = tečka/Polštářek. `hreflang cs-CZ`, `en` pro EN verzi.

## Struktura webu
| URL | Obsah | Stav |
|---|---|---|
| `/pruvodce/odcerveni` | `content/pruvodce-odcerveni.md` | vzor hotový |
| `/pruvodce/ockovani` | `content/pruvodce-ockovani.md` | vzor hotový |
| `/pruvodce/pohotovost` | `content/pruvodce-pohotovost.md` | vzor hotový |
| `/pruvodce/vaha` | `content/pruvodce-vaha.md` | vzor hotový |
| `/pruvodce/cestovani-se-psem` | `content/pruvodce-cestovani.md` | vzor (nový) |
| `/pruvodce/krmivo` | `content/pruvodce-krmivo.md` | vzor (nový) |
| `/mapa-veterin`, `/utulky`, `/faq`, `/cep` | – | plánováno |

## Technické
Structured data: `FAQPage` u průvodců, `LocalBusiness`/`VeterinaryCare` pro mapu, `Organization` (ABEGRIN s.r.o.). Statický export, Core Web Vitals: LCP ~4,2 s (mobil, simulace) – před veřejným webem předrenderovat. Odkazy affiliate: `rel="sponsored"`. Zdravotní obsah vždy s větou „Nenahrazuje veterináře“ a revizí veterináře.

## Pravidla obsahu
Tykání, krátké věty, bez emoji, bez slibů léčby, žádné srovnání pojištění (zák. 170/2018 Sb.). Veškeré brandové zmínky „Tlapka.“, ne „MyPet CZ“.
