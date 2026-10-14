'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePremium, PLANS, FREE, type PlanId } from '@/lib/premium';
import { useStore } from '@/lib/store';
import { fmtDate, plural } from '@/lib/utils';
import { Card, PageHeader, Sheet } from './ui';
import { Avatar } from './ui';

export const PERKS: { e: string; t: string; d: string; soon?: boolean }[] = [
  { e: '🩺', t: 'Aivet bez omezení', d: 'AI poradce zná profil, léky i alergie tvého mazlíčka' },
  { e: '🚫', t: 'Bez reklam', d: 'Čistá appka bez jediné reklamy' },
  { e: '📄', t: 'Zdravotní pas v PDF + QR', d: 'Očkování, léky a alergie pro veterináře, hlídání či cestu' },
  { e: '💰', t: 'Přehled výdajů', d: 'Kolik stojí péče – po měsících a po mazlíčcích' },
  { e: '🐾', t: 'Neomezeně mazlíčků', d: `Zdarma ${FREE.pets}, s Premium kolik chceš` },
  { e: '☁️', t: 'Záloha do cloudu', d: 'Data v bezpečí i při ztrátě telefonu', soon: true },
  { e: '👨‍👩‍👧', t: 'Rodinné sdílení', d: 'Společná péče s partnerem, dětmi či hlídačem', soon: true },
  { e: '🧾', t: 'AI sken faktur', d: 'Vyfoť účet od veterináře a Tlapka ho sama zapíše', soon: true },
];
const FREE_LIST = ['Až 3 mazlíčci', 'Připomínky a upozornění', 'Kalendář a návštěvy', 'Mapa veterin + nonstop pohotovost', 'Dokumenty a váha', `${FREE.aivet} zkušební dotazy Aivetovi`];

export function PremiumBadge({ small = false }: { small?: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-full font-bold text-white bg-gradient-to-br from-[#F5B04A] via-[#FF8A4C] to-[#E8553A] shadow-[0_4px_12px_-4px_rgba(232,85,58,.6)] ${small ? 'text-[12px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'}`}>✦ Premium</span>;
}

const REASON: Record<string, string> = { aivet: 'Ptej se Aiveta bez omezení', pets: `Zdarma můžeš mít ${FREE.pets} mazlíčky`, pdf: 'Zdravotní pas v PDF je součástí Premium', expenses: 'Přehled výdajů je součástí Premium', obecne: 'Víc péče, méně starostí' };

export function Paywall() {
  const p = usePremium();
  const [plan, setPlan] = useState<Exclude<PlanId, 'trial'>>('yearly');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const buy = async (id: PlanId) => { setBusy(true); setErr(''); try { await p.purchase(id); p.closePaywall(); } catch (e) { setErr(e instanceof Error ? e.message : 'Nepovedlo se.'); } finally { setBusy(false); } };
  return (
    <Sheet open={!!p.paywall} onClose={p.closePaywall} title="Tlapka Premium">
      <div className="text-center -mt-1 mb-4">
        <div className="mx-auto w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#F5B04A] via-[#FF8A4C] to-[#E8553A] text-3xl flex items-center justify-center shadow-float mb-3">✦</div>
        <p className="text-lg font-bold">{REASON[p.paywall ?? 'obecne'] ?? REASON.obecne}</p>
        <p className="text-sm text-muted">14 dní zdarma, pak zrušíš kdykoli jedním klepnutím.</p>
      </div>
      <ul className="space-y-2.5 mb-5">
        {PERKS.map((x) => (
          <li key={x.t} className="flex gap-3 items-start"><span className="text-xl w-7 text-center">{x.e}</span>
            <span className="flex-1"><b className="text-[15px]">{x.t}</b>{x.soon && <span className="ml-1.5 align-middle text-[12px] font-bold uppercase rounded-full px-1.5 py-0.5 bg-ink/10 dark:bg-white/15">brzy</span>}<span className="block text-[13px] text-muted">{x.d}</span></span></li>
        ))}
      </ul>
      <div role="radiogroup" aria-label="Tarif" className="space-y-2 mb-4">
        {PLANS.map((x) => (
          <button key={x.id} role="radio" aria-checked={plan === x.id} onClick={() => setPlan(x.id)}
            className={`press w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-2 transition ${plan === x.id ? 'ring-primary bg-primary/10' : 'ring-ink/10 dark:ring-white/10'}`}>
            <span className={`w-5 h-5 rounded-full border-2 ${plan === x.id ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-ink/30 dark:border-white/30'}`} />
            <span className="flex-1"><b>{x.name}</b>{x.best && <span className="ml-2 text-[12px] font-bold uppercase text-white bg-[#C2412A] rounded-full px-1.5 py-0.5">nejvýhodnější</span>}{x.note && <span className="block text-[13px] text-muted">{x.note}</span>}</span>
            <span className="text-right"><b>{x.price}</b><span className="block text-[12px] text-muted">{x.per}</span></span>
          </button>
        ))}
      </div>
      <button disabled={busy} onClick={() => buy('trial')} className="press w-full rounded-2xl py-3.5 font-bold text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] shadow-float disabled:opacity-50">Vyzkoušet 14 dní zdarma</button>
      <button disabled={busy} onClick={() => buy(plan)} className="press w-full rounded-2xl py-3 mt-2 font-semibold text-primary bg-primary/10 disabled:opacity-50">Předplatit {PLANS.find((x) => x.id === plan)?.price} {PLANS.find((x) => x.id === plan)?.per}</button>
      {err && <p className="text-center text-sm text-red-600 dark:text-red-400 mt-2">{err}</p>}
      <p className="mt-3 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200 text-[12px] px-3 py-2 text-center">🧪 TESTOVACÍ REŽIM – nic se neplatí. Platby přes App Store / Google Play (RevenueCat) zatím nejsou zapnuté.</p>
      <details className="mt-4 text-sm"><summary className="text-muted cursor-pointer">Co zůstává zdarma navždy</summary>
        <ul className="mt-2 grid grid-cols-2 gap-1.5 text-[13px]">{FREE_LIST.map((f) => <li key={f}>✓ {f}</li>)}</ul>
        <p className="text-[13px] text-muted mt-2">Nouzové funkce (mapa nonstop pohotovostí a varování v Aivetovi) nikdy nezamkneme.</p></details>
    </Sheet>
  );
}

/** House promo for Premium (until real ad partners exist). Never on map / Aivet / emergency screens; hidden for Premium. */
const PROMOS: Record<string, { e: string; t: string; d: string; r: string }> = {
  home: { e: '📄', t: 'Zdravotní pas do kapsy', d: 'Očkování, léky a alergie v PDF s QR kódem – pro veterináře i hlídání.', r: 'pdf' },
  pets: { e: '🩺', t: 'Aivet bez omezení', d: 'Ptej se kdykoli – zná profil, léky i alergie tvých mazlíčků.', r: 'aivet' },
};
export function AdSlot({ id }: { id: string }) {
  const p = usePremium();
  if (p.isPremium) return null;
  const x = PROMOS[id] ?? PROMOS.home;
  return (
    <aside aria-label="Tlapka Premium" data-ad-slot={id} className="rounded-[22px] p-3.5 flex items-center gap-3 bg-gradient-to-br from-[#FFF1E6] to-[#FFE3D2] dark:from-[#3a2219] dark:to-[#2a1a14] ring-1 ring-[#E8553A]/15">
      <span className="w-11 h-11 rounded-2xl bg-white/70 dark:bg-white/10 flex items-center justify-center text-xl shrink-0">{x.e}</span>
      <span className="flex-1 min-w-0"><span className="block font-semibold text-[15px]">{x.t}</span><span className="block text-[13px] text-muted">{x.d}</span></span>
      <button onClick={() => p.openPaywall(x.r)} className="press shrink-0 min-h-[44px] px-3 rounded-full text-[13px] font-bold text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A]">14 dní zdarma</button>
    </aside>
  );
}

/** Reserved 320×50 mobile banner (AdMob-ready). Rendered by the shell only on non-emergency screens for free users. */
export const BANNER_H = 50;
export function BannerSlot() {
  const p = usePremium();
  useEffect(() => {
    const on = !p.isPremium;
    document.documentElement.style.setProperty('--banner', on ? `${BANNER_H + 8}px` : '0px');
    return () => document.documentElement.style.setProperty('--banner', '0px');
  }, [p.isPremium]);
  if (p.isPremium) return null;
  return (
    <div className="fixed inset-x-0 z-30 flex justify-center pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px) + 88px)' }}>
      <aside id="ad-banner" data-ad-slot="banner-bottom" data-ad-size="320x50" aria-label="Reklama"
        className="pointer-events-auto w-[320px] h-[50px] rounded-xl flex items-center justify-center gap-2 bg-[#ECEDEF] dark:bg-[#26201d] ring-1 ring-black/[0.06] dark:ring-white/10 text-[12px] font-semibold uppercase tracking-wider text-[#5A5F68] dark:text-[#B8AAA2]">
        Reklama
      </aside>
    </div>
  );
}

const Y = new Date().getFullYear();
const DEMO = [3, 5, 9].map((m, i) => ({ id: 'd' + i, petId: 'demo', date: `${Y}-${String(m).padStart(2, '0')}-10`, clinic: '', reason: 'Ukázková návštěva', notes: '', cost: [900, 1500, 600][i] }));

export function Expenses() {
  const { data } = useStore();
  const p = usePremium();
  const [year, setYear] = useState(new Date().getFullYear());
  // Free users get a demo dataset under the blur – real amounts never reach the DOM / screen readers.
  const demoPets = useMemo(() => [{ ...(data.pets[0] ?? ({} as never)), id: 'demo', name: 'Ukázka', photo: undefined, species: 'pes' as const }], [data.pets]);
  const costs = (p.isPremium ? data.visits : DEMO).filter((v) => v.cost != null && v.cost > 0);
  const pets = p.isPremium ? data.pets : demoPets;
  const years = useMemo(() => [...new Set([new Date().getFullYear(), ...costs.map((v) => Number(v.date.slice(0, 4)))])].sort((a, b) => b - a), [costs]);
  const inY = costs.filter((v) => Number(v.date.slice(0, 4)) === year);
  const total = inY.reduce((s, v) => s + (v.cost ?? 0), 0);
  const months = Array.from({ length: 12 }, (_, m) => inY.filter((v) => Number(v.date.slice(5, 7)) === m + 1).reduce((s, v) => s + (v.cost ?? 0), 0));
  const max = Math.max(1, ...months);
  const byPet = pets.map((pet) => ({ pet, sum: inY.filter((v) => v.petId === pet.id).reduce((s, v) => s + (v.cost ?? 0), 0) })).filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const allTime = costs.reduce((s, v) => s + (v.cost ?? 0), 0);
  const kc = (n: number) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`;
  const MN = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];
  return (
    <div>
      <PageHeader title="Výdaje" sub="Z cen návštěv u veterináře" action={p.isPremium ? <PremiumBadge /> : undefined} />
      <div className={`space-y-4 ${p.isPremium ? '' : 'blur-[5px] pointer-events-none select-none'}`} inert={!p.isPremium}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">{years.map((y) => <button key={y} onClick={() => setYear(y)} className={`press rounded-full px-3.5 py-1.5 text-sm font-semibold ${y === year ? 'bg-primary-d text-white' : 'bg-surface dark:bg-surface-d ring-1 ring-ink/10 dark:ring-white/10'}`}>{y}</button>)}</div>
        <Card className="p-5">
          <p className="text-sm text-muted">Celkem v roce {year}</p>
          <p className="text-[34px] font-bold tracking-tight leading-tight">{kc(total)}</p>
          <p className="text-[13px] text-muted">{inY.length ? `${inY.length} ${plural(inY.length, 'placená návštěva', 'placené návštěvy', 'placených návštěv')} · průměr ${kc(total / inY.length)}` : 'Žádné placené návštěvy'}</p>
          <div className="mt-4 flex items-end gap-1.5 h-28" role="img" aria-label={`Výdaje po měsících v roce ${year}`}>
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#E8553A] to-[#FF9A5A] transition-[height] duration-500" style={{ height: `${(m / max) * 100}%`, minHeight: m ? 4 : 0 }} title={kc(m)} />
                <span className="text-[12px] text-muted">{MN[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        {byPet.length > 0 && <Card className="p-4 space-y-3"><h2 className="font-semibold">Podle mazlíčka</h2>
          {byPet.map(({ pet, sum }) => (
            <div key={pet.id} className="flex items-center gap-3"><Avatar pet={pet} size="w-9 h-9" text="text-lg" />
              <div className="flex-1"><div className="flex justify-between text-sm"><b>{pet.name}</b><span>{kc(sum)}</span></div>
                <div className="h-2 rounded-full bg-ink/5 dark:bg-white/10 mt-1"><div className="h-2 rounded-full bg-primary" style={{ width: `${(sum / total) * 100}%` }} /></div></div>
            </div>))}
        </Card>}
        <Card className="p-4"><h2 className="font-semibold mb-2">Poslední platby</h2>
          {inY.length ? [...inY].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((v) => (
            <div key={v.id} className="flex justify-between gap-3 py-1.5 text-sm border-b last:border-0 border-ink/5 dark:border-white/5"><span className="min-w-0"><span className="block truncate">{v.reason || 'Návštěva'}</span><span className="text-[12px] text-muted">{fmtDate(v.date)} · {pets.find((x) => x.id === v.petId)?.name}</span></span><b className="shrink-0">{kc(v.cost ?? 0)}</b></div>
          )) : <p className="text-sm text-muted">Cenu doplníš u návštěvy v kalendáři.</p>}
        </Card>
        <p className="text-center text-sm text-muted">Za celou dobu: <b>{kc(allTime)}</b></p>
      </div>
      {!p.isPremium && (
        <div className="fixed inset-x-0 top-[38%] flex justify-center px-6 z-30">
          <Card className="p-5 text-center max-w-sm"><p className="text-3xl mb-1">💰</p><p className="font-bold text-lg">Přehled výdajů</p><p className="text-sm text-muted mt-1 mb-4">Kolik stojí péče o tvé mazlíčky – po měsících a po zvířatech.</p>
            <button onClick={() => p.openPaywall('expenses')} className="press w-full rounded-2xl py-3 font-bold text-white bg-gradient-to-br from-[#FF9A5A] to-[#E8553A]">Odemknout s Premium</button></Card>
        </div>
      )}
    </div>
  );
}
