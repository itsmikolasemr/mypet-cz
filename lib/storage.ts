import { Pet, Reminder, VetVisit, Deworming, Vaccination, Document } from './types';

const PETS_KEY = 'mypet_cz_pets';
const REMINDERS_KEY = 'mypet_cz_reminders';
const VISITS_KEY = 'mypet_cz_visits';
const DEWORMINGS_KEY = 'mypet_cz_dewormings';
const VACCINATIONS_KEY = 'mypet_cz_vaccinations';
const DOCUMENTS_KEY = 'mypet_cz_documents';

function safeGet<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeSet<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function getPets(): Pet[] {
  return safeGet<Pet>(PETS_KEY);
}

export function savePets(pets: Pet[]): void {
  safeSet(PETS_KEY, pets);
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
  return safeGet<Reminder>(REMINDERS_KEY);
}

export function saveReminders(reminders: Reminder[]): void {
  safeSet(REMINDERS_KEY, reminders);
}

export function addReminder(reminder: Omit<Reminder, 'id' | 'done'>): Reminder {
  const reminders = getReminders();
  const newRem: Reminder = { ...reminder, id: crypto.randomUUID(), done: false };
  reminders.push(newRem);
  saveReminders(reminders);
  return newRem;
}

export function toggleReminderDone(id: string): void {
  const reminders = getReminders().map((r) =>
    r.id === id ? { ...r, done: !r.done } : r
  );
  saveReminders(reminders);
}

export function getVisits(): VetVisit[] {
  return safeGet<VetVisit>(VISITS_KEY);
}

export function addVisit(visit: Omit<VetVisit, 'id'>): VetVisit {
  const visits = getVisits();
  const newV: VetVisit = { ...visit, id: crypto.randomUUID() };
  visits.push(newV);
  safeSet(VISITS_KEY, visits);
  return newV;
}

export function getDewormings(): Deworming[] {
  return safeGet<Deworming>(DEWORMINGS_KEY);
}

export function addDeworming(d: Omit<Deworming, 'id'>): Deworming {
  const list = getDewormings();
  const newD: Deworming = { ...d, id: crypto.randomUUID() };
  list.push(newD);
  safeSet(DEWORMINGS_KEY, list);
  return newD;
}

export function getVaccinations(): Vaccination[] {
  return safeGet<Vaccination>(VACCINATIONS_KEY);
}

export function addVaccination(v: Omit<Vaccination, 'id'>): Vaccination {
  const list = getVaccinations();
  const newV: Vaccination = { ...v, id: crypto.randomUUID() };
  list.push(newV);
  safeSet(VACCINATIONS_KEY, list);
  return newV;
}

export function getDocuments(): Document[] {
  return safeGet<Document>(DOCUMENTS_KEY);
}

export function addDocument(doc: Omit<Document, 'id' | 'uploadedAt'>): Document {
  const docs = getDocuments();
  const newDoc: Document = { 
    ...doc, 
    id: crypto.randomUUID(), 
    uploadedAt: new Date().toISOString().split('T')[0] 
  };
  docs.push(newDoc);
  safeSet(DOCUMENTS_KEY, docs);
  return newDoc;
}
