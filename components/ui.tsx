'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Pet } from '@/lib/types';
import { speciesOf, type Status } from '@/lib/utils';

type IconName = 'home' | 'paw' | 'bell' | 'heart' | 'cog' | 'plus' | 'check' | 'x' | 'chev' | 'back' | 'edit' | 'trash' | 'camera' | 'scale' | 'repeat' | 'download' | 'upload' | 'moon';
const P: Record<IconName, string> = {
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
    <div className={`${size} ${text} rounded-2xl bg-secondary/25 dark:bg-secondary/15 flex items-center justify-center shrink-0`}>{speciesOf(pet.species).emoji}</div>
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
      <div className="relative w-[calc(100%-16px)] max-w-md max-h-[90dvh] overflow-y-auto rounded-[30px] bg-surface/95 dark:bg-surface-d/95 backdrop-blur-xl ring-1 ring-ink/5 dark:ring-white/10 shadow-float dark:shadow-float-d animate-up" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
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
    primary: 'bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] text-white shadow-[0_8px_20px_-8px_rgba(232,85,58,.6)]',
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

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6 animate-fade">
      <div className="mx-auto w-24 h-24 rounded-[30px] bg-surface dark:bg-surface-d shadow-float dark:shadow-float-d flex items-center justify-center text-5xl mb-5 animate-float">{emoji}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted mt-1 text-[15px]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STATUS: Record<Status, [string, string]> = {
  overdue: ['Po termínu', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'],
  soon: ['Brzy', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
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
        <div className={`flex items-center justify-between gap-3 rounded-[26px] px-4 transition-all duration-300 ${scrolled ? 'py-2.5 bg-surface/70 dark:bg-surface-d/70 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-ink/5 dark:ring-white/10 shadow-float dark:shadow-float-d' : 'py-2'}`}>
          <div className="min-w-0">
            {sub && <p className={`text-sm text-muted first-letter:uppercase transition-all duration-300 ${scrolled ? 'h-0 opacity-0' : 'h-5 opacity-100'} overflow-hidden`}>{sub}</p>}
            <h1 className={`font-bold tracking-tight truncate transition-all duration-300 ${scrolled ? 'text-lg' : 'text-[30px] leading-tight'}`}>{title}</h1>
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
      className="fab shrink-0 w-12 h-12 rounded-full text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] shadow-[0_10px_24px_-8px_rgba(232,85,58,.6)] flex items-center justify-center">
      <Icon name="plus" className="w-6 h-6" />
    </button>
  );
}

export function Logo({ className = 'h-8' }: { className?: string }) {
  return (
    <svg viewBox="80 80 1820 640" className={className} role="img" aria-label="Tlapka">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF9A5A" /><stop offset="1" stopColor="#E8553A" /></linearGradient></defs>
      <g transform="translate(80 80) scale(0.625)">
        <rect width="1024" height="1024" rx="230" fill="url(#lg)" />
        <g fill="#FFF8F0"><ellipse cx="512" cy="640" rx="190" ry="160" /><ellipse cx="300" cy="430" rx="72" ry="96" transform="rotate(-25 300 430)" /><ellipse cx="430" cy="320" rx="76" ry="102" transform="rotate(-8 430 320)" /><ellipse cx="594" cy="320" rx="76" ry="102" transform="rotate(8 594 320)" /><ellipse cx="724" cy="430" rx="72" ry="96" transform="rotate(25 724 430)" /></g>
        <path d="M512 700c-30-34-92-50-92-102 0-30 24-52 50-52 18 0 32 10 42 24 10-14 24-24 42-24 26 0 50 22 50 52 0 52-62 68-92 102z" fill="#F26B3A" />
      </g>
      <text x="820" y="510" fontFamily="var(--font), system-ui, sans-serif" fontWeight="700" fontSize="300" fill="currentColor" letterSpacing="-6">tlapka</text>
      <circle cx="1810" cy="488" r="26" fill="#F26B3A" />
    </svg>
  );
}
