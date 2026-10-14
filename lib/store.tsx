'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { TrashColl, TrashItem } from './types';
import type { Allergy, AppData, DocMeta, Medication, Pet, Reminder, Visit } from './types';
import { deleteBlob, loadBlob } from './docs';
import { syncNotifications } from './notify';
import { addDays, today, uid } from './utils';
import { sampleData } from './sample';

const KEY = 'tlapka:data:v1';
const empty = (): AppData => ({ version: 1, pets: [], reminders: [], visits: [], docs: [], meds: [], allergies: [], settings: { theme: 'system', onboarded: false, notify: false, notifyHour: 9 } });

export function validate(x: unknown): AppData | null {
  if (!x || typeof x !== 'object') return null;
  const d = x as Partial<AppData>;
  if (!Array.isArray(d.pets) || !Array.isArray(d.reminders) || !Array.isArray(d.visits)) return null;
  return {
    version: 1,
    pets: d.pets.map((p) => ({ ...p, weights: Array.isArray(p.weights) ? p.weights : [] })),
    reminders: d.reminders.map((r) => ({ ...r, history: Array.isArray(r.history) ? r.history : [] })),
    visits: d.visits,
    docs: Array.isArray(d.docs) ? d.docs : [],
    meds: Array.isArray(d.meds) ? d.meds : [],
    allergies: Array.isArray(d.allergies) ? d.allergies : [],
    trash: Array.isArray(d.trash) ? d.trash : [],
    settings: { theme: d.settings?.theme ?? 'system', onboarded: true, notify: !!d.settings?.notify, notifyHour: d.settings?.notifyHour ?? 9 },
  };
}

const TRASH_COLLS: TrashColl[] = ['pets', 'reminders', 'visits', 'docs', 'meds', 'allergies'];
export const TRASH_DAYS = 30;
function withTrash(prev: AppData, next: AppData): AppData {
  if (prev === next) return next;
  const at = new Date().toISOString(), group = Math.random().toString(36).slice(2, 10);
  const add: TrashItem[] = [];
  for (const k of TRASH_COLLS) {
    const a = prev[k] as { id: string }[], b = next[k] as { id: string }[];
    if (a === b) continue;
    const ids = new Set(b.map((x) => x.id));
    for (const x of a) if (!ids.has(x.id)) add.push({ coll: k, item: x as TrashItem['item'], at, group });
  }
  const cutoff = Date.now() - TRASH_DAYS * 864e5;
  const kept = (next.trash ?? []).filter((t) => Date.parse(t.at) > cutoff);
  (next.trash ?? []).forEach((t) => { if (t.coll === 'docs' && Date.parse(t.at) <= cutoff) deleteBlob(t.item.id).catch(() => {}); });
  if (!add.length && kept.length === (next.trash ?? []).length) return next;
  // trashing a photo-heavy pet: drop the inline photo copy to keep localStorage small
  return { ...next, trash: [...add.map((t) => (t.coll === 'pets' ? { ...t, item: { ...t.item, photo: undefined } } : t)), ...kept].slice(0, 300) };
}

function useStoreImpl() {
  const [data, setData] = useState<AppData>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = validate(JSON.parse(raw));
        if (v) setData({ ...v, settings: { ...v.settings, onboarded: !!JSON.parse(raw).settings?.onboarded } });
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { import('@/components/feedback').then((m) => m.notice('Úložiště je plné', 'Zkus menší fotku nebo smaž staré záznamy.')); }
  }, [data, ready]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { syncNotifications(data).catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [data.reminders, data.pets, data.settings.notify, data.settings.notifyHour, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const apply = () => {
      const dark = data.settings.theme === 'dark' || (data.settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      const glass = data.settings.theme === 'glass';
      const root = document.documentElement;
      root.classList.toggle('dark', dark);
      root.classList.toggle('glass', glass);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141917' : glass ? '#E9EAEE' : '#F7F5F2');
    };
    apply();
    const m = matchMedia('(prefers-color-scheme: dark)');
    m.addEventListener('change', apply);
    return () => m.removeEventListener('change', apply);
  }, [data.settings.theme, data.pets]);

  // Every removal lands in a 30-day trash (grouped per action, e.g. pet + its records). Files stay on device until purge.
  const upd = useCallback((f: (d: AppData) => AppData) => setData((d) => withTrash(d, f(d))), []);

  return {
    data, ready,
    savePet: (p: Pet) => upd((d) => ({ ...d, pets: d.pets.some((x) => x.id === p.id) ? d.pets.map((x) => (x.id === p.id ? p : x)) : [...d.pets, p] })),
    deletePet: (id: string) => upd((d) => { return { ...d, docs: d.docs.filter((x) => x.petId !== id), meds: d.meds.filter((x) => x.petId !== id), allergies: d.allergies.filter((x) => x.petId !== id), pets: d.pets.filter((p) => p.id !== id), reminders: d.reminders.filter((r) => r.petId !== id), visits: d.visits.filter((v) => v.petId !== id) }; }),
    saveMed: (m: Medication) => upd((d) => ({ ...d, meds: d.meds.some((x) => x.id === m.id) ? d.meds.map((x) => (x.id === m.id ? m : x)) : [...d.meds, m] })),
    deleteMed: (id: string) => upd((d) => ({ ...d, meds: d.meds.filter((x) => x.id !== id) })),
    saveAllergy: (a: Allergy) => upd((d) => ({ ...d, allergies: d.allergies.some((x) => x.id === a.id) ? d.allergies.map((x) => (x.id === a.id ? a : x)) : [...d.allergies, a] })),
    deleteAllergy: (id: string) => upd((d) => ({ ...d, allergies: d.allergies.filter((x) => x.id !== id) })),
    addDoc: (m: DocMeta) => upd((d) => ({ ...d, docs: [...d.docs, m] })),
    deleteDoc: (id: string) => { upd((d) => ({ ...d, docs: d.docs.filter((x) => x.id !== id) })); },
    setNotify: (notify: boolean, notifyHour?: number) => upd((d) => ({ ...d, settings: { ...d.settings, notify, notifyHour: notifyHour ?? d.settings.notifyHour } })),
    addWeight: (petId: string, kg: number, date: string) => upd((d) => ({ ...d, pets: d.pets.map((p) => (p.id === petId ? { ...p, weights: [...p.weights, { id: uid(), date, kg }].sort((a, b) => a.date.localeCompare(b.date)) } : p)) })),
    deleteWeight: (petId: string, wid: string) => upd((d) => ({ ...d, pets: d.pets.map((p) => (p.id === petId ? { ...p, weights: p.weights.filter((w) => w.id !== wid) } : p)) })),
    saveReminder: (r: Reminder) => upd((d) => ({ ...d, reminders: d.reminders.some((x) => x.id === r.id) ? d.reminders.map((x) => (x.id === r.id ? r : x)) : [...d.reminders, r] })),
    deleteReminder: (id: string) => upd((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id), meds: d.meds.map((m) => (m.reminderId === id ? { ...m, reminderId: undefined } : m)) })),
    completeReminder: (id: string) => upd((d) => ({
      ...d,
      reminders: d.reminders.map((r) => {
        if (r.id !== id) return r;
        const t = today();
        return r.intervalDays > 0
          ? { ...r, history: [...r.history, t], dueDate: addDays(t, r.intervalDays) }
          : { ...r, history: [...r.history, t], completedAt: t };
      }),
    })),
    reopenReminder: (id: string) => upd((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, completedAt: undefined } : r)) })),
    saveVisit: (v: Visit) => upd((d) => ({ ...d, visits: d.visits.some((x) => x.id === v.id) ? d.visits.map((x) => (x.id === v.id ? v : x)) : [...d.visits, v] })),
    deleteVisit: (id: string) => upd((d) => ({ ...d, visits: d.visits.filter((v) => v.id !== id) })),
    setTheme: (theme: AppData['settings']['theme']) => upd((d) => ({ ...d, settings: { ...d.settings, theme } })),
    finishOnboarding: (withSample: boolean) => upd((d) => ({ ...(withSample ? sampleData() : { version: 1 as const, pets: [], reminders: [], visits: [], docs: [], meds: [], allergies: [] }), settings: { ...d.settings, onboarded: true } })),
    importData: async (x: AppData) => {
      // backups carry no files: keep only document records whose file still exists on this device
      const docs = (await Promise.all(x.docs.map(async (d) => ((await loadBlob(d.id, d.mime).catch(() => null)) ? d : null)))).filter((d): d is DocMeta => !!d);
      setData({ ...x, docs });
    },
    applyRemote: (f: (d: AppData) => AppData) => upd(f),
    restoreTrash: (group: string) => setData((d) => {
      const items = (d.trash ?? []).filter((t) => t.group === group);
      const n = { ...d, trash: (d.trash ?? []).filter((t) => t.group !== group) } as AppData;
      for (const t of items) { const arr = n[t.coll] as { id: string }[]; if (!arr.some((x) => x.id === t.item.id)) (n as unknown as Record<string, unknown[]>)[t.coll] = [...arr, t.item]; }
      return n;
    }),
    emptyTrash: () => setData((d) => { (d.trash ?? []).forEach((t) => t.coll === 'docs' && deleteBlob(t.item.id).catch(() => {})); return { ...d, trash: [] }; }),
    reset: () => { data.docs.forEach((x) => deleteBlob(x.id).catch(() => {})); setData(empty()); },
  };
}

type Store = ReturnType<typeof useStoreImpl>;
const Ctx = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const s = useStoreImpl();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
