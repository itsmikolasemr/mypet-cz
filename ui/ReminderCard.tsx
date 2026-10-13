import React from 'react';

interface ReminderCardProps {
  type: 'odčervení' | 'očkování' | 'kontrola';
  dueDate: string;
  petName: string;
  done?: boolean;
}

export function ReminderCard({ type, dueDate, petName, done }: ReminderCardProps) {
  const color = done ? '#6B7280' : '#C45C26';
  return (
    <div className="rounded-xl bg-white p-3 border border-gray-100 flex justify-between items-center">
      <div>
        <p className="font-medium text-gray-900">{type}</p>
        <p className="text-sm text-gray-500">{petName} · do {dueDate}</p>
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {done ? 'Hotovo' : 'Připomenout'}
      </span>
    </div>
  );
}
