import React from 'react';

interface PetCardProps {
  name: string;
  species: string;
  breed?: string;
  age?: string;
}

export function PetCard({ name, species, breed, age }: PetCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#E8A87C] flex items-center justify-center text-white font-medium">
          {name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">{species}{breed ? ` · ${breed}` : ''}</p>
          {age && <p className="text-xs text-gray-400">{age}</p>}
        </div>
      </div>
    </div>
  );
}
