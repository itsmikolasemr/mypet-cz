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
