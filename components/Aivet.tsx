'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { API_BASE } from '@/lib/api';
import { age, speciesOf } from '@/lib/utils';
import { SEVERITY } from './forms';
import { Card, Icon, PageHeader } from './ui';
import { PetChip } from './parts';

type Msg = { role: 'user' | 'assistant'; content: string; emergency?: boolean };
const ENDPOINT = `${API_BASE}/api/aivet`;
const RED_FLAGS = /(nedých|dusí|duš|bezvědom|křeč|záchvat|krvác|otráv|otrav|jed |požral|spolkl|snědl.*(čokol|hrozn|xylit|lék|jed)|nafouk|nadmut|nemůže močit|nemoč|úraz|srazil|auto|úpal|přehřát|ochrnu|nechodí|otok (hlavy|tlamy|krku)|zvrací krev|krev ve|modr(é|á) (dásně|jazyk)|kolaps)/i;
const SUGGEST = ['Pes zvrací od rána, co mám sledovat?', 'Kočka málo pije, je to problém?', 'Jak často odčervovat?', 'Co dát do lékárničky pro psa?'];

function render(text: string) {
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    const html = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const bullet = /^[-*•]\s+/.test(t);
    return <p key={i} className={bullet ? 'pl-4 relative before:content-["•"] before:absolute before:left-1' : ''} dangerouslySetInnerHTML={{ __html: bullet ? html.replace(/^[-*•]\s+/, '') : html }} />;
  });
}

export default function Aivet({ initialPet, openMap }: { initialPet?: string; openMap: () => void }) {
  const { data } = useStore();
  const [petId, setPetId] = useState(initialPet || data.pets[0]?.id || '');
  const [status, setStatus] = useState<'checking' | 'ready' | 'off' | 'unreachable'>('checking');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const pet = data.pets.find((p) => p.id === petId);

  useEffect(() => {
    fetch(ENDPOINT).then((r) => (r.ok ? r.json() : Promise.reject())).then((j: { configured: boolean }) => setStatus(j.configured ? 'ready' : 'off')).catch(() => setStatus('unreachable'));
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);
  useEffect(() => { setMsgs([]); setErr(''); }, [petId]);

  const profile = () => pet && {
    name: pet.name, species: speciesOf(pet.species).name, breed: pet.breed, sex: pet.sex, age: age(pet.birthDate), notes: pet.notes,
    weightKg: pet.weights[pet.weights.length - 1]?.kg,
    meds: data.meds.filter((m) => m.petId === pet.id && (!m.end || m.end >= new Date().toISOString().slice(0, 10))).map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(', ')),
    allergies: data.allergies.filter((a) => a.petId === pet.id).map((a) => `${a.allergen}${a.reaction ? ` (${a.reaction})` : ''}, závažnost ${SEVERITY.find((s) => s.id === a.severity)?.n}`),
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const local = RED_FLAGS.test(q);
    const next: Msg[] = [...msgs, { role: 'user', content: q, emergency: local }];
    setMsgs(next); setInput(''); setBusy(true); setErr('');
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), pet: profile() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error === 'rate_limited_client' ? `Dosáhl jsi limitu dotazů (${j.window === 'den' ? 'denní' : 'na 10 minut'}). Zkus to za ${Math.max(1, Math.round((j.retryAfter ?? 60) / 60))} min.` : j.error === 'rate_limited' ? 'AIVET je teď přetížený, zkus to za chvíli.' : j.error === 'not_configured' ? 'AIVET ještě není nastavený.' : 'Odpověď se nepodařilo získat.');
      setMsgs([...next, { role: 'assistant', content: j.reply, emergency: !!j.emergency }]);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Chyba spojení.'); }
    finally { setBusy(false); }
  };

  const emergency = msgs.some((m) => m.emergency);
  const allergies = pet ? data.allergies.filter((a) => a.petId === pet.id) : [];

  return (
    <div>
      <PageHeader title="AIVET" sub="Virtuální poradce" />
      {data.pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
          {data.pets.map((p) => <PetChip key={p.id} pet={p} active={petId === p.id} onClick={() => setPetId(p.id)} />)}
        </div>
      )}
      {emergency && (
        <div role="alert" className="mb-4 rounded-[24px] p-4 text-white bg-gradient-to-br from-red-500 to-red-700 shadow-[0_14px_30px_-12px_rgba(220,38,38,.7)] animate-pop">
          <p className="font-bold text-lg">🚨 Může jít o akutní stav</p>
          <p className="text-sm text-white/90 mt-1">Nečekej na odpověď z chatu. Kontaktuj co nejdřív veterinární pohotovost.</p>
          <button onClick={openMap} className="press mt-3 w-full rounded-2xl bg-white text-red-700 font-bold py-3">Najít nonstop veterinu</button>
        </div>
      )}
      {status === 'off' || status === 'unreachable' ? (
        <Card className="p-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-[26px] bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] text-4xl flex items-center justify-center shadow-float mb-4 animate-float">🩺</div>
          <h2 className="text-lg font-bold">AIVET se teprve chystá</h2>
          <p className="text-muted mt-1.5 text-[15px]">{status === 'off' ? 'Poradce zatím není zapnutý – brzy tu bude. Do té doby se při potížích obrať na svého veterináře.' : 'Poradce je teď nedostupný (offline nebo lokální verze). Zkus to později.'}</p>
          <button onClick={openMap} className="press mt-5 w-full rounded-2xl py-3 font-semibold bg-primary/10 text-primary">🗺️ Veteriny v okolí</button>
        </Card>
      ) : (
        <>
          {pet && (
            <Card className="p-3.5 mb-4 text-[13px] text-muted">
              Radím s ohledem na profil <b className="text-ink dark:text-white">{pet.name}</b> ({[speciesOf(pet.species).name, age(pet.birthDate), pet.weights.length ? `${pet.weights[pet.weights.length - 1].kg} kg` : ''].filter(Boolean).join(', ')})
              {allergies.length > 0 && <> · <span className="text-red-600 dark:text-red-400 font-semibold">alergie: {allergies.map((a) => a.allergen).join(', ')}</span></>}
            </Card>
          )}
          <div className="space-y-3 min-h-[30dvh]" aria-live="polite">
            {!msgs.length && (
              <div className="animate-fade">
                <p className="text-center text-muted text-sm mb-3">Popiš, co se děje. Odpovím, jak postupovat a jestli je potřeba k veterináři.</p>
                <div className="flex flex-wrap gap-2 justify-center">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="press rounded-full px-3.5 py-2 text-sm bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10">{s}</button>)}</div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-screen`}>
                <div className={`max-w-[85%] rounded-[22px] px-4 py-3 text-[15px] leading-relaxed space-y-0.5 ${m.role === 'user' ? 'bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] text-white rounded-br-md shadow-[0_8px_20px_-10px_rgba(232,85,58,.7)]' : 'bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10 rounded-bl-md'}`}>
                  {m.role === 'assistant' ? render(m.content) : m.content}
                </div>
              </div>
            ))}
            {busy && <div className="flex"><div className="rounded-[22px] rounded-bl-md bg-surface dark:bg-surface-d shadow-card px-4 py-3.5 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>}
            {err && <p className="text-center text-sm text-red-600 dark:text-red-400">{err}</p>}
            <div ref={end} className="scroll-mb-48" />
          </div>
          <p className="text-[11px] text-muted text-center mt-4">AIVET je AI a může se mýlit. Nenahrazuje vyšetření veterinářem.</p>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="fixed z-40 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[420px] flex items-end gap-2 p-1.5 rounded-[26px] bg-surface/80 dark:bg-[#2a201b]/80 backdrop-blur-2xl ring-1 ring-ink/[0.06] dark:ring-white/10 shadow-float dark:shadow-float-d"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 86px)' }}>
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={status === 'checking' ? 'Připojuji…' : 'Napiš dotaz…'} disabled={status !== 'ready'} aria-label="Dotaz pro AIVET"
              className="flex-1 resize-none bg-transparent px-3 py-2.5 outline-none max-h-32 text-base" />
            <button type="submit" aria-label="Odeslat" disabled={!input.trim() || busy || status !== 'ready'} className="press w-11 h-11 shrink-0 rounded-full text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] disabled:opacity-40 flex items-center justify-center"><Icon name="upload" className="w-5 h-5" /></button>
          </form>
          <div className="h-28" />
        </>
      )}
    </div>
  );
}
