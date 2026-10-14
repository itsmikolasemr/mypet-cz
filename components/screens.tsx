'use client';
import { ask as askDialog, notice, toast } from './feedback';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Pet, Reminder, Visit } from '@/lib/types';
import { useStore, validate } from '@/lib/store';
import { age, diffDays, fmtDate, parse, plural, speciesOf, status, toISO, today } from '@/lib/utils';
import { notifySupported, requestPermission, showNow } from '@/lib/notify';
import { Avatar, Button, Card, Empty, Fab, Icon, Logo, PageHeader, Segmented } from './ui';
import { AllergyForm, MedForm, PetForm, ReminderForm, SEVERITY, VisitForm, WeightForm } from './forms';
import type { Allergy, Medication } from '@/lib/types';
import { Documents, PetChip, ReminderRow, VisitRow, WeightChart } from './parts';
import { Companion } from './Companion';
import { useAmbient } from './ambient';
import { usePremium } from '@/lib/premium';
import { AdSlot, PremiumBadge } from './Premium';

const sortRem = (a: Reminder, b: Reminder) => a.dueDate.localeCompare(b.dueDate);
const greeting = () => { const h = new Date().getHours(); return h < 10 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer'; };

/* ---------------- Dashboard ---------------- */
export function Dashboard({ go, openPet }: { go: (t: Tab) => void; openPet: (id: string) => void }) {
  const { data } = useStore();
  const [edit, setEdit] = useState<Reminder | null>(null);
  const [newRem, setNewRem] = useState(false);
  const [newPet, setNewPet] = useState(false);
  const prem = usePremium();
  const addPet = () => (prem.canAddPet(data.pets.length) ? setNewPet(true) : prem.openPaywall('pets'));
  useEffect(() => { if (sessionStorage.getItem('tlapka:openAddPet')) { sessionStorage.removeItem('tlapka:openAddPet'); setNewPet(true); } }, []);
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
          <Companion data={data} pets={data.pets} onOpen={openPet} />
          <div className="flex gap-2 -mt-4">
            <span className="flex-1 rounded-2xl px-3 py-2.5 text-[13px] font-semibold bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10">📅 {upcoming.length} {upcoming.length === 1 ? 'úkol' : upcoming.length >= 2 && upcoming.length <= 4 ? 'úkoly' : 'úkolů'} / 30 dní</span>
            <span className={`flex-1 rounded-2xl px-3 py-2.5 text-[13px] font-semibold shadow-card dark:shadow-card-d ring-1 ${overdue.length ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/20' : 'bg-surface dark:bg-surface-d ring-ink/5 dark:ring-white/10'}`}>{overdue.length ? `⚠️ ${overdue.length} po termínu` : '✨ Nic nemeškáš'}</span>
          </div>
          <p className="text-[13px] text-muted -mt-5 px-1">Tip: připomínku odškrtneš i potažením doprava 🐾</p>
          <div className="grid grid-cols-2 gap-3 -mt-2">
            <button onClick={() => setNewRem(true)} className="press min-h-[48px] rounded-2xl bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10 font-semibold text-[15px]">＋ Připomínka</button>
            <button onClick={() => { sessionStorage.setItem('tlapka:petTab', 'doklady'); openPet(data.pets[0].id); }} className="press min-h-[48px] rounded-2xl bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10 font-semibold text-[15px]">📎 Dokument</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card onClick={() => go('ai')} className="p-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] text-white text-xl flex items-center justify-center shadow-[0_8px_18px_-8px_rgba(232,85,58,.7)] mb-3">🩺</div>
              <p className="font-semibold">Aivet</p><p className="text-[13px] text-muted">Poradí, co dělat</p>
            </Card>
            <Card onClick={() => go('map')} className="p-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-xl flex items-center justify-center mb-3">🗺️</div>
              <p className="font-semibold">Veteriny</p><p className="text-[13px] text-muted">V okolí i nonstop</p>
            </Card>
            <Card onClick={() => go('expenses')} className="p-4 col-span-2 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-xl flex items-center justify-center">💰</div>
              <span className="flex-1"><span className="font-semibold flex items-center gap-2">Výdaje {!prem.isPremium && <PremiumBadge small />}</span><span className="block text-[13px] text-muted">Kolik stojí péče po měsících</span></span>
              <Icon name="chev" className="w-4 h-4 text-muted" />
            </Card>
          </div>
          <section>
            <div className="flex items-center justify-between mb-2"><h2 className="font-semibold text-lg">Mazlíčci</h2><button className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] justify-center px-2 -mr-2 inline-flex items-center min-h-[44px] px-2 -mr-2 inline-flex items-center" onClick={() => go('pets')}>Vše</button></div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pt-1 pb-3">
              {data.pets.map((p) => (
                <button key={p.id} onClick={() => openPet(p.id)} className="press shrink-0 w-24 text-center">
                  <Avatar pet={p} size="w-20 h-20 mx-auto shadow-card dark:shadow-card-d" text="text-4xl" />
                  <p className="font-semibold mt-1.5 truncate">{p.name}</p>
                  <p className="text-xs text-muted truncate">{age(p.birthDate) || speciesOf(p.species).name}</p>
                </button>
              ))}
              <button onClick={addPet} className="press shrink-0 w-24 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl border-2 border-dashed border-ink/15 dark:border-white/15 flex items-center justify-center text-muted"><Icon name="plus" className="w-6 h-6" /></div>
                <p className="text-sm text-muted mt-1.5">Přidat</p>
              </button>
            </div>
          </section>
          {overdue.length > 0 && (
            <section className="space-y-2.5"><h2 className="font-semibold text-lg text-red-700 dark:text-red-400">Po termínu</h2>{overdue.map((r, i) => <ReminderRow key={r.id} r={r} pet={pet(r.petId)} hint={i === 0} onEdit={() => setEdit(r)} />)}</section>
          )}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Nadcházející</h2><button className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] justify-center px-2 -mr-2 inline-flex items-center min-h-[44px] px-2 -mr-2 inline-flex items-center" onClick={() => setNewRem(true)}>+ Přidat</button></div>
            {upcoming.length ? upcoming.slice(0, 5).map((r, i) => <ReminderRow key={r.id} r={r} pet={pet(r.petId)} hint={!overdue.length && i === 0} onEdit={() => setEdit(r)} />) : <Card className="p-4 text-sm text-muted text-center">Příštích 30 dní nic. 🎉</Card>}
          </section>
          <AdSlot id="home" />
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
  const prem = usePremium();
  const [add, setAddS] = useState(false);
  const setAdd = (v: boolean) => (!v || prem.canAddPet(data.pets.length) ? setAddS(v) : prem.openPaywall('pets'));
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
                <p className="font-semibold text-lg leading-tight flex items-center gap-2">{p.name}{data.allergies.some((a) => a.petId === p.id) && <span className="text-[12px] font-bold rounded-full px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">⚠️ Alergie</span>}</p>
                <p className="text-[13px] text-muted truncate">{[p.breed || speciesOf(p.species).name, age(p.birthDate), w && `${w.kg.toLocaleString('cs-CZ')} kg`].filter(Boolean).join(' · ')}</p>
                {next && <p className={`text-[13px] mt-0.5 font-medium ${status(next) === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>{next.title} · {fmtDate(next.dueDate)}</p>}
              </div>
              <Icon name="chev" className="w-4 h-4 text-muted" />
            </Card>
          );
        })}
      </div>
      {data.pets.length > 0 && <div className="mt-5"><AdSlot id="pets" /></div>}
      {!prem.isPremium && data.pets.length >= 3 && <p className="text-center text-[13px] text-muted mt-3">Zdarma až 3 mazlíčci · <button className="font-semibold text-primary" onClick={() => prem.openPaywall('pets')}>neomezeně s Premium</button></p>}
      <PetForm open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

export function PetDetail({ id, back, ask }: { id: string; back: () => void; ask?: () => void }) {
  const { data, deletePet, deleteWeight, addWeight } = useStore();
  const pet = data.pets.find((p) => p.id === id);
  const [tab, setTab] = useState<'pece' | 'zdravi' | 'vaha' | 'doklady'>(() => { const t = typeof window !== 'undefined' && sessionStorage.getItem('tlapka:petTab'); if (t) sessionStorage.removeItem('tlapka:petTab'); return t === 'doklady' ? 'doklady' : 'pece'; });
  const [edit, setEdit] = useState(false);
  const [rem, setRem] = useState<Reminder | null | 'new'>(null);
  const [vis, setVis] = useState<Visit | null | 'new'>(null);
  const [wt, setWt] = useState(false);
  const [med, setMed] = useState<Medication | null | 'new'>(null);
  const [alg, setAlg] = useState<Allergy | null | 'new'>(null);
  const ambient = useAmbient(pet?.photo);
  if (!pet) return <Empty emoji="🤔" title="Mazlíček nenalezen" text="" action={<Button onClick={back}>Zpět</Button>} />;
  const rems = data.reminders.filter((r) => r.petId === id).sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt) || sortRem(a, b));
  const visits = data.visits.filter((v) => v.petId === id).sort((a, b) => b.date.localeCompare(a.date));
  const meds = data.meds.filter((m) => m.petId === id).sort((a, b) => Number(!!a.end && a.end < today()) - Number(!!b.end && b.end < today()));
  const allergies = data.allergies.filter((a) => a.petId === id);
  const info: [string, string][] = ([['Druh', speciesOf(pet.species).name], ['Plemeno', pet.breed], [pet.sex === 'samice' ? 'Narozena' : pet.sex === 'samec' ? 'Narozen' : 'Datum narození', pet.birthDate && `${fmtDate(pet.birthDate)} (${age(pet.birthDate)})`], ['Pohlaví', pet.sex === 'samec' ? 'Samec' : pet.sex === 'samice' ? 'Samice' : ''], ['Barva', pet.color], ['Čip', pet.microchip]] as [string, string][]).filter(([, v]) => v);
  return (
    <div>
      <div className="sticky z-30 flex items-center justify-between mb-4 -mx-1 px-1.5 py-1.5 rounded-full bg-surface/70 dark:bg-surface-d/70 backdrop-blur-2xl ring-1 ring-ink/5 dark:ring-white/10 shadow-card dark:shadow-card-d" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <button onClick={back} className="press flex items-center gap-1 text-primary font-semibold pl-2 pr-3 min-h-[44px] rounded-full"><Icon name="back" /> Zpět</button>
        <button onClick={() => setEdit(true)} className="press flex items-center gap-1.5 text-primary font-semibold px-3 min-h-[44px] rounded-full"><Icon name="edit" className="w-4 h-4" /> Upravit</button>
      </div>
      {ambient && <div aria-hidden className="fixed inset-x-0 top-0 h-[55dvh] -z-10 pointer-events-none transition-opacity duration-700" style={{ background: `radial-gradient(100% 70% at 30% 0%, ${ambient}66, transparent 70%)` }} />}
      <div className="flex items-center gap-4 mb-4">
        <Avatar pet={pet} size="w-24 h-24 shadow-float dark:shadow-float-d" text="text-5xl" />
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight break-words">{pet.name}</h1>
          <p className="text-muted">{[pet.breed || speciesOf(pet.species).name, age(pet.birthDate)].filter(Boolean).join(' · ')}</p>
          {allergies.length > 0 && <button onClick={() => setTab('zdravi')} className="mt-1.5 min-h-[44px] text-[13px] font-bold rounded-full px-3.5 bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">⚠️ Alergie: {allergies.map((a) => a.allergen).join(', ')}</button>}
        </div>
      </div>
      {info.length > 0 && (
        <Card className="p-4 mb-4 grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
          {info.map(([k, v]) => <div key={k}><p className="text-muted text-xs">{k}</p><p className="font-medium break-all">{v}</p></div>)}
          {pet.notes && <div className="col-span-2"><p className="text-muted text-xs">Poznámky</p><p>{pet.notes}</p></div>}
        </Card>
      )}
      <PassButton pet={pet} />
      {ask && <button onClick={ask} className="press w-full mb-4 flex items-center gap-3 rounded-[22px] p-3.5 text-left text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] shadow-[0_14px_30px_-14px_rgba(232,85,58,.7)]">
        <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">🩺</span>
        <span className="flex-1"><b className="block">Zeptej se Aiveta</b><span className="text-sm text-white/85">Zná profil, léky i alergie – {pet.name}</span></span><Icon name="chev" className="w-4 h-4" />
      </button>}
      <Segmented value={tab} onChange={setTab} options={[{ v: 'pece', l: 'Péče' }, { v: 'zdravi', l: 'Zdraví' }, { v: 'vaha', l: 'Váha' }, { v: 'doklady', l: 'Doklady' }]} />
      <div className="mt-5 space-y-3 stagger" key={tab}>
        {tab === 'pece' && (<>
          <Button variant="soft" className="w-full" onClick={() => setRem('new')}><Icon name="plus" /> Nová připomínka</Button>
          {!rems.length && <p className="text-sm text-muted text-center py-4">Žádné připomínky. Přidej třeba odčervení Milbemaxem.</p>}
          {rems.map((r) => <ReminderRow key={r.id} r={r} showPet={false} onEdit={() => setRem(r)} />)}
        </>)}
        {tab === 'zdravi' && (<>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2"><p className="font-semibold">⚠️ Alergie</p><button className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] justify-center px-2 -mr-2 inline-flex items-center min-h-[44px] px-2 -mr-2 inline-flex items-center" onClick={() => setAlg('new')}>+ Přidat</button></div>
            {!allergies.length ? <p className="text-sm text-muted">Žádné známé alergie.</p> : (
              <div className="space-y-2">{allergies.map((a) => (
                <button key={a.id} onClick={() => setAlg(a)} className="press w-full flex items-center gap-3 text-left rounded-2xl bg-ink/[0.03] dark:bg-white/[0.04] px-3 py-2.5">
                  <div className="flex-1 min-w-0"><p className="font-semibold">{a.allergen}</p>{a.reaction && <p className="text-[13px] text-muted truncate">{a.reaction}</p>}</div>
                  <span className={`text-[12px] font-bold uppercase rounded-full px-2 py-0.5 ${SEVERITY.find((x) => x.id === a.severity)?.cls}`}>{SEVERITY.find((x) => x.id === a.severity)?.n}</span>
                </button>
              ))}</div>
            )}
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2"><p className="font-semibold">💊 Léky</p><button className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] justify-center px-2 -mr-2 inline-flex items-center min-h-[44px] px-2 -mr-2 inline-flex items-center" onClick={() => setMed('new')}>+ Přidat</button></div>
            {!meds.length ? <p className="text-sm text-muted">Žádné léky.</p> : (
              <div className="space-y-2">{meds.map((m) => {
                const ended = !!m.end && m.end < today();
                return (
                  <button key={m.id} onClick={() => setMed(m)} className={`press w-full flex items-center gap-3 text-left rounded-2xl bg-ink/[0.03] dark:bg-white/[0.04] px-3 py-2.5 ${ended ? 'opacity-55' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{m.name}{m.reminderId && <span className="ml-1.5 text-xs">🔔</span>}</p>
                      <p className="text-[13px] text-muted">{[m.dose, m.frequency].filter(Boolean).join(' · ')}</p>
                      <p className="text-[12px] text-muted">{ended ? `Ukončeno ${fmtDate(m.end)}` : `Od ${fmtDate(m.start)}${m.end ? ` do ${fmtDate(m.end)}` : ''}`}</p>
                    </div>
                    <Icon name="chev" className="w-4 h-4 text-muted" />
                  </button>
                );
              })}</div>
            )}
          </Card>
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
                <button aria-label="Smazat" onClick={() => { const prev = w; deleteWeight(pet.id, w.id); toast('Záznam váhy smazán', () => addWeight(pet.id, prev.kg, prev.date)); }} className="text-muted p-1"><Icon name="x" className="w-4 h-4" /></button>
              </div>
            ))}
          </Card>
        </>)}
        {tab === 'doklady' && <Documents pet={pet} />}
      </div>
      <Button variant="danger" className="w-full mt-8" onClick={async () => { if (await askDialog({ title: `Smazat ${pet.name}?`, text: 'Smažou se i všechny připomínky, návštěvy, léky, alergie a dokumenty. Nelze vrátit.', ok: 'Smazat', danger: true })) { deletePet(pet.id); back(); toast(`${pet.name} smazán${pet.sex === 'samice' ? 'a' : ''}`); } }}><Icon name="trash" /> Smazat mazlíčka</Button>
      <PetForm open={edit} pet={pet} onClose={() => setEdit(false)} />
      <ReminderForm open={rem !== null} reminder={rem && rem !== 'new' ? rem : undefined} petId={pet.id} onClose={() => setRem(null)} />
      <VisitForm open={vis !== null} visit={vis && vis !== 'new' ? vis : undefined} petId={pet.id} onClose={() => setVis(null)} />
      <WeightForm open={wt} petId={pet.id} onClose={() => setWt(false)} />
      <MedForm open={med !== null} med={med && med !== 'new' ? med : undefined} petId={pet.id} onClose={() => setMed(null)} />
      <AllergyForm open={alg !== null} allergy={alg && alg !== 'new' ? alg : undefined} petId={pet.id} onClose={() => setAlg(null)} />
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
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const shift = (d: 1 | -1) => { setDir(d); setMonth((m) => new Date(m.getFullYear(), m.getMonth() + d, 1)); };
  const sw = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const [drag, setDrag] = useState(0);
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
              <button aria-label="Předchozí měsíc" className="press w-11 h-11 flex items-center justify-center rounded-full" onClick={() => shift(-1)}><Icon name="back" /></button>
              <p className="font-semibold capitalize">{month.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</p>
              <button aria-label="Další měsíc" className="press w-11 h-11 flex items-center justify-center rounded-full" onClick={() => shift(1)}><Icon name="chev" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-muted mb-1">{WD.map((d) => <div key={d}>{d}</div>)}</div>
            <div className="overflow-hidden"
              style={{ touchAction: 'pan-y' }} data-month={`${month.getFullYear()}-${month.getMonth() + 1}`}
              onPointerDown={(e) => { swiped.current = false; sw.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; }}
              onPointerMove={(e) => { const s0 = sw.current; if (!s0 || s0.id !== e.pointerId) return; const x = e.clientX - s0.x; if (Math.abs(x) > Math.abs(e.clientY - s0.y) && Math.abs(x) > 6) setDrag(x); }}
              onPointerUp={(e) => { const s0 = sw.current; sw.current = null; setDrag(0); if (!s0) return; const x = e.clientX - s0.x; if (Math.abs(x) > 50) { swiped.current = true; shift(x < 0 ? 1 : -1); } }}
              onPointerCancel={() => { sw.current = null; setDrag(0); }}
              onClickCapture={(e) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; } }}>
            <div key={month.getTime()} className={`grid grid-cols-7 gap-y-1 select-none ${drag ? '' : dir === 1 ? 'cal-in-r' : dir === -1 ? 'cal-in-l' : ''}`} style={drag ? { transform: `translateX(${drag * 0.4}px)`, opacity: 1 - Math.min(0.4, Math.abs(drag) / 400) } : undefined}>
              {days.map((d) => {
                const inM = parse(d).getMonth() === mv, isSel = d === sel, isT = d === today(), m = byDay[d];
                return (
                  <button key={d} onClick={() => setSel(d)} className={`relative h-11 mx-0.5 rounded-xl text-sm font-medium transition ${isSel ? 'bg-primary-d text-white' : isT ? 'bg-primary/10 text-primary' : inM ? '' : 'text-muted'}`}>
                    {Number(d.slice(8))}
                    {m && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">{m.v > 0 && <i className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-primary'}`} />}{m.r > 0 && <i className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/70' : 'bg-amber-500'}`} />}</span>}
                  </button>
                );
              })}
            </div></div>
            <div className="flex gap-4 justify-center text-[12px] text-muted mt-2"><span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-primary" />Návštěva</span><span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-amber-500" />Připomínka</span></div>
          </Card>
          <div className="flex items-center justify-between mt-5 mb-2"><h2 className="font-semibold">{fmtDate(sel)}</h2>{data.pets.length > 0 && <button className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] justify-center px-2 -mr-2 inline-flex items-center min-h-[44px] px-2 -mr-2 inline-flex items-center" onClick={() => setEdit('new')}>+ Návštěva</button>}</div>
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
const THEMES: { v: 'system' | 'light' | 'dark' | 'glass'; l: string; d: string; bg: string; pane: string; edge?: string; split?: boolean }[] = [
  { v: 'system', l: 'Auto', d: 'Podle nastavení telefonu – ve dne světlý, v noci tmavý.', bg: '#FFF8F0', pane: '#FFFFFF', split: true },
  { v: 'light', l: 'Světlý', d: 'Teplý světlý vzhled.', bg: '#FFF1E6', pane: '#FFFFFF', edge: '0 2px 6px rgba(59,42,36,.12)' },
  { v: 'dark', l: 'Tmavý', d: 'Šetří oči i baterii v noci.', bg: '#17110E', pane: '#2a201b' },
  { v: 'glass', l: 'Sklo', d: 'Matné sklo ve stylu iOS – průsvitné vrstvy nad šedým pozadím.', bg: 'linear-gradient(180deg,#F2F3F5,#DCDFE4)', pane: 'rgba(255,255,255,.7)', edge: 'inset 0 1px 0 #fff, 0 0 0 .5px rgba(60,64,72,.18)' },
];

export function Settings() {
  const { data, setTheme, setNotify, importData, reset, finishOnboarding } = useStore();
  const prem = usePremium();
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
        <section aria-labelledby="vzhled-h"><h2 id="vzhled-h" className="text-sm font-semibold uppercase tracking-wide text-muted mb-2 px-1">Vzhled</h2>
          <Card className="p-3">
            <div role="radiogroup" aria-label="Motiv aplikace" className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => {
                const on = data.settings.theme === t.v;
                return (
                  <button key={t.v} role="radio" aria-checked={on} aria-label={`Motiv ${t.l}`} onClick={() => setTheme(t.v)} className={`press rounded-2xl p-1.5 text-center ring-2 transition ${on ? 'ring-primary' : 'ring-transparent'}`}>
                    <span aria-hidden className="relative block h-[72px] rounded-xl overflow-hidden" style={{ background: t.bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }}>
                      {t.split && <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: '#17110E' }} />}
                      <span className="absolute left-2 right-2 top-2 h-5 rounded-md" style={{ background: t.pane, boxShadow: t.edge }} />
                      <span className="absolute left-2 w-2/3 top-9 h-5 rounded-md" style={{ background: t.pane, boxShadow: t.edge }} />
                      <span className="absolute right-2 bottom-2 w-3 h-3 rounded-full bg-gradient-to-br from-[#FF9A5A] to-[#E8553A]" />
                    </span>
                    <span className={`block mt-1.5 text-[13px] font-semibold ${on ? '' : 'text-muted'}`}>{t.l}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-muted mt-2 px-1">{THEMES.find((t) => t.v === data.settings.theme)?.d}</p>
          </Card>
        </section>
        <section><h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2 px-1">Předplatné</h2>
          <Card className="divide-y divide-ink/5 dark:divide-white/5">
            {prem.isPremium && prem.ent ? (<>
              <Row icon="✦" title="Tlapka Premium" sub={`${{ monthly: 'Měsíční', yearly: 'Roční', family: 'Rodinný', trial: 'Zkušební (14 dní)' }[prem.ent.plan]} tarif · platí do ${fmtDate(toISO(new Date(prem.ent.exp)))}`} right={<PremiumBadge />} onClick={() => prem.openPaywall('obecne')} />
              {prem.ent.test && <Row icon="🧪" title="Vypnout testovací Premium" sub="TEST – vrátí appku do verze zdarma" onClick={() => prem.deactivate()} />}
            </>) : (
              <Row icon="✦" title="Získat Premium" sub="Aivet bez omezení, bez reklam, PDF pas, výdaje · 14 dní zdarma" right={<span className="text-sm font-bold text-primary">79 Kč</span>} onClick={() => prem.openPaywall('obecne')} />
            )}
          </Card>
        </section>
        <section><h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2 px-1">Upozornění</h2>
          <Card className="divide-y divide-ink/5 dark:divide-white/5">
            <Row icon="🔔" title="Připomínat termíny" sub={notifySupported() ? 'Upozornění v den termínu' : /iP(hone|ad|od)/.test(navigator.userAgent) ? 'Na iPhonu: Sdílet → Přidat na plochu, pak upozornění zapneš (iOS 16.4+)' : 'Tento prohlížeč upozornění nepodporuje'} onClick={toggleNotify}
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
            <Row icon="🐕" title="Načíst ukázková data" onClick={async () => { if (await askDialog({ title: 'Nahradit data ukázkou?', text: 'Současné záznamy se přepíšou.', ok: 'Nahradit', danger: true })) { finishOnboarding(true); toast('Ukázková data načtena'); } }} />
            <Row icon="🗑️" title="Smazat všechna data" onClick={async () => { if (await askDialog({ title: 'Smazat všechna data?', text: 'Smažou se všichni mazlíčci a záznamy. Nelze vrátit. Předplatné Premium a počet zkušebních dotazů Aivetovi zůstávají (jsou vázané na zařízení).', ok: 'Smazat vše', danger: true })) reset(); }} />
          </Card>
          <input ref={ref} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
            try { const v = validate(JSON.parse(await f.text())); if (!v) throw 0; if (await askDialog({ ok: 'Importovat', title: 'Obnovit zálohu?', text: `Nahradí aktuální data. Importovat ${v.pets.length} ${plural(v.pets.length, 'mazlíčka', 'mazlíčky', 'mazlíčků')} a ${v.reminders.length} ${plural(v.reminders.length, 'připomínku', 'připomínky', 'připomínek')}?${v.docs.length ? ' Soubory dokumentů nejsou v záloze – záznamy dokumentů se nenahrají.' : ''}` })) { importData(v); flash('Záloha obnovena'); } } catch { flash('Neplatný soubor zálohy'); }
          }} />
        </section>
        <div className="text-center pt-4 pb-2 text-muted text-sm">
          <Logo className="h-9 mx-auto text-ink dark:text-white mb-2" />
          Verze 1.0 · data zůstávají jen v tomto zařízení
        </div>
      </div>
      {msg && <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+var(--badge,0px)+100px)] z-50 rounded-full bg-ink text-white dark:bg-white dark:text-ink px-4 py-2 text-sm shadow-lg animate-fade">{msg}</div>}
    </div>
  );
}

function PassButton({ pet }: { pet: Pet }) {
  const { data } = useStore();
  const prem = usePremium();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!prem.isPremium) return prem.openPaywall('pdf');
    setBusy(true);
    try { const { healthPassPdf, saveOrShare } = await import('@/lib/pdf'); const b = await healthPassPdf(data, pet); const where = await saveOrShare(b, `zdravotni-pas-${pet.name.normalize('NFD').replace(/[^\w-]/g, '').toLowerCase() || 'mazlicek'}.pdf`); toast(where.startsWith('file:') ? 'Zdravotní pas uložen do Dokumentů ✓' : 'Zdravotní pas stažen ✓'); }
    catch (e) { console.error(e); notice('PDF se nepodařilo vytvořit', 'Zkus to prosím znovu.'); } finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy} className="press w-full mb-3 flex items-center gap-3 rounded-[22px] p-3.5 text-left bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10 disabled:opacity-60">
      <span className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xl">📄</span>
      <span className="flex-1"><b className="flex items-center gap-2">Zdravotní pas (PDF + QR) {!prem.isPremium && <PremiumBadge small />}</b><span className="text-sm text-muted">{busy ? 'Připravuji…' : 'Očkování, léky a alergie pro veterináře'}</span></span>
      <Icon name="chev" className="w-4 h-4" />
    </button>
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
    <div style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom), 16px) + var(--badge, 0px))" }} className="min-h-[100dvh] flex flex-col px-6 pt-safe bg-gradient-to-b from-[#FFE6D3] to-bg dark:from-[#3a2219] dark:to-bg-d">
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
        <div className="space-y-3"><Button className="w-full py-4" onClick={() => { sessionStorage.setItem('tlapka:openAddPet', '1'); finishOnboarding(false); }}>Začít s vlastním mazlíčkem</Button><Button variant="ghost" className="w-full" onClick={() => finishOnboarding(true)}>Vyzkoušet s ukázkovými daty</Button></div>
      )}
    </div>
  );
}

export type Tab = 'home' | 'pets' | 'reminders' | 'calendar' | 'settings' | 'map' | 'ai' | 'expenses';
export type { Pet };
