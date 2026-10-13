'use client';
import { useEffect, useRef, useState } from 'react';
import type { DocMeta, Pet, Reminder, Visit } from '@/lib/types';
import { useStore } from '@/lib/store';
import { fmtDate, fmtShort, intervalName, relDue, status, today, typeOf, uid } from '@/lib/utils';
import { loadBlob, saveBlob } from '@/lib/docs';
import { Avatar, Button, Card, Field, Icon, Sheet, StatusPill, inputCls } from './ui';

export function ReminderRow({ r, pet, onEdit, showPet = true }: { r: Reminder; pet?: Pet; onEdit: () => void; showPet?: boolean }) {
  const { completeReminder, reopenReminder } = useStore();
  const s = status(r);
  const t = typeOf(r.type);
  const [pop, setPop] = useState(false);
  return (
    <Card className={`p-3.5 flex items-center gap-3 ${s === 'done' ? 'opacity-60' : ''}`}>
      <button onClick={onEdit} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${s === 'overdue' ? 'bg-red-100 dark:bg-red-500/15' : s === 'soon' ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-primary/10'}`}>{t.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="font-semibold truncate">{r.title}</p><StatusPill s={s} /></div>
          <p className="text-[13px] text-muted truncate">
            {showPet && pet ? `${pet.name} · ` : ''}{r.product ? `${r.product} · ` : ''}{s === 'done' ? `hotovo ${fmtDate(r.completedAt!)}` : `${fmtShort(r.dueDate)} (${relDue(r.dueDate)})`}
          </p>
          {r.intervalDays > 0 && s !== 'done' && <p className="text-[12px] text-muted/80 flex items-center gap-1"><Icon name="repeat" className="w-3 h-3" />{intervalName(r.intervalDays)}</p>}
        </div>
      </button>
      {s === 'done' ? (
        <button onClick={() => reopenReminder(r.id)} className="press text-xs font-semibold text-muted px-2 py-2">Obnovit</button>
      ) : (
        <button aria-label="Označit jako hotové" onClick={() => { setPop(true); setTimeout(() => { completeReminder(r.id); setPop(false); }, 350); }}
          className={`press w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${pop ? 'bg-primary border-primary text-white scale-110' : 'border-primary/40 text-primary/50'}`}>
          <Icon name="check" className="w-5 h-5" />
        </button>
      )}
    </Card>
  );
}

export function VisitRow({ v, pet, onClick }: { v: Visit; pet?: Pet; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="p-3.5 flex gap-3 items-start">
      <div className="w-12 shrink-0 text-center rounded-xl bg-secondary/20 py-1.5">
        <div className="text-lg font-bold leading-none">{Number(v.date.slice(8))}</div>
        <div className="text-[11px] uppercase text-muted">{new Date(v.date).toLocaleDateString('cs-CZ', { month: 'short' })}</div>
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
  if (w.length < 2) return <p className="text-sm text-muted py-6 text-center">{w.length ? `Zatím jeden záznam: ${w[0].kg} kg. Přidej další pro graf.` : 'Zatím žádná váha.'}</p>;
  const W = 320, H = 150, px = 28, py = 18;
  const t0 = new Date(w[0].date).getTime(), t1 = new Date(w[w.length - 1].date).getTime() || t0 + 1;
  const ks = w.map((x) => x.kg);
  let lo = Math.min(...ks), hi = Math.max(...ks);
  const pad = Math.max((hi - lo) * 0.2, 0.5); lo -= pad; hi += pad;
  const X = (d: string) => px + ((new Date(d).getTime() - t0) / (t1 - t0 || 1)) * (W - px * 2);
  const Y = (k: number) => py + (1 - (k - lo) / (hi - lo)) * (H - py * 2);
  const pts = w.map((x) => `${X(x.date)},${Y(x.kg)}`).join(' ');
  const last = w[w.length - 1], prev = w[w.length - 2];
  const delta = +(last.kg - prev.kg).toFixed(2);
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold tabular-nums">{last.kg.toLocaleString('cs-CZ')}</span><span className="text-muted">kg</span>
        <span className={`text-sm font-semibold ml-auto ${delta > 0 ? 'text-warning' : delta < 0 ? 'text-primary' : 'text-muted'}`}>{delta > 0 ? '+' : ''}{delta.toLocaleString('cs-CZ')} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Graf váhy">
        <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2E7D6F" stopOpacity=".28" /><stop offset="1" stopColor="#2E7D6F" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((f) => { const k = lo + (hi - lo) * f; return <g key={f}><line x1={px} x2={W - px} y1={Y(k)} y2={Y(k)} className="stroke-ink/10 dark:stroke-white/10" strokeDasharray="3 4" /><text x={2} y={Y(k) + 3} className="fill-muted" fontSize="9">{k.toFixed(1)}</text></g>; })}
        <polygon points={`${X(w[0].date)},${H - py} ${pts} ${X(last.date)},${H - py}`} fill="url(#g)" />
        <polyline points={pts} fill="none" stroke="#2E7D6F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="draw" />
        {w.map((x) => <circle key={x.id} cx={X(x.date)} cy={Y(x.kg)} r="3.5" fill="#2E7D6F" className="stroke-surface dark:stroke-surface-d" strokeWidth="2" />)}
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
    if (!b) return alert('Soubor se nepodařilo načíst.');
    setView({ d, url: URL.createObjectURL(b) });
  };
  const close = () => { if (view) URL.revokeObjectURL(view.url); setView(null); };
  return (
    <div className="space-y-2.5">
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPending(f); setMeta({ name: f.name.replace(/\.[^.]+$/, ''), kind: f.type === 'application/pdf' ? 'faktura' : 'rtg', date: today() }); } e.target.value = ''; }} />
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
            setPending(null);
          } catch { alert('Uložení se nezdařilo (málo místa?).'); } finally { setBusy(false); }
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
              <Button variant="danger" onClick={() => { if (confirm('Smazat dokument?')) { deleteDoc(view.d.id); close(); } }}><Icon name="trash" /> Smazat</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export function PetChip({ pet, active, onClick }: { pet?: Pet; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`press shrink-0 flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 border text-sm font-medium transition ${active ? 'border-primary bg-primary/10 text-primary dark:text-primary-l' : 'border-ink/10 dark:border-white/10'}`}>
      {pet ? <Avatar pet={pet} size="w-6 h-6" text="text-sm" /> : <span className="w-6 h-6 flex items-center justify-center">🐾</span>}
      {pet ? pet.name : 'Všichni'}
    </button>
  );
}
