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
  /** Předávací karta pro hlídače */
  care?: PetCare;
  /** v1.2: vzpomínkový režim – mazlíček zemřel; odznaky, série a výzvy se zastaví, sbírka zůstane */
  memorial?: string;
}

export interface Feeding { id: string; what: string; amount: string; timesPerDay: number; times: string; notes?: string }
export interface Contact { name: string; phone: string; note?: string }
export interface PetCare {
  feeding: Feeding[];
  treats?: string;
  water?: string;
  walks?: string;
  habits?: string;
  fears?: string;
  house?: string;
  owner?: Contact;
  backup?: Contact;
  vet?: Contact & { address?: string };
  emergency?: string;
  updated?: string;
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
  cards: LoyaltyCard[];
  trash?: TrashItem[];
  /** v1.2: denní deník (krmení, venčení) – zdroj pro Tlapka Den a Wrapped */
  daily?: DailyEntry[];
  /** v1.2: odemčené odznaky (zdroj pravdy pro odměny je server – tl_claim_badge) */
  badges?: EarnedBadge[];
  /** v1.2: kamarádi mazlíčků přidaní přes QR ve výběhu */
  friends?: PetFriend[];
  /** v1.2: check-iny ve výbězích (GPS ≤ 100 m, max 1 / výběh / den) */
  checkins?: ParkCheckin[];
  /** v1.2: drobné příznaky pro odznaky (sdílený Wrapped, sbalený kufr, výlet do zahraničí, plán na Silvestr…) */
  flags?: Record<string, string>;
  settings: { theme: Theme; onboarded: boolean; notify: boolean; notifyHour: number; dayBefore?: boolean; weekly?: boolean; badges?: boolean; myName?: string };
}

export type TrashColl = 'pets' | 'reminders' | 'visits' | 'docs' | 'meds' | 'allergies' | 'cards';
export interface TrashItem { coll: TrashColl; item: { id: string } & Record<string, unknown>; at: string; group: string }

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
  /** as-needed (Dle potřeby): minimum hours between doses */
  minHours?: number;
  given?: { at: string; by?: string }[];
}

export type Severity = 'mirna' | 'stredni' | 'tezka';
export interface Allergy {
  id: string;
  petId: string;
  allergen: string;
  reaction: string;
  severity: Severity;
}

export type CardStore = 'superzoo' | 'zoobonus' | 'petcenter' | 'fressnapf' | 'hulin' | 'custom';
export type CardFormat = 'EAN13' | 'CODE128' | 'QR';
/** Věrnostní karta: shared within the household (tl_loyalty_cards) */
export interface LoyaltyCard {
  id: string;
  store: CardStore;
  name: string;
  code: string;
  format: CardFormat;
  color?: string;
  notes: string;
  uses: number;
  lastUsed?: string;
  created: string;
}

/** v1.2 – one ticked daily task (feeding / walk). Meds keep using Medication.given. */
export type DailyKind = 'feed' | 'walk';
export interface DailyEntry { id: string; petId: string; kind: DailyKind; day: string; slot: number; at: string; minutes?: number; place?: string; by?: string }

export interface EarnedBadge { id: string; petId: string; at: string; seen?: boolean }
export interface PetFriend { id: string; name: string; species: Species; birthDate?: string; owner?: string; badges?: string[]; avatar?: string; addedAt: string; place?: string }
export interface ParkCheckin { id: string; petId: string; parkId: string; name: string; lat: number; lon: number; region?: string; at: string }
