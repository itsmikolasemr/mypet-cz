'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pet } from '@/lib/types';
import { speciesOf, type Status } from '@/lib/utils';

type IconName = 'home' | 'paw' | 'bell' | 'heart' | 'cog' | 'plus' | 'check' | 'x' | 'chev' | 'back' | 'edit' | 'trash' | 'camera' | 'scale' | 'repeat' | 'download' | 'upload' | 'moon' | 'phone';
const P: Record<IconName, string> = {
  phone: 'M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5C10.5 20 4 13.5 3.5 5.6A1.5 1.5 0 0 1 5 4Z',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  paw: 'M8.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 15a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 5 15Zm14 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Zm-7-1c-2.5 0-5 3-5 5 0 1.4 1.2 2 2.5 2 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.3 0 2.5-.6 2.5-2 0-2-2.5-5-5-5Z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Zm4.5 12a1.8 1.8 0 0 0 3 0',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  chev: 'm9 6 6 6-6 6',
  back: 'm15 6-6 6 6 6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  scale: 'M5 4h14l1 16H4zM9 9a3 3 0 0 1 6 0M12 9l1.5-2',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3m13-3v2a4 4 0 0 1-4 4H4',
  download: 'M12 4v11m-4-4 4 4 4-4M5 20h14',
  upload: 'M12 16V5m-4 4 4-4 4 4M5 20h14',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
};
export function Icon({ name, className = 'w-5 h-5', fill = false }: { name: IconName; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name]} />
    </svg>
  );
}

export function Avatar({ pet, size = 'w-12 h-12', text = 'text-2xl' }: { pet: Pet; size?: string; text?: string }) {
  return pet.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={pet.photo} alt={pet.name} className={`${size} rounded-2xl object-cover shrink-0`} />
  ) : (
    <div className={`${size} ${text} rounded-2xl bg-secondary/25 dark:bg-secondary/15 flex items-center justify-center shrink-0 text-[#1A4F86] dark:text-primary`} role="img" aria-label={pet.name}><Glyph name={SPECIES_GLYPH[pet.species] ?? 'paw'} className="w-[58%] h-[58%]" /></div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-ink/30 dark:bg-black/60 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className="relative w-[calc(100%-16px)] max-w-md max-h-[90dvh] overflow-y-auto rounded-[30px] bg-surface/95 dark:bg-surface-d/95 backdrop-blur-xl ring-1 ring-ink/5 dark:ring-white/10 shadow-float dark:shadow-float-d animate-up" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px) + 8px)' }}>
        <div className="sticky top-0 z-10 bg-surface/95 dark:bg-surface-d/95 backdrop-blur px-5 pt-3 pb-3 flex items-center justify-between">
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-1 w-10 rounded-full bg-ink/15 dark:bg-white/20" />
          <h2 className="text-lg font-semibold pt-2">{title}</h2>
          <button onClick={onClose} aria-label="Zavřít" className="mt-1 w-11 h-11 rounded-full bg-ink/5 dark:bg-white/10 flex items-center justify-center"><Icon name="x" className="w-4 h-4" /></button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
export const inputCls = 'w-full rounded-2xl bg-bg dark:bg-white/5 text-ink dark:text-white border border-ink/10 dark:border-white/10 px-3.5 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';

export function Button({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }) {
  const v = {
    primary: 'bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-[#0F2540] shadow-[0_8px_20px_-8px_rgba(127,179,232,.6)]',
    ghost: 'border border-ink/10 dark:border-white/15 text-ink dark:text-white',
    soft: 'bg-primary/10 text-primary dark:text-primary-l',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  }[variant];
  return <button {...rest} className={`press inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-semibold disabled:opacity-40 ${v} ${className}`}>{children}</button>;
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div';
  return <C onClick={onClick} className={`block w-full text-left rounded-[22px] bg-surface dark:bg-surface-d ring-1 ring-ink/[0.04] dark:ring-white/[0.06] shadow-card dark:shadow-card-d transition-[transform,box-shadow] duration-200 ${onClick ? 'lift' : ''} ${className}`}>{children}</C>;
}

import { EMOJI_GLYPH, Glyph, SPECIES_GLYPH } from './glyphs';
export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6 animate-fade">
      <div className="mx-auto w-24 h-24 rounded-[30px] bg-surface dark:bg-surface-d shadow-float dark:shadow-float-d flex items-center justify-center text-5xl text-primary-d dark:text-primary mb-5 animate-float">{EMOJI_GLYPH[emoji] ? <Glyph name={EMOJI_GLYPH[emoji]} className="w-12 h-12" /> : <span aria-hidden>{emoji}</span>}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted mt-1 text-[14px]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STATUS: Record<Status, [string, string]> = {
  overdue: ['Po termínu', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'],
  soon: ['Brzy', 'bg-[#DCEBFA] text-[#1F4E7A] dark:bg-[#7FB3E8]/15 dark:text-[#A9CEF3]'],
  ok: ['Naplánováno', 'bg-primary/10 text-primary dark:text-primary-l'],
  done: ['Hotovo', 'bg-ink/5 text-muted dark:bg-white/10 dark:text-white/85'],
};
export function StatusPill({ s }: { s: Status }) {
  return <span className={`text-[12px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${STATUS[s][1]}`}>{STATUS[s][0]}</span>;
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div className="relative grid rounded-full bg-ink/[0.05] dark:bg-white/[0.07] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-full bg-surface dark:bg-white/[0.14] shadow-card dark:shadow-none transition-transform duration-300 ease-spring" style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`relative z-10 whitespace-nowrap rounded-full px-2 min-h-[44px] text-sm font-semibold transition-colors ${value === o.v ? 'text-ink dark:text-white' : 'text-muted'}`}>{o.l}</button>
      ))}
    </div>
  );
}

export function PageHeader({ title, sub, action, fab }: { title: string; sub?: string; action?: React.ReactNode; fab?: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled((was) => (was ? window.scrollY > 4 : window.scrollY > 40));
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <>
      <div className="sticky z-30 -mx-2 mb-5" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <div className={`flex items-center justify-between gap-3 rounded-[26px] px-4 transition-all duration-300 ${scrolled ? 'py-2.5 hdr backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-ink/5 dark:ring-white/10 shadow-float dark:shadow-float-d' : 'py-2'}`}>
          <div className="min-w-0">
            {sub && <p className={`text-sm text-muted first-letter:uppercase transition-all duration-300 ${scrolled ? 'h-0 opacity-0' : 'h-5 opacity-100'} overflow-hidden`}>{sub}</p>}
            <h1 className={`font-bold tracking-tight truncate transition-all duration-300 ${scrolled ? 'text-lg' : 'text-[26px] leading-tight'}`}>{title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">{action}{fab}</div>
        </div>
      </div>
    </>
  );
}

export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  // Lives in the page header (not floating) so it never covers list actions or the bottom nav.
  return (
    <button onClick={onClick} aria-label={label}
      className="fab shrink-0 w-12 h-12 rounded-full text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] shadow-[0_10px_24px_-8px_rgba(127,179,232,.6)] flex items-center justify-center">
      <Icon name="plus" className="w-6 h-6" />
    </button>
  );
}

/** "Polštářek" mark: light tile (dark: graphite), 4 graphite toes (dark: white), baby-blue pad. animate = toes then pad (loader / success). */
export function PawMark({ className = 'h-8 w-8', animate = false, loop = false, tile = true, label }: { className?: string; animate?: boolean; loop?: boolean; tile?: boolean; label?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={`${className} ${animate ? (loop ? 'paw-anim paw-loop' : 'paw-anim') : ''}`} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} data-pawmark>
      {tile && <rect width="1024" height="1024" rx="230" className="fill-[#ECEFF3] dark:fill-[#2E3138]" />}
      {[[255, 424.7, -56], [411.1, 304.9, -19], [612.9, 304.9, 19], [769, 424.7, 56]].map(([cx, cy, a], i) => <g key={i} transform={`rotate(${a} ${cx} ${cy})`}><ellipse cx={cx} cy={cy} rx="62" ry="82" className="paw-toe fill-[#3A3D43] dark:fill-white" style={{ animationDelay: `${i * 90}ms` }} /></g>)}
      <circle cx="512" cy="598" r="200" fill="#7FB3E8" className="paw-pad" />
    </svg>
  );
}

/** Small looping loader built from the brand mark (toes → pad). */
export function PawLoader({ label = 'Načítám…', className = 'w-6 h-6' }: { label?: string; className?: string }) {
  return <span role="status" className="inline-flex items-center gap-2"><PawMark className={className} animate loop tile={false} /><span>{label}</span></span>;
}

export function Logo({ className = 'h-8', animate = false }: { className?: string; animate?: boolean }) {
  const px = Number(className.match(/(?:^|\s)h-(\d+)/)?.[1] ?? 8) * 4;
  // Polštářek logo: mark + Manrope ExtraBold wordmark (approved logo asset; the UI itself uses Inter) + round baby-blue "pad" period. Colours follow the theme (light/dark/Sklo).
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: px * 0.22 }} role="img" aria-label="Tlapka" data-logo>
      <PawMark animate={animate} className="h-full w-auto aspect-square shrink-0" />
      <span aria-hidden className="tracking-[-0.03em] leading-none text-[#2E3138] dark:text-white" style={{ fontSize: px * 0.62, fontFamily: 'var(--font-logo), var(--font), sans-serif', fontWeight: 800 }}>Tlapka<span className="inline-block rounded-full bg-[#7FB3E8] align-baseline ml-[0.04em]" style={{ width: '0.15em', height: '0.15em' }} /></span>
    </span>
  );
}

const MONTHS_CZ = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
/** Czech date picker (den. měsíc rok) – never mm/dd/yyyy regardless of browser locale. Value/onChange in ISO YYYY-MM-DD ('' = empty). */
export function DateInput({ value, onChange, min, max, required, label }: { value: string; onChange: (v: string) => void; min?: string; max?: string; required?: boolean; label?: string }) {
  const [y, m, d] = (value || '--').split('-');
  const [part, setPart] = useState({ y: y || '', m: m || '', d: d || '' });
  useEffect(() => { const [a, b, c] = (value || '--').split('-'); setPart({ y: a || '', m: b || '', d: c || '' }); }, [value]);
  const now = new Date().getFullYear();
  const y0 = min ? Number(min.slice(0, 4)) : now - 30, y1 = max ? Number(max.slice(0, 4)) : now + 5;
  const years = Array.from({ length: Math.max(1, y1 - Math.min(y0, now - 30) + 1) }, (_, i) => y1 - i).filter((v) => v >= (min ? y0 : now - 30));
  const dim = part.y && part.m ? new Date(Number(part.y), Number(part.m), 0).getDate() : 31;
  const upd = (k: 'y' | 'm' | 'd', v: string) => {
    const n = { ...part, [k]: v }; if (n.d && Number(n.d) > (n.y && n.m ? new Date(Number(n.y), Number(n.m), 0).getDate() : 31)) n.d = '';
    setPart(n); if (n.y && n.m && n.d) onChange(`${n.y}-${n.m}-${n.d}`); else if (!n.y && !n.m && !n.d) onChange('');
  };
  const sel = 'min-w-0 w-full min-h-[48px] rounded-2xl px-2 bg-ink/5 dark:bg-white/10 text-[15px] font-medium appearance-none text-center';
  return (
    <span className="grid grid-cols-[1fr_2fr_1.4fr] gap-2" role="group" aria-label={label ?? 'Datum'} data-date-input>
      <select aria-label="Den" required={required} className={sel} value={part.d} onChange={(e) => upd('d', e.target.value)}><option value="">den</option>{Array.from({ length: dim }, (_, i) => String(i + 1).padStart(2, '0')).map((v) => <option key={v} value={v}>{Number(v)}.</option>)}</select>
      <select aria-label="Měsíc" required={required} className={sel} value={part.m} onChange={(e) => upd('m', e.target.value)}><option value="">měsíc</option>{MONTHS_CZ.map((n, i) => <option key={n} value={String(i + 1).padStart(2, '0')}>{n}</option>)}</select>
      <select aria-label="Rok" required={required} className={sel} value={part.y} onChange={(e) => upd('y', e.target.value)}><option value="">rok</option>{years.map((v) => <option key={v} value={String(v)}>{v}</option>)}</select>
    </span>
  );
}
