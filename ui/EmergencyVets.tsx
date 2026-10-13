'use client';

import React, { useState } from 'react';
import vetsData from '../data/vets-seed.json';

interface Vet {
  id: string;
  city: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
}

export function EmergencyVets() {
  const [filter, setFilter] = useState('');
  const vets: Vet[] = vetsData.emergencyVets;
  const cities = Array.from(new Set(vets.map(v => v.city)));

  const filtered = filter
    ? vets.filter(v => v.city.toLowerCase().includes(filter.toLowerCase()) || v.name.toLowerCase().includes(filter.toLowerCase()))
    : vets;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Non-stop veterináři</h2>
        <p className="text-sm text-gray-500 mb-3">Pohotovostní kliniky v ČR (seed data — aktualizovat reálnými čísly)</p>
        <input
          type="text"
          placeholder="Filtrovat podle města..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((vet) => (
          <div key={vet.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">{vet.name}</h3>
                <p className="text-sm text-gray-500">{vet.city} · {vet.address}</p>
                {vet.note && <p className="text-xs text-amber-600 mt-1">{vet.note}</p>}
              </div>
              <a
                href={`tel:${vet.phone.replace(/\s/g, '')}`}
                className="bg-[#2E7D6F] text-white text-sm px-3 py-1.5 rounded-lg font-medium whitespace-nowrap"
              >
                {vet.phone}
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-400">Žádné kliniky pro tento filtr</p>}
      </div>
      <p className="text-xs text-gray-400">Data jsou ilustrativní. V produkci nahradit reálnými zdroji (kliniky, firem.cz).</p>
    </div>
  );
}
