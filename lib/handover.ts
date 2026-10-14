// Předávací karta pro hlídače: one source of truth for the shared page, PDF, print and copy/export text.
import type { AppData, Pet, PetCare } from './types';
import { age, fmtDate, speciesOf, today } from './utils';

export type HSection = { h: string; lines: string[]; alert?: boolean; key: string };
export type HOpts = { contacts: boolean };

export const emptyCare = (): PetCare => ({ feeding: [] });
const contact = (c?: { name: string; phone: string; note?: string }) => (c && (c.name || c.phone) ? [c.name, c.phone, c.note].filter(Boolean).join(' · ') : '');

/** Sitter-facing sections for one pet. `contacts:false` strips phone numbers/addresses (pet-sitting sites forbid off-platform contacts before booking). */
export function handoverSections(pet: Pet, data: Pick<AppData, 'meds' | 'allergies'>, o: HOpts = { contacts: true }): HSection[] {
  const c = pet.care ?? emptyCare();
  const meds = data.meds.filter((m) => m.petId === pet.id && (!m.end || m.end >= today()));
  const al = data.allergies.filter((a) => a.petId === pet.id);
  const w = pet.weights?.[pet.weights.length - 1];
  const about = [`${speciesOf(pet.species).name}${pet.breed ? ', ' + pet.breed : ''}${pet.birthDate ? `, ${age(pet.birthDate)}` : ''}${w ? `, ${w.kg.toLocaleString('cs-CZ')} kg` : ''}`];
  const S: HSection[] = [
    { key: 'about', h: 'Základní info', lines: about },
    { key: 'allergies', h: '⚠ Alergie', alert: true, lines: al.map((a) => `${a.allergen}${a.reaction ? ' – ' + a.reaction : ''}`) },
    { key: 'feeding', h: 'Krmení', lines: [...c.feeding.map((f) => `${f.what}${f.amount ? ' – ' + f.amount : ''}${f.timesPerDay ? `, ${f.timesPerDay}× denně` : ''}${f.times ? ` (${f.times})` : ''}${f.notes ? '. ' + f.notes : ''}`), ...(c.treats ? [`Pamlsky: ${c.treats}`] : []), ...(c.water ? [`Voda: ${c.water}`] : [])] },
    { key: 'meds', h: 'Léky a dávkování', lines: meds.map((m) => `${m.name}${m.dose ? ', ' + m.dose : ''}${m.frequency ? ' – ' + m.frequency : ''}${m.minHours ? ` (nejdřív po ${m.minHours} h)` : ''}${m.end ? `, do ${fmtDate(m.end)}` : ''}${m.notes ? '. ' + m.notes : ''}`) },
    { key: 'walks', h: 'Venčení a pohyb', lines: c.walks ? [c.walks] : [] },
    { key: 'habits', h: 'Zvyky a povaha', lines: [c.habits, c.fears ? `Bojí se / pozor: ${c.fears}` : '', c.house ? `Doma: ${c.house}` : ''].filter((x): x is string => !!x) },
    { key: 'emergency', h: 'V nouzi', alert: false, lines: [c.emergency ?? '', 'Akutní stav (dušení, otrava, krvácení, nadmutí břicha): hned nejbližší nonstop veterina, v ohrožení života 112.'].filter(Boolean) },
  ];
  if (o.contacts) S.push({ key: 'contacts', h: 'Kontakty', lines: [contact(c.owner) && `Majitel: ${contact(c.owner)}`, contact(c.backup) && `Záložní kontakt: ${contact(c.backup)}`, c.vet && (c.vet.name || c.vet.phone) ? `Veterinář: ${[contact(c.vet), c.vet.address].filter(Boolean).join(' · ')}` : ''].filter(Boolean) as string[] });
  else S.push({ key: 'contacts', h: 'Kontakty', lines: ['Kontakty na majitele a veterináře předám po domluvě přes platformu.'] });
  return S.filter((s) => s.lines.length);
}

export function handoverText(pets: Pet[], data: Pick<AppData, 'meds' | 'allergies'>, o: HOpts & { site?: boolean } = { contacts: true }) {
  const out: string[] = [];
  if (o.site) out.push(`Hledám hlídání pro ${pets.map((p) => p.name).join(' a ')}. Tady je přehled péče:`, '');
  for (const p of pets) {
    out.push(`🐾 ${p.name.toUpperCase()}`);
    for (const s of handoverSections(p, data, o)) { out.push(`${s.h.replace('⚠ ', '⚠️ ')}:`); for (const l of s.lines) out.push(`• ${l}`); }
    out.push('');
  }
  out.push(o.site ? '(Přehled z aplikace Tlapka.)' : `Předávací karta z aplikace Tlapka · ${fmtDate(today())}`);
  return out.join('\n');
}

export async function handoverPdf(pets: Pet[], data: Pick<AppData, 'meds' | 'allergies'>, o: HOpts = { contacts: true }) {
  const { simplePdf } = await import('./pdf');
  const sections = pets.flatMap((p) => [{ h: `🐾 ${p.name}`.replace('🐾 ', '— '), lines: [] as string[] }, ...handoverSections(p, data, o).map((s) => ({ ...s, h: pets.length > 1 ? `${p.name}: ${s.h.replace('⚠ ', '')}` : s.h.replace('⚠ ', '') }))]);
  return simplePdf('Předávací karta pro hlídače', `${pets.map((p) => p.name).join(', ')} · ${fmtDate(today())}`, sections, 'Vytvořeno v aplikaci Tlapka. Údaje zadal majitel.');
}
