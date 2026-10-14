/**
 * Odznaky (v1.2) – 30 badges per /workspace/tlapka-research/v1.2-ideas.md (kolo 2, sekce B).
 * Ethics: we reward care & experiences, never quantity of treatment. Meds only "podle plánu" (all scheduled doses, none extra),
 * never vet-visit counts, weighing more often than weekly, weight change, treats/extra food. Memorial pets freeze. Toggle off in Settings.
 * Client computes progress for display; Premium-day rewards are decided by the server (tl_claim_badge) from server-side evidence only.
 */
import type { AppData, Pet } from './types';
import { dayKey, dosesPerDay } from './today';

export type Rarity = 'tecka' | 'bricho' | 'tlapka' | 'zlata' | 'sezonni';
export const RARITY: Record<Rarity, { name: string; reward: string }> = {
  tecka: { name: 'Tečka', reward: '' },
  bricho: { name: 'Bříško', reward: '+1 den Premium' },
  tlapka: { name: 'Tlapka', reward: '+7 dní Premium' },
  zlata: { name: 'Zlatá tečka', reward: '+1 měsíc Premium' },
  sezonni: { name: 'Sezónní', reward: '' },
};
export type Group = 'pece' | 'zdravi' | 'pohyb' | 'cesty' | 'karty' | 'rodina' | 'milniky' | 'sezonni';
export const GROUPS: Record<Group, string> = { pece: 'Péče a pravidelnost', zdravi: 'Zdraví (bezpečně)', pohyb: 'Pohyb a výběhy', cesty: 'Cesty', karty: 'Nákupy a karty', rodina: 'Rodina a sdílení', milniky: 'Milníky', sezonni: 'Sezónní' };
export interface Badge { id: string; name: string; desc: string; rarity: Rarity; group: Group; scope: 'pet' | 'owner'; server?: boolean; season?: [number, number] }
export interface Progress { have: number; need: number; done: boolean }

export const BADGES: Badge[] = [
  { id: 'first_tick', name: 'Dobré ráno, tlapko', desc: 'První odškrtnutý úkol v Tlapka Dni.', rarity: 'tecka', group: 'pece', scope: 'pet' },
  { id: 'days7', name: 'Týden v pohodě', desc: '7 dní péče v řadě (1 volný den týdně se počítá).', rarity: 'tecka', group: 'pece', scope: 'pet' },
  { id: 'days30', name: 'Měsíc jako hodinky', desc: '30 dní péče v řadě.', rarity: 'bricho', group: 'pece', scope: 'pet' },
  { id: 'days100', name: 'Sto dní spolu', desc: '100 dní péče v řadě.', rarity: 'tlapka', group: 'pece', scope: 'pet' },
  { id: 'year365', name: 'Celý rok', desc: '365 dní péče v řadě.', rarity: 'zlata', group: 'pece', scope: 'pet' },
  { id: 'on_time', name: 'Včas a v klidu', desc: 'Prevence nebo očkování odškrtnuté do termínu.', rarity: 'tecka', group: 'zdravi', scope: 'pet' },
  { id: 'vax_ok', name: 'Očkovací pas v cajku', desc: 'Žádné očkování po termínu.', rarity: 'bricho', group: 'zdravi', scope: 'pet' },
  { id: 'course', name: 'Podle plánu', desc: 'Kúra léků dokončená přesně dle předpisu – ani víc, ani míň.', rarity: 'bricho', group: 'zdravi', scope: 'pet' },
  { id: 'papers', name: 'Papíry v pořádku', desc: 'Nahraný první doklad nebo snímek.', rarity: 'tecka', group: 'zdravi', scope: 'pet' },
  { id: 'weight3', name: 'Váha pod dohledem', desc: 'Vážení 3 měsíce po sobě (stačí jednou měsíčně).', rarity: 'tecka', group: 'zdravi', scope: 'pet' },
  { id: 'park1', name: 'První výběh', desc: 'Check-in ve výběhu.', rarity: 'tecka', group: 'pohyb', scope: 'pet' },
  { id: 'park10', name: 'Výběhový štamgast', desc: '10 check-inů ve výbězích.', rarity: 'bricho', group: 'pohyb', scope: 'pet' },
  { id: 'park5x', name: 'Průzkumník', desc: '5 různých výběhů.', rarity: 'bricho', group: 'pohyb', scope: 'pet' },
  { id: 'regions3', name: 'Psí cestovatel po ČR', desc: 'Výběhy ve 3 krajích.', rarity: 'tlapka', group: 'pohyb', scope: 'pet' },
  { id: 'regions14', name: 'Všech 14', desc: 'Check-in ve všech 14 krajích.', rarity: 'zlata', group: 'pohyb', scope: 'pet' },
  { id: 'packed', name: 'Kufr sbalen', desc: 'Dokončený cestovní checklist.', rarity: 'tecka', group: 'cesty', scope: 'pet' },
  { id: 'abroad', name: 'Za hranice', desc: 'Výlet do zahraničí s platným pasem.', rarity: 'bricho', group: 'cesty', scope: 'pet' },
  { id: 'card1', name: 'Karta v kapse', desc: 'První věrnostní karta.', rarity: 'tecka', group: 'karty', scope: 'owner' },
  { id: 'cashier5', name: 'U kasy jako profík', desc: '5× použitý pokladní režim.', rarity: 'bricho', group: 'karty', scope: 'owner' },
  { id: 'family', name: 'Ve dvou se to lépe táhne', desc: 'Pozvaný člen rodiny nebo partner.', rarity: 'tecka', group: 'rodina', scope: 'owner', server: true },
  { id: 'sitter', name: 'Hlídač připraven', desc: 'Vyplněná karta pro hlídače.', rarity: 'tecka', group: 'rodina', scope: 'pet' },
  { id: 'party3', name: 'Tlapka parta', desc: '3 přátelé, kteří Tlapku opravdu používají.', rarity: 'bricho', group: 'rodina', scope: 'owner', server: true },
  { id: 'ambassador10', name: 'Ambasador tlapek', desc: '10 přátel v Tlapce.', rarity: 'tlapka', group: 'rodina', scope: 'owner', server: true },
  { id: 'wrapped', name: 'Wrapped hvězda', desc: 'Sdílený Tlapka Wrapped.', rarity: 'bricho', group: 'rodina', scope: 'pet' },
  { id: 'birthday', name: 'Všechno nejlepší!', desc: 'Narozeniny mazlíčka v Tlapce.', rarity: 'bricho', group: 'milniky', scope: 'pet' },
  { id: 'anniversary', name: 'Rok v Tlapce', desc: 'Výročí registrace mazlíčka.', rarity: 'tlapka', group: 'milniky', scope: 'pet' },
  { id: 'spring_ticks', name: 'Jarní klíště-check', desc: 'Antiparazitní ochrana nastavená do konce dubna.', rarity: 'sezonni', group: 'sezonni', scope: 'pet', season: [3, 4] },
  { id: 'nye', name: 'Silvestr bez stresu', desc: 'Vyplněný plán na Silvestr: bezpečné místo, kontakt na veterináře, známka na obojku.', rarity: 'sezonni', group: 'sezonni', scope: 'pet', season: [12, 1] },
  { id: 'winter_paws', name: 'Zimní tlapky', desc: '10 zimních procházek a připomínka ošetření polštářků.', rarity: 'sezonni', group: 'sezonni', scope: 'pet', season: [12, 2] },
  { id: 'advent', name: 'Advent procházek', desc: '15 z 24 adventních dní s procházkou.', rarity: 'sezonni', group: 'sezonni', scope: 'pet', season: [12, 12] },
];
export const badge = (id: string) => BADGES.find((b) => b.id === id);
export const inSeason = (b: Badge, now = new Date()) => { if (!b.season) return true; const m = now.getMonth() + 1, [a, z] = b.season; return a <= z ? m >= a && m <= z : m >= a || m <= z; };

/** Days with any logged care for a pet (daily tick or med dose). */
export function careDays(data: AppData, petId: string): Set<string> {
  const s = new Set<string>();
  for (const e of data.daily ?? []) if (e.petId === petId) s.add(e.day);
  for (const m of data.meds) if (m.petId === petId) for (const g of m.given ?? []) s.add(dayKey(new Date(g.at)));
  return s;
}
/** Current streak with "polštářek": one missed day per rolling week does not break it. A missed day never scolds. */
export function streak(days: Set<string>, now = new Date()): number {
  let n = 0, misses: number[] = [];
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);            // today not done yet ≠ broken
  for (let i = 0; i < 800; i++) {
    if (days.has(dayKey(d))) n++;
    else { misses = misses.filter((x) => i - x < 7); if (misses.length >= 1) break; misses.push(i); }
    d.setDate(d.getDate() - 1);
  }
  return n;
}
/** 14 krajů by their capitals – a park counts for the nearest one (good enough offline). */
const KRAJE: [string, number, number][] = [['Praha', 50.0755, 14.4378], ['Středočeský', 49.95, 14.6], ['Jihočeský', 48.9745, 14.4743], ['Plzeňský', 49.7384, 13.3736], ['Karlovarský', 50.231, 12.871], ['Ústecký', 50.6607, 14.0323], ['Liberecký', 50.7663, 15.0543], ['Královéhradecký', 50.2092, 15.8328], ['Pardubický', 50.0343, 15.7812], ['Vysočina', 49.3961, 15.5912], ['Jihomoravský', 49.1951, 16.6068], ['Olomoucký', 49.5938, 17.2509], ['Zlínský', 49.2265, 17.6707], ['Moravskoslezský', 49.8209, 18.2625]];
export const krajOf = (lat: number, lon: number) => {
  if (Math.hypot(lat - 50.0755, (lon - 14.4378) * 0.64) < 0.13) return 'Praha';
  return KRAJE.slice(1).reduce((b, k) => (Math.hypot(lat - k[1], (lon - k[2]) * 0.64) < Math.hypot(lat - b[1], (lon - b[2]) * 0.64) ? k : b))[0];
};

const P = (have: number, need: number): Progress => ({ have: Math.min(have, need), need, done: have >= need });
/** Progress for one badge (pet badges need a pet; owner badges ignore it). Server-only badges show local hints but unlock via server. */
export function progress(b: Badge, data: AppData, pet: Pet | undefined, now = new Date(), server: Record<string, boolean> = {}): Progress {
  const pid = pet?.id ?? '';
  const daily = (data.daily ?? []).filter((e) => e.petId === pid);
  const ck = (data.checkins ?? []).filter((c) => c.petId === pid);
  const f = data.flags ?? {};
  const today = dayKey(now);
  switch (b.id) {
    case 'first_tick': return P(daily.length + data.meds.filter((m) => m.petId === pid && (m.given ?? []).length).length ? 1 : 0, 1);
    case 'days7': case 'days30': case 'days100': case 'year365': return P(streak(careDays(data, pid), now), { days7: 7, days30: 30, days100: 100, year365: 365 }[b.id]!);
    case 'on_time': return P(data.reminders.some((r) => r.petId === pid && ['ockovani', 'odcerveni', 'antiparazitika', 'veterina'].includes(r.type) && r.history.some((h, i) => i > 0 || h <= r.dueDate)) ? 1 : 0, 1);
    case 'vax_ok': { const v = data.reminders.filter((r) => r.petId === pid && r.type === 'ockovani' && !r.completedAt); return P(v.length && v.every((r) => r.dueDate >= today) ? 1 : 0, 1); }
    case 'course': {
      // finished course (end date passed) where every scheduled dose was logged once – no more, no less
      const ok = data.meds.some((m) => { if (m.petId !== pid || !m.end || m.end >= today || !m.start) return false; const n = dosesPerDay(m.frequency); if (!n) return false;
        const days = Math.round((Date.parse(m.end) - Date.parse(m.start)) / 864e5) + 1; return (m.given ?? []).length === days * n; });
      return P(ok ? 1 : 0, 1);
    }
    case 'papers': return P(data.docs.some((d) => d.petId === pid) ? 1 : 0, 1);
    case 'weight3': { const months = new Set((pet?.weights ?? []).map((w) => w.date.slice(0, 7))); let run = 0; const d = new Date(now); for (let i = 0; i < 24; i++) { const k = d.toISOString().slice(0, 7); if (months.has(k)) run++; else if (i > 0) break; d.setMonth(d.getMonth() - 1); } return P(run, 3); }
    case 'park1': return P(ck.length, 1);
    case 'park10': return P(ck.length, 10);
    case 'park5x': return P(new Set(ck.map((c) => c.parkId)).size, 5);
    case 'regions3': return P(new Set(ck.map((c) => c.region).filter(Boolean)).size, 3);
    case 'regions14': return P(new Set(ck.map((c) => c.region).filter(Boolean)).size, 14);
    case 'packed': return P(f[`packed:${pid}`] ? 1 : 0, 1);
    case 'abroad': return P(f[`abroad:${pid}`] ? 1 : 0, 1);
    case 'card1': return P(data.cards.length, 1);
    case 'cashier5': return P(data.cards.reduce((a, c) => a + Math.min(c.uses ?? 0, 999), 0), 5);
    case 'family': case 'party3': case 'ambassador10': return P(server[b.id] ? 1 : 0, 1);
    case 'sitter': return P(pet?.care && (pet.care.feeding.length || pet.care.walks || pet.care.habits) ? 1 : 0, 1);
    case 'wrapped': return P(f[`wrapped:${pid}`] ? 1 : 0, 1);
    case 'birthday': { if (!pet?.birthDate) return P(0, 1); const created = pet.createdAt?.slice(0, 10) ?? today; const bd = pet.birthDate.slice(5); const y = now.getFullYear();
      const hits = [y, y - 1].map((yy) => `${yy}-${bd}`).filter((x) => x >= created && x <= today); return P(hits.length ? 1 : 0, 1); }
    case 'anniversary': { const c = pet?.createdAt?.slice(0, 10); if (!c) return P(0, 365); const d = Math.floor((Date.parse(today) - Date.parse(c)) / 864e5); return P(Math.max(0, d), 365); }
    case 'spring_ticks': return P(data.reminders.some((r) => r.petId === pid && r.type === 'antiparazitika' && !r.completedAt && r.dueDate >= `${now.getFullYear()}-03-01` && r.history.length > 0) ? 1 : 0, 1);
    case 'nye': return P(f[`nye:${pid}`] ? 1 : 0, 1);
    case 'winter_paws': { const w = daily.filter((e) => e.kind === 'walk' && /-(12|01|02)-/.test(e.day)).length; const rem = data.reminders.some((r) => r.petId === pid && /polšt|tlap/i.test(r.title)); return P(Math.min(w, 10) + (rem ? 1 : 0), 11); }
    case 'advent': { const y = now.getMonth() === 11 ? now.getFullYear() : now.getFullYear() - 1; const s = new Set(daily.filter((e) => e.kind === 'walk' && e.day >= `${y}-12-01` && e.day <= `${y}-12-24`).map((e) => e.day)); return P(s.size, 15); }
  }
  return P(0, 1);
}

/** Newly unlocked (not yet in data.badges). Memorial pets and disabled badges never unlock anything. */
export function newlyEarned(data: AppData, now = new Date(), server: Record<string, boolean> = {}): { id: string; petId: string }[] {
  if (data.settings.badges === false) return [];
  const have = new Set((data.badges ?? []).map((b) => `${b.id}:${b.petId}`));
  const out: { id: string; petId: string }[] = [];
  for (const b of BADGES) {
    if (b.scope === 'owner') { if (!have.has(`${b.id}:`) && progress(b, data, data.pets[0], now, server).done) out.push({ id: b.id, petId: '' }); continue; }
    for (const p of data.pets) {
      if (p.memorial || have.has(`${b.id}:${p.id}`)) continue;
      if (b.season && !inSeason(b, now)) continue;
      if (progress(b, data, p, now, server).done) out.push({ id: b.id, petId: p.id });
    }
  }
  return out;
}
/** Next badge to show on the widget ring / dashboard (closest unfinished, non-seasonal out of season skipped). */
export function nextBadge(data: AppData, pet: Pet, now = new Date()) {
  const have = new Set((data.badges ?? []).filter((b) => b.petId === pet.id || b.petId === '').map((b) => b.id));
  return BADGES.filter((b) => !have.has(b.id) && !b.server && inSeason(b, now)).map((b) => ({ b, p: progress(b, data, pet, now) }))
    .filter((x) => !x.p.done && x.p.have > 0).sort((a, z) => z.p.have / z.p.need - a.p.have / a.p.need)[0];
}
