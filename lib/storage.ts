import { Pet, Reminder } from './types';

const PETS_KEY = 'mypet_cz_pets';
const REMINDERS_KEY = 'mypet_cz_reminders';

export function getPets(): Pet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePets(pets: Pet[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PETS_KEY, JSON.stringify(pets));
}

export function addPet(pet: Omit<Pet, 'id'>): Pet {
  const pets = getPets();
  const newPet: Pet = { ...pet, id: crypto.randomUUID() };
  pets.push(newPet);
  savePets(pets);
  return newPet;
}

export function deletePet(id: string): void {
  const pets = getPets().filter((p) => p.id !== id);
  savePets(pets);
}

export function getReminders(): Reminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReminders(reminders: Reminder[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function addReminder(reminder: Omit<Reminder, 'id' | 'done'>): Reminder {
  const reminders = getReminders();
  const newRem: Reminder = { ...reminder, id: crypto.randomUUID(), done: false };
  reminders.push(newRem);
  saveReminders(reminders);
  return newRem;
}
