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
