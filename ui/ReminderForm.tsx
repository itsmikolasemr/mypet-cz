'use client';

import React, { useState } from 'react';
import { Reminder, Pet } from '../lib/types';

interface Props {
  pets: Pet[];
  onSubmit: (r: Omit<Reminder, 'id' | 'done'>) => void;
  onCancel?: () => void;
}

export function ReminderForm({ pets, onSubmit, onCancel }: Props) {
  const [petId, setPetId] = useState(pets[0]?.id || '');
  const [type, setType] = useState<'odčervení' | 'očkování' | 'kontrola'>('odčervení');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !dueDate) return;
    onSubmit({ petId, type, dueDate });
    setDueDate('');
  };

  if (pets.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-medium text-gray-900">Nová připomínka</h3>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Mazlíček</label>
        <select value={petId} onChange={(e) => setPetId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Typ</label>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg">
          <option value="odčervení">Odčervení</option>
          <option value="očkování">Očkování</option>
          <option value="kontrola">Kontrola</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Datum</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-[#2E7D6F] text-white py-2 rounded-lg font-medium">Přidat</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg text-gray-600">Zrušit</button>}
      </div>
    </form>
  );
}
