'use client';

import React, { useState } from 'react';
import { Species, Pet } from '../lib/types';

interface Props {
  onSubmit: (pet: Omit<Pet, 'id'>) => void;
  onCancel?: () => void;
}

const SPECIES: { id: Species; label: string }[] = [
  { id: 'pes', label: 'Pes' },
  { id: 'kočka', label: 'Kočka' },
  { id: 'králík', label: 'Králík' },
  { id: 'morče', label: 'Morče' },
  { id: 'fretka', label: 'Fretka' },
  { id: 'pták', label: 'Pták' },
  { id: 'plaz', label: 'Plaz' },
  { id: 'ryba', label: 'Ryba' },
  { id: 'kůň', label: 'Kůň' },
  { id: 'jiné', label: 'Jiné' },
];

export function PetForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('pes');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<'samec' | 'samice' | 'neznámé'>('neznámé');
  const [birthDate, setBirthDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      species,
      breed: breed.trim() || undefined,
      sex,
      birthDate: birthDate || undefined,
    });
    setName('');
    setBreed('');
    setBirthDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jméno mazlíčka</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D6F]"
          placeholder="Max"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Druh</label>
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value as Species)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        >
          {SPECIES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plemeno</label>
        <input
          type="text"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          placeholder="Labrador"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pohlaví</label>
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        >
          <option value="samec">Samec</option>
          <option value="samice">Samice</option>
          <option value="neznámé">Neznámé</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Datum narození</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-[#2E7D6F] text-white py-2.5 rounded-lg font-medium hover:bg-[#25685c]"
        >
          Uložit profil
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600"
          >
            Zrušit
          </button>
        )}
      </div>
    </form>
  );
}
