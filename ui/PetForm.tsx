import React from 'react';

export function PetForm() {
  return (
    <form className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jméno mazlíčka</label>
        <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D6F]" placeholder="Max" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Druh</label>
        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg">
          <option>Pes</option>
          <option>Kočka</option>
          <option>Králík</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plemeno</label>
        <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
      </div>
      <button type="submit" className="w-full bg-[#2E7D6F] text-white py-2.5 rounded-lg font-medium hover:bg-[#25685c]">
        Uložit profil
      </button>
    </form>
  );
}
