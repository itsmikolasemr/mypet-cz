'use client';

import { useEffect, useState } from 'react';
import { PetCard } from '@/ui/PetCard';
import { PetForm } from '@/ui/PetForm';
import { ReminderCard } from '@/ui/ReminderCard';
import { getPets, addPet, deletePet, getReminders } from '@/lib/storage';
import { Pet, Reminder } from '@/lib/types';

export default function Home() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setPets(getPets());
    setReminders(getReminders());
  }, []);

  const handleAdd = (data: Omit<Pet, 'id'>) => {
    const newPet = addPet(data);
    setPets((prev) => [...prev, newPet]);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deletePet(id);
    setPets((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Moji mazlíčci</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#2E7D6F] text-white text-sm px-3 py-1.5 rounded-lg font-medium"
        >
          + Nový
        </button>
      </div>

      {showForm && (
        <PetForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {pets.length === 0 && !showForm && (
        <p className="text-gray-500 text-center py-8">Zatím žádní mazlíčci. Přidej prvního!</p>
      )}

      <div className="space-y-3">
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} onDelete={handleDelete} />
        ))}
      </div>

      {reminders.length > 0 && (
        <>
          <h2 className="text-xl font-semibold pt-4">Připomínky</h2>
          <div className="space-y-2">
            {reminders.map((r) => {
              const pet = pets.find((p) => p.id === r.petId);
              return (
                <ReminderCard
                  key={r.id}
                  type={r.type}
                  petName={pet?.name || 'Mazlíček'}
                  dueDate={r.dueDate}
                  done={r.done}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
