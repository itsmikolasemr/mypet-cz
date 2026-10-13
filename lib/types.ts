export type Species =
  | 'pes'
  | 'kočka'
  | 'králík'
  | 'morče'
  | 'fretka'
  | 'pták'
  | 'plaz'
  | 'ryba'
  | 'kůň'
  | 'jiné';

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed?: string;
  sex?: 'samec' | 'samice' | 'neznámé';
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  color?: string;
  microchip?: string;
  notes?: string;
}

export interface Reminder {
  id: string;
  petId: string;
  type: 'odčervení' | 'očkování' | 'kontrola';
  dueDate: string;
  done: boolean;
}

export interface VetVisit {
  id: string;
  petId: string;
  date: string;
  clinic?: string;
  reason: string;
  notes?: string;
  cost?: number;
}

export interface Deworming {
  id: string;
  petId: string;
  date: string;
  product: string;
  nextDue?: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  date: string;
  type: string;
  nextDue?: string;
}
