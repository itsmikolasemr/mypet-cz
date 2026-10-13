'use client';

import React, { useState } from 'react';
import { Pet } from '../lib/types';

type RecordType = 'visit' | 'deworming' | 'vaccination';

interface Props {
  pets: Pet[];
  onAddVisit: (v: any) => void;
  onAddDeworming: (d: any) => void;
  onAddVaccination: (v: any) => void;
  onCancel?: () => void;
}

export function HealthForm({ pets, onAddVisit, onAddDeworming, onAddVaccination, onCancel }: Props) {
  const [recordType, setRecordType] = useState<RecordType>('deworming');
  const [petId, setPetId] = useState(pets[0]?.id || '');
  const [date, setDate] = useState('');
  const [product, setProduct] = useState('');
  const [reason, setReason] = useState('');
  const [clinic, setClinic] = useState('');
  const [vaxType, setVaxType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !date) return;
    if (recordType === 'visit') {
      onAddVisit({ petId, date, clinic: clinic || undefined, reason: reason || 'Návštěva' });
    } else if (recordType === 'deworming') {
      onAddDeworming({ petId, date, product: product || 'Přípravek' });
    } else {
      onAddVaccination({ petId, date, type: vaxType || 'Očkování' });
    }
    setDate('');
    setProduct('');
    setReason('');
    setClinic('');
    setVaxType('');
  };

  if (pets.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-medium text-gray-900">Nový zdravotní záznam</h3>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Typ záznamu</label>
        <select value={recordType} onChange={(e) => setRecordType(e.target.value as RecordType)} className="w-full px-3 py-2 border rounded-lg">
          <option value="deworming">Odčervení</option>
          <option value="vaccination">Očkování</option>
          <option value="visit">Návštěva u veteriny</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Mazlíček</label>
        <select value={petId} onChange={(e) => setPetId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          {pets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Datum</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      </div>
      {recordType === 'deworming' && (
        <div>
          <label className="block text-sm text-gray-700 mb-1">Přípravek</label>
          <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Drontal" />
        </div>
      )}
      {recordType === 'vaccination' && (
        <div>
          <label className="block text-sm text-gray-700 mb-1">Typ očkování</label>
          <input type="text" value={vaxType} onChange={(e) => setVaxType(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Vzteklina" />
        </div>
      )}
      {recordType === 'visit' && (
        <>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Klinika</label>
            <input type="text" value={clinic} onChange={(e) => setClinic(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Veterina Praha" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Důvod</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Kontrola" />
          </div>
        </>
      )}
      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-[#2E7D6F] text-white py-2 rounded-lg font-medium">Uložit záznam</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg text-gray-600">Zrušit</button>}
      </div>
    </form>
  );
}
