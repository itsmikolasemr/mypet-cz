'use client';
// v1.1 optional account: offline-first local mode stays default; sign-in enables cloud backup, household sharing, caretaker links.
import { useState } from 'react';
import { useCloud } from '@/lib/cloudsync';
import { useStore } from '@/lib/store';
import { auth, createInvite, createShareLink, ensureHousehold, joinHousehold, recentDoses, resetSyncState, subscribeHousehold, syncNow, type OAuth } from '@/lib/cloud';
import { Card, Sheet } from './ui';
import { toast, notice, ask } from './feedback';

const btn = 'press min-h-[48px] w-full rounded-2xl font-semibold flex items-center justify-center gap-2';
const OAUTH: { id: OAuth; l: string; cls: string }[] = [
  { id: 'apple', l: 'Pokračovat přes Apple', cls: 'bg-black text-white' },
  { id: 'google', l: 'Pokračovat přes Google', cls: 'bg-white text-[#1f1f1f] ring-1 ring-black/15' },
  { id: 'facebook', l: 'Pokračovat přes Facebook', cls: 'bg-[#1877F2] text-white' },
];

export function Account() {
  const { data } = useStore();
  const { session: s, hh, setHh, busy, setBusy, last, doses, sync, name } = useCloud();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [join, setJoin] = useState<string | null>(null);
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
      <button onClick={() => setJoin('')} className={`${btn} bg-ink/5 dark:bg-white/10`}>🔑 Mám kód pozvánky</button>
      <Sheet open={join !== null} onClose={() => setJoin(null)} title="Připojit se k domácnosti">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { setHh(await joinHousehold(join!, name)); setJoin(null); toast('Připojeno k domácnosti'); } catch { notice('Kód neplatí', 'Vypršel nebo už byl použit. Požádej o novou pozvánku.'); } }}>
          <label className="block"><span className="text-[14px] font-semibold">Kód pozvánky</span>
            <input autoFocus required name="invite" value={join ?? ''} onChange={(e) => setJoin(e.target.value)} autoCapitalize="off" autoComplete="off" spellCheck={false} className="mt-1 w-full min-h-[48px] rounded-2xl px-4 font-mono bg-ink/5 dark:bg-white/10" /></label>
          <button className={`${btn} text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A]`}>Připojit</button>
        </form>
      </Sheet>
      {!!doses.length && <div className="pt-1"><p className="text-[13px] font-semibold text-muted mb-1">Poslední podání</p>{doses.slice(0, 5).map((d, i) => <p key={i} className="text-[14px]" data-dose>{(data.reminders.find((r) => r.id === d.reminder_id)?.title ?? data.meds.find((m) => m.id === d.med_id)?.name ?? 'Dávka')} · {data.pets.find((p) => p.id === d.pet_id)?.name ?? ''} – podal(a) {d.given_by_name ?? '—'} {new Date(d.given_at).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>)}</div>}
      <button disabled={!hh || !data.pets.length} onClick={async () => { try { const url = await createShareLink(hh!, data.pets.map((p) => p.id), 7); await navigator.clipboard?.writeText(url).catch(() => {}); notice('Odkaz pro hlídače', `Platí 7 dní, bez registrace. Zkopírováno:\n${url}`); } catch (e) { notice('Nepovedlo se', String((e as Error).message)); } }} className={`${btn} bg-ink/5 dark:bg-white/10`}>🔗 Odkaz pro hlídače (7 dní)</button>
      <button onClick={async () => { if (await ask({ title: 'Odhlásit se?', text: 'Data zůstanou v tomto telefonu.', ok: 'Odhlásit' })) { await auth.signOut(); resetSyncState(); toast('Odhlášeno'); } }} className="press min-h-[44px] w-full text-[15px] font-semibold text-red-600">Odhlásit se</button>
    </Card>
  );
}
