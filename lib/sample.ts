import type { AppData } from './types';
import { addDays, today } from './utils';

export function sampleData(): Omit<AppData, 'settings'> {
  const t = today();
  return {
    version: 1,
    cards: [],
    pets: [
      {
        id: 'max', name: 'Max', species: 'pes', breed: 'Labrador retriever', sex: 'samec',
        birthDate: addDays(t, -3 * 365 - 40), color: 'Zlatá', microchip: '203098100123456', notes: 'Miluje vodu a aportování.',
        care: { feeding: [{ id: 'f1', what: 'Granule Hypoallergenic', amount: '200 g', timesPerDay: 2, times: '7:30, 18:30' }], walks: '3× denně, večer dlouhá do Stromovky' },
        createdAt: addDays(t, -200),
        weights: [
          { id: 'w1', date: addDays(t, -300), kg: 27.4 }, { id: 'w2', date: addDays(t, -220), kg: 28.9 },
          { id: 'w3', date: addDays(t, -150), kg: 30.1 }, { id: 'w4', date: addDays(t, -90), kg: 31.2 },
          { id: 'w5', date: addDays(t, -30), kg: 30.6 }, { id: 'w6', date: addDays(t, -3), kg: 30.2 },
        ],
      },
      {
        id: 'mia', name: 'Mia', species: 'kocka', breed: 'Britská krátkosrstá', sex: 'samice',
        birthDate: addDays(t, -2 * 365 - 100), color: 'Modrá', microchip: '', notes: 'Bytová kočka.',
        care: { feeding: [{ id: 'f2', what: 'Kapsička', amount: '85 g', timesPerDay: 2, times: '8:00, 19:00' }] },
        createdAt: addDays(t, -150),
        weights: [
          { id: 'w7', date: addDays(t, -180), kg: 3.9 }, { id: 'w8', date: addDays(t, -100), kg: 4.2 },
          { id: 'w9', date: addDays(t, -20), kg: 4.4 },
        ],
      },
    ],
    reminders: [
      { id: 'r1', petId: 'max', type: 'odcerveni', title: 'Odčervení', product: 'Milbemax', dueDate: addDays(t, 5), intervalDays: 90, notes: '1 tableta s jídlem', history: [addDays(t, -85)] },
      { id: 'r2', petId: 'mia', type: 'ockovani', title: 'Očkování', product: 'Kotěcí (RCP)', dueDate: addDays(t, 7), intervalDays: 365, notes: '', history: [] },
      { id: 'r3', petId: 'max', type: 'antiparazitika', title: 'Klíšťata a blechy', product: 'Bravecto', dueDate: addDays(t, -2), intervalDays: 90, notes: '', history: [] },
      { id: 'r4', petId: 'max', type: 'ockovani', title: 'Vzteklina', product: 'Vzteklina', dueDate: addDays(t, 120), intervalDays: 365, notes: 'Zapsat do pasu', history: [] },
      { id: 'r5', petId: 'mia', type: 'pece', title: 'Stříhání drápků', product: '', dueDate: addDays(t, 14), intervalDays: 30, notes: '', history: [] },
    ],
    docs: [],
    meds: [
      { id: 'm1', petId: 'max', name: 'Cosequin', dose: '1 tableta', frequency: 'Denně ráno', start: addDays(t, -60), end: '', notes: 'Kloubní výživa', given: sampleDoses(t) },
    ],
    allergies: [
      { id: 'a1', petId: 'max', allergen: 'Kuřecí maso', reaction: 'Svědění, zarudnutí uší', severity: 'stredni' },
    ],
    daily: sampleDaily(t),
    visits: [
      { id: 'v1', petId: 'max', date: addDays(t, -40), clinic: 'Veterina U Parku', reason: 'Preventivní prohlídka', notes: 'Vše v pořádku, hlídat váhu.', cost: 650 },
      { id: 'v2', petId: 'mia', date: addDays(t, -110), clinic: 'Veterina U Parku', reason: 'Kastrace', notes: 'Hojení bez komplikací.', cost: 2400 },
      { id: 'v3', petId: 'max', date: addDays(t, -200), clinic: 'Pohotovost Praha', reason: 'Řezná rána na tlapce', notes: 'Šití, antibiotika 7 dní.', cost: 1800 },
    ],
  };
}

// v1.2 – realistic history for Tlapka Den + Wrapped demo (walks with dog parks since 1. 1., Cosequin doses with one gap)
const PARKS = ['Stromovka – psí louka', 'Ladronka', 'Výběh Parukářka', 'Riegrovy sady'];
function sampleDoses(t: string) {
  const out: { at: string; by?: string }[] = [];
  for (let i = 58; i >= 1; i--) { if (i === 37) continue; out.push({ at: addDays(t, -i) + 'T07:40:00.000Z' }); }
  return out;
}
function sampleDaily(t: string) {
  const out: import('./types').DailyEntry[] = []; const start = t.slice(0, 4) + '-01-01';
  for (let d = start; d < t; d = addDays(d, 1)) {
    const k = Number(d.slice(8, 10)) + Number(d.slice(5, 7)) * 3; const n = k % 5 === 0 ? 2 : 3;
    for (let s = 0; s < n; s++) out.push({ id: `walk:max:${s}:${d}`, petId: 'max', kind: 'walk', day: d, slot: s, at: d + 'T0' + (7 + s * 5) % 10 + ':00:00.000Z', minutes: s === 2 ? 55 : 25, ...(s === 2 ? { place: PARKS[k % 7 < 4 ? 0 : (k % 4)] } : {}) });
  }
  out.push({ id: `walk:max:0:${t}`, petId: 'max', kind: 'walk', day: t, slot: 0, at: t + 'T07:05:00.000Z', minutes: 25 });
  return out;
}
