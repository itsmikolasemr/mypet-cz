'use client';
import { useMemo, useRef, useState } from 'react';
import type { Pet, Reminder, Visit } from '@/lib/types';
import { useStore, validate } from '@/lib/store';
import { age, diffDays, fmtDate, parse, speciesOf, status, toISO, today } from '@/lib/utils';
import { notifySupported, requestPermission, showNow } from '@/lib/notify';
import { Avatar, Button, Card, Empty, Fab, Icon, Logo, PageHeader, Segmented } from './ui';
import { PetForm, ReminderForm, VisitForm, WeightForm } from './forms';
import { Documents, PetChip, ReminderRow, VisitRow, WeightChart } from './parts';

const sortRem = (a: Reminder, b: Reminder) => a.dueDate.localeCompare(b.dueDate);
const greeting = () => { const h = new Date().getHours(); return h < 10 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer'; };

/* ---------------- Dashboard ---------------- */
export function Dashboard({ go, openPet }: { go: (t: Tab) => void; openPet: (id: string) => void }) {
  const { data } = useStore();
  const [edit, setEdit] = useState<Reminder | null>(null);
  const [newRem, setNewRem] = useState(false);
  const [newPet, setNewPet] = useState(false);
  const active = data.reminders.filter((r) => !r.completedAt).sort(sortRem);
  const overdue = active.filter((r) => status(r) === 'overdue');
  const upcoming = active.filter((r) => diffDays(r.dueDate, today()) >= 0 && diffDays(r.dueDate, today()) <= 30);
  const nextVisit = data.visits.filter((v) => v.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
  const pet = (id: string) => data.pets.find((p) => p.id === id);
  return (
    <div>
      <PageHeader sub={new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })} title={greeting()} action={<Logo className="h-8 text-ink dark:text-white" />} />
      {!data.pets.length ? (
        <Empty emoji="🐾" title="Zatím tu nikdo není" text="Přidej svého prvního mazlíčka a Tlapka ti pohlídá odčervení, očkování i veterinu." action={<Button onClick={() => setNewPet(true)}><Icon name="plus" /> Přidat mazlíčka</Button>} />
      ) : (
        <div className="space-y-8 stagger">
          <div className="rounded-[28px] p-6 text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] shadow-[0_18px_40px_-14px_rgba(232,85,58,.6),0_6px_14px_-6px_rgba(232,85,58,.35)] relative overflow-hidden">
            <Icon name="paw" fill className="absolute -right-6 -bottom-6 w-36 h-36 text-white/15" />
            <p className="text-white/85 text-sm font-medium">Tento měsíc</p>
            <p className="text-3xl font-bold mt-1">{upcoming.length} {upcoming.length === 1 ? 'úkol' : upcoming.length >= 2 && upcoming.length <= 4 ? 'úkoly' : 'úkolů'}</p>
            <p className="text-white/90 text-sm mt-1">{overdue.length ? `⚠️ ${overdue.length} po termínu` : 'Vše v pořádku, nic nemeškáš ✨'}</p>
          </div>
          <section>
            <div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-lg">Mazlíčci</h2><button className="text-sm font-semibold text-primary" onClick={() => go('pets')}>Vše</button></div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pt-1 pb-3">
              {data.pets.map((p) => (
                <button key={p.id} onClick={() => openPet(p.id)} className="press shrink-0 w-24 text-center">
                  <Avatar pet={p} size="w-20 h-20 mx-auto shadow-card dark:shadow-card-d" text="text-4xl" />
                  <p className="font-semibold mt-1.5 truncate">{p.name}</p>
                  <p className="text-xs text-muted truncate">{age(p.birthDate) || speciesOf(p.species).name}</p>
                </button>
              ))}
              <button onClick={() => setNewPet(true)} className="press shrink-0 w-24 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl border-2 border-dashed border-ink/15 dark:border-white/15 flex items-center justify-center text-muted"><Icon name="plus" className="w-6 h-6" /></div>
                <p className="text-sm text-muted mt-1.5">Přidat</p>
              </button>
            </div>
          </section>
          {overdue.length > 0 && (
            <section className="space-y-2.5"><h2 className="font-semibold text-lg text-red-700 dark:text-red-400">Po termínu</h2>{overdue.map((r) => <ReminderRow key={r.id} r={r} pet={pet(r.petId)} onEdit={() => setEdit(r)} />)}</section>
          )}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Nadcházející</h2><button className="text-sm font-semibold text-primary" onClick={() => setNewRem(true)}>+ Přidat</button></div>
            {upcoming.length ? upcoming.slice(0, 5).map((r) => <ReminderRow key={r.id} r={r} pet={pet(r.petId)} onEdit={() => setEdit(r)} />) : <Card className="p-4 text-sm text-muted text-center">Příštích 30 dní nic. 🎉</Card>}
          </section>
          {nextVisit && (
            <section className="space-y-2.5"><h2 className="font-semibold text-lg">Příští návštěva</h2><VisitRow v={nextVisit} pet={pet(nextVisit.petId)} onClick={() => go('calendar')} /></section>
          )}
        </div>
      )}
      <ReminderForm open={!!edit || newRem} reminder={edit ?? undefined} onClose={() => { setEdit(null); setNewRem(false); }} />
      <PetForm open={newPet} onClose={() => setNewPet(false)} />
    </div>
  );
}

/* ---------------- Pets ---------------- */
export function PetsList({ openPet }: { openPet: (id: string) => void }) {
  const { data } = useStore();
  const [add, setAdd] = useState(false);
  return (
    <div>
      <PageHeader title="Mazlíčci" fab={<Fab label="Přidat mazlíčka" onClick={() => setAdd(true)} />} />
      {!data.pets.length && <Empty emoji="🐶" title="Žádní mazlíčci" text="Vytvoř profil s fotkou, plemenem a váhou." action={<Button onClick={() => setAdd(true)}>Přidat mazlíčka</Button>} />}
      <div className="space-y-3.5 stagger">
        {data.pets.map((p) => {
          const next = data.reminders.filter((r) => r.petId === p.id && !r.completedAt).sort(sortRem)[0];
          const w = p.weights[p.weights.length - 1];
          return (
            <Card key={p.id} onClick={() => openPet(p.id)} className="p-3.5 flex items-center gap-3.5">
              <Avatar pet={p} size="w-16 h-16" text="text-3xl" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg leading-tight">{p.name}</p>
                <p className="text-[13px] text-muted truncate">{[p.breed || speciesOf(p.species).name, age(p.birthDate), w && `${w.kg.toLocaleString('cs-CZ')} kg`].filter(Boolean).join(' · ')}</p>
                {next && <p className={`text-[13px] mt-0.5 font-medium ${status(next) === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>{next.title} · {fmtDate(next.dueDate)}</p>}
              </div>
              <Icon name="chev" className="w-4 h-4 text-muted" />
            </Card>
          );
        })}
      </div>
      <PetForm open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

export function PetDetail({ id, back }: { id: string; back: () => void }) {
  const { data, deletePet, deleteWeight } = useStore();
  const pet = data.pets.find((p) => p.id === id);
  const [tab, setTab] = useState<'pece' | 'zdravi' | 'vaha' | 'doklady'>('pece');
  const [edit, setEdit] = useState(false);
  const [rem, setRem] = useState<Reminder | null | 'new'>(null);
  const [vis, setVis] = useState<Visit | null | 'new'>(null);
  const [wt, setWt] = useState(false);
  if (!pet) return <Empty emoji="🤔" title="Mazlíček nenalezen" text="" action={<Button onClick={back}>Zpět</Button>} />;
  const rems = data.reminders.filter((r) => r.petId === id).sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt) || sortRem(a, b));
  const visits = data.visits.filter((v) => v.petId === id).sort((a, b) => b.date.localeCompare(a.date));
  const info: [string, string][] = ([['Druh', speciesOf(pet.species).name], ['Plemeno', pet.breed], ['Narozen(a)', pet.birthDate && `${fmtDate(pet.birthDate)} (${age(pet.birthDate)})`], ['Pohlaví', pet.sex === 'samec' ? 'Samec' : pet.sex === 'samice' ? 'Samice' : ''], ['Barva', pet.color], ['Čip', pet.microchip]] as [string, string][]).filter(([, v]) => v);
  return (
    <div>
      <div className="sticky z-30 flex items-center justify-between mb-4 -mx-1 px-1.5 py-1.5 rounded-full bg-surface/70 dark:bg-surface-d/70 backdrop-blur-2xl ring-1 ring-ink/5 dark:ring-white/10 shadow-card dark:shadow-card-d" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <button onClick={back} className="press flex items-center gap-1 text-primary font-semibold pl-2 pr-3 py-1.5 rounded-full"><Icon name="back" /> Zpět</button>
        <button onClick={() => setEdit(true)} className="press flex items-center gap-1.5 text-primary font-semibold px-3 py-1.5 rounded-full"><Icon name="edit" className="w-4 h-4" /> Upravit</button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <Avatar pet={pet} size="w-24 h-24 shadow-float dark:shadow-float-d" text="text-5xl" />
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight">{pet.name}</h1>
          <p className="text-muted">{[pet.breed || speciesOf(pet.species).name, age(pet.birthDate)].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {info.length > 0 && (
        <Card className="p-4 mb-4 grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
          {info.map(([k, v]) => <div key={k}><p className="text-muted text-xs">{k}</p><p className="font-medium break-all">{v}</p></div>)}
          {pet.notes && <div className="col-span-2"><p className="text-muted text-xs">Poznámky</p><p>{pet.notes}</p></div>}
        </Card>
      )}
      <Segmented value={tab} onChange={setTab} options={[{ v: 'pece', l: 'Péče' }, { v: 'zdravi', l: 'Zdraví' }, { v: 'vaha', l: 'Váha' }, { v: 'doklady', l: 'Doklady' }]} />
      <div className="mt-5 space-y-3 stagger" key={tab}>
        {tab === 'pece' && (<>
          <Button variant="soft" className="w-full" onClick={() => setRem('new')}><Icon name="plus" /> Nová připomínka</Button>
          {!rems.length && <p className="text-sm text-muted text-center py-4">Žádné připomínky. Přidej třeba odčervení Milbemaxem.</p>}
          {rems.map((r) => <ReminderRow key={r.id} r={r} showPet={false} onEdit={() => setRem(r)} />)}
        </>)}
        {tab === 'zdravi' && (<>
          <Button variant="soft" className="w-full" onClick={() => setVis('new')}><Icon name="plus" /> Zapsat návštěvu</Button>
          {!visits.length && <p className="text-sm text-muted text-center py-4">Zdravotní deník je prázdný.</p>}
          {visits.map((v) => <VisitRow key={v.id} v={v} onClick={() => setVis(v)} />)}
          {rems.some((r) => r.history.length) && (
            <Card className="p-4"><p className="font-semibold mb-2">Provedená péče</p>
              <ul className="space-y-1.5 text-sm">{rems.flatMap((r) => r.history.map((h) => ({ h, r }))).sort((a, b) => b.h.localeCompare(a.h)).slice(0, 12).map(({ h, r }, i) => <li key={i} className="flex justify-between gap-2"><span>{r.title}{r.product ? ` – ${r.product}` : ''}</span><span className="text-muted shrink-0">{fmtDate(h)}</span></li>)}</ul>
            </Card>
          )}
        </>)}
        {tab === 'vaha' && (<>
          <Card className="p-4"><WeightChart pet={pet} /></Card>
          <Button variant="soft" className="w-full" onClick={() => setWt(true)}><Icon name="scale" /> Zapsat váhu</Button>
          <Card className="divide-y divide-ink/5 dark:divide-white/5">
            {[...pet.weights].reverse().map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted">{fmtDate(w.date)}</span>
                <span className="font-semibold tabular-nums ml-auto mr-3">{w.kg.toLocaleString('cs-CZ')} kg</span>
                <button aria-label="Smazat" onClick={() => deleteWeight(pet.id, w.id)} className="text-muted p-1"><Icon name="x" className="w-4 h-4" /></button>
              </div>
            ))}
          </Card>
        </>)}
        {tab === 'doklady' && <Documents pet={pet} />}
      </div>
      <Button variant="danger" className="w-full mt-8" onClick={() => { if (confirm(`Opravdu smazat ${pet.name} včetně všech záznamů?`)) { deletePet(pet.id); back(); } }}><Icon name="trash" /> Smazat mazlíčka</Button>
      <PetForm open={edit} pet={pet} onClose={() => setEdit(false)} />
      <ReminderForm open={rem !== null} reminder={rem && rem !== 'new' ? rem : undefined} petId={pet.id} onClose={() => setRem(null)} />
      <VisitForm open={vis !== null} visit={vis && vis !== 'new' ? vis : undefined} petId={pet.id} onClose={() => setVis(null)} />
      <WeightForm open={wt} petId={pet.id} onClose={() => setWt(false)} />
    </div>
  );
}

/* ---------------- Reminders ---------------- */
export function Reminders() {
  const { data } = useStore();
  const [filter, setFilter] = useState<'aktivni' | 'hotove'>('aktivni');
  const [petF, setPetF] = useState<string>('');
  const [edit, setEdit] = useState<Reminder | null | 'new'>(null);
  const list = data.reminders.filter((r) => (filter === 'aktivni' ? !r.completedAt : !!r.completedAt) && (!petF || r.petId === petF)).sort(sortRem);
  const groups: [string, Reminder[]][] = filter === 'hotove' ? [['Dokončené', list]] : [
    ['Po termínu', list.filter((r) => status(r) === 'overdue')],
    ['Tento týden', list.filter((r) => status(r) === 'soon')],
    ['Později', list.filter((r) => status(r) === 'ok')],
  ];
  return (
    <div>
      <PageHeader title="Připomínky" fab={data.pets.length ? <Fab label="Nová připomínka" onClick={() => setEdit('new')} /> : undefined} />
      <Segmented value={filter} onChange={setFilter} options={[{ v: 'aktivni', l: 'Aktivní' }, { v: 'hotove', l: 'Hotové' }]} />
      {data.pets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mt-3">
          <PetChip active={!petF} onClick={() => setPetF('')} />
          {data.pets.map((p) => <PetChip key={p.id} pet={p} active={petF === p.id} onClick={() => setPetF(p.id)} />)}
        </div>
      )}
      {!list.length ? (
        <Empty emoji={filter === 'aktivni' ? '🔔' : '✅'} title={filter === 'aktivni' ? 'Žádné připomínky' : 'Nic dokončeného'} text={filter === 'aktivni' ? 'Nastav odčervení, očkování nebo léky a Tlapka ti včas připomene.' : 'Jednorázové úkoly se po splnění objeví tady.'}
          action={filter === 'aktivni' && data.pets.length ? <Button onClick={() => setEdit('new')}>Přidat připomínku</Button> : undefined} />
      ) : (
        <div className="space-y-7 mt-5 stagger">
          {groups.filter(([, l]) => l.length).map(([g, l]) => (
            <section key={g} className="space-y-2.5">
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${g === 'Po termínu' ? 'text-red-600 dark:text-red-400' : 'text-muted'}`}>{g}</h2>
              {l.map((r) => <ReminderRow key={r.id} r={r} pet={data.pets.find((p) => p.id === r.petId)} onEdit={() => setEdit(r)} />)}
            </section>
          ))}
        </div>
      )}
      <ReminderForm open={edit !== null} reminder={edit && edit !== 'new' ? edit : undefined} onClose={() => setEdit(null)} />
    </div>
  );
}

/* ---------------- Calendar ---------------- */
const WD = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
export function CalendarScreen() {
  const { data } = useStore();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(today());
  const [mode, setMode] = useState<'mesic' | 'seznam'>('mesic');
  const [edit, setEdit] = useState<Visit | null | 'new'>(null);
  const [rem, setRem] = useState<Reminder | null>(null);
  const pet = (id: string) => data.pets.find((p) => p.id === id);
  const days = useMemo(() => {
    const start = new Date(month); start.setDate(1 - ((month.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return toISO(d); });
  }, [month]);
  const byDay = useMemo(() => {
    const m: Record<string, { v: number; r: number }> = {};
    data.visits.forEach((v) => { (m[v.date] ??= { v: 0, r: 0 }).v++; });
    data.reminders.filter((r) => !r.completedAt).forEach((r) => { (m[r.dueDate] ??= { v: 0, r: 0 }).r++; });
    return m;
  }, [data.visits, data.reminders]);
  const dayVisits = data.visits.filter((v) => v.date === sel);
  const dayRems = data.reminders.filter((r) => !r.completedAt && r.dueDate === sel);
  const allVisits = [...data.visits].sort((a, b) => b.date.localeCompare(a.date));
  const upcomingV = allVisits.filter((v) => v.date >= today()).reverse();
  const pastV = allVisits.filter((v) => v.date < today());
  const mv = month.getMonth();
  return (
    <div>
      <PageHeader title="Kalendář" fab={data.pets.length ? <Fab label="Nová návštěva" onClick={() => setEdit('new')} /> : undefined} />
      <Segmented value={mode} onChange={setMode} options={[{ v: 'mesic', l: 'Měsíc' }, { v: 'seznam', l: 'Návštěvy' }]} />
      {mode === 'mesic' ? (
        <div className="animate-screen">
          <Card className="p-3 mt-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <button aria-label="Předchozí měsíc" className="press p-2 rounded-full" onClick={() => setMonth(new Date(month.getFullYear(), mv - 1, 1))}><Icon name="back" /></button>
              <p className="font-semibold capitalize">{month.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</p>
              <button aria-label="Další měsíc" className="press p-2 rounded-full" onClick={() => setMonth(new Date(month.getFullYear(), mv + 1, 1))}><Icon name="chev" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted mb-1">{WD.map((d) => <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((d) => {
                const inM = parse(d).getMonth() === mv, isSel = d === sel, isT = d === today(), m = byDay[d];
                return (
                  <button key={d} onClick={() => setSel(d)} className={`relative h-11 mx-0.5 rounded-xl text-sm font-medium transition ${isSel ? 'bg-primary text-white' : isT ? 'bg-primary/10 text-primary' : inM ? '' : 'text-muted/50'}`}>
                    {Number(d.slice(8))}
                    {m && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">{m.v > 0 && <i className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-primary'}`} />}{m.r > 0 && <i className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/70' : 'bg-amber-500'}`} />}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 justify-center text-[11px] text-muted mt-2"><span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-primary" />Návštěva</span><span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-amber-500" />Připomínka</span></div>
          </Card>
          <div className="flex items-center justify-between mt-5 mb-2"><h2 className="font-semibold">{fmtDate(sel)}</h2>{data.pets.length > 0 && <button className="text-sm font-semibold text-primary" onClick={() => setEdit('new')}>+ Návštěva</button>}</div>
          <div className="space-y-2.5">
            {!dayVisits.length && !dayRems.length && <p className="text-sm text-muted">Na tento den nic není.</p>}
            {dayVisits.map((v) => <VisitRow key={v.id} v={v} pet={pet(v.petId)} onClick={() => setEdit(v)} />)}
            {dayRems.map((r) => <ReminderRow key={r.id} r={r} pet={pet(r.petId)} onEdit={() => setRem(r)} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-5 mt-4 animate-screen">
          {!allVisits.length && <Empty emoji="🩺" title="Žádné návštěvy" text="Zapisuj návštěvy veterináře – důvod, diagnózu i cenu." action={data.pets.length ? <Button onClick={() => setEdit('new')}>Zapsat návštěvu</Button> : undefined} />}
          {upcomingV.length > 0 && <section className="space-y-2.5"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Naplánované</h2>{upcomingV.map((v) => <VisitRow key={v.id} v={v} pet={pet(v.petId)} onClick={() => setEdit(v)} />)}</section>}
          {pastV.length > 0 && <section className="space-y-2.5"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Historie</h2>{pastV.map((v) => <VisitRow key={v.id} v={v} pet={pet(v.petId)} onClick={() => setEdit(v)} />)}</section>}
          {pastV.some((v) => v.cost) && <p className="text-sm text-muted text-center">Celkem utraceno: <b>{pastV.reduce((s, v) => s + (v.cost ?? 0), 0).toLocaleString('cs-CZ')} Kč</b></p>}
        </div>
      )}
      <VisitForm open={edit !== null} visit={edit && edit !== 'new' ? edit : undefined} date={sel} onClose={() => setEdit(null)} />
      <ReminderForm open={!!rem} reminder={rem ?? undefined} onClose={() => setRem(null)} />
    </div>
  );
}

/* ---------------- Settings ---------------- */
export function Settings() {
  const { data, setTheme, setNotify, importData, reset, finishOnboarding } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tlapka-zaloha-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const toggleNotify = async () => {
    if (data.settings.notify) return setNotify(false);
    if (await requestPermission()) { setNotify(true); flash('Upozornění zapnuta'); } else flash('Upozornění nejsou povolena v nastavení zařízení.');
  };
  const Row = ({ icon, title, sub, right, onClick }: { icon: string; title: string; sub?: string; right?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} className="press w-full flex items-center gap-3 px-4 py-3.5 text-left">
      <span className="text-xl w-7 text-center">{icon}</span>
      <span className="flex-1 min-w-0"><span className="block font-medium">{title}</span>{sub && <span className="block text-[13px] text-muted">{sub}</span>}</span>
      {right}
    </button>
  );
  return (
    <div>
      <PageHeader title="Nastavení" />
      <div className="space-y-7 stagger">
        <section><h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2 px-1">Vzhled</h2>
          <Segmented value={data.settings.theme} onChange={setTheme} options={[{ v: 'system', l: 'Automaticky' }, { v: 'light', l: 'Světlý' }, { v: 'dark', l: 'Tmavý' }]} />
        </section>
        <section><h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2 px-1">Upozornění</h2>
          <Card className="divide-y divide-ink/5 dark:divide-white/5">
            <Row icon="🔔" title="Připomínat termíny" sub={notifySupported() ? 'Upozornění v den termínu' : 'Tento prohlížeč upozornění nepodporuje'} onClick={toggleNotify}
              right={<span className={`w-12 h-7 rounded-full p-0.5 transition ${data.settings.notify ? 'bg-primary' : 'bg-ink/15 dark:bg-white/20'}`}><span className={`block w-6 h-6 rounded-full bg-white shadow transition ${data.settings.notify ? 'translate-x-5' : ''}`} /></span>} />
            {data.settings.notify && (<>
              <div className="flex items-center gap-3 px-4 py-3"><span className="text-xl w-7 text-center">⏰</span><span className="flex-1 font-medium">Čas upozornění</span>
                <select className="bg-transparent font-semibold text-primary" value={data.settings.notifyHour} onChange={(e) => setNotify(true, Number(e.target.value))}>{Array.from({ length: 16 }, (_, i) => i + 6).map((h) => <option key={h} value={h}>{h}:00</option>)}</select></div>
              <Row icon="🧪" title="Poslat zkušební upozornění" onClick={() => showNow('🐾 Tlapka', 'Takhle ti připomenu odčervení a očkování.')} />
            </>)}
          </Card>
        </section>
        <section><h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2 px-1">Data</h2>
          <Card className="divide-y divide-ink/5 dark:divide-white/5">
            <Row icon="📤" title="Exportovat zálohu" sub="JSON se všemi záznamy (bez souborů dokumentů)" onClick={exportJson} />
            <Row icon="📥" title="Importovat zálohu" sub="Nahradí aktuální data" onClick={() => ref.current?.click()} />
            <Row icon="🐕" title="Načíst ukázková data" onClick={() => { if (confirm('Nahradit data ukázkou?')) finishOnboarding(true); }} />
            <Row icon="🗑️" title="Smazat všechna data" onClick={() => { if (confirm('Opravdu smazat všechna data? Nelze vrátit.')) reset(); }} />
          </Card>
          <input ref={ref} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
            try { const v = validate(JSON.parse(await f.text())); if (!v) throw 0; if (confirm(`Importovat ${v.pets.length} mazlíčků a ${v.reminders.length} připomínek?`)) { importData(v); flash('Záloha obnovena'); } } catch { flash('Neplatný soubor zálohy'); }
          }} />
        </section>
        <div className="text-center pt-4 pb-2 text-muted text-sm">
          <Logo className="h-9 mx-auto text-ink dark:text-white mb-2" />
          Verze 1.0 · data zůstávají jen v tomto zařízení
        </div>
      </div>
      {msg && <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+100px)] z-50 rounded-full bg-ink text-white dark:bg-white dark:text-ink px-4 py-2 text-sm shadow-lg animate-fade">{msg}</div>}
    </div>
  );
}

/* ---------------- Onboarding ---------------- */
export function Onboarding() {
  const { finishOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const slides = [
    { e: '🐾', t: 'Vítej v Tlapce', d: 'Jednoduchý pomocník pro zdraví tvých mazlíčků. Všechno na jednom místě.' },
    { e: '🔔', t: 'Nic nezmeškáš', d: 'Odčervení, klíšťata, očkování i léky. Tlapka ti včas připomene.' },
    { e: '📋', t: 'Zdravotní deník', d: 'Návštěvy veterináře, váha, faktury a RTG snímky pěkně pohromadě.' },
  ];
  const s = slides[step];
  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-safe pb-safe bg-gradient-to-b from-[#FFE6D3] to-bg dark:from-[#3a2219] dark:to-bg-d">
      <div className="pt-10"><Logo className="h-10 text-ink dark:text-white" /></div>
      <div className="flex-1 flex flex-col justify-center animate-screen" key={step}>
        <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] text-6xl flex items-center justify-center shadow-xl shadow-primary/30 mb-8">{s.e}</div>
        <h1 className="text-[34px] leading-tight font-bold tracking-tight">{s.t}</h1>
        <p className="text-lg text-muted mt-3">{s.d}</p>
      </div>
      <div className="flex gap-1.5 mb-6">{slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-ink/15 dark:bg-white/20'}`} />)}</div>
      {step < slides.length - 1 ? (
        <div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={() => setStep(slides.length - 1)}>Přeskočit</Button><Button className="flex-1" onClick={() => setStep(step + 1)}>Další</Button></div>
      ) : (
        <div className="space-y-3"><Button className="w-full py-4" onClick={() => finishOnboarding(false)}>Začít s vlastním mazlíčkem</Button><Button variant="ghost" className="w-full" onClick={() => finishOnboarding(true)}>Vyzkoušet s ukázkovými daty</Button></div>
      )}
    </div>
  );
}

export type Tab = 'home' | 'pets' | 'reminders' | 'calendar' | 'settings';
export type { Pet };
