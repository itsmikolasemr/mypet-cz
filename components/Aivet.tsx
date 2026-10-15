'use client';
import { loc } from '@/lib/i18n';
import { getLang } from '@/lib/i18n';
import { Emo, GT } from './glyphs';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { API_BASE } from '@/lib/api';
import { age, speciesOf } from '@/lib/utils';
import { SEVERITY } from './forms';
import { Card, Icon, PageHeader } from './ui';
import { PetChip } from './parts';
import { usePremium, FREE } from '@/lib/premium';

type Msg = { role: 'user' | 'assistant'; content: string; emergency?: boolean };
const ENDPOINT = `${API_BASE}/api/aivet`;
const RED_FLAGS = /(nedých|dusí|duš|bezvědom|křeč|záchvat|krvác|otráv|otrav|jed |požral|spolkl|snědl.*(čokol|hrozn|xylit|lék|jed)|nafouk|nadmut|nemůže močit|nemoč|úraz|srazil|auto|úpal|přehřát|ochrnu|nechodí|otok (hlavy|tlamy|krku)|zvrací krev|krev ve|modr(é|á) (dásně|jazyk)|kolaps)/i;
const EMERG_REPLY = '**Může jít o akutní stav – nečekej.**\n- Hned zavolej nebo jeď na nejbližší veterinární pohotovost (tlačítko níže, mapa je vždy zdarma).\n- Pokud zvíře nedýchá, je v bezvědomí, má křeče nebo silně krvácí, jednej okamžitě.\n- Při podezření na otravu vezmi s sebou obal od látky, kterou snědlo.\n- Nevyvolávej zvracení a nedávej žádné léky bez pokynu veterináře.\nTato rada nenahrazuje vyšetření veterinářem.';
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
  const prem = usePremium();
  const [petId, setPetId] = useState(initialPet || data.pets[0]?.id || '');
  const [status, setStatus] = useState<'checking' | 'ready' | 'off' | 'unreachable'>('checking');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [bannerOpen, setBannerOpen] = useState(true);
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
    setMsgs(next); setInput(''); setErr('');
    if (local) { // emergency: instant prepared guidance, no network, never counted
      setMsgs([...next, { role: 'assistant', content: EMERG_REPLY, emergency: true }]); setBannerOpen(true);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', ...prem.headers() }, body: JSON.stringify({ lang: getLang(), messages: next.map(({ role, content }) => ({ role, content })), pet: profile() }) });
      const j = await r.json().catch(() => ({}));
      if (typeof j.trialLeft === 'number') prem.setTrialLeft(j.trialLeft);
      if (r.status === 402) { prem.setTrialLeft(0); throw new Error(`Zkušební dotazy jsou vyčerpané. Tvoje otázka zůstala uložená – s Premium (14 dní zdarma, tlačítko nahoře) ti Aivet odpoví hned. Když jde o akutní stav, otevři Mapu → 🚨 Nonstop, ta je vždy zdarma.`); }
      if (!r.ok) throw new Error(j.error === 'rate_limited_client' ? `Dosáhl jsi limitu dotazů (${j.window === 'den' ? 'denní' : 'na 10 minut'}). Zkus to za ${Math.max(1, Math.round((j.retryAfter ?? 60) / 60))} min.` : j.error === 'rate_limited' ? 'Aivet je teď přetížený, zkus to za chvíli.' : j.error === 'not_configured' ? 'Aivet ještě není nastavený.' : 'Odpověď se nepodařilo získat.');
      setMsgs([...next, { role: 'assistant', content: j.reply, emergency: !!j.emergency || local }]);
    } catch (e) { setMsgs(msgs); setInput(q); setErr(e instanceof Error ? e.message : 'Chyba spojení.'); }
    finally { setBusy(false); }
  };

  const emergency = msgs.some((m) => m.emergency);
  const allergies = pet ? data.allergies.filter((a) => a.petId === pet.id) : [];

  return (
    <div>
      <PageHeader title="Aivet" sub="Aivet ti radí" />
      {!prem.isPremium && (
        <button onClick={() => prem.openPaywall('aivet')} className="press w-full mb-4 flex items-center justify-between gap-2 rounded-full px-4 min-h-[48px] text-sm bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10">
          <span>{prem.trialLeft > 0 ? <>{prem.trialLeft === 1 ? 'Zbývá' : 'Zbývají'} <b>{prem.trialLeft}</b> ze {FREE.aivet} zkušebních dotazů</> : 'Zkušební dotazy vyčerpány'}</span>
          <span className="font-semibold text-primary">Premium ›</span>
        </button>
      )}
      {data.pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
          {data.pets.map((p) => <PetChip key={p.id} pet={p} active={petId === p.id} onClick={() => setPetId(p.id)} />)}
        </div>
      )}
      {/* sticky under the header so auto-scroll never hides it */}
      {emergency && (bannerOpen ? (
        <div role="alert" style={{ top: 'calc(env(safe-area-inset-top) + 72px)' }} className="sticky z-20 mb-4 rounded-[24px] p-4 text-white bg-gradient-to-br from-red-500 to-red-700 shadow-[0_14px_30px_-12px_rgba(220,38,38,.7)] animate-pop">
          <div className="flex items-start gap-2"><p className="font-bold text-lg flex-1"><GT t="🚨 Může jít o akutní stav" /></p>
            <button onClick={() => setBannerOpen(false)} aria-label="Sbalit varování" className="press -m-2 w-11 h-11 rounded-full flex items-center justify-center text-white/90 text-xl">⌃</button></div>
          <p className="text-sm text-white/90 mt-1">Nečekej na odpověď z chatu. Kontaktuj co nejdřív veterinární pohotovost.</p>
          <button onClick={openMap} className="press mt-3 w-full min-h-[44px] rounded-2xl bg-white text-red-700 font-bold py-3">Najít nonstop veterinu</button>
        </div>
      ) : (
        <div style={{ top: 'calc(env(safe-area-inset-top) + 72px)' }} className="sticky z-20 mb-4 flex justify-center">
          <span className="inline-flex rounded-full bg-red-600 text-white font-bold shadow-[0_8px_20px_-8px_rgba(220,38,38,.8)] overflow-hidden">
            <button onClick={openMap} className="press min-h-[44px] pl-4 pr-3"><GT t="🚨 Pohotovost" /></button>
            <button onClick={() => setBannerOpen(true)} aria-label="Rozbalit varování" className="press min-h-[44px] w-11 border-l border-white/30">⌄</button>
          </span>
        </div>
      ))}
      {status === 'off' ? (
        <Card className="p-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-[26px] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-4xl flex items-center justify-center shadow-float mb-4 animate-float text-[#0F2540]"><Emo e="🩺" className="w-10 h-10" /></div>
          <h2 className="text-lg font-bold">Aivet se teprve chystá</h2>
          <p className="text-muted mt-1.5 text-[14px]">{status === 'off' ? 'Poradce zatím není zapnutý – brzy tu bude. Do té doby se při potížích obrať na svého veterináře.' : 'Poradce je teď nedostupný (offline nebo lokální verze). Zkus to později.'}</p>
          <button onClick={openMap} className="press mt-5 w-full rounded-2xl py-3 font-semibold bg-primary/10 text-primary"><GT t="🗺️ Veteriny v okolí" /></button>
        </Card>
      ) : (
        <>
          {pet && (
            <Card className="p-3.5 mb-4 text-[13px] text-muted">
              Radím podle profilu – <b className="text-ink dark:text-white">{pet.name}</b> ({[speciesOf(pet.species).name, age(pet.birthDate), pet.weights.length ? `${pet.weights[pet.weights.length - 1].kg.toLocaleString(loc())} kg` : ''].filter(Boolean).join(', ')})
              {allergies.length > 0 && <> · <span className="text-red-600 dark:text-red-400 font-semibold">alergie: {allergies.map((a) => a.allergen).join(', ')}</span></>}
            </Card>
          )}
          {status === 'unreachable' && <p className="text-[13px] text-muted text-center mb-3">Aivet je teď offline. Nouzové rady (otrava, úraz, dušení…) ti ale ukážu i bez připojení.</p>}
          <div className="space-y-3 min-h-[30dvh]" aria-live="polite">
            {!msgs.length && (
              <div className="animate-fade">
                <p className="text-center text-muted text-sm mb-3">Popiš, co se děje. Odpovím, jak postupovat a jestli je potřeba k veterináři.</p>
                <div className="flex flex-wrap gap-2 justify-center">{SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="press rounded-full px-3.5 min-h-[44px] text-sm bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10">{s}</button>)}</div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-screen`}>
                <div className={`max-w-[85%] rounded-[22px] px-4 py-3 text-[14px] leading-relaxed space-y-0.5 ${m.role === 'user' ? 'bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-[#0F2540] rounded-br-md shadow-[0_8px_20px_-10px_rgba(127,179,232,.7)]' : 'bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10 rounded-bl-md'}`}>
                  {m.role === 'assistant' ? render(m.content) : m.content}
                  {m.role === 'assistant' && m.emergency && <button onClick={openMap} className="press mt-2 w-full rounded-2xl bg-red-600 text-white font-bold py-2.5"><GT t="🚨 Najít nonstop veterinu" /></button>}
                </div>
              </div>
            ))}
            {busy && <div className="flex"><div className="rounded-[22px] rounded-bl-md bg-surface dark:bg-surface-d shadow-card px-4 py-3.5 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div></div>}
            {err && <div role="alert" className="text-center text-sm text-red-600 dark:text-red-400 space-y-2"><p>{err}</p><p className="text-muted">Otázka zůstala v poli níže.</p><button data-retry onClick={() => send(input)} className="press min-h-[44px] px-5 rounded-full font-semibold bg-primary/10 text-primary">Zkusit znovu</button></div>}
            <div ref={end} className="scroll-mb-48" />
          </div>
          <p className="text-[13px] text-muted text-center mt-4">Aivet je AI a může se mýlit. Nenahrazuje vyšetření veterinářem.</p>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="fixed z-40 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[420px] flex items-end gap-2 p-1.5 rounded-[26px] bg-surface/80 dark:bg-[#1C222A]/80 backdrop-blur-2xl ring-1 ring-ink/[0.06] dark:ring-white/10 shadow-float dark:shadow-float-d"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px) + 86px)' }}>
            <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={status === 'checking' ? 'Připojuji…' : 'Napiš Aivetovi…'} disabled={status === 'checking'} aria-label="Dotaz pro Aiveta"
              className="flex-1 resize-none bg-transparent px-3 py-2.5 outline-none max-h-32 text-base" />
            <button type="submit" aria-label="Odeslat" disabled={!input.trim() || busy || status === 'checking'} className="press w-11 h-11 shrink-0 rounded-full text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] disabled:opacity-40 flex items-center justify-center"><Icon name="upload" className="w-5 h-5" /></button>
          </form>
          <div className="h-28" />
        </>
      )}
    </div>
  );
}
