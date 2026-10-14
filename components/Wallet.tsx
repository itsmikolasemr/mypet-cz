'use client';
import { Emo, GT } from './glyphs';
// Věrnostní karty — glass wallet of pet-shop loyalty cards, shared within the household.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import type { CardFormat, CardStore, LoyaltyCard } from '@/lib/types';
import { cashierMode, guessFormat, isNative, renderSvg, scanImage, scanNativeCamera, scanVideo, type ScanResult } from '@/lib/barcode';
import { Button, Empty, Fab, Field, Icon, PageHeader, Segmented, Sheet, inputCls } from './ui';
import { ask, toast } from './feedback';

export const STORES: Record<CardStore, { name: string; from: string; to: string; ink: string; emoji: string }> = {
  superzoo: { name: 'Super zoo', from: '#E4252B', to: '#A3121A', ink: '#fff', emoji: '🦜' },
  zoobonus: { name: 'Zoo Bonus', from: '#8CC63F', to: '#4E8B1F', ink: '#fff', emoji: '🐠' },
  petcenter: { name: 'Pet Center', from: '#1E73BE', to: '#0B3F78', ink: '#fff', emoji: '🐾' },
  fressnapf: { name: 'Fressnapf / Maxi Zoo', from: '#37A447', to: '#1D6B2B', ink: '#fff', emoji: '🦴' },
  hulin: { name: 'Krmiva Hulín', from: '#F7A823', to: '#D06A0C', ink: '#fff', emoji: '🥫' },
  custom: { name: 'Vlastní', from: '#6B7280', to: '#374151', ink: '#fff', emoji: '💳' },
};
const ORDER: CardStore[] = ['superzoo', 'zoobonus', 'petcenter', 'fressnapf', 'hulin', 'custom'];
const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
const look = (c: Pick<LoyaltyCard, 'store' | 'color'>) => { const s = STORES[c.store] ?? STORES.custom; return c.store === 'custom' && c.color ? { ...s, from: c.color, to: shade(c.color) } : s; };
function shade(hex: string) { const n = parseInt(hex.slice(1), 16); const f = (x: number) => Math.max(0, Math.round(x * 0.62)); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => f(x).toString(16).padStart(2, '0')).join('')}`; }
export const cardTitle = (c: LoyaltyCard) => c.name || STORES[c.store]?.name || 'Karta';
/** Most used first, then most recently used, then newest. */
export const sortCards = (cs: LoyaltyCard[]) => [...cs].sort((a, b) => (b.uses || 0) - (a.uses || 0) || (b.lastUsed ?? '').localeCompare(a.lastUsed ?? '') || b.created.localeCompare(a.created));

function Code({ code, format, big }: { code: string; format: CardFormat; big?: boolean }) {
  const [svg, setSvg] = useState<string | null | undefined>(undefined);
  useEffect(() => { let on = true; renderSvg(code, format).then((s) => on && setSvg(s)); return () => { on = false; }; }, [code, format]);
  if (svg === undefined) return <div className="h-24" />;
  if (!svg) return <p data-code-invalid className="text-sm text-red-600 py-4">Tenhle kód nejde vykreslit jako {format === 'EAN13' ? 'EAN-13 (13 číslic se správnou kontrolní číslicí)' : format}.</p>;
  return <div data-barcode={format} className={`[&_svg]:w-full [&_svg]:h-auto ${format === 'QR' ? (big ? 'w-[78vw] max-w-[340px]' : 'w-40') + ' mx-auto' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Full-screen white cashier view: max brightness, screen kept on. */
function Cashier({ card, onClose }: { card: LoyaltyCard; onClose: () => void }) {
  useEffect(() => {
    let restore: (() => void) | undefined; cashierMode().then((r) => { restore = r; });
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k);
    const ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { restore?.(); removeEventListener('keydown', k); document.body.style.overflow = ov; };
  }, [onClose]);
  const s = look(card);
  return (
    <div data-cashier role="dialog" aria-modal aria-label={`Karta ${cardTitle(card)}`} className="fixed inset-0 z-[90] bg-white text-black flex flex-col items-center justify-center px-5" style={{ filter: 'none' }} onClick={onClose}>
      <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] inset-x-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}><Emo e={s.emoji} className="w-6 h-6" /></span>
        <span className="flex-1 font-bold text-lg truncate">{cardTitle(card)}</span>
        <button aria-label="Zavřít" onClick={onClose} className="w-11 h-11 rounded-full bg-black/5 flex items-center justify-center"><Icon name="x" className="w-5 h-5" /></button>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl p-4" onClick={(e) => e.stopPropagation()}><Code code={card.code} format={card.format} big /></div>
      {card.format === 'QR' && <p className="mt-3 font-mono text-lg tracking-wider">{card.code}</p>}
      {card.notes && <p className="mt-4 text-[15px] text-black/60 text-center max-w-sm">{card.notes}</p>}
      <p className="absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] text-[13px] text-black/45">Jas naplno · klepnutím zavřeš</p>
    </div>
  );
}

function Scanner({ onResult, onClose }: { onResult: (r: ScanResult) => void; onClose: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!v.current) return;
    const s = scanVideo(v.current);
    s.result.then(onResult).catch((e: Error) => { if (e.message !== 'stopped') setErr(e.name === 'NotAllowedError' ? 'Přístup ke kameře je zakázaný. Povol ho v prohlížeči, nebo vyfoť kartu.' : 'Kamera není dostupná. Vyfoť kartu, nebo zadej číslo ručně.'); });
    return s.stop;
  }, [onResult]);
  return (
    <div className="fixed inset-0 z-[85] bg-black flex flex-col" role="dialog" aria-label="Skenování karty">
      <video ref={v} playsInline muted className="flex-1 object-cover" />
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-44 rounded-3xl ring-2 ring-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,.45)] pointer-events-none" />
      <p className="absolute top-[calc(env(safe-area-inset-top)+20px)] inset-x-0 text-center text-white font-semibold">Namiř na čárový nebo QR kód</p>
      {err && <p data-scan-err className="absolute bottom-28 inset-x-6 rounded-2xl bg-white/90 text-black p-3 text-sm text-center">{err}</p>}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] inset-x-0 flex justify-center"><Button variant="soft" onClick={onClose}>Zrušit</Button></div>
    </div>
  );
}

function CardForm({ initial, onDone }: { initial: LoyaltyCard; onDone: () => void }) {
  const { saveCard, deleteCard } = useStore();
  const [c, setC] = useState(initial);
  const [cam, setCam] = useState(false);
  const [fmtTouched, setFmtTouched] = useState(!!initial.code);
  const photo = useRef<HTMLInputElement>(null);
  const isNew = !initial.code;
  const set = (p: Partial<LoyaltyCard>) => setC((x) => ({ ...x, ...p }));
  const got = (r: ScanResult) => { setCam(false); set({ code: r.code, format: r.format }); setFmtTouched(true); toast(`Načteno: ${r.code}`); };
  const scan = async () => {
    if (await isNative()) {
      try { const r = await scanNativeCamera(); if (r) got(r); } catch (e) { toast((e as Error).message === 'camera-denied' ? 'Bez přístupu ke kameře to nepůjde. Povol ho v Nastavení telefonu.' : 'Skenování se nepovedlo.'); }
    } else if (typeof navigator.mediaDevices?.getUserMedia === 'function') setCam(true);
    else photo.current?.click();
  };
  const fromPhoto = async (f?: File) => { if (!f) return; const r = await scanImage(f); if (r) got(r); else toast('Na fotce jsem kód nenašel. Zkus ostřejší fotku, nebo číslo opiš.'); };
  const valid = c.code.trim().length > 0 && (c.format !== 'EAN13' || guessFormat(c.code.trim()) === 'EAN13');
  const save = () => { if (!valid) return; saveCard({ ...c, code: c.code.trim(), name: c.store === 'custom' ? c.name.trim() : c.name.trim() }); toast(isNew ? 'Karta uložená 💳' : 'Uloženo'); onDone(); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Obchod">
        {ORDER.map((k) => { const s = STORES[k]; const on = c.store === k; return (
          <button key={k} role="radio" aria-checked={on} data-store={k} onClick={() => set({ store: k })}
            className={`press rounded-2xl p-2 min-h-[64px] text-[12px] font-semibold leading-tight text-white ${on ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-surface dark:ring-offset-surface-d' : 'opacity-80'}`}
            style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}><span className="block text-lg"><Emo e={s.emoji} className="w-6 h-6" /></span>{s.name}</button>); })}
      </div>
      {c.store === 'custom' && <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <Field label="Název obchodu"><input name="cardName" className={inputCls} value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="Např. Chovatelské potřeby U Tlapky" /></Field>
        <label className="block"><span className="sr-only">Barva</span><input name="cardColor" type="color" value={c.color ?? '#6B7280'} onChange={(e) => set({ color: e.target.value })} className="w-14 h-[50px] rounded-2xl bg-transparent" /></label>
      </div>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="soft" onClick={scan} data-scan-camera><GT t="📷 Naskenovat" /></Button>
        <Button type="button" variant="soft" onClick={() => photo.current?.click()}><GT t="🖼️ Z fotky" /></Button>
        <input ref={photo} data-scan-photo type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { fromPhoto(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <Field label="Číslo karty"><input name="cardCode" inputMode={c.format === 'EAN13' ? 'numeric' : 'text'} autoComplete="off" className={`${inputCls} font-mono tracking-wider`} value={c.code}
        onChange={(e) => { const code = e.target.value.replace(c.format === 'EAN13' ? /\s/g : /^$/, ''); set({ code, ...(fmtTouched ? {} : { format: guessFormat(code.trim()) === 'QR' ? 'CODE128' : guessFormat(code.trim()) }) }); }} placeholder="Opiš číslo pod čárovým kódem" /></Field>
      <Field label="Typ kódu"><Segmented value={c.format} onChange={(f) => { setFmtTouched(true); set({ format: f }); }} options={[{ v: 'EAN13', l: 'EAN-13' }, { v: 'CODE128', l: 'Code 128' }, { v: 'QR', l: 'QR' }]} /></Field>
      {c.code.trim() && <div className="rounded-2xl bg-white p-3 ring-1 ring-ink/10"><Code code={c.code.trim()} format={c.format} /></div>}
      <Field label="Poznámka"><textarea name="cardNotes" rows={2} className={inputCls} value={c.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Např. sleva 10 % na granule každé úterý" /></Field>
      <div className="flex gap-2">
        {!isNew && <Button variant="danger" type="button" onClick={async () => { if (await ask({ title: 'Smazat kartu?', text: 'Půjde obnovit z koše 30 dní.', ok: 'Smazat', danger: true })) { deleteCard(c.id); toast('Karta smazaná'); onDone(); } }}>Smazat</Button>}
        <Button className="flex-1" onClick={save} disabled={!valid} data-save-card>{isNew ? 'Přidat kartu' : 'Uložit'}</Button>
      </div>
      {cam && <Scanner onResult={got} onClose={() => setCam(false)} />}
    </div>
  );
}

export function Wallet() {
  const { data, markCardUsed } = useStore();
  const cards = useMemo(() => sortCards(data.cards), [data.cards]);
  const [edit, setEdit] = useState<LoyaltyCard | null>(null);
  const [show, setShow] = useState<LoyaltyCard | null>(null);
  const blank = (): LoyaltyCard => ({ id: uid(), store: 'superzoo', name: '', code: '', format: 'EAN13', notes: '', uses: 0, created: new Date().toISOString() });
  const open = (c: LoyaltyCard) => { markCardUsed(c.id); setShow(c); };
  // opened from the map ("Máš tu věrnostní kartu"): show cashier view right away
  useEffect(() => { const id = sessionStorage.getItem('tlapka:openCard'); if (!id) return; sessionStorage.removeItem('tlapka:openCard'); const c = cards.find((x) => x.id === id); if (c) open(c); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <PageHeader title="Věrnostní karty" sub={cards.length ? `${cards.length} ${cards.length === 1 ? 'karta' : cards.length < 5 ? 'karty' : 'karet'} · sdílené s domácností` : 'Všechny zverimexy v kapse'} fab={<Fab label="Přidat kartu" onClick={() => setEdit(blank())} />} />
      {!cards.length ? (
        <Empty emoji="💳" title="Zatím žádná karta" text="Vyber obchod a naskenuj kartu. U pokladny ji pak jen ukážeš." action={<div data-quick-brands className="grid grid-cols-2 gap-2 text-left">
          {ORDER.map((k) => { const st = STORES[k]; return <button key={k} data-brand={k} onClick={() => setEdit({ ...blank(), store: k })} className="press min-h-[56px] rounded-2xl px-3 py-2 flex items-center gap-2 font-semibold text-[14px] shadow-card" style={{ background: `linear-gradient(135deg, ${st.from}, ${st.to})`, color: st.ink }}><span aria-hidden className="shrink-0"><Emo e={st.emoji} className="w-5 h-5" /></span><span className="leading-tight">{k === 'custom' ? 'Jiná karta' : st.name}</span></button>; })}
        </div>} />
      ) : (<>
        <p className="text-[13px] text-muted px-1 -mt-1 mb-3"><GT t="👆 Klepni na kartu – u pokladny se ukáže velký kód a zesvětlí se displej." /></p>
        <ul className="pb-4" aria-label="Karty">
          {cards.map((c, i) => { const s = look(c); return (
            <li key={c.id} data-card={c.id} className={`relative ${i ? '-mt-[86px]' : ''}`} style={{ zIndex: i + 1 }}>
              <div role="button" tabIndex={0} aria-label={`Ukázat kartu ${cardTitle(c)}`} onClick={() => open(c)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(c)}
                className="press relative overflow-hidden rounded-[24px] h-[150px] p-4 cursor-pointer ring-1 ring-white/25 shadow-[0_18px_40px_-18px_rgba(0,0,0,.55)] backdrop-blur-xl"
                style={{ background: `linear-gradient(135deg, ${s.from}F2, ${s.to}E6)`, color: s.ink }}>
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.38),rgba(255,255,255,.06)_40%,transparent_60%)]" />
                <span className="pointer-events-none absolute -right-10 -top-12 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-xl"><Emo e={s.emoji} className="w-6 h-6" /></span>
                  <span className="flex-1 min-w-0"><span className="block font-bold text-[17px] truncate" data-card-title>{cardTitle(c)}</span>
                    <span className="block text-[12px] opacity-80">{c.uses ? `Použito ${c.uses}×` : 'Zatím nepoužito'}</span></span>
                  <button aria-label={`Upravit ${cardTitle(c)}`} onClick={(e) => { e.stopPropagation(); setEdit(c); }} className="w-10 h-10 -m-1 rounded-full bg-white/15 flex items-center justify-center "><Emo e="✎" className="w-5 h-5" /></button>
                </div>
                <div className="relative mt-[38px] flex items-end justify-between gap-3">
                  <span className="font-mono text-[15px] tracking-[.14em] truncate">{c.format === 'QR' ? 'QR kód' : (/^\d{8,}$/.test(c.code) ? c.code.replace(/(\d{4})(?=\d)/g, '$1 ') : c.code)}</span>
                  {c.notes && <span className="text-[12px] opacity-85 truncate max-w-[45%]">{c.notes}</span>}
                </div>
              </div>
            </li>); })}
        </ul></>
      )}
      {cards.length > 0 && <p className="text-[13px] text-muted text-center px-6 mt-2">Klepni na kartu a ukaž ji u pokladny. Nejpoužívanější karty jsou nahoře.</p>}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.code ? 'Upravit kartu' : 'Nová karta'}>{edit && <CardForm key={edit.id} initial={edit} onDone={() => setEdit(null)} />}</Sheet>
      {show && <Cashier card={show} onClose={() => setShow(null)} />}
    </div>
  );
}
