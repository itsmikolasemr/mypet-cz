'use client';

import React from 'react';
import { Pet } from '../lib/types';

interface Props {
  pet: Pet;
  onDelete?: (id: string) => void;
}

export function PetCard({ pet, onDelete }: Props) {
  const age = pet.birthDate
    ? Math.floor((Date.now() - new Date(pet.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + ' let'
    : undefined;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 relative">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#E8A87C] flex items-center justify-center text-white font-medium text-lg">
          {pet.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{pet.name}</h3>
          <p className="text-sm text-gray-500">
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
            {pet.sex && pet.sex !== 'neznámé' ? ` · ${pet.sex}` : ''}
          </p>
          {age && <p className="text-xs text-gray-400">{age}</p>}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(pet.id)}
          className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-sm"
          aria-label="Smazat"
        >
          ×
        </button>
      )}
    </div>
  );
}
