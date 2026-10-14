'use client';

import React from 'react';
import { Pet } from '../lib/types';

interface Props {
  pet: Pet;
  ownerName?: string;
  ownerPhone?: string;
}

export function EmergencyCard({ pet, ownerName = 'Majitel', ownerPhone = '+420 XXX XXX XXX' }: Props) {
  // TODO: Nahradit placeholder reálným QR (issue: generování QR). Data: jméno, čip, kontakt, odkaz.
  const qrData = `${pet.name}|${pet.microchip || 'bez čipu'}|${ownerPhone}`;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#2E7D6F] to-[#1a5c52] text-white p-5 shadow-lg max-w-sm mx-auto">
      <div className="text-center mb-4">
        <div className="text-xs uppercase tracking-wider opacity-75">Emergency karta</div>
        <h3 className="text-2xl font-bold mt-1">{pet.name}</h3>
        <p className="text-sm opacity-90">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
      </div>
      <div className="space-y-2 text-sm bg-white/10 rounded-xl p-3">
        {pet.microchip && (
          <div className="flex justify-between">
            <span className="opacity-75">Čip</span>
            <span className="font-mono">{pet.microchip}</span>
          </div>
        )}
        {pet.birthDate && (
          <div className="flex justify-between">
            <span className="opacity-75">Narození</span>
            <span>{pet.birthDate}</span>
          </div>
        )}
        {pet.weightKg && (
          <div className="flex justify-between">
            <span className="opacity-75">Váha</span>
            <span>{pet.weightKg} kg</span>
          </div>
        )}
        <div className="border-t border-white/20 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="opacity-75">Kontakt</span>
            <span>{ownerName}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="opacity-75">Tel</span>
            <span>{ownerPhone}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <div className="w-28 h-28 mx-auto bg-white rounded-lg flex flex-col items-center justify-center text-[#2E7D6F] text-xs font-mono border-2 border-dashed border-[#2E7D6F]/30">
          <span>QR kód</span>
          <span className="text-[10px] mt-1 opacity-60">brzy</span>
          <span className="text-[9px] mt-1 px-1 break-all">{qrData.slice(0, 20)}...</span>
        </div>
        <p className="text-xs opacity-75 mt-2">Pro pečovatele — naskenujte pro rychlý přístup k profilu</p>
      </div>
    </div>
  );
}
