# Tlapka – ceník v1.2 a konfigurace RevenueCat

| Tarif | Cena | Product ID (App Store i Google Play) | Poznámka |
|---|---|---|---|
| Měsíčně | 99 Kč/měs | `tlapka_premium_monthly_99` | Úvodní nabídka: 1. měsíc 49 Kč (App Store „Pay as you go“ intro offer, 1 období; Play: base plan `monthly` + offer `intro49`) |
| Ročně | 699 Kč/rok | `tlapka_premium_yearly_699` | 14 dní zdarma (free trial intro offer) |
| Rodina | 999 Kč/rok | `tlapka_family_yearly_999` | až 6 lidí v domácnosti (Family Sharing zapnout v App Store; limit vynucuje i DB trigger `tl_private.check_member_limit`) |
| Zakládající Tlapkař | 499 Kč/rok | `tlapka_founder_yearly_499` | Prodej jen 3 měsíce od spuštění (`NEXT_PUBLIC_STORE_LAUNCH=YYYY-MM-DD`), pak produkt v obchodech stáhnout z prodeje – stávající předplatitelé obnovují za 499 Kč, dokud nezruší. Vzácný odznak „Zakládající Tlapkař“ (Zlatá tečka). |

- Zkušební doba 14 dní zůstává (jen pro nové předplatitele, nekombinuje se s intro 49 Kč u stejného produktu).
- RevenueCat: entitlement `premium` připojit ke všem 4 produktům; offering `default` = packages `$rc_monthly`, `$rc_annual`, `family`, `founder` (founder skrýt po uplynutí okna – nebo samostatný offering `launch`).
- Webhook `/api/billing-revenuecat` mapuje product → plan (monthly/yearly/family/founder).
- Odznak „Zakládající Tlapkař“ uděluje server (webhook) – na klientovi ho získat nejde.
- Ceny včetně DPH; obchodní podmínky aktualizovány (components/Legal.tsx).
- Dar z Tlapky: 5 % příjmů z Premium věnuje firma útulku měsíce (tabulka `tl_shelter_of_month`); uživatelé nic neplatí, v aplikaci se nesbírá.

## Jednorázové nákupy (v1.2, non-consumable)
| Produkt | Cena | Product ID (App Store i Google Play) | Entitlement |
|---|---|---|---|
| PDF zdravotní karta (CZ/EN/DE, natrvalo) | 79 Kč | `tlapka_pdf_card_79` | `pdf_card` |

- RevenueCat: produkt typu **Non-consumable** (App Store) / **in-app product** (Play), entitlement `pdf_card` (samostatný, NE `premium`). Offering `pdf_card` s jedním package `pdf`.
- Appka: `lib/revenue.ts` (`ONE_TIME.pdfCard`), nákup `usePremium().buyOnce('pdfCard')`, nabídka v paywallu s důvodem `pdf` (`components/Revenue.tsx › PdfCardOffer`). PDF pas odemyká Premium (lokální nebo cloud) **nebo** `pdf_card`.
- DB: `tl_purchases` (migrace `20261014150000_tlapka_v12_revenue.sql`, zatím jen lokálně) – zapisuje jen webhook (service role), uživatel čte své nákupy. Webhook `/api/billing-revenuecat` je potřeba doplnit o `NON_RENEWING_PURCHASE` → insert do `tl_purchases`.
- Do zapnutí RevenueCat: v testovacím režimu se nákup zapíše jen lokálně, nic se neplatí; nativně `RevenueCatProvider.buyOnce` hlásí, že platby nejsou zapnuté.
