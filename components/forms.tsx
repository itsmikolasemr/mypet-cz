'use client';
import { useEffect, useRef, useState } from 'react';
import type { Allergy, Medication, Pet, Reminder, ReminderType, Severity, Sex, Species, Visit } from '@/lib/types';
import { useStore } from '@/lib/store';
import { BREEDS, INTERVALS, PRODUCTS, REMINDER_TYPES, SPECIES, addDays, num, resizeImage, today, typeOf, uid } from '@/lib/utils';
import { Button, Field, Icon, Sheet, inputCls } from './ui';

export function PetForm({ open, onClose, pet }: { open: boolean; onClose: () => void; pet?: Pet }) {
  const { savePet, addWeight } = useStore();
  const blank: Pet = { id: '', name: '', species: 'pes', breed: '', sex: 'nezname', birthDate: '', color: '', microchip: '', notes: '', weights: [], createdAt: today() };
  const [f, setF] = useState<Pet>(pet ?? blank);
  const [kg, setKg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setF(pet ?? { ...blank, id: uid() }); setKg(''); } }, [open, pet]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Pet>(k: K, v: Pet[K]) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    savePet({ ...f, name: f.name.trim() });
    const w = num(kg);
    if (!pet && w > 0 && w < 2000) addWeight(f.id, w, today());
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={pet ? 'Upravit mazlíčka' : 'Nový mazlíček'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex justify-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="press relative w-24 h-24 rounded-3xl bg-secondary/20 overflow-hidden flex items-center justify-center text-4xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover" /> : SPECIES.find((s) => s.id === f.species)?.emoji}
            <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow"><Icon name="camera" className="w-4 h-4" /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { set('photo', await resizeImage(file)); } catch { alert('Tento formát fotky se nepodařilo načíst. Zkus JPG nebo PNG.'); } }} />
        </div>
        {f.photo && <button type="button" className="block mx-auto text-sm text-muted -mt-2" onClick={() => set('photo', undefined)}>Odebrat fotku</button>}
        <Field label="Jméno"><input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="např. Rex" required autoFocus={!pet} /></Field>
        <div>
          <span className="block text-[13px] font-medium text-muted mb-1.5">Druh</span>
          <div className="grid grid-cols-4 gap-2">
            {SPECIES.map((s) => (
              <button type="button" key={s.id} onClick={() => set('species', s.id as Species)} className={`press rounded-xl py-2 text-center border transition ${f.species === s.id ? 'border-primary bg-primary/10' : 'border-ink/10 dark:border-white/10'}`}>
                <div className="text-xl">{s.emoji}</div><div className="text-[11px] font-medium mt-0.5">{s.name}</div>
              </button>
            ))}
          </div>
        </div>
        <Field label="Plemeno">
          <input className={inputCls} list="breeds" value={f.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Vyber nebo napiš" />
          <datalist id="breeds">{(BREEDS[f.species] ?? []).map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum narození"><input type="date" className={inputCls} value={f.birthDate} max={today()} onChange={(e) => set('birthDate', e.target.value)} /></Field>
          <Field label="Pohlaví">
            <select className={inputCls} value={f.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
              <option value="nezname">Neuvedeno</option><option value="samec">Samec</option><option value="samice">Samice</option>
            </select>
          </Field>
        </div>
        {!pet && <Field label="Aktuální váha (kg)"><input inputMode="decimal" className={inputCls} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="např. 12,5" /></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Barva"><input className={inputCls} value={f.color} onChange={(e) => set('color', e.target.value)} /></Field>
          <Field label="Číslo čipu"><input inputMode="numeric" className={inputCls} value={f.microchip} onChange={(e) => set('microchip', e.target.value)} /></Field>
        </div>
        <Field label="Poznámky"><textarea rows={2} className={inputCls} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Button type="submit" className="w-full" disabled={!f.name.trim()}>{pet ? 'Uložit změny' : 'Přidat mazlíčka'}</Button>
      </form>
    </Sheet>
  );
}

export function ReminderForm({ open, onClose, reminder, petId }: { open: boolean; onClose: () => void; reminder?: Reminder; petId?: string }) {
  const { data, saveReminder, deleteReminder } = useStore();
  const mk = (): Reminder => ({ id: uid(), petId: petId ?? data.pets[0]?.id ?? '', type: 'odcerveni', title: 'Odčervení', product: '', dueDate: addDays(today(), 1), intervalDays: 90, notes: '', history: [] });
  const [f, setF] = useState<Reminder>(reminder ?? mk());
  useEffect(() => { if (open) setF(reminder ?? mk()); }, [open, reminder]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Reminder>(k: K, v: Reminder[K]) => setF((x) => ({ ...x, [k]: v }));
  const pickType = (t: ReminderType) => {
    const meta = typeOf(t);
    setF((x) => ({ ...x, type: t, intervalDays: meta.interval, title: REMINDER_TYPES.some((r) => r.name === x.title) || !x.title ? meta.name : x.title }));
  };
  if (!data.pets.length) return <Sheet open={open} onClose={onClose} title="Nová připomínka"><p className="text-muted py-6 text-center">Nejdřív přidej mazlíčka.</p></Sheet>;
  return (
    <Sheet open={open} onClose={onClose} title={reminder ? 'Upravit připomínku' : 'Nová připomínka'}>
      <form onSubmit={(e) => { e.preventDefault(); saveReminder({ ...f, title: f.title.trim() || typeOf(f.type).name }); onClose(); }} className="space-y-4">
        <Field label="Mazlíček">
          <select className={inputCls} value={f.petId} onChange={(e) => set('petId', e.target.value)}>
            {data.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div>
          <span className="block text-[13px] font-medium text-muted mb-1.5">Typ</span>
          <div className="flex flex-wrap gap-2">
            {REMINDER_TYPES.map((t) => (
              <button type="button" key={t.id} onClick={() => pickType(t.id)} className={`press rounded-full px-3 py-1.5 text-sm border transition ${f.type === t.id ? 'border-primary bg-primary/10 text-primary dark:text-primary-l font-semibold' : 'border-ink/10 dark:border-white/10'}`}>{t.emoji} {t.name}</button>
            ))}
          </div>
        </div>
        <Field label="Název"><input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Přípravek / lék">
          <input className={inputCls} list="products" value={f.product} onChange={(e) => set('product', e.target.value)} placeholder="např. Milbemax" />
          <datalist id="products">{(PRODUCTS[f.type] ?? []).map((b) => <option key={b} value={b} />)}</datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Termín"><input type="date" required className={inputCls} value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
          <Field label="Opakování">
            <select className={inputCls} value={f.intervalDays} onChange={(e) => set('intervalDays', Number(e.target.value))}>
              {INTERVALS.map((i) => <option key={i.d} value={i.d}>{i.n}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Poznámka"><textarea rows={2} className={inputCls} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Button type="submit" className="w-full">Uložit</Button>
        {reminder && <Button type="button" variant="danger" className="w-full" onClick={() => { if (confirm('Smazat připomínku?')) { deleteReminder(reminder.id); onClose(); } }}><Icon name="trash" /> Smazat</Button>}
      </form>
    </Sheet>
  );
}

export function VisitForm({ open, onClose, visit, petId, date }: { open: boolean; onClose: () => void; visit?: Visit; petId?: string; date?: string }) {
  const { data, saveVisit, deleteVisit } = useStore();
  const mk = (): Visit => ({ id: uid(), petId: petId ?? data.pets[0]?.id ?? '', date: date ?? today(), clinic: data.visits[data.visits.length - 1]?.clinic ?? '', reason: '', notes: '' });
  const [f, setF] = useState<Visit>(visit ?? mk());
  const [cost, setCost] = useState('');
  useEffect(() => { if (open) { const v = visit ?? mk(); setF(v); setCost(v.cost != null ? String(v.cost) : ''); } }, [open, visit, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Visit>(k: K, v: Visit[K]) => setF((x) => ({ ...x, [k]: v }));
  if (!data.pets.length) return <Sheet open={open} onClose={onClose} title="Návštěva"><p className="text-muted py-6 text-center">Nejdřív přidej mazlíčka.</p></Sheet>;
  return (
    <Sheet open={open} onClose={onClose} title={visit ? 'Upravit návštěvu' : 'Návštěva veterináře'}>
      <form onSubmit={(e) => { e.preventDefault(); const c = num(cost); saveVisit({ ...f, cost: c >= 0 ? c : undefined }); onClose(); }} className="space-y-4">
        <Field label="Mazlíček">
          <select className={inputCls} value={f.petId} onChange={(e) => set('petId', e.target.value)}>
            {data.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum"><input type="date" required className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Cena (Kč)"><input inputMode="decimal" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        </div>
        <Field label="Důvod"><input required className={inputCls} value={f.reason} onChange={(e) => set('reason', e.target.value)} placeholder="např. Preventivní prohlídka" /></Field>
        <Field label="Klinika"><input className={inputCls} value={f.clinic} onChange={(e) => set('clinic', e.target.value)} /></Field>
        <Field label="Poznámky / diagnóza"><textarea rows={3} className={inputCls} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        <Button type="submit" className="w-full">Uložit</Button>
        {visit && <Button type="button" variant="danger" className="w-full" onClick={() => { if (confirm('Smazat záznam?')) { deleteVisit(visit.id); onClose(); } }}><Icon name="trash" /> Smazat</Button>}
      </form>
    </Sheet>
  );
}

export function WeightForm({ open, onClose, petId }: { open: boolean; onClose: () => void; petId: string }) {
  const { addWeight } = useStore();
  const [kg, setKg] = useState('');
  const [date, setDate] = useState(today());
  useEffect(() => { if (open) { setKg(''); setDate(today()); } }, [open]);
  const v = num(kg);
  return (
    <Sheet open={open} onClose={onClose} title="Zapsat váhu">
      <form onSubmit={(e) => { e.preventDefault(); if (v > 0 && v < 2000) { addWeight(petId, v, date); onClose(); } }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Váha (kg)"><input autoFocus inputMode="decimal" className={inputCls} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="0,0" /></Field>
          <Field label="Datum"><input type="date" className={inputCls} value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Button type="submit" className="w-full" disabled={!(v > 0 && v < 2000)}>Uložit</Button>
      </form>
    </Sheet>
  );
}

const FREQ = ['Denně ráno', 'Denně večer', '2× denně', '3× denně', 'Obden', 'Týdně', 'Měsíčně', 'Dle potřeby'];
const FREQ_DAYS: Record<string, number> = { 'Denně ráno': 1, 'Denně večer': 1, '2× denně': 1, '3× denně': 1, Obden: 2, Týdně: 7, Měsíčně: 30 };

export function MedForm({ open, onClose, med, petId }: { open: boolean; onClose: () => void; med?: Medication; petId: string }) {
  const { saveMed, deleteMed, saveReminder, deleteReminder } = useStore();
  const mk = (): Medication => ({ id: uid(), petId, name: '', dose: '', frequency: 'Denně ráno', start: today(), end: '', notes: '' });
  const [f, setF] = useState<Medication>(med ?? mk());
  const [remind, setRemind] = useState(false);
  useEffect(() => { if (open) { setF(med ?? mk()); setRemind(!!med?.reminderId); } }, [open, med]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Medication>(k: K, v: Medication[K]) => setF((x) => ({ ...x, [k]: v }));
  const interval = FREQ_DAYS[f.frequency] ?? 0;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.start || (f.end && f.end < f.start)) return;
    let reminderId = f.reminderId;
    if (remind) {
      reminderId = reminderId ?? uid();
      const due = f.start > today() ? f.start : today();
      saveReminder({ id: reminderId, petId, type: 'leky', title: f.name.trim(), product: [f.dose, f.frequency].filter(Boolean).join(' · '), dueDate: due, intervalDays: interval, notes: f.notes, history: [] });
    } else if (reminderId) { deleteReminder(reminderId); reminderId = undefined; }
    saveMed({ ...f, name: f.name.trim(), reminderId });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={med ? 'Upravit lék' : 'Nový lék'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Název léku"><input required autoFocus={!med} className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="např. Previcox 57 mg" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dávka"><input className={inputCls} value={f.dose} onChange={(e) => set('dose', e.target.value)} placeholder="1/2 tablety" /></Field>
          <Field label="Frekvence">
            <select className={inputCls} value={f.frequency} onChange={(e) => set('frequency', e.target.value)}>{FREQ.map((x) => <option key={x}>{x}</option>)}</select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Od"><input type="date" required className={inputCls} value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
          <Field label="Do (volitelné)"><input type="date" className={inputCls} value={f.end} min={f.start} onChange={(e) => set('end', e.target.value)} /></Field>
        </div>
        <Field label="Poznámka"><textarea rows={2} className={inputCls} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="např. podávat s jídlem" /></Field>
        <label className="flex items-center gap-3 rounded-2xl bg-primary/5 px-4 py-3">
          <input type="checkbox" className="w-5 h-5 accent-[#E8553A]" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
          <span className="text-sm"><b>Vytvořit připomínku</b><br /><span className="text-muted">{interval ? `Opakovat každých ${interval} ${interval === 1 ? 'den' : 'dní'}` : 'Jednorázově'}</span></span>
        </label>
        <Button type="submit" className="w-full">Uložit</Button>
        {med && <Button type="button" variant="danger" className="w-full" onClick={() => { if (confirm('Smazat lék?')) { if (med.reminderId) deleteReminder(med.reminderId); deleteMed(med.id); onClose(); } }}><Icon name="trash" /> Smazat</Button>}
      </form>
    </Sheet>
  );
}

export const SEVERITY: { id: Severity; n: string; cls: string }[] = [
  { id: 'mirna', n: 'Mírná', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  { id: 'stredni', n: 'Střední', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  { id: 'tezka', n: 'Těžká', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
];

export function AllergyForm({ open, onClose, allergy, petId }: { open: boolean; onClose: () => void; allergy?: Allergy; petId: string }) {
  const { saveAllergy, deleteAllergy } = useStore();
  const mk = (): Allergy => ({ id: uid(), petId, allergen: '', reaction: '', severity: 'mirna' });
  const [f, setF] = useState<Allergy>(allergy ?? mk());
  useEffect(() => { if (open) setF(allergy ?? mk()); }, [open, allergy]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} title={allergy ? 'Upravit alergii' : 'Nová alergie'}>
      <form onSubmit={(e) => { e.preventDefault(); if (!f.allergen.trim()) return; saveAllergy({ ...f, allergen: f.allergen.trim() }); onClose(); }} className="space-y-4">
        <Field label="Alergen"><input required autoFocus={!allergy} className={inputCls} list="allergens" value={f.allergen} onChange={(e) => setF({ ...f, allergen: e.target.value })} placeholder="např. Kuřecí maso, penicilin" />
          <datalist id="allergens">{['Kuřecí maso', 'Hovězí maso', 'Pšenice', 'Sója', 'Mléčné výrobky', 'Blechy (sliny)', 'Pyl', 'Roztoči', 'Penicilin', 'Vakcína'].map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label="Reakce"><input className={inputCls} value={f.reaction} onChange={(e) => setF({ ...f, reaction: e.target.value })} placeholder="např. svědění, zvracení, otok" /></Field>
        <div>
          <span className="block text-[13px] font-medium text-muted mb-1.5">Závažnost</span>
          <div className="grid grid-cols-3 gap-2">{SEVERITY.map((x) => <button type="button" key={x.id} onClick={() => setF({ ...f, severity: x.id })} className={`press rounded-2xl py-2.5 text-sm font-semibold ring-2 transition ${f.severity === x.id ? `${x.cls} ring-current` : 'ring-ink/10 dark:ring-white/10'}`}>{x.n}</button>)}</div>
        </div>
        <Button type="submit" className="w-full">Uložit</Button>
        {allergy && <Button type="button" variant="danger" className="w-full" onClick={() => { if (confirm('Smazat alergii?')) { deleteAllergy(allergy.id); onClose(); } }}><Icon name="trash" /> Smazat</Button>}
      </form>
    </Sheet>
  );
}
