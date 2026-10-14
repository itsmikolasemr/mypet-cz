'use client';
/** v1.2 Tlapka Wrapped – IG-story style year recap per pet (in-app animated player + PNG export / share + invite QR). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { inviteUrl, slides as mkSlides, wrapped, type Slide } from '@/lib/wrapped';
import { themeFor } from '@/lib/wrappedCanvas';
import { PawMark } from './ui';
import { toast } from './feedback';

const DUR = 5200;

function useCount(target: number, run: boolean) {
  const [v, setV] = useState(run ? 0 : target);
  useEffect(() => { if (!run) { setV(target); return; } let raf = 0; const t0 = performance.now(); const f = (t: number) => { const p = Math.min(1, (t - t0) / 1100); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [target, run]);
  return v;
}

function SlideView({ s, i, total, photo, qr }: { s: Slide; i: number; total: number; photo?: string; qr?: string }) {
  const th = themeFor(i, s.key);
  const num = Number(s.big.replace(/\s/g, '').replace(',', '.'));
  const isNum = /^[\d\s]+(,\d+)?$/.test(s.big) && !Number.isNaN(num);
  const c = useCount(isNum ? Math.round(num) : 0, isNum && !s.big.includes(','));
  const bigText = isNum && !s.big.includes(',') ? c.toLocaleString('cs-CZ') : s.big;
  return (
    <div key={s.key} className="absolute inset-0 flex flex-col items-center text-center px-7 pt-20 pb-10 overflow-hidden" style={{ background: `linear-gradient(165deg, ${th.bg[0]}, ${th.bg[1]})`, color: th.ink }} data-slide={s.key}>
      <div aria-hidden className="absolute inset-0 opacity-[.06]" style={{ backgroundImage: `radial-gradient(${th.ink} 2.2px, transparent 2.4px)`, backgroundSize: '26px 26px' }} />
      <div className="relative flex-1 flex flex-col items-center justify-center w-full wr-in">
        {s.key === 'intro' && (photo ? <img src={photo} alt="" className="w-36 h-36 rounded-full object-cover ring-[6px] ring-white mb-6 wr-pop" /> : <PawMark className="w-36 h-36 mb-6 wr-pop" animate tile={false} />)}
        {s.key === 'persona' && <PawMark className="w-28 h-28 mb-5 wr-pop" animate tile={false} />}
        <p className="text-[15px] font-extrabold uppercase tracking-[.14em]" style={{ color: th.sub }}>{s.kicker}</p>
        <p className={`font-extrabold tracking-[-0.03em] leading-[0.95] mt-2 ${s.big.length > 12 ? 'text-[40px]' : s.big.length > 7 ? 'text-[56px]' : 'text-[84px]'}`}>{bigText}{s.unit && <span className="text-[0.42em] ml-2 tracking-normal">{s.unit}</span>}</p>
        <span aria-hidden className="block w-4 h-4 rounded-full my-5 wr-pop" style={{ background: th.dot, animationDelay: '.5s' }} />
        <p className="text-[18px] font-semibold leading-snug max-w-[300px]">{s.line}</p>
        {s.foot && <p className="text-[14px] font-semibold mt-3 max-w-[290px]" style={{ color: th.sub }}>{s.foot}</p>}
        {s.key === 'invite' && qr && <img src={qr} alt="QR kód s pozvánkou do Tlapky" className="mt-6 w-40 h-40 rounded-2xl bg-white p-2.5 wr-pop" />}
        {s.dots && <div aria-hidden className="flex gap-3 mt-8">{Array.from({ length: 4 }, (_, k) => <span key={k} className="w-3.5 h-3.5 rounded-full wr-pop" style={{ background: k < s.dots! ? th.dot : th.sub, opacity: k < s.dots! ? 1 : 0.3, animationDelay: `${0.6 + k * 0.12}s` }} />)}</div>}
      </div>
      <p className="relative text-[12px] font-semibold" style={{ color: th.sub }}>#TlapkaWrapped · {i + 1}/{total}</p>
    </div>
  );
}

export function WrappedPlayer({ petId, onClose, year }: { petId: string; onClose: () => void; year?: number }) {
  const { data } = useStore();
  const st = useMemo(() => wrapped(data, petId, year), [data, petId, year]);
  const list = useMemo(() => (st ? mkSlides(st) : []), [st]);
  const [i, setI] = useState(0); const [paused, setPaused] = useState(false); const [qr, setQr] = useState<string>(); const [busy, setBusy] = useState(false);
  const t0 = useRef(Date.now()); const [prog, setProg] = useState(0);
  useEffect(() => { if (!st) return; import('qrcode').then((Q) => Q.toDataURL(inviteUrl(st.pet.name), { margin: 1, width: 480, color: { dark: '#2E3138', light: '#FFFFFF' } })).then(setQr).catch(() => {}); }, [st]);
  useEffect(() => { t0.current = Date.now(); setProg(0); }, [i]);
  useEffect(() => {
    if (paused) return; const id = setInterval(() => { const p = (Date.now() - t0.current) / DUR; if (p >= 1) { setI((x) => (x < list.length - 1 ? x + 1 : x)); if (i >= list.length - 1) setPaused(true); } else setProg(p); }, 60);
    return () => clearInterval(id);
  }, [paused, i, list.length]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((x) => Math.min(list.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [list.length, onClose]);

  const exportPng = useCallback(async (all: boolean) => {
    if (!st) return; setBusy(true); setPaused(true);
    try {
      const { renderSlide } = await import('@/lib/wrappedCanvas');
      const idx = all ? list.map((_, k) => k) : [i];
      const files: File[] = [];
      for (const k of idx) { const c = await renderSlide(list[k], k, list.length, { photo: st.pet.photo, qr }); const b: Blob = await new Promise((r) => c.toBlob((x) => r(x!), 'image/png')); files.push(new File([b], `tlapka-wrapped-${st.pet.name}-${String(k + 1).padStart(2, '0')}.png`, { type: 'image/png' })); }
      const text = `${st.pet.name} – ${st.ytd ? 'zatím letos' : 'rok ' + st.year} v Tlapce. ${inviteUrl(st.pet.name)}`;
      if (navigator.canShare?.({ files })) { await navigator.share({ files, text, title: 'Tlapka Wrapped' }).catch(() => {}); }
      else if (all) { const { zipSync } = await import('fflate'); const z: Record<string, Uint8Array> = {}; for (const f of files) z[f.name] = new Uint8Array(await f.arrayBuffer()); dl(new Blob([zipSync(z) as BlobPart], { type: 'application/zip' }), `tlapka-wrapped-${st.pet.name}.zip`); toast('Příběh uložen (ZIP s obrázky 1080×1920)'); }
      else { dl(files[0], files[0].name); toast('Obrázek uložen – nahraj ho do Instagram Stories'); }
      (window as unknown as { __wrappedFiles?: number }).__wrappedFiles = files.length;
    } finally { setBusy(false); }
  }, [st, list, i, qr]);

  if (!st) return null;
  const s = list[i];
  return (
    <div role="dialog" aria-modal="true" aria-label={`Tlapka Wrapped – ${st.pet.name}`} className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 animate-fade" data-wrapped>
      <div className="relative w-full max-w-[400px] aspect-[9/16] max-h-[calc(100dvh-110px)] rounded-[28px] overflow-hidden shadow-2xl select-none"
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)}>
        <SlideView key={s.key + i} s={s} i={i} total={list.length} photo={st.pet.photo} qr={qr} />
        <div className="absolute top-3 inset-x-3 flex gap-1.5 z-10" aria-hidden>{list.map((_, k) => <span key={k} className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: themeFor(i, s.key).sub, opacity: .5 }}><span className="block h-full" data-bar style={{ background: themeFor(i, s.key).ink, width: k < i ? '100%' : k === i ? `${prog * 100}%` : '0%' }} /></span>)}</div>
        <button aria-label="Zavřít" onClick={onClose} className="absolute top-6 right-3 z-20 w-11 h-11 rounded-full bg-black/25 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        <button aria-label="Předchozí snímek" onClick={() => setI(Math.max(0, i - 1))} className="absolute left-0 top-16 bottom-16 w-1/3 z-[5]" />
        <button aria-label="Další snímek" onClick={() => setI(Math.min(list.length - 1, i + 1))} className="absolute right-0 top-16 bottom-16 w-2/3 z-[5]" />
      </div>
      <div className="w-full max-w-[400px] grid grid-cols-2 gap-2.5 mt-3">
        <button disabled={busy} onClick={() => exportPng(false)} data-wr-share className="press min-h-[48px] rounded-2xl font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">{busy ? 'Připravuji…' : 'Sdílet do Stories'}</button>
        <button disabled={busy} onClick={() => exportPng(true)} data-wr-all className="press min-h-[48px] rounded-2xl font-bold text-white bg-white/15 ring-1 ring-white/25">Uložit celý příběh</button>
      </div>
    </div>
  );
}
function dl(b: Blob, name: string) { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); }

/** Entry card (dashboard + pet detail). */
export function WrappedCard({ compact = false }: { compact?: boolean }) {
  const { data } = useStore(); const [open, setOpen] = useState<string | null>(null); const [pick, setPick] = useState(false);
  if (!data.pets.length) return null;
  const y = new Date().getFullYear(); const late = new Date().getMonth() >= 11;
  const go = () => (data.pets.length > 1 ? setPick(true) : setOpen(data.pets[0].id));
  return (
    <>
      <button onClick={go} data-wrapped-card className={`press w-full text-left rounded-[22px] p-4 flex items-center gap-4 text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] shadow-[0_14px_30px_-16px_rgba(127,179,232,.9)] relative overflow-hidden ${compact ? '' : 'min-h-[92px]'}`}>
        <span aria-hidden className="absolute inset-0 opacity-[.12]" style={{ backgroundImage: 'radial-gradient(#0F2540 1.6px, transparent 1.8px)', backgroundSize: '18px 18px' }} />
        <span className="relative w-14 h-14 shrink-0 rounded-2xl bg-white/45 flex items-center justify-center"><PawMark className="w-10 h-10" tile={false} /></span>
        <span className="relative flex-1 min-w-0"><span className="block text-[12px] font-extrabold uppercase tracking-[.12em] opacity-75">Tlapka Wrapped</span><span className="block font-extrabold text-[18px] leading-tight">{late ? `Rok ${y} v příběhu` : 'Zatím letos'}</span><span className="block text-[13px] font-semibold opacity-80">Procházky, léky, zdraví – ke sdílení na Instagram</span></span>
        <span className="relative text-2xl font-bold" aria-hidden>›</span>
      </button>
      {pick && <div role="dialog" aria-label="Čí příběh?" className="fixed inset-0 z-[70] bg-black/40 flex items-end" onClick={() => setPick(false)}><div className="w-full max-w-md mx-auto bg-surface dark:bg-surface-d rounded-t-[28px] p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-lg mb-3">Čí příběh chceš vidět?</p>
        <div className="grid grid-cols-2 gap-3">{data.pets.map((p) => <button key={p.id} onClick={() => { setPick(false); setOpen(p.id); }} className="press min-h-[64px] rounded-2xl bg-primary/10 font-bold text-[16px]">{p.name}</button>)}</div>
      </div></div>}
      {open && <WrappedPlayer petId={open} onClose={() => setOpen(null)} />}
    </>
  );
}
