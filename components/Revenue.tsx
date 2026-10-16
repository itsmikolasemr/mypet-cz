'use client';
// v1.2 doplňkové příjmy: PDF karta 79 Kč, zásoba krmiva + affiliate, štítek „Propagováno“, QR přívěsek, sponzorovaný slot (vypnuto), pojištění (vypnuto).
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { usePremium } from '@/lib/premium';
import { useCloud } from '@/lib/cloudsync';
import type { Pet } from '@/lib/types';
import { activeFoodShops, FOOD_LOW_DAYS, foodDaysLeft, INSURANCE_ON, INSURERS, ONE_TIME, QR_TAG, shopLink, SPONSORED_ON, type FoodStock } from '@/lib/revenue';
import { Button, Card, Sheet } from './ui';
import { Emo, GT } from './glyphs';
import { notice } from './feedback';
import { today } from '@/lib/utils';

const H = ({ e, t, sub }: { e: string; t: string; sub?: string }) => (<div className="mb-2"><p className="font-semibold"><GT t={`${e} ${t}`} /></p>{sub && <p className="text-[13px] text-muted">{sub}</p>}</div>);
const inp = 'w-full rounded-2xl bg-ink/[0.04] dark:bg-white/[0.06] px-4 min-h-[44px] text-[15px] outline-none focus:ring-2 ring-primary';
const Tag = ({ t }: { t: string }) => <span className="inline-flex shrink-0 items-center rounded-[5px] border border-ink/15 dark:border-white/20 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted leading-[16px]">{t}</span>;

/* 1) PDF zdravotní karta – jednorázově 79 Kč (nabídka v paywallu s důvodem „pdf“) */
export function PdfCardOffer() {
  const p = usePremium(); const [busy, setBusy] = useState(false);
  if (p.paywall !== 'pdf') return null;
  const buy = async () => { setBusy(true); try { await p.buyOnce('pdfCard'); p.closePaywall(); notice('Hotovo', 'PDF zdravotní karta je odemčená natrvalo, i v angličtině a němčině.'); } catch (e) { notice('Nákup', e instanceof Error ? e.message : 'Nepovedlo se.'); } finally { setBusy(false); } };
  return (
    <div data-pdf-once className="rounded-2xl ring-1 ring-ink/10 dark:ring-white/10 p-3.5 mb-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary-d dark:text-primary flex items-center justify-center shrink-0"><Emo e="📄" className="w-5 h-5" /></span>
      <span className="flex-1 min-w-0"><b className="block text-[14px]">Jen PDF zdravotní karta</b><span className="block text-[13px] text-muted">Jednorázově, bez předplatného. CZ, EN i DE.</span></span>
      <button disabled={busy} onClick={buy} className="press shrink-0 min-h-[44px] px-3.5 rounded-full text-[14px] font-bold text-primary bg-primary/10 whitespace-nowrap disabled:opacity-50">{ONE_TIME.pdfCard.price} Kč</button>
    </div>
  );
}

/* 2) Zásoba krmiva + affiliate odkazy, když dochází */
export function FoodStockCard({ pet }: { pet: Pet }) {
  const { savePet } = useStore(); const [edit, setEdit] = useState(false);
  const f = pet.food; const left = foodDaysLeft(f); const low = left != null && left <= FOOD_LOW_DAYS; const shops = activeFoodShops();
  return (
    <Card className="p-4 space-y-2" >
      <div data-food className="flex items-start gap-2"><div className="flex-1"><H e="🍽️" t="Zásoba krmiva" sub={f ? `${f.name} · ${f.bagKg} kg · ${f.dailyG} g denně` : 'Zadej balení a denní dávku, Tlapka pohlídá, kdy dochází.'} /></div>
        <button className="text-[13px] font-semibold text-primary min-h-[44px] min-w-[44px] px-2 -mr-2" onClick={() => setEdit(true)}>{f ? 'Upravit' : 'Nastavit'}</button></div>
      {left != null && <p data-food-left className={`text-[14px] font-semibold ${low ? 'text-[#B3261E] dark:text-[#F2B8B5]' : ''}`}>{left === 0 ? 'Krmivo už mělo dojít' : `Vystačí ještě ${left} ${left === 1 ? 'den' : left < 5 ? 'dny' : 'dní'}`}</p>}
      {low && shops.length > 0 && <div data-food-shops className="space-y-1.5 pt-1">
        <p className="text-[13px] text-muted">Doobjednat:</p>
        {shops.map((s) => <a key={s.id} href={shopLink(s.url, f!.name)} target="_blank" rel="sponsored noopener" className="press flex items-center gap-2 rounded-2xl bg-ink/[0.04] dark:bg-white/[0.06] px-3.5 min-h-[44px]">
          <span className="flex-1 font-semibold text-[14px]">{s.name}</span><Tag t="affiliate odkaz" /></a>)}
        <p className="text-[12px] text-muted">Affiliate odkaz: když nakoupíš, Tlapka dostane malou provizi. Cenu to nemění.</p>
      </div>}
      <Sheet open={edit} onClose={() => setEdit(false)} title="Zásoba krmiva">
        <FoodForm init={f} onDone={(v) => { savePet({ ...pet, food: v }); setEdit(false); }} />
      </Sheet>
    </Card>
  );
}
function FoodForm({ init, onDone }: { init?: FoodStock; onDone: (f: FoodStock | undefined) => void }) {
  const [v, setV] = useState<FoodStock>(init ?? { name: '', bagKg: 0, dailyG: 0, openedAt: today() });
  const ok = v.name.trim() && v.bagKg > 0 && v.dailyG > 0;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ok) onDone({ ...v, name: v.name.trim() }); }}>
      <label className="block"><span className="text-[13px] font-semibold">Krmivo</span><input aria-label="Krmivo" className={inp + ' mt-1'} value={v.name} maxLength={60} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="např. Brit Care Lamb" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="text-[13px] font-semibold">Balení (kg)</span><input aria-label="Balení (kg)" inputMode="decimal" className={inp + ' mt-1'} value={v.bagKg || ''} onChange={(e) => setV({ ...v, bagKg: Number(e.target.value.replace(',', '.')) || 0 })} /></label>
        <label className="block"><span className="text-[13px] font-semibold">Denně (g)</span><input aria-label="Denně (g)" inputMode="numeric" className={inp + ' mt-1'} value={v.dailyG || ''} onChange={(e) => setV({ ...v, dailyG: Number(e.target.value) || 0 })} /></label>
      </div>
      <label className="block"><span className="text-[13px] font-semibold">Otevřeno</span><input aria-label="Otevřeno" type="date" className={inp + ' mt-1'} value={v.openedAt} onChange={(e) => setV({ ...v, openedAt: e.target.value })} /></label>
      <Button className="w-full" disabled={!ok}>Uložit</Button>
      {init && <button type="button" className="w-full text-[13px] text-muted underline min-h-[44px]" onClick={() => onDone(undefined)}>Přestat sledovat</button>}
    </form>
  );
}

/* 3) Štítek u placeného výpisu veteriny / salonu */
export const PromotedLabel = () => <span data-promoted className="inline-flex shrink-0 items-center rounded-[5px] bg-ink/[0.06] dark:bg-white/10 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted leading-[16px]">Propagováno</span>;

/* 4) QR přívěsek 249 Kč – placeholder objednávky (bez expedice) */
export function QrTagCard({ pet }: { pet: Pet }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4 space-y-2">
      <div data-qr-tag><H e="🔳" t="QR přívěsek na obojek" sub={`Když se ${pet.name} zatoulá, nálezce načte QR a uvidí kontakt na tebe. ${QR_TAG.price} Kč včetně poštovného.`} /></div>
      <Button variant="soft" className="w-full" onClick={() => setOpen(true)}>Objednat přívěsek</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="QR přívěsek">
        <div className="space-y-3 text-[14px]" data-qr-tag-order>
          <p><b>{QR_TAG.price} Kč</b> · kovová známka s QR kódem, odolná vodě.</p>
          <p className="text-muted">Objednávky spustíme brzy. Zatím nic neplatíš a nic se neodesílá.</p>
          {QR_TAG.orderUrl ? <a href={QR_TAG.orderUrl} target="_blank" rel="noopener" className="press block text-center rounded-2xl py-3 font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">Pokračovat na objednávku</a>
            : <Button className="w-full" disabled>Brzy</Button>}
        </div>
      </Sheet>
    </Card>
  );
}

/* 5) Sponzorovaný obsah – jen free verze, feature flag (vypnuto do ~5 000 MAU) */
export function SponsoredSlot({ item }: { item?: { title: string; text: string; url: string; brand: string } }) {
  const p = usePremium(); const c = useCloud();
  if (!SPONSORED_ON || p.isPremium || c.premium || !item) return null;
  return (
    <aside data-sponsored aria-label="Reklama" className="rounded-[22px] p-3.5 ring-1 ring-ink/10 dark:ring-white/10 bg-surface dark:bg-surface-d">
      <div className="flex items-center gap-2 mb-1"><Tag t="Reklama" /><span className="text-[12px] text-muted">{item.brand}</span></div>
      <a href={item.url} target="_blank" rel="sponsored noopener" className="block"><b className="block text-[14px]">{item.title}</b><span className="block text-[13px] text-muted">{item.text}</span></a>
    </aside>
  );
}

/* 6) Pojištění – neutrální odkazy, feature flag (vypnuto do kontroly právníkem) */
export function InsuranceLinks() {
  const list = INSURERS.filter((i) => /^https:\/\//.test(i.url));
  if (!INSURANCE_ON || !list.length) return null;
  return (
    <Card className="p-4 space-y-2">
      <div data-insurance><H e="🛡️" t="Pojištění mazlíčka" sub="Pojišťovny se samostatným pojištěním zvířat, abecedně. Nic nedoporučujeme ani nesrovnáváme." /></div>
      {list.map((i) => <a key={i.id} href={i.url} target="_blank" rel={i.affiliate ? 'sponsored noopener' : 'noopener'} className="press flex items-center gap-2 rounded-2xl bg-ink/[0.04] dark:bg-white/[0.06] px-3.5 min-h-[44px]">
        <span className="flex-1 font-semibold text-[14px]">{i.name}</span>{i.affiliate && <Tag t="affiliate" />}</a>)}
      <p className="text-[12px] text-muted">U odkazů označených „affiliate“ může Tlapka dostat odměnu. Podmínky pojištění si vždy přečti u pojišťovny.</p>
    </Card>
  );
}
