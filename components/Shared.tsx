'use client';
import { SharedHandover } from './Handover';
// Caretaker page (#share/<token>): works without account or local data. Shows pets, today's tasks and marks doses.
import { useCallback, useEffect, useState } from 'react';
import { sharedLogDose, sharedView } from '@/lib/cloud';
import { Card, Logo } from './ui';
import { toast } from './feedback';

type V = { scope: string; expires_at: string; pets: import('@/lib/types').Pet[]; reminders: { id: string; petId: string; title: string; product?: string; dueDate: string }[];
  meds: { id: string; petId: string; name: string; dose: string; frequency: string }[]; allergies: { id: string; petId: string; allergen: string }[]; doses: { pet_id: string; reminder_id: string | null; med_id: string | null; given_at: string; by: string | null }[] };

export function SharedPage({ token }: { token: string }) {
  const [v, setV] = useState<V | null | undefined>(undefined);
  const [name, setName] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('tlapka:sitterName')) || '');
  const load = useCallback(() => Promise.resolve(sharedView(token)).then((r) => setV((r.data as V) ?? null)).catch(() => setV(null)), [token]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  const t = (iso: string) => new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const lastDose = (pet: string, rem?: string, med?: string) => v?.doses.find((d) => d.pet_id === pet && (rem ? d.reminder_id === rem : d.med_id === med));
  const give = async (pet: string, rem: string | null, med: string | null) => {
    const n = name.trim() || 'Hlídač'; localStorage.setItem('tlapka:sitterName', n);
    const r = await sharedLogDose(token, pet, rem, med, n);
    if (r.data) { toast('Zapsáno, majitel to uvidí'); load(); } else toast('Odkaz už neplatí');
  };
  return (
    <main className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-16 space-y-4">
      <Logo />
      {v === undefined && <p className="text-muted">Načítám…</p>}
      {v === null && <Card className="p-5"><p className="font-bold text-lg">Odkaz neplatí</p><p className="text-muted mt-1">Vypršel nebo ho majitel zrušil. Požádej o nový.</p></Card>}
      {v && <>
        <div><h1 className="text-2xl font-bold">{v.pets.some((p) => p.care) ? 'Předávací karta' : v.scope === 'pass' ? 'Zdravotní pas' : 'Hlídání'}</h1><p className="text-[14px] text-muted">Platí do {new Date(v.expires_at).toLocaleString('cs-CZ')} · bez registrace</p></div>
        {v.scope === 'today' && <label className="block"><span className="text-[13px] font-semibold">Tvoje jméno (uvidí ho majitel)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="např. Jana" className="mt-1 w-full min-h-[48px] rounded-2xl px-4 bg-ink/5 dark:bg-white/10" /></label>}
        {v.pets.map((p) => {
          const rs = v.reminders.filter((r) => r.petId === p.id), ms = v.meds.filter((m) => m.petId === p.id), al = v.allergies.filter((a) => a.petId === p.id);
          return (
            <Card key={p.id} className="p-4 space-y-3" >
              <p className="text-lg font-bold" data-pet={p.id}>{p.name}</p>
              {!!al.length && <p className="text-[14px] rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2">⚠️ Alergie: {al.map((a) => a.allergen).join(', ')}</p>}
              {[...ms.map((m) => ({ k: `m${m.id}`, title: `${m.name} · ${m.dose}`, sub: m.frequency, rem: null as string | null, med: m.id as string | null })),
                ...rs.map((r) => ({ k: `r${r.id}`, title: r.title, sub: `termín ${new Date(r.dueDate).toLocaleDateString('cs-CZ')}`, rem: r.id as string | null, med: null as string | null }))].map((x) => {
                const d = lastDose(p.id, x.rem ?? undefined, x.med ?? undefined);
                return (
                  <div key={x.k} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0"><p className="font-medium break-words">{x.title}</p><p className="text-[13px] text-muted">{d ? `✓ podal(a) ${d.by ?? '—'} v ${t(d.given_at)}` : x.sub}</p></div>
                    {v.scope === 'today' && <button onClick={() => give(p.id, x.rem, x.med)} className="press min-h-[44px] px-4 rounded-2xl font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">Podáno</button>}
                  </div>
                );
              })}
              <SharedHandover pet={p} data={{ meds: v.meds as unknown as import('@/lib/types').Medication[], allergies: v.allergies as unknown as import('@/lib/types').Allergy[] }} />
              {!rs.length && !ms.length && !p.care && <p className="text-[14px] text-muted">{v.scope === 'pass' ? 'Žádné záznamy.' : 'Dnes nic k podání.'}</p>}
            </Card>
          );
        })}
        <p className="text-[13px] text-muted">Nouze? Nejbližší nonstop veterina: otevři Tlapka → Mapa, nebo volej 112.</p>
      </>}
    </main>
  );
}
