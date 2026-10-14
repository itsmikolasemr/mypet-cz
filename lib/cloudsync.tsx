'use client';
// App-level cloud sync engine (runs on every screen): session, household, debounced push/pull, realtime, reconnect.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useStore } from './store';
import { deviceId, usePremium } from './premium';
import { auth, cloud, ensureHousehold, recentDoses, resetSyncState, subscribeHousehold, syncNow } from './cloud';
import { API_BASE } from './api';
import { notice, toast } from '@/components/feedback';

function useCloudImpl() {
  const { data, applyRemote } = useStore();
  const prem = usePremium();
  const [hhPremium, setHhPremium] = useState(() => { try { return localStorage.getItem('tlapka:hhPremium') === '1'; } catch { return false; } });
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const refreshPremium = useCallback(async (h: string) => { const r = await cloud().rpc('tl_household_premium', { hh: h }); setHhPremium(!!r.data); try { localStorage.setItem('tlapka:hhPremium', r.data ? '1' : '0'); } catch {} return !!r.data; }, []);
  const [s, setS] = useState<Session | null>(null);
  const [hh, setHh] = useState<string | null>(null);
  const [doses, setDoses] = useState<Awaited<ReturnType<typeof recentDoses>>>([]);
  const [busy, setBusy] = useState(false); const [last, setLast] = useState<string | null>(null);
  const dataRef = useRef(data); dataRef.current = data;
  const name = s?.user.user_metadata?.full_name || s?.user.email?.split('@')[0];

  useEffect(() => { auth.session().then(setS).catch(() => {}); const sub = auth.onChange(setS); setLast(localStorage.getItem('tlapka:sync:at')); return () => sub.unsubscribe(); }, []);
  useEffect(() => { if (!s) { setHh(null); return; } ensureHousehold(name).then(setHh).catch((e) => notice('Cloud není dostupný', String(e.message ?? e))); }, [s?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const running = useRef(false), again = useRef(false);
  const sync = useCallback(async (quiet = false): Promise<void> => {
    if (!hh) return;
    if (running.current) { again.current = true; return; }
    running.current = true; setBusy(true);
    try { const r = await syncNow(hh, dataRef.current, applyRemote, name, { files: prem.isPremium || hhPremium, push: !deviceBlocked }); setLast(r.at); recentDoses(hh).then(setDoses).catch(() => {}); if (!quiet) toast(`Synchronizováno · ↑${r.pushed} ↓${r.pulled}${r.pendingFiles ? (prem.isPremium || hhPremium ? ` · ${r.pendingFiles} souborů čeká` : ' · soubory jen v Premium') : ''}`); }
    catch (e) { if (!quiet) notice('Synchronizace selhala', 'Data zůstávají v telefonu, zkusíme to znovu.'); console.warn('sync', e); }
    finally { running.current = false; setBusy(false); if (again.current) { again.current = false; setTimeout(() => sync(true), 500); } }
  }, [hh, applyRemote, name, prem.isPremium, hhPremium, deviceBlocked]);
  // auto: on sign-in, on local change (debounced), on remote change (realtime), on reconnect
  useEffect(() => { if (hh && ready) sync(true); }, [hh, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hh) return; const t = setTimeout(() => sync(true), 3000); return () => clearTimeout(t); }, [data, hh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hh) return; const off = subscribeHousehold(hh, () => sync(true)); const on = () => sync(true); addEventListener('online', on); return () => { off(); removeEventListener('online', on); }; }, [hh, sync]);

  // gate: premium state + free one-device backup claim, before the first sync
  useEffect(() => {
    setReady(false); if (!hh) { setHhPremium(false); return; }
    (async () => {
      try {
        // test toggle active on this device but DB not yet aware (signed in later) -> sync flag via guarded server function
        if (prem.isPremium && prem.ent?.test && !(await refreshPremium(hh))) { await prem.resyncTest().catch(() => {}); await refreshPremium(hh); }
        else await refreshPremium(hh);
        const c = await cloud().rpc('tl_claim_backup_device', { p_device: deviceId() });
        setDeviceBlocked(c.data === 'other');
      } catch {} finally { setReady(true); }
    })();
  }, [hh, prem.isPremium]); // eslint-disable-line react-hooks/exhaustive-deps
  const claimDevice = async () => { const c = await cloud().rpc('tl_claim_backup_device', { p_device: deviceId(), p_force: true }); if (c.data === 'ok') { setDeviceBlocked(false); setTimeout(() => sync(), 100); } };
  const deleteAccount = async () => {
    const t = (await auth.session())?.access_token; if (!t) throw new Error('Nejsi přihlášen(a).');
    const r = await fetch(`${API_BASE}/api/account/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ confirm: 'SMAZAT' }) });
    if (!r.ok) throw new Error(r.status === 503 ? 'Mazání účtu ještě není na serveru nastavené.' : `Chyba ${r.status}`);
    const j = await r.json().catch(() => null); if (!j?.ok) throw new Error('Server nepotvrdil smazání. Nic se nesmazalo, zkus to později.');
    await auth.signOut().catch(() => {}); resetSyncState(); return j;
  };
  /** Premium features: own device entitlement OR shared Premium household (family plan). */
  const premium = prem.isPremium || hhPremium;
  return { premium, hhPremium, refreshPremium: () => (hh ? refreshPremium(hh) : Promise.resolve(false)), deviceBlocked, claimDevice, deleteAccount, session: s, hh, setHh, busy, setBusy, last, doses, sync, name };
}
type C = ReturnType<typeof useCloudImpl>;
const Ctx = createContext<C | null>(null);
export function CloudProvider({ children }: { children: React.ReactNode }) { const c = useCloudImpl(); return <Ctx.Provider value={c}>{children}</Ctx.Provider>; }
export function useCloud() { const c = useContext(Ctx); if (!c) throw new Error('CloudProvider missing'); return c; }
