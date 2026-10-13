'use client';
// Freemium: entitlement state + purchase-provider abstraction (Mock now, RevenueCat later).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { API_BASE } from './api';

export type PlanId = 'monthly' | 'yearly' | 'family' | 'trial';
export const PLANS: { id: Exclude<PlanId, 'trial'>; name: string; price: string; per: string; note?: string; best?: boolean }[] = [
  { id: 'yearly', name: 'Ročně', price: '499 Kč', per: 'za rok', note: '≈ 42 Kč měsíčně · ušetříš 47 %', best: true },
  { id: 'monthly', name: 'Měsíčně', price: '79 Kč', per: 'za měsíc' },
  { id: 'family', name: 'Rodina', price: '749 Kč', per: 'za rok', note: 'až 5 členů domácnosti' },
];
export const FREE = { pets: 3, aivet: 3 };
export const PRODUCT_IDS: Record<Exclude<PlanId, 'trial'>, string> = { monthly: 'tlapka_premium_monthly', yearly: 'tlapka_premium_yearly', family: 'tlapka_family_yearly' };
export const ENTITLEMENT_ID = 'premium';

export type Entitlement = { plan: PlanId; exp: number; token: string; test: boolean; source: string };
export interface PurchaseProvider {
  name: string;
  available(): Promise<boolean>;
  purchase(plan: PlanId, deviceId: string): Promise<Entitlement>;
  restore(deviceId: string): Promise<Entitlement | null>;
}

/** TEST ONLY – grants a signed Premium token from /api/entitlement without any payment. */
export const MockProvider: PurchaseProvider = {
  name: 'test',
  available: async () => { try { const r = await fetch(`${API_BASE}/api/entitlement`); return !!(await r.json()).devMode; } catch { return false; } },
  async purchase(plan, deviceId) {
    const r = await fetch(`${API_BASE}/api/entitlement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, plan, test: true }) });
    const j = await r.json();
    if (!r.ok || !j.token) throw new Error(j.error === 'test_mode_off' ? 'Testovací režim je vypnutý.' : 'Aktivace selhala.');
    return { plan, exp: j.exp, token: j.token, test: true, source: 'test' };
  },
  restore: async () => null,
};

/** Ready for @revenuecat/purchases-capacitor: install the plugin, set NEXT_PUBLIC_RC_KEY, map PRODUCT_IDS. */
export const RevenueCatProvider: PurchaseProvider = {
  name: 'revenuecat',
  available: async () => Capacitor.isNativePlatform() && !!process.env.NEXT_PUBLIC_RC_KEY && Capacitor.isPluginAvailable('Purchases'),
  async purchase() { throw new Error('Platby přes App Store / Google Play zatím nejsou zapnuté.'); },
  async restore() { return null; },
};

const K_DEV = 'tlapka:device', K_ENT = 'tlapka:ent', K_TRIAL = 'tlapka:trialLeft';
function deviceId() {
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
  return {
    isPremium, ent, deviceId: dev, trialLeft, paywall,
    openPaywall: (reason = 'obecne') => setPaywall(reason), closePaywall: () => setPaywall(null),
    setTrialLeft: (n: number) => { setTrialLeftS(n); localStorage.setItem(K_TRIAL, String(n)); },
    purchase: async (plan: PlanId) => { const p = await provider(); const e = await p.purchase(plan, deviceId()); save(e); return e; },
    deactivate: () => save(null),
    headers: (): Record<string, string> => ({ 'X-Tlapka-Device': dev || deviceId(), ...(isPremium && ent ? { 'X-Tlapka-Entitlement': ent.token } : {}) }),
    canAddPet: (count: number) => isPremium || count < FREE.pets,
  };
}
type P = ReturnType<typeof usePremiumImpl>;
const Ctx = createContext<P | null>(null);
export function PremiumProvider({ children }: { children: React.ReactNode }) { return <Ctx.Provider value={usePremiumImpl()}>{children}</Ctx.Provider>; }
export function usePremium() { const c = useContext(Ctx); if (!c) throw new Error('PremiumProvider missing'); return c; }
