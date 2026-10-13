import type { AppData } from './types';
import { addDays, today } from './utils';

export function sampleData(): Omit<AppData, 'settings'> {
  const t = today();
  return {
    version: 1,
    pets: [
      {
        id: 'max', name: 'Max', species: 'pes', breed: 'Labrador retriever', sex: 'samec',
        birthDate: addDays(t, -3 * 365 - 40), color: 'Zlatá', microchip: '203098100123456', notes: 'Miluje vodu a aportování.',
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
    visits: [
      { id: 'v1', petId: 'max', date: addDays(t, -40), clinic: 'Veterina U Parku', reason: 'Preventivní prohlídka', notes: 'Vše v pořádku, hlídat váhu.', cost: 650 },
      { id: 'v2', petId: 'mia', date: addDays(t, -110), clinic: 'Veterina U Parku', reason: 'Kastrace', notes: 'Hojení bez komplikací.', cost: 2400 },
      { id: 'v3', petId: 'max', date: addDays(t, -200), clinic: 'Pohotovost Praha', reason: 'Řezná rána na tlapce', notes: 'Šití, antibiotika 7 dní.', cost: 1800 },
    ],
  };
}
