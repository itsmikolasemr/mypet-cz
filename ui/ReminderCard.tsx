import React from 'react';

interface ReminderCardProps {
  type: 'odčervení' | 'očkování' | 'kontrola';
  dueDate: string;
  petName: string;
  done?: boolean;
  product?: string;
}

export function ReminderCard({ type, dueDate, petName, done, product }: ReminderCardProps) {
  const color = done ? '#6B7280' : '#C45C26';
  return (
    <div className="rounded-xl bg-white p-3 border border-gray-100 flex justify-between items-center">
      <div>
        <p className="font-medium text-gray-900">{type}</p>
        <p className="text-sm text-gray-500">{petName} · do {dueDate}</p>
        {product && <p className="text-xs text-gray-400">Přípravek: {product}</p>}
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {done ? 'Hotovo' : 'Připomenout'}
      </span>
    </div>
  );
}
