import { loc } from './i18n';
import type { Reminder, ReminderType, Species } from './types';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (s: string, days: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
export const diffDays = (a: string, b: string) =>
  Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);

export const fmtDate = (s: string) =>
  s ? parse(s).toLocaleDateString(loc(), { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
export const fmtShort = (s: string) =>
  parse(s).toLocaleDateString(loc(), { day: 'numeric', month: 'short' });

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n);
  if (a === 1) return one;
  if (a >= 2 && a <= 4) return few;
  return many;
}

export function relDue(due: string) {
  const d = diffDays(due, today());
  if (d === 0) return 'dnes';
  if (d === 1) return 'zítra';
  if (d === -1) return 'včera';
  if (d > 0) return `za ${d} ${plural(d, 'den', 'dny', 'dní')}`;
  return `před ${-d} ${plural(-d, 'dnem', 'dny', 'dny')}`;
}

export function age(birth: string) {
  if (!birth) return '';
  const b = parse(birth);
  const n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) months--;
  if (months < 0) return '';
  if (months < 12) return `${months} ${plural(months, 'měsíc', 'měsíce', 'měsíců')}`;
  const y = Math.floor(months / 12);
  return `${y} ${plural(y, 'rok', 'roky', 'let')}`;
}

export type Status = 'overdue' | 'soon' | 'ok' | 'done';
export function status(r: Reminder): Status {
  if (r.completedAt) return 'done';
  const d = diffDays(r.dueDate, today());
  if (d < 0) return 'overdue';
  if (d <= 7) return 'soon';
  return 'ok';
}

export const SPECIES: { id: Species; name: string; emoji: string }[] = [
  { id: 'pes', name: 'Pes', emoji: '🐕' },
  { id: 'kocka', name: 'Kočka', emoji: '🐈' },
  { id: 'kralik', name: 'Králík', emoji: '🐇' },
  { id: 'morce', name: 'Morče', emoji: '🐹' },
  { id: 'fretka', name: 'Fretka', emoji: '🦦' },
  { id: 'ptak', name: 'Pták', emoji: '🦜' },
  { id: 'plaz', name: 'Plaz', emoji: '🦎' },
  { id: 'jine', name: 'Jiné', emoji: '🐾' },
];
export const speciesOf = (id: Species) => SPECIES.find((s) => s.id === id) ?? SPECIES[7];

export const BREEDS: Partial<Record<Species, string[]>> = {
  pes: ['Německý ovčák', 'Labrador retriever', 'Zlatý retriever', 'Jezevčík', 'Border collie', 'Čivava', 'Jack Russell teriér', 'Buldok', 'Pudl', 'Kříženec'],
  kocka: ['Britská krátkosrstá', 'Maine Coon', 'Perská', 'Siamská', 'Ragdoll', 'Sphynx', 'Bengálská', 'Evropská', 'Kříženec'],
  kralik: ['Zakrslý', 'Belgický obr', 'Holandský', 'Angorský', 'Kříženec'],
  morce: ['Hladkosrsté', 'Peruánské', 'Habešské', 'Skinny'],
};

export const REMINDER_TYPES: { id: ReminderType; name: string; emoji: string; interval: number }[] = [
  { id: 'ockovani', name: 'Očkování', emoji: '💉', interval: 365 },
  { id: 'odcerveni', name: 'Odčervení', emoji: '💊', interval: 90 },
  { id: 'antiparazitika', name: 'Klíšťata a blechy', emoji: '🛡️', interval: 30 },
  { id: 'veterina', name: 'Veterina', emoji: '🩺', interval: 365 },
  { id: 'pece', name: 'Péče a úprava', emoji: '✂️', interval: 60 },
  { id: 'leky', name: 'Léky', emoji: '💧', interval: 1 },
  { id: 'jine', name: 'Jiné', emoji: '📌', interval: 0 },
];
export const typeOf = (id: ReminderType) => REMINDER_TYPES.find((t) => t.id === id) ?? REMINDER_TYPES[6];

export const PRODUCTS: Partial<Record<ReminderType, string[]>> = {
  odcerveni: ['Milbemax', 'Drontal', 'Caniverm', 'Prazitel', 'Milpro', 'Profender'],
  antiparazitika: ['Bravecto', 'NexGard', 'Simparica', 'Frontline', 'Advantix', 'Seresto obojek', 'Credelio'],
  ockovani: ['Vzteklina', 'DHPPi+L', 'Leptospiróza', 'Kotěcí (RCP)', 'Myxomatóza'],
};

export const INTERVALS = [
  { d: 0, n: 'Jednorázově' },
  { d: 1, n: 'Denně' },
  { d: 7, n: 'Týdně' },
  { d: 14, n: 'Každé 2 týdny' },
  { d: 30, n: 'Měsíčně' },
  { d: 60, n: 'Každé 2 měsíce' },
  { d: 90, n: 'Každé 3 měsíce' },
  { d: 180, n: 'Každého půl roku' },
  { d: 365, n: 'Ročně' },
];
export const intervalName = (d: number) => INTERVALS.find((i) => i.d === d)?.n ?? `Každých ${d} dní`;

export async function resizeImage(file: File, max = 480): Promise<string> {
  const url = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

/** Parse a user-typed Czech number like "1 200,50" → 1200.5; NaN when invalid. */
export const num = (s: string) => {
  const t = s.replace(/[\s\u00a0]/g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};
export const MAX_DOC_BYTES = 25 * 1024 * 1024;
