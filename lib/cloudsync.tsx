'use client';
// App-level cloud sync engine (runs on every screen): session, household, debounced push/pull, realtime, reconnect.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useStore } from './store';
import { usePremium } from './premium';
import { auth, cloud, ensureHousehold, recentDoses, subscribeHousehold, syncNow } from './cloud';
import { notice, toast } from '@/components/feedback';

function useCloudImpl() {
  const { data, applyRemote } = useStore();
  const prem = usePremium();
  const [hhPremium, setHhPremium] = useState(false);
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
    try { const r = await syncNow(hh, dataRef.current, applyRemote, name, { files: prem.isPremium || hhPremium }); setLast(r.at); recentDoses(hh).then(setDoses).catch(() => {}); if (!quiet) toast(`Synchronizováno · ↑${r.pushed} ↓${r.pulled}${r.pendingFiles ? (prem.isPremium || hhPremium ? ` · ${r.pendingFiles} souborů čeká` : ' · soubory jen v Premium') : ''}`); }
    catch (e) { if (!quiet) notice('Synchronizace selhala', 'Data zůstávají v telefonu, zkusíme to znovu.'); console.warn('sync', e); }
    finally { running.current = false; setBusy(false); if (again.current) { again.current = false; setTimeout(() => sync(true), 500); } }
  }, [hh, applyRemote, name, prem.isPremium, hhPremium]);
  // auto: on sign-in, on local change (debounced), on remote change (realtime), on reconnect
  useEffect(() => { if (hh) sync(true); }, [hh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hh) return; const t = setTimeout(() => sync(true), 3000); return () => clearTimeout(t); }, [data, hh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hh) return; const off = subscribeHousehold(hh, () => sync(true)); const on = () => sync(true); addEventListener('online', on); return () => { off(); removeEventListener('online', on); }; }, [hh, sync]);

  useEffect(() => { if (!hh) { setHhPremium(false); return; } Promise.resolve(cloud().rpc('tl_household_premium', { hh })).then((r) => setHhPremium(!!r.data)).catch(() => {}); }, [hh]);
  /** Premium features: own device entitlement OR shared Premium household (family plan). */
  const premium = prem.isPremium || hhPremium;
  return { premium, hhPremium, session: s, hh, setHh, busy, setBusy, last, doses, sync, name };
}
type C = ReturnType<typeof useCloudImpl>;
const Ctx = createContext<C | null>(null);
export function CloudProvider({ children }: { children: React.ReactNode }) { const c = useCloudImpl(); return <Ctx.Provider value={c}>{children}</Ctx.Provider>; }
export function useCloud() { const c = useContext(Ctx); if (!c) throw new Error('CloudProvider missing'); return c; }
