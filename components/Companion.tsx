'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Pet } from '@/lib/types';
import { diffDays, REMINDER_TYPES, speciesOf, status, today } from '@/lib/utils';
const low = (t: string) => (REMINDER_TYPES.some((x) => x.name === t) ? t.toLowerCase() : t);
import { useAmbient } from './ambient';

export type Mood = 'happy' | 'ok' | 'sad';

/** Care score 0–100 from the pet's reminders: overdue items hurt, recent completions help. */
export function careOf(data: AppData, petId: string) {
  const rs = data.reminders.filter((r) => r.petId === petId);
  const overdue = rs.filter((r) => status(r) === 'overdue');
  const dueToday = rs.filter((r) => !r.completedAt && r.dueDate === today());
  const recent = rs.flatMap((r) => r.history.map((h) => ({ h, r }))).filter(({ h }) => diffDays(today(), h) <= 7).sort((a, b) => b.h.localeCompare(a.h));
  const worst = overdue.reduce((m, r) => Math.max(m, diffDays(today(), r.dueDate)), 0);
  let score = 100 - overdue.length * 22 - Math.min(30, worst) - dueToday.length * 6 + Math.min(10, recent.length * 5);
  score = Math.max(0, Math.min(100, score));
  const mood: Mood = overdue.length ? (score >= 50 ? 'ok' : 'sad') : score >= 80 ? 'happy' : score >= 50 ? 'ok' : 'sad';
  return { score, mood, overdue, dueToday, recent };
}

function line(pet: Pet, c: ReturnType<typeof careOf>) {
  // keep it short: max ~40 chars, never wraps over 2 lines in the bubble
  if (c.overdue.length) {
    const r = c.overdue[0]; const d = diffDays(today(), r.dueDate);
    return `${r.product || r.title}: ${d === 1 ? 'včera' : `${d} ${d < 5 ? 'dny' : 'dní'}`} po termínu 🥺`;
  }
  if (c.dueToday.length) return `Dnes: ${low(c.dueToday[0].title)} 💪`;
  if (c.recent.length) return `Díky za ${c.recent[0].r.product || low(c.recent[0].r.title)}! 💛`;
  return `${pet.sex === 'samice' ? 'Spokojená' : 'Spokojený'}. Pojď si hrát! 🐾`;
}

export function Companion({ data, pets, onOpen }: { data: AppData; pets: Pet[]; onOpen: (id: string) => void }) {
  const [idx, setIdx] = useState(0);
  const [bump, setBump] = useState(0);
  const pet = pets[Math.min(idx, pets.length - 1)];
  const n = pets.length;
  const go = (d: number) => { setIdx((i) => (Math.min(i, n - 1) + d + n) % n); try { navigator.vibrate?.(8); } catch {} };
  const swiped = useRef(false);
  const sw = useRef<{ x: number; y: number; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [peek, setPeek] = useState(false);
  useEffect(() => { if (n > 1 && !localStorage.getItem('tlapka:hint:peek') && !matchMedia('(prefers-reduced-motion: reduce)').matches) setPeek(true); }, [n]);
  const onDown = (e: React.PointerEvent) => { swiped.current = false; if (n < 2) return; sw.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
  const onMove = (e: React.PointerEvent) => { const s0 = sw.current; if (!s0 || s0.id !== e.pointerId) return; const x = e.clientX - s0.x, y = e.clientY - s0.y; if (Math.abs(x) > Math.abs(y) && Math.abs(x) > 6) setDx(x); };
  const onUp = (e: React.PointerEvent) => { const s0 = sw.current; sw.current = null; if (!s0) return; const x = e.clientX - s0.x; setDx(0); if (Math.abs(x) > 50) { swiped.current = true; go(x < 0 ? 1 : -1); } };
  const c = useMemo(() => careOf(data, pet.id), [data, pet.id]);
  const ambient = useAmbient(pet.photo);
  const cat = pet.species === 'kocka';
  const fur = ambient ?? (cat ? '#C9B8A8' : '#E3B27A');
  const pet_ = () => { setBump((b) => b + 1); try { navigator.vibrate?.(c.mood === 'sad' ? [10, 40, 10] : 15); } catch {} };
  const f = pet.sex === 'samice';
  const label = c.overdue.length ? (c.mood === 'sad' ? (f ? 'Smutná' : 'Smutný') : 'Čeká na péči') : { happy: f ? 'Šťastná' : 'Šťastný', ok: 'V pohodě', sad: f ? 'Smutná' : 'Smutný' }[c.mood];
  const R = 46, C = 2 * Math.PI * R;
  return (
    <section aria-roledescription="karusel" aria-label={`Živý mazlíček ${pet.name}: ${label}, péče ${c.score} %`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { sw.current = null; setDx(0); }}
      onClickCapture={(e) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; } }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }}
      style={{ touchAction: 'pan-y' }} data-pet={pet.id} className="companion-card select-none relative rounded-[30px] p-5 pb-4 overflow-hidden bg-surface dark:bg-surface-d shadow-float dark:shadow-float-d ring-1 ring-ink/5 dark:ring-white/10">
      <div aria-hidden className="absolute inset-0 opacity-60 dark:opacity-40 transition-colors duration-700" style={{ background: `radial-gradient(120% 90% at 20% 0%, ${fur}55, transparent 60%), radial-gradient(90% 80% at 100% 100%, ${c.mood === 'sad' ? '#7aa2c855' : '#A9CEF344'}, transparent 60%)` }} />
      <div onAnimationEnd={() => { setPeek(false); localStorage.setItem('tlapka:hint:peek', '1'); }} className={`relative flex items-center gap-4 transition-transform duration-200 ${peek ? 'peek-hint' : ''}`} style={{ transform: dx ? `translateX(${dx * 0.35}px)` : undefined }} key={pet.id}>
        <button onClick={pet_} aria-label={`Pohladit ${pet.name}`} className={`companion mood-${c.mood} relative w-[132px] h-[132px] shrink-0`} key={bump}>
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="6" className="stroke-ink/10 dark:stroke-white/10" />
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="6" strokeLinecap="round" stroke="url(#ring)" strokeDasharray={C} strokeDashoffset={C * (1 - c.score / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.3,1.2,.5,1)' }} />
            <defs><linearGradient id="ring"><stop offset="0" stopColor={c.mood === 'sad' ? '#7aa2c8' : '#A9CEF3'} /><stop offset="1" stopColor={c.mood === 'sad' ? '#4f7bb0' : '#7FB3E8'} /></linearGradient></defs>
          </svg>
          <svg viewBox="0 0 120 120" className="relative w-full h-full" aria-hidden>
            <g className="c-body">
              {/* tail */}
              <path className="c-tail" d={cat ? 'M86 86 C 104 84, 108 64, 98 56' : 'M84 84 C 98 82, 102 70, 100 62'} fill="none" stroke={fur} strokeWidth={cat ? 6 : 8} strokeLinecap="round" />
              {/* body */}
              <ellipse cx="60" cy="86" rx="26" ry="18" fill={fur} />
              <ellipse cx="60" cy="90" rx="14" ry="10" fill="#E4E5E8" opacity=".55" />
              {/* head */}
              <g className="c-head">
                {pet.species === 'kralik' ? (<>
                  <ellipse className="c-ear l" cx="49" cy="24" rx="6" ry="17" fill={fur} />
                  <ellipse className="c-ear r" cx="71" cy="24" rx="6" ry="17" fill={fur} />
                </>) : cat ? (<>
                  <path className="c-ear l" d="M38 44 L42 24 L54 38 Z" fill={fur} />
                  <path className="c-ear r" d="M82 44 L78 24 L66 38 Z" fill={fur} />
                </>) : (<>
                  <ellipse className="c-ear l" cx="36" cy="50" rx="8" ry="15" fill={fur} style={{ filter: 'brightness(.82)' }} />
                  <ellipse className="c-ear r" cx="84" cy="50" rx="8" ry="15" fill={fur} style={{ filter: 'brightness(.82)' }} />
                </>)}
                <circle cx="60" cy="54" r="24" fill={fur} />
                <ellipse cx="60" cy="63" rx="12" ry="9" fill="#E4E5E8" opacity=".7" />
                {/* eyes */}
                <g className="c-eyes">
                  {c.mood === 'happy' ? (<>
                    <path d="M46 52 q4 -5 8 0" stroke="#1D1E22" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                    <path d="M66 52 q4 -5 8 0" stroke="#1D1E22" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                  </>) : (<>
                    <circle cx="50" cy="52" r="3.4" fill="#1D1E22" /><circle cx="70" cy="52" r="3.4" fill="#1D1E22" />
                    <circle cx="51" cy="51" r="1" fill="#fff" /><circle cx="71" cy="51" r="1" fill="#fff" />
                  </>)}
                  {c.mood === 'sad' && (<><path d="M45 47 l9 -3" stroke="#1D1E22" strokeWidth="2" strokeLinecap="round" /><path d="M75 47 l-9 -3" stroke="#1D1E22" strokeWidth="2" strokeLinecap="round" /></>)}
                </g>
                {c.mood === 'sad' && <path className="c-tear" d="M48 57 q-2 4 0 6 q2 -2 0 -6z" fill="#7aa2c8" />}
                <ellipse cx="60" cy="60" rx="3.4" ry="2.4" fill="#1D1E22" />
                <path d={c.mood === 'sad' ? 'M54 68 q6 -4 12 0' : c.mood === 'happy' ? 'M53 64 q7 8 14 0' : 'M55 65 q5 3 10 0'} stroke="#1D1E22" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                {c.mood === 'happy' && (<><circle cx="42" cy="62" r="4" fill="#FF8A7A" opacity=".45" /><circle cx="78" cy="62" r="4" fill="#FF8A7A" opacity=".45" /></>)}
              </g>
            </g>
            {bump > 0 && <g className="c-hearts"><text x="30" y="30" fontSize="14">💛</text><text x="78" y="24" fontSize="11">💛</text><text x="56" y="16" fontSize="12">💛</text></g>}
          </svg>
          {!pet.photo && !['pes', 'kocka'].includes(pet.species) && <span aria-hidden className="absolute -right-1 -bottom-1 w-9 h-9 rounded-full bg-surface dark:bg-surface-d shadow-card flex items-center justify-center text-lg">{speciesOf(pet.species).emoji}</span>}
          {pet.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pet.photo} alt="" className="absolute -right-1 -bottom-1 w-9 h-9 rounded-full object-cover ring-[3px] ring-surface dark:ring-surface-d shadow-card" />)}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-wider text-muted">{label} · péče {c.score} %</p>
          <button onClick={() => onOpen(pet.id)} className="text-left text-2xl font-bold leading-tight truncate max-w-full min-h-[44px]">{pet.name}</button>
          <div className="mt-2 relative rounded-2xl rounded-tl-md bg-bg/90 dark:bg-white/[0.07] px-3 py-2 text-[14px] leading-snug ring-1 ring-ink/5 dark:ring-white/10 animate-fade" key={pet.id + c.mood}>{line(pet, c)}</div>
        </div>
      </div>
      {n > 1 && (
        <div className="relative flex items-center justify-between mt-3 -mx-1">
          <button onClick={() => go(-1)} aria-label="Předchozí mazlíček" className="press w-11 h-11 rounded-full flex items-center justify-center text-xl bg-ink/5 dark:bg-white/10">‹</button>
          {n <= 5 ? (
            <div className="flex items-center gap-1" role="tablist" aria-label="Vyber mazlíčka">
              {pets.map((p, i) => (
                <button key={p.id} role="tab" aria-selected={i === idx} aria-label={p.name} onClick={() => setIdx(i)} className="w-11 h-11 flex items-center justify-center">
                  <span className={`block h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-primary' : 'w-2 bg-ink/25 dark:bg-white/30'}`} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] font-semibold text-muted tabular-nums" aria-live="polite">{Math.min(idx, n - 1) + 1} / {n}</p>
          )}
          <button onClick={() => go(1)} aria-label="Další mazlíček" className="press w-11 h-11 rounded-full flex items-center justify-center text-xl bg-ink/5 dark:bg-white/10">›</button>
        </div>
      )}
    </section>
  );
}
