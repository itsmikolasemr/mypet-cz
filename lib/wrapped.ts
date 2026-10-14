/**
 * Tlapka Wrapped (v1.2): per-pet year recap („Rok 2026“) or year-to-date („Zatím letos“).
 * Pure function over AppData so it works offline, in tests and for PNG export.
 */
import type { AppData, Pet } from './types';
import { dayKey } from './today';

export interface WrappedStats {
  pet: Pet; year: number; ytd: boolean; from: string; to: string;
  visits: number; clinics: string[]; spent: number;
  doses: number; doseStreak: number; careDone: number;
  walks: number; walkMinutes: number; km: number; parks: string[]; topPark?: string;
  feeds: number;
  weightFrom?: number; weightTo?: number; weightDelta?: number;
  busiestMonth?: { m: number; n: number };
  firstWalk?: string; days: number;
  moments: { date: string; t: string }[];
  persona: { t: string; d: string };
}
const MON = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
export const monthName = (m: number) => MON[m];

export function wrapped(data: AppData, petId: string, year = new Date().getFullYear(), now = new Date()): WrappedStats | null {
  const pet = data.pets.find((p) => p.id === petId); if (!pet) return null;
  const from = `${year}-01-01`; const ytd = year === now.getFullYear(); const to = ytd ? dayKey(now) : `${year}-12-31`;
  const inY = (d?: string) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const visits = data.visits.filter((v) => v.petId === petId && inY(v.date));
  const meds = data.meds.filter((m) => m.petId === petId);
  const given = meds.flatMap((m) => (m.given ?? []).map((g) => dayKey(new Date(g.at)))).filter(inY);
  const daysWithDose = [...new Set(given)].sort();
  let best = 0, run = 0, prev = '';
  for (const d of daysWithDose) { const p = new Date(d); p.setDate(p.getDate() - 1); run = prev === dayKey(p) ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  const daily = (data.daily ?? []).filter((e) => e.petId === petId && inY(e.day));
  const walks = daily.filter((e) => e.kind === 'walk');
  const walkMinutes = walks.reduce((n, e) => n + (e.minutes ?? 30), 0);
  const parkCount = new Map<string, number>(); walks.forEach((w) => w.place && parkCount.set(w.place, (parkCount.get(w.place) ?? 0) + 1));
  const topPark = [...parkCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const careDone = data.reminders.filter((r) => r.petId === petId).reduce((n, r) => n + r.history.filter(inY).length, 0);
  const ws = pet.weights.filter((w) => inY(w.date)).sort((a, b) => a.date.localeCompare(b.date));
  const perMonth = Array(12).fill(0) as number[]; [...walks.map((w) => w.day), ...given, ...visits.map((v) => v.date)].forEach((d) => perMonth[Number(d.slice(5, 7)) - 1]++);
  const bm = perMonth.reduce((b, n, m) => (n > b.n ? { m, n } : b), { m: 0, n: 0 });
  const moments: { date: string; t: string }[] = [];
  visits.forEach((v) => moments.push({ date: v.date, t: v.reason }));
  if (walks[0]) moments.push({ date: walks[0].day, t: 'První zapsaná procházka roku' });
  if (topPark) moments.push({ date: walks.find((w) => w.place === topPark)!.day, t: `Objevení výběhu ${topPark}` });
  if (best >= 7) moments.push({ date: daysWithDose[daysWithDose.length - 1], t: `${best} dní léků v řadě bez vynechání` });
  moments.sort((a, b) => a.date.localeCompare(b.date));
  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1);
  const km = Math.round((walkMinutes / 60) * 4);
  const persona = walks.length > days * 1.2 ? { t: 'Neúnavný průzkumník', d: 'Víc procházek než dní v roce.' }
    : best >= 30 ? { t: 'Vzorný pacient', d: 'Léky jako hodinky.' }
    : pet.species === 'kocka' ? { t: 'Domácí filozof', d: 'Klid, rutina a pohodlí.' }
    : careDone >= 4 ? { t: 'Pečovaný šampion', d: 'Prevence bez jediné mezery.' } : { t: 'Parťák do pohody', d: 'Rok plný malých radostí.' };
  return {
    pet, year, ytd, from, to, visits: visits.length, clinics: [...new Set(visits.map((v) => v.clinic).filter(Boolean))], spent: visits.reduce((n, v) => n + (v.cost ?? 0), 0),
    doses: given.length, doseStreak: best, careDone, walks: walks.length, walkMinutes, km, parks: [...parkCount.keys()], topPark,
    feeds: daily.filter((e) => e.kind === 'feed').length,
    weightFrom: ws[0]?.kg, weightTo: ws[ws.length - 1]?.kg, weightDelta: ws.length > 1 ? Math.round((ws[ws.length - 1].kg - ws[0].kg) * 10) / 10 : undefined,
    busiestMonth: bm.n ? bm : undefined, firstWalk: walks[0]?.day, days, moments: moments.slice(-4), persona,
  };
}

export type Slide = { key: string; kicker: string; big: string; unit?: string; line: string; foot?: string; dots?: number };
const n = (x: number) => x.toLocaleString('cs-CZ');
export function slides(s: WrappedStats): Slide[] {
  const P = s.pet.name; const out: Slide[] = [];
  out.push({ key: 'intro', kicker: s.ytd ? 'Zatím letos' : `Rok ${s.year}`, big: P, line: s.ytd ? `Hlavní role: ${P}. Zatím ${s.days} dní společné péče.` : `Celý rok ${s.year}, hlavní role: ${P}.`, dots: 4 });
  if (s.walks) out.push({ key: 'walks', kicker: 'Procházky', big: n(s.walks), unit: '×', line: `Spolu venku ${n(Math.round(s.walkMinutes / 60))} hodin – zhruba ${n(s.km)} km.`, foot: s.topPark ? `Nejoblíbenější výběh: ${s.topPark}` : undefined });
  if (s.doses) out.push({ key: 'meds', kicker: 'Léky', big: n(s.doses), unit: 'dávek', line: s.doseStreak > 1 ? `Nejdelší série: ${s.doseStreak} dní v řadě.` : 'Každá dávka zapsaná.', dots: Math.min(4, Math.max(1, Math.round(s.doseStreak / 10))) });
  out.push({ key: 'vet', kicker: 'Zdraví', big: n(s.visits), unit: s.visits === 1 ? 'návštěva' : s.visits >= 2 && s.visits <= 4 ? 'návštěvy' : 'návštěv', line: s.careDone ? `${s.careDone}× prevence včas (odčervení, očkování, klíšťata).` : 'Veterinu jste letos nepotřebovali.', foot: s.clinics[0] ? `Nejčastěji: ${s.clinics[0]}` : undefined });
  if (s.weightTo != null) out.push({ key: 'weight', kicker: 'Váha', big: String(s.weightTo).replace('.', ','), unit: 'kg', line: s.weightDelta == null ? 'První vážení roku zapsané.' : s.weightDelta === 0 ? 'Drží formu na gram.' : `${s.weightDelta > 0 ? '+' : '−'}${String(Math.abs(s.weightDelta)).replace('.', ',')} kg od ${String(s.weightFrom).replace('.', ',')} kg.` });
  if (s.spent) out.push({ key: 'money', kicker: 'Výdaje na veterinu', big: n(s.spent), unit: 'Kč', line: `To je ${n(Math.round(s.spent / Math.max(1, s.days / 30.4)))} Kč měsíčně – a stálo to za to.` });
  if (s.busiestMonth) out.push({ key: 'month', kicker: 'Nejrušnější měsíc', big: monthName(s.busiestMonth.m), line: `${n(s.busiestMonth.n)} zapsaných chvil péče.`, foot: s.moments.map((m) => m.t).slice(-2).join(' · ') || undefined });
  out.push({ key: 'persona', kicker: `${P} je`, big: s.persona.t, line: s.persona.d, dots: 4 });
  out.push({ key: 'invite', kicker: 'Tlapka', big: 'Pečuj s námi', line: 'Naskenuj kód a vyzkoušej Tlapku zdarma.', foot: SITE.replace(/^https?:\/\//, '') });
  return out;
}
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mypet-cz.netlify.app';
export const inviteUrl = (petName: string) => `${SITE}/?ref=wrapped&p=${encodeURIComponent(petName)}`;
