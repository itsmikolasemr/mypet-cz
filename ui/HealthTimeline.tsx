import React from 'react';

interface TimelineEvent {
  date: string;
  type: 'očkování' | 'odčervení' | 'návštěva' | 'připomínka';
  title: string;
  notes?: string;
}

interface HealthTimelineProps {
  events: TimelineEvent[];
}

export function HealthTimeline({ events }: HealthTimelineProps) {
  const sorted = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {sorted.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#2E7D6F]" />
            {i < sorted.length - 1 && <div className="w-0.5 flex-1 bg-gray-200" />}
          </div>
          <div className="pb-4">
            <p className="text-xs text-gray-500">{event.date}</p>
            <p className="font-medium text-gray-900">{event.title}</p>
            {event.notes && <p className="text-sm text-gray-600">{event.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
