'use client';
import { ask, notice, toast } from './feedback';
import { useEffect, useRef, useState } from 'react';
import type { DocMeta, Pet, Reminder, Visit } from '@/lib/types';
import { useStore } from '@/lib/store';
import { MAX_DOC_BYTES, fmtDate, fmtShort, intervalName, parse, relDue, status, today, addDays, typeOf, uid } from '@/lib/utils';
import { loadBlob, saveBlob } from '@/lib/docs';
import { Avatar, Button, Card, Field, Icon, Sheet, StatusPill, inputCls } from './ui';

const PAW = 'M8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 15a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 5 15Zm14 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Zm-7-1c-2.5 0-5 3-5 5 0 1.4 1.2 2 2.5 2 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.3 0 2.5-.6 2.5-2 0-2-2.5-5-5-5Z';

export function ReminderRow({ r, pet, onEdit, showPet = true, hint = false }: { r: Reminder; pet?: Pet; onEdit: () => void; showPet?: boolean; hint?: boolean }) {
  const [hinting, setHinting] = useState(false);
  useEffect(() => { if (hint && !localStorage.getItem('tlapka:hint:swipe') && !matchMedia('(prefers-reduced-motion: reduce)').matches) setHinting(true); }, [hint]);
  const { completeReminder, reopenReminder, saveReminder } = useStore();
  const s = status(r);
  const t = typeOf(r.type);
  const [pop, setPop] = useState(false);
  const [dx, setDx] = useState(0);
  const [paws, setPaws] = useState<{ id: number; x: number; y: number; r: number }[]>([]);
  const drag = useRef<{ x0: number; y0: number; w: number; moved: boolean; last: number; locked?: 'x' | 'y'; id: number } | null>(null);
  const suppressClick = useRef(false);
  const done = () => {
    setPop(true);
    try { navigator.vibrate?.([12, 30, 18]); } catch {}
    const prev = r;
    setTimeout(() => { completeReminder(r.id); setPop(false); setDx(0); toast(r.intervalDays > 0 ? `${r.title} ✓ · další ${new Date(addDays(today(), r.intervalDays)).toLocaleDateString('cs-CZ')} (počítáno od dneška)` : `${r.title} – hotovo ✓`, () => saveReminder(prev)); }, 380);
  };
  const can = s !== 'done';
  const onDown = (e: React.PointerEvent) => {
    if (!can || e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x0: e.clientX, y0: e.clientY, w: (e.currentTarget as HTMLElement).offsetWidth, moved: false, last: 0, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const mx = e.clientX - d.x0, my = e.clientY - d.y0;
    if (!d.locked && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
      d.locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (d.locked === 'x') (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    if (d.locked !== 'x') return;
    d.moved = true;
    const x = Math.max(0, Math.min(d.w * 0.9, mx));
    setDx(x);
    if (x - d.last > 30) {
      d.last = x;
      const n = Math.floor(x / 30);
      setPaws((p) => [...p.slice(-10), { id: Date.now() + n, x: x - 18, y: n % 2 ? 14 : 38, r: 90 + (n % 2 ? -12 : 12) }]);
      try { navigator.vibrate?.(4); } catch {}
    }
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d) return;
    if (d.moved) { suppressClick.current = true; setTimeout(() => (suppressClick.current = false), 50); }
    if (d.moved && dx > d.w * 0.38) done(); else setDx(0);
  };
  const progress = Math.min(1, dx / 140);
  return (
    <div className="relative">
      {can && (
        <div aria-hidden className="absolute inset-0 rounded-[22px] overflow-hidden flex items-center pl-5 font-bold text-white bg-gradient-to-r from-[#FF9A5A] to-[#E8553A]" style={{ opacity: dx ? 0.35 + progress * 0.65 : hinting ? 0.9 : 0 }}>
          <span style={{ transform: `scale(${0.8 + progress * 0.3})` }} className="transition-transform">✓ Hotovo</span>
        </div>
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px] z-10">
        {paws.map((p) => (
          <svg key={p.id} viewBox="0 0 24 24" className="paw-print text-white" style={{ left: p.x, top: p.y, ['--r' as string]: `${p.r}deg` }} onAnimationEnd={() => setPaws((x) => x.filter((y) => y.id !== p.id))}><path d={PAW} fill="currentColor" /></svg>
        ))}
      </div>
      <div onAnimationEnd={() => { if (hinting) { setHinting(false); localStorage.setItem('tlapka:hint:swipe', '1'); } }} className={`swipe-track select-none relative ${hinting ? 'swipe-hint' : ''} ${dx ? '' : 'transition-transform duration-300 ease-spring'}`} style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Card className={`p-4 flex items-center gap-3.5 ${s === 'done' ? 'opacity-60' : ''}`}>
          <button onClick={() => { if (!suppressClick.current) onEdit(); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${s === 'overdue' ? 'bg-red-100 dark:bg-red-500/15' : s === 'soon' ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-primary/10'}`}>{t.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 min-w-0"><p className="font-semibold line-clamp-2 break-words">{r.title}</p><span className="shrink-0"><StatusPill s={s} /></span></div>
              <p className="text-[13px] text-muted truncate">
                {showPet && pet ? `${pet.name} · ` : ''}{r.product ? `${r.product} · ` : ''}{s === 'done' ? `hotovo ${fmtDate(r.completedAt!)}` : `${fmtShort(r.dueDate)} (${relDue(r.dueDate)})`}
              </p>
              {r.intervalDays > 0 && s !== 'done' && <p className="text-[12px] text-muted flex items-center gap-1"><Icon name="repeat" className="w-3 h-3" />{intervalName(r.intervalDays)}</p>}
            </div>
          </button>
          {s === 'done' ? (
            <button onClick={() => reopenReminder(r.id)} className="press text-sm font-semibold text-muted px-3 min-h-[44px]">Obnovit</button>
          ) : (
            <button aria-label="Označit jako hotové" onClick={done}
              className={`press w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${pop ? 'bg-primary border-primary text-white scale-110' : 'border-primary/40 text-primary'}`}>
              <Icon name="check" className="w-5 h-5" />
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}

export function VisitRow({ v, pet, onClick }: { v: Visit; pet?: Pet; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="p-4 flex gap-3.5 items-start">
      <div className="w-12 shrink-0 text-center rounded-xl bg-secondary/20 py-1.5">
        <div className="text-lg font-bold leading-none">{Number(v.date.slice(8))}</div>
        <div className="text-[12px] uppercase text-muted">{parse(v.date).toLocaleDateString('cs-CZ', { month: 'short' })}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{v.reason}</p>
        <p className="text-[13px] text-muted">{[pet?.name, v.clinic, v.cost != null ? `${v.cost.toLocaleString('cs-CZ')} Kč` : ''].filter(Boolean).join(' · ')}</p>
        {v.notes && <p className="text-[13px] mt-1 line-clamp-2">{v.notes}</p>}
      </div>
    </Card>
  );
}

export function WeightChart({ pet }: { pet: Pet }) {
  const w = pet.weights;
  if (w.length < 2) return <p className="text-sm text-muted py-6 text-center">{w.length ? `Zatím jeden záznam: ${w[0].kg.toLocaleString('cs-CZ')} kg. Přidej další pro graf.` : 'Zatím žádná váha.'}</p>;
  const W = 320, H = 150, px = 28, py = 18;
  const t0 = parse(w[0].date).getTime(), t1 = parse(w[w.length - 1].date).getTime();
  const ks = w.map((x) => x.kg);
  let lo = Math.min(...ks), hi = Math.max(...ks);
  const pad = Math.max((hi - lo) * 0.2, 0.5); lo -= pad; hi += pad;
  const same = t1 === t0;
  const X = (d: string, i = 0) => px + (same ? i / (w.length - 1) : (parse(d).getTime() - t0) / (t1 - t0)) * (W - px * 2);
  const Y = (k: number) => py + (1 - (k - lo) / (hi - lo)) * (H - py * 2);
  const pts = w.map((x, i) => `${X(x.date, i)},${Y(x.kg)}`).join(' ');
  const last = w[w.length - 1], prev = w[w.length - 2];
  const delta = +(last.kg - prev.kg).toFixed(2);
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold tabular-nums">{last.kg.toLocaleString('cs-CZ')}</span><span className="text-muted">kg</span>
        <span className={`text-sm font-semibold ml-auto ${delta > 0 ? 'text-warning' : delta < 0 ? 'text-primary' : 'text-muted'}`}>{delta > 0 ? '+' : ''}{delta.toLocaleString('cs-CZ')} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Graf váhy">
        <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#E8553A" stopOpacity=".28" /><stop offset="1" stopColor="#E8553A" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((f) => { const k = lo + (hi - lo) * f; return <g key={f}><line x1={px} x2={W - px} y1={Y(k)} y2={Y(k)} className="stroke-ink/10 dark:stroke-white/10" strokeDasharray="3 4" /><text x={2} y={Y(k) + 3} className="fill-muted" fontSize="9">{k.toFixed(1)}</text></g>; })}
        <polygon points={`${X(w[0].date)},${H - py} ${pts} ${X(last.date, w.length - 1)},${H - py}`} fill="url(#g)" />
        <polyline points={pts} fill="none" stroke="#E8553A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="draw" />
        {w.map((x, i) => <circle key={x.id} cx={X(x.date, i)} cy={Y(x.kg)} r="3.5" fill="#E8553A" className="stroke-surface dark:stroke-surface-d" strokeWidth="2" />)}
        <text x={px} y={H - 2} fontSize="9" className="fill-muted">{fmtShort(w[0].date)}</text>
        <text x={W - px} y={H - 2} fontSize="9" textAnchor="end" className="fill-muted">{fmtShort(last.date)}</text>
      </svg>
    </div>
  );
}

const KINDS: { id: DocMeta['kind']; n: string; e: string }[] = [
  { id: 'faktura', n: 'Faktura', e: '🧾' }, { id: 'rtg', n: 'RTG / snímek', e: '🩻' }, { id: 'zprava', n: 'Lékařská zpráva', e: '📋' }, { id: 'pas', n: 'Pas / očkování', e: '📘' }, { id: 'jine', n: 'Jiné', e: '📎' },
];
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);

function Thumb({ d }: { d: DocMeta }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!d.mime.startsWith('image/')) return;
    let u: string | undefined;
    loadBlob(d.id, d.mime).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => {});
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [d.id, d.mime]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-2xl">{d.mime === 'application/pdf' ? '📄' : KINDS.find((k) => k.id === d.kind)?.e}</div>;
}

export function Documents({ pet }: { pet: Pet }) {
  const { data, addDoc, deleteDoc } = useStore();
  const docs = data.docs.filter((d) => d.petId === pet.id).sort((a, b) => b.date.localeCompare(a.date));
  const ref = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [meta, setMeta] = useState({ name: '', kind: 'faktura' as DocMeta['kind'], date: today() });
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<{ d: DocMeta; url: string } | null>(null);
  const open = async (d: DocMeta) => {
    const b = await loadBlob(d.id, d.mime).catch(() => null);
    if (!b) return notice('Soubor se nepodařilo načíst', 'Soubor v tomto zařízení chybí nebo je poškozený.');
    setView({ d, url: URL.createObjectURL(b) });
  };
  const close = () => { if (view) URL.revokeObjectURL(view.url); setView(null); };
  return (
    <div className="space-y-2.5">
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > MAX_DOC_BYTES) { notice('Soubor je větší než 25 MB', 'Zmenši ho nebo vyfoť znovu.'); e.target.value = ''; return; } if (f) { setPending(f); setMeta({ name: f.name.replace(/\.[^.]+$/, ''), kind: f.type === 'application/pdf' ? 'faktura' : 'rtg', date: today() }); } e.target.value = ''; }} />
      <Button variant="soft" className="w-full" onClick={() => ref.current?.click()}><Icon name="upload" /> Nahrát dokument</Button>
      {!docs.length && <p className="text-sm text-muted text-center py-4">Faktury, RTG snímky, zprávy z veteriny – vše na jednom místě.</p>}
      {docs.map((d) => (
        <Card key={d.id} onClick={() => open(d)} className="p-3 flex items-center gap-3">
          <Thumb d={d} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{d.name}</p>
            <p className="text-[13px] text-muted">{KINDS.find((k) => k.id === d.kind)?.n} · {fmtDate(d.date)} · {kb(d.size)}</p>
          </div>
          <Icon name="chev" className="w-4 h-4 text-muted" />
        </Card>
      ))}
      <Sheet open={!!pending} onClose={() => setPending(null)} title="Uložit dokument">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault(); if (!pending) return; setBusy(true);
          const id = uid();
          try {
            await saveBlob(id, pending);
            addDoc({ id, petId: pet.id, name: meta.name || pending.name, kind: meta.kind, mime: pending.type || 'application/octet-stream', size: pending.size, date: meta.date });
            toast('Dokument uložen ✓');
            setPending(null);
          } catch (e) { console.error(e); notice('Uložení se nezdařilo', e instanceof DOMException && e.name === 'QuotaExceededError' ? 'V zařízení není dost místa pro tento soubor.' : 'Soubor se nepodařilo uložit. V anonymním režimu prohlížeče může být ukládání souborů omezené – zkus běžné okno nebo aplikaci.'); } finally { setBusy(false); }
        }}>
          <Field label="Název"><input className={inputCls} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">{KINDS.map((k) => <button type="button" key={k.id} onClick={() => setMeta({ ...meta, kind: k.id })} className={`press rounded-full px-3 py-1.5 text-sm border ${meta.kind === k.id ? 'border-primary bg-primary/10 font-semibold' : 'border-ink/10 dark:border-white/10'}`}>{k.e} {k.n}</button>)}</div>
          <Field label="Datum"><input type="date" className={inputCls} value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} /></Field>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Ukládám…' : 'Uložit'}</Button>
        </form>
      </Sheet>
      <Sheet open={!!view} onClose={close} title={view?.d.name ?? ''}>
        {view && (
          <div className="space-y-3">
            {view.d.mime.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.url} alt={view.d.name} className="w-full rounded-2xl" />
            ) : view.d.mime === 'application/pdf' ? (
              <object data={view.url} type="application/pdf" className="w-full h-[60dvh] rounded-2xl bg-white"><p className="text-sm text-muted">Náhled PDF není dostupný – otevři soubor.</p></object>
            ) : <p className="text-muted">Náhled není k dispozici.</p>}
            <div className="grid grid-cols-2 gap-2">
              <a href={view.url} download={view.d.name} target="_blank" rel="noreferrer" className="press inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold border border-ink/10 dark:border-white/15"><Icon name="download" /> Otevřít</a>
              <Button variant="danger" onClick={async () => { if (await ask({ title: 'Smazat dokument?', text: view.d.name, ok: 'Smazat', danger: true })) { deleteDoc(view.d.id); close(); toast('Dokument smazán'); } }}><Icon name="trash" /> Smazat</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export function PetChip({ pet, active, onClick }: { pet?: Pet; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`press shrink-0 flex items-center gap-1.5 rounded-full pl-1.5 pr-3.5 min-h-[44px] border text-sm font-medium transition ${active ? 'border-primary bg-primary/10 text-primary dark:text-primary-l' : 'border-ink/10 dark:border-white/10'}`}>
      {pet ? <Avatar pet={pet} size="w-6 h-6" text="text-sm" /> : <span className="w-6 h-6 flex items-center justify-center">🐾</span>}
      {pet ? pet.name : 'Všichni'}
    </button>
  );
}
