// Export připomínek a návštěv do kalendáře (Apple/Google/Outlook) jako .ics soubor.
import type { AppData } from './types';
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
const d8 = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
const next = (iso: string) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
export function buildIcs(data: AppData, hour = 9) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const pet = (id: string) => data.pets.find((p) => p.id === id)?.name ?? '';
  const ev: string[] = [];
  for (const r of data.reminders.filter((x) => !x.completedAt)) {
    const rr = r.intervalDays && r.intervalDays % 365 === 0 ? `RRULE:FREQ=YEARLY;INTERVAL=${r.intervalDays / 365}` : r.intervalDays && r.intervalDays % 30 === 0 ? `RRULE:FREQ=MONTHLY;INTERVAL=${r.intervalDays / 30}` : r.intervalDays ? `RRULE:FREQ=DAILY;INTERVAL=${r.intervalDays}` : '';
    ev.push(['BEGIN:VEVENT', `UID:rem-${r.id}@tlapka.app`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d8(r.dueDate)}`, `DTEND;VALUE=DATE:${d8(next(r.dueDate))}`, `SUMMARY:${esc(`🐾 ${r.title}${pet(r.petId) ? ' – ' + pet(r.petId) : ''}`)}`, r.product ? `DESCRIPTION:${esc('Přípravek: ' + r.product)}` : '', rr,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:PT${hour}H`, `DESCRIPTION:${esc(r.title)}`, 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n'));
  }
  for (const v of data.visits.filter((x) => x.date >= new Date().toISOString().slice(0, 10)))
    ev.push(['BEGIN:VEVENT', `UID:vis-${v.id}@tlapka.app`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d8(v.date)}`, `DTEND;VALUE=DATE:${d8(next(v.date))}`, `SUMMARY:${esc(`🩺 Veterina${pet(v.petId) ? ' – ' + pet(v.petId) : ''}${v.reason ? ': ' + v.reason : ''}`)}`, v.clinic ? `LOCATION:${esc(v.clinic)}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tlapka//CZ', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Tlapka', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
export async function exportIcs(data: AppData, hour = 9) {
  const blob = new Blob([buildIcs(data, hour)], { type: 'text/calendar;charset=utf-8' });
  const file = new File([blob], 'tlapka-kalendar.ics', { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Tlapka – kalendář' }); return 'shared'; } catch { /* fall back to download */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tlapka-kalendar.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); return 'downloaded';
}
