export type Species = 'pes' | 'kocka' | 'kralik' | 'morce' | 'fretka' | 'ptak' | 'plaz' | 'jine';
export type Sex = 'samec' | 'samice' | 'nezname';

export interface WeightEntry { id: string; date: string; kg: number }

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  birthDate: string;
  color: string;
  microchip: string;
  notes: string;
  photo?: string;
  weights: WeightEntry[];
  createdAt: string;
}

export type ReminderType = 'ockovani' | 'odcerveni' | 'antiparazitika' | 'veterina' | 'pece' | 'leky' | 'jine';

export interface Reminder {
  id: string;
  petId: string;
  type: ReminderType;
  title: string;
  product: string;
  dueDate: string;
  intervalDays: number;
  notes: string;
  history: string[];
  completedAt?: string;
}

export interface Visit {
  id: string;
  petId: string;
  date: string;
  clinic: string;
  reason: string;
  notes: string;
  cost?: number;
}

export type Theme = 'system' | 'light' | 'dark' | 'glass';

export interface AppData {
  version: 1;
  pets: Pet[];
  reminders: Reminder[];
  visits: Visit[];
  docs: DocMeta[];
  meds: Medication[];
  allergies: Allergy[];
  settings: { theme: Theme; onboarded: boolean; notify: boolean; notifyHour: number };
}

export interface DocMeta {
  id: string;
  petId: string;
  name: string;
  kind: 'faktura' | 'rtg' | 'zprava' | 'pas' | 'jine';
  mime: string;
  size: number;
  date: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  dose: string;
  frequency: string;
  start: string;
  end: string;
  notes: string;
  reminderId?: string;
}

export type Severity = 'mirna' | 'stredni' | 'tezka';
export interface Allergy {
  id: string;
  petId: string;
  allergen: string;
  reaction: string;
  severity: Severity;
}
