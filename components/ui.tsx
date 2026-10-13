'use client';
import { useEffect } from 'react';
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
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-surface dark:bg-surface-d shadow-2xl animate-up pb-safe">
        <div className="sticky top-0 z-10 bg-surface/95 dark:bg-surface-d/95 backdrop-blur px-5 pt-3 pb-3 flex items-center justify-between">
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-1 w-10 rounded-full bg-ink/15 dark:bg-white/20" />
          <h2 className="text-lg font-semibold pt-2">{title}</h2>
          <button onClick={onClose} aria-label="Zavřít" className="mt-2 w-9 h-9 rounded-full bg-ink/5 dark:bg-white/10 flex items-center justify-center"><Icon name="x" className="w-4 h-4" /></button>
        </div>
        <div className="px-5 pb-6">{children}</div>
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
export const inputCls = 'w-full rounded-xl bg-bg dark:bg-white/5 text-ink dark:text-white border border-ink/10 dark:border-white/10 px-3.5 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';

export function Button({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }) {
  const v = {
    primary: 'bg-primary text-white shadow-sm shadow-primary/30 active:bg-primary-d',
    ghost: 'border border-ink/10 dark:border-white/15 text-ink dark:text-white',
    soft: 'bg-primary/10 text-primary dark:text-primary-l',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  }[variant];
  return <button {...rest} className={`press inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold disabled:opacity-40 ${v} ${className}`}>{children}</button>;
}

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div';
  return <C onClick={onClick} className={`block w-full text-left rounded-2xl bg-surface dark:bg-surface-d border border-ink/[0.06] dark:border-white/[0.07] shadow-card ${onClick ? 'press' : ''} ${className}`}>{children}</C>;
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6 animate-fade">
      <div className="mx-auto w-20 h-20 rounded-3xl bg-secondary/20 flex items-center justify-center text-4xl mb-4">{emoji}</div>
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
  done: ['Hotovo', 'bg-ink/5 text-muted dark:bg-white/10'],
};
export function StatusPill({ s }: { s: Status }) {
  return <span className={`text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${STATUS[s][1]}`}>{STATUS[s][0]}</span>;
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="flex rounded-xl bg-ink/5 dark:bg-white/10 p-1 gap-1 overflow-x-auto no-scrollbar">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.v ? 'bg-surface dark:bg-surface-d shadow-sm text-ink dark:text-white' : 'text-muted'}`}>{o.l}</button>
      ))}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-2 pb-4">
      <div>
        {sub && <p className="text-sm text-muted">{sub}</p>}
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="press w-11 h-11 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center">
      <Icon name="plus" className="w-5 h-5" />
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
