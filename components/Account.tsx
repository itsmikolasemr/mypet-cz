'use client';
// v1.1 optional account: offline-first local mode stays default; sign-in enables cloud backup, household sharing, caretaker links.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useStore } from '@/lib/store';
import { auth, createInvite, createShareLink, ensureHousehold, joinHousehold, resetSyncState, subscribeHousehold, syncNow, type OAuth } from '@/lib/cloud';
import { Card } from './ui';
import { toast, notice, ask } from './feedback';

const btn = 'press min-h-[48px] w-full rounded-2xl font-semibold flex items-center justify-center gap-2';
const OAUTH: { id: OAuth; l: string; cls: string }[] = [
  { id: 'apple', l: 'Pokračovat přes Apple', cls: 'bg-black text-white' },
  { id: 'google', l: 'Pokračovat přes Google', cls: 'bg-white text-[#1f1f1f] ring-1 ring-black/15' },
  { id: 'facebook', l: 'Pokračovat přes Facebook', cls: 'bg-[#1877F2] text-white' },
];

export function Account() {
  const { data, applyRemote } = useStore();
  const [s, setS] = useState<Session | null>(null);
  const [hh, setHh] = useState<string | null>(null);
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [last, setLast] = useState<string | null>(null);
  const dataRef = useRef(data); dataRef.current = data;
  const name = s?.user.user_metadata?.full_name || s?.user.email?.split('@')[0];

  useEffect(() => { auth.session().then(setS).catch(() => {}); const sub = auth.onChange(setS); setLast(localStorage.getItem('tlapka:sync:at')); return () => sub.unsubscribe(); }, []);
  useEffect(() => { if (!s) { setHh(null); return; } ensureHousehold(name).then(setHh).catch((e) => notice('Cloud není dostupný', String(e.message ?? e))); }, [s?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useCallback(async (quiet = false) => {
    if (!hh) return; setBusy(true);
    try { const r = await syncNow(hh, dataRef.current, applyRemote, name); setLast(r.at); if (!quiet) toast(`Synchronizováno · ↑${r.pushed} ↓${r.pulled}`); }
    catch (e) { if (!quiet) notice('Synchronizace selhala', 'Data zůstávají v telefonu, zkusíme to znovu.'); console.warn(e); }
    finally { setBusy(false); }
  }, [hh, applyRemote, name]);
  // auto: on sign-in, on local change (debounced), on remote change (realtime), on reconnect
  useEffect(() => { if (hh) sync(true); }, [hh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hh) return; const t = setTimeout(() => sync(true), 3000); return () => clearTimeout(t); }, [data, hh]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!hh) return; const off = subscribeHousehold(hh, () => sync(true)); const on = () => sync(true); addEventListener('online', on); return () => { off(); removeEventListener('online', on); }; }, [hh, sync]);

  const run = async (f: () => Promise<{ error: { message: string } | null }>, ok?: string) => {
    setBusy(true); try { const r = await f(); if (r.error) notice('Nepovedlo se', r.error.message); else if (ok) notice(ok); } finally { setBusy(false); }
  };

  if (!s) return (
    <Card className="p-4 space-y-3">
      <p className="text-[15px]"><b>Účet je volitelný.</b> Tlapka funguje i bez něj, offline v telefonu. Přihlášením zapneš zálohu do cloudu (EU) a sdílení s rodinou.</p>
      {OAUTH.map((o) => <button key={o.id} disabled={busy} onClick={() => run(() => auth.oauth(o.id))} className={`${btn} ${o.cls}`}>{o.l}</button>)}
      <div className="flex items-center gap-3 text-[13px] text-muted"><span className="flex-1 h-px bg-current opacity-20" />nebo e-mail<span className="flex-1 h-px bg-current opacity-20" /></div>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (mode === 'magic') run(() => auth.magicLink(email), 'Poslali jsme ti odkaz pro přihlášení. Zkontroluj e-mail.'); else run(() => auth.signIn(email, pw)); }}>
        <label className="block"><span className="sr-only">E-mail</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tvuj@email.cz" className="w-full min-h-[48px] rounded-2xl px-4 bg-ink/5 dark:bg-white/10" /></label>
        {mode === 'password' && <label className="block"><span className="sr-only">Heslo</span><input type="password" required minLength={8} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Heslo (min. 8 znaků)" className="w-full min-h-[48px] rounded-2xl px-4 bg-ink/5 dark:bg-white/10" /></label>}
        <button disabled={busy} className={`${btn} text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A]`}>{mode === 'magic' ? 'Poslat přihlašovací odkaz' : 'Přihlásit se'}</button>
      </form>
      <div className="flex flex-wrap gap-x-4 text-[14px] font-semibold text-[#C2410C] dark:text-[#FFB48A]">
        <button className="min-h-[44px]" onClick={() => setMode(mode === 'magic' ? 'password' : 'magic')}>{mode === 'magic' ? 'Přihlásit heslem' : 'Raději odkazem e-mailem'}</button>
        {mode === 'password' && <button className="min-h-[44px]" disabled={busy} onClick={() => run(() => auth.signUp(email, pw), 'Účet vytvořen. Potvrď e-mail odkazem, který ti přišel.')}>Vytvořit účet</button>}
        {mode === 'password' && <button className="min-h-[44px]" disabled={busy || !email} onClick={() => run(() => auth.resetPassword(email), 'Poslali jsme odkaz pro obnovu hesla.')}>Zapomenuté heslo</button>}
      </div>
    </Card>
  );

  return (
    <Card className="p-4 space-y-3">
      <div><p className="font-semibold">{name}</p><p className="text-[13px] text-muted">{s.user.email} · {last ? `poslední synchronizace ${new Date(last).toLocaleString('cs-CZ')}` : 'zatím nesynchronizováno'}</p></div>
      <button disabled={busy || !hh} onClick={() => sync()} className={`${btn} bg-ink/5 dark:bg-white/10`}>{busy ? 'Synchronizuji…' : '☁️ Synchronizovat teď'}</button>
      <button disabled={!hh} onClick={async () => { try { const i = await createInvite(hh!); await navigator.clipboard?.writeText(i.code).catch(() => {}); notice('Pozvánka pro partnera', `Kód ${i.code} (zkopírováno) platí do ${new Date(i.expires_at).toLocaleDateString('cs-CZ')}. Partner ho zadá v Nastavení → Účet.`); } catch (e) { notice('Nepovedlo se', String((e as Error).message)); } }} className={`${btn} bg-ink/5 dark:bg-white/10`}>👨‍👩‍👧 Pozvat do domácnosti</button>
      <button onClick={async () => { const c = prompt('Kód pozvánky'); if (!c) return; try { setHh(await joinHousehold(c, name)); toast('Připojeno k domácnosti'); } catch { notice('Kód neplatí', 'Požádej o novou pozvánku.'); } }} className={`${btn} bg-ink/5 dark:bg-white/10`}>🔑 Mám kód pozvánky</button>
      <button disabled={!hh || !data.pets.length} onClick={async () => { try { const url = await createShareLink(hh!, data.pets.map((p) => p.id), 7); await navigator.clipboard?.writeText(url).catch(() => {}); notice('Odkaz pro hlídače', `Platí 7 dní, bez registrace. Zkopírováno:\n${url}`); } catch (e) { notice('Nepovedlo se', String((e as Error).message)); } }} className={`${btn} bg-ink/5 dark:bg-white/10`}>🔗 Odkaz pro hlídače (7 dní)</button>
      <button onClick={async () => { if (await ask({ title: 'Odhlásit se?', text: 'Data zůstanou v tomto telefonu.', ok: 'Odhlásit' })) { await auth.signOut(); resetSyncState(); toast('Odhlášeno'); } }} className="press min-h-[44px] w-full text-[15px] font-semibold text-red-600">Odhlásit se</button>
    </Card>
  );
}
