'use client';

import { useEffect, useState } from 'react';
import { PetCard } from '@/ui/PetCard';
import { PetForm } from '@/ui/PetForm';
import { ReminderCard } from '@/ui/ReminderCard';
import { ReminderForm } from '@/ui/ReminderForm';
import { HealthForm } from '@/ui/HealthForm';
import { HealthTimeline } from '@/ui/HealthTimeline';
import { DocumentCard } from '@/ui/DocumentCard';
import { DocumentForm } from '@/ui/DocumentForm';
import {
  getPets, addPet, deletePet,
  getReminders, addReminder, toggleReminderDone,
  getVisits, addVisit, getDewormings, addDeworming, getVaccinations, addVaccination,
  getDocuments, addDocument
} from '@/lib/storage';
import { Pet, Reminder, VetVisit, Deworming, Vaccination, Document } from '@/lib/types';

export default function Home() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [dewormings, setDewormings] = useState<Deworming[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showPetForm, setShowPetForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);

  const refresh = () => {
    setPets(getPets());
    setReminders(getReminders());
    setVisits(getVisits());
    setDewormings(getDewormings());
    setVaccinations(getVaccinations());
    setDocuments(getDocuments());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleAddPet = (data: Omit<Pet, 'id'>) => {
    addPet(data);
    refresh();
    setShowPetForm(false);
  };

  const handleDeletePet = (id: string) => {
    deletePet(id);
    refresh();
  };

  const handleAddReminder = (data: Omit<Reminder, 'id' | 'done'>) => {
    addReminder(data);
    refresh();
    setShowReminderForm(false);
  };

  const handleToggleReminder = (id: string) => {
    toggleReminderDone(id);
    refresh();
  };

  const handleAddVisit = (data: any) => {
    addVisit(data);
    refresh();
    setShowHealthForm(false);
  };

  const handleAddDeworming = (data: any) => {
    addDeworming(data);
    refresh();
    setShowHealthForm(false);
  };

  const handleAddVaccination = (data: any) => {
    addVaccination(data);
    refresh();
    setShowHealthForm(false);
  };

  const handleAddDocument = (data: Omit<Document, 'id' | 'uploadedAt'>) => {
    addDocument(data);
    refresh();
    setShowDocumentForm(false);
  };

  // Prepare timeline events
  const timelineEvents = [
    ...visits.map(v => ({ date: v.date, type: 'návštěva' as const, title: `Návštěva: ${v.reason}`, notes: v.clinic })),
    ...dewormings.map(d => ({ date: d.date, type: 'odčervení' as const, title: `Odčervení: ${d.product}` })),
    ...vaccinations.map(v => ({ date: v.date, type: 'očkování' as const, title: `Očkování: ${v.type}` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Moji mazlíčci</h1>
        <button
          onClick={() => setShowPetForm(true)}
          className="bg-[#2E7D6F] text-white text-sm px-3 py-1.5 rounded-lg font-medium"
        >
          + Nový
        </button>
      </div>

      {showPetForm && (
        <PetForm onSubmit={handleAddPet} onCancel={() => setShowPetForm(false)} />
      )}

      {pets.length === 0 && !showPetForm && (
        <p className="text-gray-500 text-center py-8">Zatím žádní mazlíčci. Přidej prvního!</p>
      )}

      <div className="space-y-3">
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} onDelete={handleDeletePet} />
        ))}
      </div>

      {/* Připomínky */}
      <div className="pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Připomínky</h2>
          {pets.length > 0 && (
            <button onClick={() => setShowReminderForm(!showReminderForm)} className="text-sm text-[#2E7D6F] font-medium">
              {showReminderForm ? 'Skrýt' : '+ Přidat'}
            </button>
          )}
        </div>
        {showReminderForm && <ReminderForm pets={pets} onSubmit={handleAddReminder} onCancel={() => setShowReminderForm(false)} />}
        <div className="space-y-2 mt-3">
          {reminders.map((r) => {
            const pet = pets.find((p) => p.id === r.petId);
            return (
              <div key={r.id} onClick={() => handleToggleReminder(r.id)} className="cursor-pointer">
                <ReminderCard
                  type={r.type}
                  petName={pet?.name || 'Mazlíček'}
                  dueDate={r.dueDate}
                  done={r.done}
                />
              </div>
            );
          })}
          {reminders.length === 0 && <p className="text-sm text-gray-400">Žádné připomínky</p>}
        </div>
      </div>

      {/* Zdravotní záznamy */}
      <div className="pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Zdravotní záznamy</h2>
          {pets.length > 0 && (
            <button onClick={() => setShowHealthForm(!showHealthForm)} className="text-sm text-[#2E7D6F] font-medium">
              {showHealthForm ? 'Skrýt' : '+ Přidat'}
            </button>
          )}
        </div>
        {showHealthForm && (
          <HealthForm
            pets={pets}
            onAddVisit={handleAddVisit}
            onAddDeworming={handleAddDeworming}
            onAddVaccination={handleAddVaccination}
            onCancel={() => setShowHealthForm(false)}
          />
        )}
        <div className="mt-4">
          {timelineEvents.length > 0 ? (
            <HealthTimeline events={timelineEvents} />
          ) : (
            <p className="text-sm text-gray-400">Zatím žádné záznamy</p>
          )}
        </div>
      </div>

      {/* Dokumenty */}
      <div className="pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Dokumenty</h2>
          {pets.length > 0 && (
            <button onClick={() => setShowDocumentForm(!showDocumentForm)} className="text-sm text-[#2E7D6F] font-medium">
              {showDocumentForm ? 'Skrýt' : '+ Nahrát'}
            </button>
          )}
        </div>
        {showDocumentForm && <DocumentForm pets={pets} onSubmit={handleAddDocument} onCancel={() => setShowDocumentForm(false)} />}
        <div className="space-y-2 mt-3">
          {documents.map((d) => {
            const pet = pets.find((p) => p.id === d.petId);
            return (
              <DocumentCard
                key={d.id}
                type={d.type}
                uploadedAt={d.uploadedAt}
                fileName={`${d.fileName} (${pet?.name || '?'})`}
              />
            );
          })}
          {documents.length === 0 && <p className="text-sm text-gray-400">Žádné dokumenty</p>}
        </div>
      </div>
    </div>
  );
}
