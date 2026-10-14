/**
 * Tlapka Den (v1.2): today's tasks per pet – meds (Medication.given), feeding (care.feeding) and walks (care.walks / dogs default 2).
 * Same payload drives the in-app „Dnes“ view and the native home-screen widgets (tlapka:widget → App Group / SharedPreferences).
 */
import type { AppData, DailyEntry, DailyKind, Pet } from './types';

export const dosesPerDay = (f: string) => (f === '3× denně' ? 3 : f === '2× denně' ? 2 : f === 'Denně ráno' || f === 'Denně večer' ? 1 : 0);
export const dayKey = (d = new Date()) => d.toLocaleDateString('sv');
export type TaskKind = 'med' | DailyKind;
export interface TodayTask { id: string; petId: string; pet: string; kind: TaskKind; title: string; sub: string; slot: number; time?: string; done: boolean; refId?: string }

export function walksPerDay(p: Pet): number {
  const m = (p.care?.walks ?? '').match(/(\d+)\s*[×x]/i);
  if (m) return Math.min(6, Number(m[1]));
  return p.species === 'pes' ? 2 : 0;
}
const slotTime = (times: string | undefined, i: number) => (times ?? '').split(/[,;/ ]+/).filter((t) => /^\d{1,2}[:.]\d{2}$/.test(t))[i]?.replace('.', ':');

export function todayTasks(data: AppData, now = new Date()): TodayTask[] {
  const day = dayKey(now); const out: TodayTask[] = [];
  const daily = data.daily ?? [];
  for (const p of data.pets) {
    for (const m of data.meds.filter((x) => x.petId === p.id && (!x.end || x.end >= day) && (!x.start || x.start <= day))) {
      const n = dosesPerDay(m.frequency); if (!n) continue;
      const given = (m.given ?? []).filter((g) => dayKey(new Date(g.at)) === day).length;
      for (let i = 0; i < n; i++) out.push({ id: `med:${m.id}:${i}`, petId: p.id, pet: p.name, kind: 'med', title: m.name, sub: `${m.dose}${n > 1 ? ` · ${i + 1}/${n}` : ''}`, slot: i, time: n === 1 ? (m.frequency === 'Denně večer' ? '19:00' : '8:00') : ['8:00', '13:00', '19:00'][i * (n === 2 ? 2 : 1)], done: i < given, refId: m.id });
    }
    for (const f of p.care?.feeding ?? []) {
      const n = Math.max(1, Math.min(5, f.timesPerDay || 1));
      for (let i = 0; i < n; i++) out.push({ id: `feed:${p.id}:${f.id}:${i}`, petId: p.id, pet: p.name, kind: 'feed', title: f.what || 'Krmení', sub: [f.amount, n > 1 ? `${i + 1}/${n}` : ''].filter(Boolean).join(' · '), slot: i, time: slotTime(f.times, i), done: daily.some((e) => e.petId === p.id && e.kind === 'feed' && e.day === day && e.slot === i + hash(f.id)), refId: f.id });
    }
    const w = walksPerDay(p);
    for (let i = 0; i < w; i++) out.push({ id: `walk:${p.id}:${i}`, petId: p.id, pet: p.name, kind: 'walk', title: 'Venčení', sub: w > 1 ? `${i + 1}/${w}` : '', slot: i, time: ['7:00', '12:30', '18:00', '21:00', '15:00', '10:00'][i], done: daily.some((e) => e.petId === p.id && e.kind === 'walk' && e.day === day && e.slot === i) });
  }
  const t = (x?: string) => (x ? Number(x.split(':')[0]) * 60 + Number(x.split(':')[1]) : 9999);
  return out.sort((a, b) => Number(a.done) - Number(b.done) || t(a.time) - t(b.time));
}
/** feeding slot ids are namespaced per feeding row so two rows don't collide */
export function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997; return h * 10; }

/** Apply a tick (from the app or a widget) – returns new data. Idempotent: ticking a done task is a no-op. */
export function applyTick(data: AppData, taskId: string, by?: string, at = new Date()): AppData {
  const task = todayTasks(data, at).find((x) => x.id === taskId);
  if (!task || task.done) return data;
  if (task.kind === 'med') return { ...data, meds: data.meds.map((m) => (m.id === task.refId ? { ...m, given: [...(m.given ?? []), { at: at.toISOString(), by }].slice(-400) } : m)) };
  const e: DailyEntry = { id: `${taskId}:${dayKey(at)}`, petId: task.petId, kind: task.kind, day: dayKey(at), slot: task.kind === 'feed' ? task.slot + hash(task.refId!) : task.slot, at: at.toISOString(), ...(task.kind === 'walk' ? { minutes: 30 } : {}), by };
  return { ...data, daily: [...(data.daily ?? []), e].slice(-4000) };
}
export function undoTick(data: AppData, taskId: string, at = new Date()): AppData {
  const day = dayKey(at); const [kind, a] = taskId.split(':');
  if (kind === 'med') { const m = data.meds.find((x) => x.id === a); if (!m) return data; const g = [...(m.given ?? [])]; for (let i = g.length - 1; i >= 0; i--) if (dayKey(new Date(g[i].at)) === day) { g.splice(i, 1); break; } return { ...data, meds: data.meds.map((x) => (x.id === a ? { ...x, given: g } : x)) }; }
  return { ...data, daily: (data.daily ?? []).filter((e) => e.id !== `${taskId}:${day}`) };
}

/** Compact payload for native widgets (kept < 4 KB). */
export function widgetToday(data: AppData, now = new Date()) {
  const tasks = todayTasks(data, now);
  return {
    v: 2, day: dayKey(now), updated: now.toISOString(),
    done: tasks.filter((t) => t.done).length, total: tasks.length,
    next: tasks.find((t) => !t.done) ?? null,
    tasks: tasks.slice(0, 8).map(({ id, pet, kind, title, sub, time, done }) => ({ id, pet, kind, title, sub, time: time ?? '', done })),
  };
}
