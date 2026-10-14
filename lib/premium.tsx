'use client';
// Freemium: entitlement state + purchase-provider abstraction (Mock now, RevenueCat later).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from './api';
import { markOwned, ONE_TIME, ownedOnce } from './revenue';

export type PlanId = 'monthly' | 'yearly' | 'family' | 'founder' | 'trial';
/** v1.2 ceník (kolo 3): 99 Kč/měs (1. měsíc 49 Kč), 699 Kč/rok, Rodina 999 Kč/rok až 6 lidí. 14 dní zdarma zůstává. */
export const PRICES = { monthly: 99, monthlyIntro: 49, yearly: 699, family: 999, founder: 499, familyMembers: 6 } as const;
/** "Zakládající Tlapkař": first 3 months after the store launch – yearly for 499 Kč, locked while the subscription runs + rare badge.
 *  NEXT_PUBLIC_STORE_LAUNCH (YYYY-MM-DD) sets the window; before launch / when unset the offer is shown (pre-launch). */
export const STORE_LAUNCH = process.env.NEXT_PUBLIC_STORE_LAUNCH || '';
export const founderOpen = (now = new Date()) => { if (!STORE_LAUNCH) return true; const end = new Date(STORE_LAUNCH); end.setMonth(end.getMonth() + 3); return now < end; };
export const PLANS: { id: Exclude<PlanId, 'trial'>; name: string; price: string; per: string; note?: string; best?: boolean; badge?: string }[] = [
  { id: 'founder', name: 'Zakládající Tlapkař', price: '499 Kč', per: 'za rok', note: 'Cena zamčená navždy, dokud předplatné běží · jen 3 měsíce od spuštění · vzácný odznak', best: true, badge: 'jen teď' },
  { id: 'yearly', name: 'Ročně', price: '699 Kč', per: 'za rok', note: 'méně než 59 Kč měsíčně · ušetříš 41 %', best: true },
  { id: 'monthly', name: 'Měsíčně', price: '99 Kč', per: 'za měsíc', note: 'první měsíc za 49 Kč' },
  { id: 'family', name: 'Rodina', price: '999 Kč', per: 'za rok', note: 'Premium až pro 6 lidí v domácnosti · neomezeně mazlíčků' },
];
export const plansNow = (now = new Date()) => (founderOpen(now) ? PLANS.map((p) => (p.id === 'yearly' ? { ...p, best: false } : p)) : PLANS.filter((p) => p.id !== 'founder'));
export const FREE = { pets: 3, aivet: 3 };
/** RevenueCat / store product ids (see docs/PRICING.md). monthly carries the 49 Kč first-month introductory offer in both stores. */
export const PRODUCT_IDS: Record<Exclude<PlanId, 'trial'>, string> = { monthly: 'tlapka_premium_monthly_99', yearly: 'tlapka_premium_yearly_699', family: 'tlapka_family_yearly_999', founder: 'tlapka_founder_yearly_499' };
export const ENTITLEMENT_ID = 'premium';

export type Entitlement = { plan: PlanId; exp: number; token: string; test: boolean; source: string };
export interface PurchaseProvider {
  name: string;
  available(): Promise<boolean>;
  purchase(plan: PlanId, deviceId: string): Promise<Entitlement>;
  restore(deviceId: string): Promise<Entitlement | null>;
  /** non-consumable (např. PDF karta 79 Kč) – vrací entitlement id */
  buyOnce(productId: string): Promise<string>;
}

/** TEST ONLY – grants a signed Premium token from /api/entitlement without any payment. */
/** Supabase session header (if signed in) so the test toggle can also set the DB premium flag for this user. */
export async function authHeader(): Promise<Record<string, string>> {
  try { const { auth } = await import('./cloud'); const s = await auth.session(); return s ? { Authorization: `Bearer ${s.access_token}` } : {}; } catch { return {}; }
}
export const MockProvider: PurchaseProvider = {
  name: 'test',
  available: async () => { try { const r = await fetch(`${API_BASE}/api/entitlement`); return !!(await r.json()).devMode; } catch { return false; } },
  async purchase(plan, deviceId) {
    const r = await fetch(`${API_BASE}/api/entitlement`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeader()) }, body: JSON.stringify({ deviceId, plan, test: true }) });
    const j = await r.json();
    if (!r.ok || !j.token) throw new Error(j.error === 'test_mode_off' ? 'Testovací režim je vypnutý.' : 'Aktivace selhala.');
    return { plan, exp: j.exp, token: j.token, test: true, source: 'test' };
  },
  restore: async () => null,
  /** TEST ONLY – jednorázový nákup se jen zapíše lokálně, nic se neplatí */
  async buyOnce(productId) { const k = Object.values(ONE_TIME).find((x) => x.productId === productId); if (!k) throw new Error('Neznámý produkt.'); return k.entitlement; },
};

/** Ready for @revenuecat/purchases-capacitor: install the plugin, set NEXT_PUBLIC_RC_KEY, map PRODUCT_IDS. */
export const RevenueCatProvider: PurchaseProvider = {
  name: 'revenuecat',
  available: async () => Capacitor.isNativePlatform() && !!process.env.NEXT_PUBLIC_RC_KEY && Capacitor.isPluginAvailable('Purchases'),
  async purchase() { throw new Error('Platby přes App Store / Google Play zatím nejsou zapnuté.'); },
  async restore() { return null; },
  async buyOnce() { throw new Error('Platby přes App Store / Google Play zatím nejsou zapnuté.'); },
};

const K_DEV = 'tlapka:device', K_ENT = 'tlapka:ent', K_TRIAL = 'tlapka:trialLeft';
export function deviceId() {
  let d = localStorage.getItem(K_DEV);
  if (!d) { d = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem(K_DEV, d); }
  return d;
}

function usePremiumImpl() {
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [trialLeft, setTrialLeftS] = useState<number>(FREE.aivet);
  const [dev, setDev] = useState('');
  const [paywall, setPaywall] = useState<null | string>(null);
  useEffect(() => {
    setDev(deviceId());
    try { const e = JSON.parse(localStorage.getItem(K_ENT) || 'null'); if (e && e.exp > Date.now()) setEnt(e); } catch {}
    const t = localStorage.getItem(K_TRIAL); if (t != null) setTrialLeftS(Number(t));
  }, []);
  useEffect(() => { const c = () => setPaywall(null); addEventListener('hashchange', c); addEventListener('popstate', c); return () => { removeEventListener('hashchange', c); removeEventListener('popstate', c); }; }, []);
  const save = (e: Entitlement | null) => { setEnt(e); if (e) localStorage.setItem(K_ENT, JSON.stringify(e)); else localStorage.removeItem(K_ENT); };
  const provider = useCallback(async () => ((await RevenueCatProvider.available()) ? RevenueCatProvider : MockProvider), []);
  const isPremium = !!ent && ent.exp > Date.now();
  const [once, setOnce] = useState<string[]>([]);
  useEffect(() => setOnce(ownedOnce()), []);
  return {
    isPremium, ent, deviceId: dev, trialLeft, paywall,
    openPaywall: (reason = 'obecne') => setPaywall(reason), closePaywall: () => setPaywall(null),
    setTrialLeft: (n: number) => { setTrialLeftS(n); localStorage.setItem(K_TRIAL, String(n)); },
    restore: async () => { const p = await provider(); const e = await p.restore(deviceId()); if (e) save(e); return e; },
    purchase: async (plan: PlanId) => { const p = await provider(); const e = await p.purchase(plan, deviceId()); save(e); return e; },
    /** re-issue the test entitlement with the Supabase session so the DB flag matches (test mode only) */
    resyncTest: async () => { if (!ent?.test) return; const e = await MockProvider.purchase(ent.plan, deviceId()); save(e); },
    deactivate: () => { save(null); authHeader().then((h) => { if (h.Authorization) return fetch(`${API_BASE}/api/entitlement`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify({ deviceId: deviceId(), deactivate: true }) }); }).catch(() => {}); },
    headers: (): Record<string, string> => ({ 'X-Tlapka-Device': dev || deviceId(), ...(isPremium && ent ? { 'X-Tlapka-Entitlement': ent.token } : {}) }),
    canAddPet: (count: number) => isPremium || count < FREE.pets,
    /** jednorázové nákupy (non-consumable) */
    owns: (ent: string) => once.includes(ent),
    buyOnce: async (k: keyof typeof ONE_TIME) => { const p = await provider(); const ent = await p.buyOnce(ONE_TIME[k].productId); markOwned(ent); setOnce(ownedOnce()); return ent; },
  };
}
type P = ReturnType<typeof usePremiumImpl>;
const Ctx = createContext<P | null>(null);
export function PremiumProvider({ children }: { children: React.ReactNode }) { return <Ctx.Provider value={usePremiumImpl()}>{children}</Ctx.Provider>; }
export function usePremium() { const c = useContext(Ctx); if (!c) throw new Error('PremiumProvider missing'); return c; }
