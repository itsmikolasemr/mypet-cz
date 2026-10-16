# Tlapka. — Status

Poslední aktualizace: 16. 10. 2026 (tým MyPet CZ / Tlapka.)

## Verdikt: HOTOVO K TESTOVÁNÍ (v1.2)
Funkčně i vizuálně je v1.2 hotová pro vnitřní testování a testovací distribuci. **Není hotová k veřejnému vydání** – viz „Blokováno“. Nic není veřejně nasazeno.

## Verze
- **v1.1** – vydáno, tag `v1.1.0`, větev `v1.1` (záloha na dvou místech).
- **v1.2** – hotová ve větvi `v1.2` (feature list: `docs/RELEASE-1.2.md`, `docs/GROWTH.md`, `docs/REVENUE.md`, `docs/PRICING.md`). `main` obsahuje starší MVP scaffold (jiná historie) – viz poznámka níže.

## Aktuální rozhodnutí
- Značka **Tlapka.** (Polštářek var. 3, baby blue `#7FB3E8`, grafit `#3A3D43`, světle šedá, kulatá modrá tečka), font **Inter**, bez oranžové/srdíček/emoji, motiv Sklo.
- Ceny: 99 Kč/měs (1. měsíc 49 Kč), 699 Kč/rok, Rodina 999 Kč/rok, Zakládající Tlapkař 499 Kč/rok napořád (prodej prvních 3 měsíce), 14 dní zdarma. PDF karta 79 Kč, QR přívěsek 249 Kč.
- Komunita Tlapkaři bez sbírek; **Dar z Tlapky** 5 % příjmů z Premium; 12 ověřených útulků.
- Firma ABEGRIN s.r.o. (IČO 29262585). Kontakt dočasně `emr@itsmedesign.cz`. Apple Wallet odložen.
- Hosting: Cloudflare registrace byla odmítnuta (ochrana proti robotům) → pro testování dočasný tunel (`cloudflared`); Netlify nasazení možné od **23. 10.** Supabase `owveqkchmcutoqlsjlyb` – migrace v1.1 a v1.2 nasazeny.

## Změny 16. 10.
- Report 8 (nezávislý audit): bez nálezů; UX opravy B1–B4 hotové (`e2fbfda`), viz QA.md.
- Testovací Premium: příznak `NEXT_PUBLIC_TEST_PREMIUM` (lokální entitlement bez AI), výchozí vypnuto (`d01e27e`).
- Sjednoceno tykání v průvodcích `content/`.
- Stav GitHubu: PR #1 otevřený, issue #2–#10 otevřená (nic nevyřešeno).

## Hotovo
Párový režim, odznaky (31), Story/Wrapped, avatar, nálepky, Tlapkaři (kamarádi QR, feed, výzvy, pozvánky/promo), útulky, check-in ve výběhu, cestovní pas PDF CS/EN/DE, checklist, EN lokalizace (1 262 klíčů), 3 motivy, Tlapka Den widget (návrh). Příjmy: PDF karta, affiliate krmivo při docházející zásobě, štítek Propagováno, QR přívěsek (placeholder), sponzorovaný slot a pojištění (vypnuté). QA 5–7 viz `QA.md`. Mockupy 34 obrazovek × 3 motivy + EN (mimo repo).
**Dnes (docs run):** BRAND/DESIGN/SEO/QA/STATUS/ROADMAP, `data/schema.json` (tl_ tabulky), šablony e-mailů (uvítací, doporučení, konec zkoušky, Zakládající nabídka, affiliate), 2 nové SEO průvodci.

## Blokováno / čeká na majitele
- Právník: VOP, ochrana údajů, texty pojištění (zák. 170/2018 Sb.).
- Affiliate ID/odkazy (Zoohit/Awin, SUPERZOO, Dobrá miska, Krmivo-Brit) a URL objednávky QR přívěsku.
- RevenueCat produkty a entitlementy (`premium`, `pdf_card`) + webhook.
- `SUPABASE_SERVICE_ROLE_KEY` (smazání účtu, promo/odměny → AI).
- Test na reálných zařízeních (WebKit/iPhone, Xiaomi/Samsung).
- Hosting: Cloudflare účet nevznikl; Netlify až 23. 10.
- Apple/Google účty a podklady pro obchody (`docs/STORE-READINESS.md`), nativní widgety.

## Poznámka k Gitu
`main` a `v1.2` mají rozdílnou historii (společný předek `c5bf133`). `main` se tímto během **nepřepisuje**; práce je ve větvích `v1.2` a `docs/tym-2026-10-15` (PR do `v1.2`/`main` ke schválení). Sloučení do `main` vyžaduje rozhodnutí majitele.

## Další kroky
1. Právní kontrola + doplnění kontaktů v `components/Legal.tsx`.
2. RevenueCat + sandbox nákupy, test na zařízeních.
3. Service role key, serverová kontrola Premium pro AI.
4. 23. 10.: Netlify deploy (jen po schválení), přidat URL do Supabase Auth redirectů.
5. Store metadata, screenshoty, TestFlight / Play interní testování.
