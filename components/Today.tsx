'use client';
import { FairShareCard } from './Growth';
import { myName } from '@/lib/growth';
import { loc } from '@/lib/i18n';
/** v1.2 „Tlapka Den“ – in-app twin of the home-screen widget: today's meds / feeding / walks, one tap to tick. */
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { todayTasks, type TodayTask } from '@/lib/today';
import { Glyph, type GlyphName } from './glyphs';
import { Card, PageHeader } from './ui';
import { toast } from './feedback';

const KIND: Record<TodayTask['kind'], { g: GlyphName; l: string }> = { med: { g: 'pill', l: 'Lék' }, feed: { g: 'food', l: 'Krmení' }, walk: { g: 'paw', l: 'Venčení' } };

function Ring({ done, total, size = 56 }: { done: number; total: number; size?: number }) {
  const r = 22, c = 2 * Math.PI * r, p = total ? done / total : 0;
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} role="img" aria-label={`Hotovo ${done} z ${total}`} data-ring>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-ink/10 dark:stroke-white/15" />
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" stroke="#7FB3E8" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dasharray .6s cubic-bezier(.3,1.4,.5,1)' }} />
      <text x="28" y="32.5" textAnchor="middle" className="fill-current font-extrabold" fontSize="13">{done}/{total}</text>
    </svg>
  );
}

export function TaskRow({ t, compact = false }: { t: TodayTask; compact?: boolean }) {
  const { tickToday, untickToday } = useStore();
  const k = KIND[t.kind];
  const tick = () => { if (t.done) { untickToday(t.id); return; } tickToday(t.id, myName()); toast(`${t.pet}: ${t.kind === 'walk' ? 'venčení' : t.title} hotovo`, () => untickToday(t.id)); };
  return (
    <div className={`flex items-center gap-3 ${compact ? 'py-2' : 'p-3'} ${t.done ? 'opacity-60' : ''}`} data-task={t.id} data-done={t.done ? '1' : '0'}>
      <span className="w-10 h-10 shrink-0 rounded-2xl bg-primary/10 text-primary-d dark:text-primary flex items-center justify-center"><Glyph name={k.g} /></span>
      <span className="flex-1 min-w-0">
        <span className={`block font-semibold text-[14px] leading-tight truncate ${t.done ? 'line-through decoration-2 decoration-[#7FB3E8]' : ''}`}>{t.kind === 'walk' ? `Venčení – ${t.pet}` : `${t.title}`}</span>
        <span className="block text-[12.5px] text-muted truncate">{[t.time, t.kind === 'walk' ? t.sub : t.pet, t.kind !== 'walk' ? t.sub : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <button onClick={tick} aria-pressed={t.done} aria-label={`${t.done ? 'Vrátit' : 'Odškrtnout'}: ${t.title} – ${t.pet}`}
        className={`press w-11 h-11 shrink-0 rounded-full border-2 flex items-center justify-center transition ${t.done ? 'bg-[#7FB3E8] border-[#7FB3E8] text-[#0F2540]' : 'border-[#7FB3E8] text-[#5E9BDC]'}`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
    </div>
  );
}

/** Dashboard card – same information density as the medium widget. */
export function TodayCard({ open }: { open: () => void }) {
  const { data } = useStore();
  const tasks = useMemo(() => todayTasks(data), [data]);
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.done).length;
  return (
    <section data-today-card>
      <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Dnes</h2><button onClick={open} className="text-sm font-semibold text-primary min-h-[44px] px-2 -mr-2">Celý den ›</button></div>
      <Card className="p-3 pt-2">
        <div className="flex items-center gap-3 px-1 pb-1">
          <Ring done={done} total={tasks.length} size={48} />
          <p className="flex-1 text-[13px] font-semibold leading-snug">{done === tasks.length ? 'Všechno hotovo. Dobrá práce!' : `Zbývá ${tasks.length - done} ${tasks.length - done === 1 ? 'úkol' : tasks.length - done <= 4 ? 'úkoly' : 'úkolů'}`}<span className="block text-[12.5px] font-normal text-muted">Léky, krmení a venčení – i na ploše telefonu.</span></p>
        </div>
        <div className="divide-y divide-ink/5 dark:divide-white/5">{tasks.filter((t) => !t.done).slice(0, 3).map((t) => <TaskRow key={t.id} t={t} compact />)}</div>
      </Card>
    </section>
  );
}

export function TodayScreen() {
  const { data } = useStore();
  const tasks = useMemo(() => todayTasks(data), [data]);
  const done = tasks.filter((t) => t.done).length;
  const byPet = data.pets.map((p) => ({ p, list: tasks.filter((t) => t.petId === p.id) })).filter((x) => x.list.length);
  const d = new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="space-y-5" data-today>
      <PageHeader title="Dnes" sub={d.charAt(0).toUpperCase() + d.slice(1)} />
      <Card className="p-4 flex items-center gap-4">
        <Ring done={done} total={tasks.length} size={72} />
        <div className="flex-1"><p className="font-bold text-lg leading-tight">{done === tasks.length && tasks.length ? 'Den splněn' : `${done} z ${tasks.length} hotovo`}</p>
          <p className="text-[13px] text-muted">Odškrtávat jde i z widgetu na ploše – iPhone i Android.</p></div>
      </Card>
      <WidgetHelp />
      <FairShareCard />
      <NyePlan />
      {!tasks.length && <Card className="p-5 text-center text-muted text-[13px]">Žádné denní úkoly. Přidej krmení a venčení v Předávací kartě (Mazlíček → Sdílet) nebo lék s dávkováním.</Card>}
      {byPet.map(({ p, list }) => (
        <section key={p.id} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted px-1">{p.name} · {list.filter((t) => t.done).length}/{list.length}</h2>
          <Card className="divide-y divide-ink/5 dark:divide-white/5">{list.map((t) => <TaskRow key={t.id} t={t} />)}</Card>
        </section>
      ))}
    </div>
  );
}

function WidgetHelp() {
  const add = async () => {
    const w = await import('@/lib/widget');
    if (await w.pinWidget()) return;
    const ios = w.platform() === 'ios' || w.platform() === 'ios-web';
    const { notice } = await import('./feedback');
    notice('Widget na plochu', ios ? 'Podrž prst na ploše → ＋ vlevo nahoře → najdi Tlapka → vyber velikost (malý, střední nebo na zamčenou obrazovku) → Přidat widget.' : 'Podrž prst na ploše → Widgety → Tlapka → přetáhni „Tlapka Den“ na plochu.');
  };
  return <button onClick={add} data-add-widget className="press w-full min-h-[48px] rounded-2xl font-semibold text-primary bg-primary/10 flex items-center justify-center gap-2"><Glyph name="sparkle" className="w-5 h-5" />Přidat widget na plochu</button>;
}

/** Silvestr (20.–31. 12.): calm plan for fireworks night – the "nye" badge rewards preparing, not anything risky. */
function NyePlan() {
  const { data, setFlag } = useStore(); const n = new Date();
  if (n.getMonth() !== 11 || n.getDate() < 20 || !data.pets.length) return null;
  const done = data.pets.every((p) => p.memorial || data.flags?.[`nye:${p.id}`]);
  return (
    <Card className="p-4"><p className="font-semibold">Plán na Silvestr</p><p className="text-[13px] text-muted mb-2">Klidné místo, zatemnění, jmenovka s telefonem, procházka ještě za světla. Při silné úzkosti se poraď s veterinářem.</p>
      <button disabled={done} onClick={() => data.pets.filter((p) => !p.memorial).forEach((p) => setFlag(`nye:${p.id}`))} className="press w-full min-h-[44px] rounded-2xl font-semibold text-primary bg-primary/10 disabled:opacity-60">{done ? 'Připraveno ✓' : 'Mám připraveno'}</button></Card>
  );
}
