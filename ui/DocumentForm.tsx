'use client';

import { useState } from 'react';
import { Pet, Document } from '@/lib/types';

interface Props {
  pets: Pet[];
  onSubmit: (data: Omit<Document, 'id' | 'uploadedAt'>) => void;
  onCancel: () => void;
}

export function DocumentForm({ pets, onSubmit, onCancel }: Props) {
  const [petId, setPetId] = useState(pets[0]?.id || '');
  const [type, setType] = useState<'faktura' | 'pas' | 'vyšetření' | 'jiné'>('faktura');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !fileName) return;
    onSubmit({ petId, type, fileName, notes: notes || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
      <h3 className="font-medium">Nahrát dokument</h3>
      <select value={petId} onChange={(e) => setPetId(e.target.value)} className="w-full p-2 border rounded">
        {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border rounded">
        <option value="faktura">Faktura</option>
        <option value="pas">Zvířecí pas</option>
        <option value="vyšetření">Vyšetření</option>
        <option value="jiné">Jiné</option>
      </select>
      <input
        placeholder="Název souboru (např. faktura_veterina.pdf)"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <textarea
        placeholder="Poznámky (volitelné)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full p-2 border rounded"
        rows={2}
      />
      <div className="flex gap-2">
        <button type="submit" className="bg-[#2E7D6F] text-white px-4 py-2 rounded">Uložit</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">Zrušit</button>
      </div>
      <p className="text-xs text-gray-500">MVP: ukládá se pouze metadata. Skutečný soubor a OCR přijdou později.</p>
    </form>
  );
}
