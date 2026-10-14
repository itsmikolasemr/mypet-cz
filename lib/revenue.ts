// v1.2 doplňkové příjmy (mimo předplatné). Všechna ID partnerů jsou jen v env – nikdy je nevymýšlet ani nehardcodovat.
// Přehled, zdroje a stav: docs/REVENUE.md. Ceny: docs/PRICING.md.
import type { FoodStock, Pet } from './types';
export type { FoodStock };

/* ───────── 1) Jednorázový nákup: PDF zdravotní karta 79 Kč (non-consumable) ───────── */
export const ONE_TIME = {
  pdfCard: { productId: 'tlapka_pdf_card_79', entitlement: 'pdf_card', price: 79 },
} as const;
const K_ONCE = 'tlapka:once';
export const ownedOnce = (): string[] => { try { return JSON.parse(localStorage.getItem(K_ONCE) || '[]'); } catch { return []; } };
export const markOwned = (ent: string) => { const s = new Set(ownedOnce()); s.add(ent); localStorage.setItem(K_ONCE, JSON.stringify([...s])); };
export const ownsPdfCard = () => ownedOnce().includes(ONE_TIME.pdfCard.entitlement);

/* ───────── 2) Affiliate krmivo – nabídka, když dochází krmivo ───────── */
/** Kolik dní zbývá do konce balení (zaokrouhleno dolů), null když chybí údaje. */
export function foodDaysLeft(f: FoodStock | undefined, now = new Date()): number | null {
  if (!f || !(f.bagKg > 0) || !(f.dailyG > 0) || !f.openedAt) return null;
  const total = Math.floor((f.bagKg * 1000) / f.dailyG);
  const used = Math.floor((now.getTime() - new Date(f.openedAt + 'T00:00:00').getTime()) / 864e5);
  return Math.max(0, total - Math.max(0, used));
}
export const FOOD_LOW_DAYS = 7;
const env = (v: string | undefined) => (v && v.trim() ? v.trim() : '');
/** Affiliate odkazy: base URL/ID partnerské sítě se doplní v env (Awin/Dognet/VIVnetworks/eHUB). Bez env se obchod nezobrazí. */
export const FOOD_SHOPS: { id: string; name: string; network: string; url: string }[] = [
  { id: 'zoohit', name: 'Zoohit', network: 'Awin / Dognet', url: env(process.env.NEXT_PUBLIC_AFF_ZOOHIT_URL) },
  { id: 'superzoo', name: 'SUPERZOO', network: 'VIVnetworks', url: env(process.env.NEXT_PUBLIC_AFF_SUPERZOO_URL) },
  { id: 'dobramiska', name: 'Dobrá miska', network: 'přímý program', url: env(process.env.NEXT_PUBLIC_AFF_DOBRAMISKA_URL) },
  { id: 'krmivobrit', name: 'Krmivo-Brit', network: 'eHUB', url: env(process.env.NEXT_PUBLIC_AFF_KRMIVOBRIT_URL) },
];
/** Vyhledávací odkaz: {q} v affiliate URL se nahradí názvem krmiva, jinak se URL použije beze změny. */
export const shopLink = (url: string, q: string) => (url.includes('{q}') ? url.replace('{q}', encodeURIComponent(q)) : url);
export const activeFoodShops = () => FOOD_SHOPS.filter((s) => /^https:\/\//.test(s.url));

/* ───────── 3) Placené výpisy veterin a salonů – DB příznak, zatím bez platební brány ───────── */
export type Listing = { osm_id: string; kind: 'vet' | 'groomer'; promoted_until: string | null };
/** Aktivní placené výpisy (veřejně čitelné, zapisuje jen service role). */
export async function promotedListings(): Promise<Map<string, Listing>> {
  try { const { cloud } = await import('./cloud'); const r = await cloud().from('tl_listings').select('osm_id, kind, promoted_until').gt('promoted_until', new Date().toISOString());
    return new Map(((r.data ?? []) as Listing[]).map((l) => [l.osm_id, l])); } catch { return new Map(); }
}
export const isPromoted = (l: Listing | undefined, now = new Date()) => !!l && !!l.promoted_until && new Date(l.promoted_until) > now;

/* ───────── 4) QR přívěsek 249 Kč – jen stránka objednávky (placeholder, bez expedice) ───────── */
export const QR_TAG = { price: 249, orderUrl: env(process.env.NEXT_PUBLIC_QR_TAG_ORDER_URL) };

/* ───────── 5) Sponzorovaný obsah – jen free verze, vypnuto do ~5 000 MAU ───────── */
export const SPONSORED_ON = process.env.NEXT_PUBLIC_FLAG_SPONSORED === '1';
/** Kampaň z env (JSON {brand,title,text,url}); bez ní se slot nevykreslí. */
export const SPONSORED_ITEM: { brand: string; title: string; text: string; url: string } | undefined = (() => { try { const j = JSON.parse(process.env.NEXT_PUBLIC_SPONSORED_JSON || 'null'); return j && /^https:\/\//.test(j.url) ? j : undefined; } catch { return undefined; } })();

/* ───────── 6) Pojištění – neutrální odkazy, vypnuto do kontroly právníkem (zák. 170/2018 Sb.) ───────── */
export const INSURANCE_ON = process.env.NEXT_PUBLIC_FLAG_INSURANCE === '1';
/** Abecedně, stejný vzhled, bez doporučení a srovnání. URL (affiliate i neaffiliate) jen z env. */
export const INSURERS: { id: string; name: string; url: string; affiliate: boolean }[] = [
  { id: 'colonnade', name: 'Colonnade (Nebudbyval.cz)', url: env(process.env.NEXT_PUBLIC_INS_COLONNADE_URL), affiliate: true },
  { id: 'cpp', name: 'ČPP – HAFAN', url: env(process.env.NEXT_PUBLIC_INS_CPP_URL), affiliate: false },
  { id: 'direct', name: 'Direct pojišťovna', url: env(process.env.NEXT_PUBLIC_INS_DIRECT_URL), affiliate: false },
  { id: 'generali', name: 'Generali Česká pojišťovna', url: env(process.env.NEXT_PUBLIC_INS_GENERALI_URL), affiliate: false },
  { id: 'petexpert', name: 'PetExpert (ČSOB Pojišťovna)', url: env(process.env.NEXT_PUBLIC_INS_PETEXPERT_URL), affiliate: true },
  { id: 'uniqa', name: 'UNIQA', url: env(process.env.NEXT_PUBLIC_INS_UNIQA_URL), affiliate: false },
].sort((a, b) => a.name.localeCompare(b.name, 'cs'));

export const petFood = (p: Pet) => p.food;
