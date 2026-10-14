'use client';
import { Emo, GT } from './glyphs';
// Předávací karta pro hlídače — feeding, meds, allergies, habits, walks, contacts, emergency; link / PDF / print / copy / export for sitter sites.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/lib/store';
import { useCloud } from '@/lib/cloudsync';
import { usePremium } from '@/lib/premium';
import { createShareLink } from '@/lib/cloud';
import { emptyCare, handoverPdf, handoverSections, handoverText } from '@/lib/handover';
import { saveOrShare } from '@/lib/pdf';
import type { Feeding, Pet, PetCare } from '@/lib/types';
import { Button, Card, Field, Sheet, inputCls } from './ui';
import { notice, toast } from './feedback';

const uid = () => Math.random().toString(36).slice(2, 10);
const soft = 'press min-h-[48px] rounded-2xl px-3 font-semibold text-[14px] bg-primary/10 text-primary';

async function copy(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

function CareForm({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const { savePet } = useStore();
  const [c, setC] = useState<PetCare>(() => ({ ...emptyCare(), ...pet.care, feeding: pet.care?.feeding?.length ? pet.care.feeding : [{ id: uid(), what: '', amount: '', timesPerDay: 2, times: '7:00, 18:00' }] }));
  const set = (p: Partial<PetCare>) => setC((x) => ({ ...x, ...p }));
  const setF = (i: number, p: Partial<Feeding>) => set({ feeding: c.feeding.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const ct = (k: 'owner' | 'backup' | 'vet', f: 'name' | 'phone' | 'address', v: string) => set({ [k]: { name: '', phone: '', ...c[k], [f]: v } } as Partial<PetCare>);
  const save = () => { savePet({ ...pet, care: { ...c, feeding: c.feeding.filter((f) => f.what.trim()), updated: new Date().toISOString() } }); toast('Předávací karta uložená'); onDone(); };
  return (
    <div className="space-y-4" data-care-form>
      <p className="font-semibold"><GT t="🍽️ Krmení" /></p>
      {c.feeding.map((f, i) => (
        <div key={f.id} className="rounded-2xl ring-1 ring-ink/10 dark:ring-white/10 p-3 space-y-2">
          <Field label="Co"><input name={`feedWhat${i}`} className={inputCls} value={f.what} onChange={(e) => setF(i, { what: e.target.value })} placeholder="Granule Brit Care Lamb" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kolik"><input name={`feedAmount${i}`} className={inputCls} value={f.amount} onChange={(e) => setF(i, { amount: e.target.value })} placeholder="150 g (1 hrnek)" /></Field>
            <Field label="Kolikrát denně"><input name={`feedTimes${i}`} type="number" min={0} max={12} className={inputCls} value={f.timesPerDay || ''} onChange={(e) => setF(i, { timesPerDay: Number(e.target.value) })} /></Field>
          </div>
          <Field label="V kolik"><input name={`feedAt${i}`} className={inputCls} value={f.times} onChange={(e) => setF(i, { times: e.target.value })} placeholder="7:00, 18:00" /></Field>
          {c.feeding.length > 1 && <button className="text-[13px] text-red-600" onClick={() => set({ feeding: c.feeding.filter((_, j) => j !== i) })}>Odebrat</button>}
        </div>
      ))}
      <button className={soft + ' w-full'} onClick={() => set({ feeding: [...c.feeding, { id: uid(), what: '', amount: '', timesPerDay: 1, times: '' }] })}>＋ Další jídlo</button>
      <Field label="Pamlsky"><input name="treats" className={inputCls} value={c.treats ?? ''} onChange={(e) => set({ treats: e.target.value })} placeholder="Max 3 denně, žádné ze stolu" /></Field>
      <Field label="Venčení a pohyb"><textarea name="walks" rows={2} className={inputCls} value={c.walks ?? ''} onChange={(e) => set({ walks: e.target.value })} placeholder="3× denně ~30 min, na vodítku u silnice, tahá za kočkami" /></Field>
      <Field label="Zvyky a povaha"><textarea name="habits" rows={2} className={inputCls} value={c.habits ?? ''} onChange={(e) => set({ habits: e.target.value })} placeholder="Spí v pelechu v obýváku, po jídle chce na zahradu" /></Field>
      <Field label="Čeho se bojí / na co pozor"><input name="fears" className={inputCls} value={c.fears ?? ''} onChange={(e) => set({ fears: e.target.value })} placeholder="Ohňostroje, vysavač" /></Field>
      <Field label="Domácnost (klíče, kde je krmení, vodítko…)"><input name="house" className={inputCls} value={c.house ?? ''} onChange={(e) => set({ house: e.target.value })} /></Field>
      <p className="font-semibold pt-2"><GT t="📞 Kontakty" /></p>
      {(['owner', 'backup', 'vet'] as const).map((k) => (
        <div key={k} className="grid grid-cols-2 gap-2">
          <Field label={{ owner: 'Majitel', backup: 'Záložní kontakt', vet: 'Veterinář' }[k]}><input name={`${k}Name`} className={inputCls} value={c[k]?.name ?? ''} onChange={(e) => ct(k, 'name', e.target.value)} /></Field>
          <Field label="Telefon"><input name={`${k}Phone`} type="tel" className={inputCls} value={c[k]?.phone ?? ''} onChange={(e) => ct(k, 'phone', e.target.value)} /></Field>
        </div>
      ))}
      <Field label="Adresa veterináře"><input name="vetAddress" className={inputCls} value={c.vet?.address ?? ''} onChange={(e) => ct('vet', 'address', e.target.value)} /></Field>
      <Field label="V nouzi (co dělat)"><textarea name="emergency" rows={2} className={inputCls} value={c.emergency ?? ''} onChange={(e) => set({ emergency: e.target.value })} placeholder="Při zvracení víc než 2× volat veterináře. Pojištění: …" /></Field>
      <Button className="w-full" onClick={save} data-save-care>Uložit předávací kartu</Button>
    </div>
  );
}

export function HandoverCard({ pet }: { pet: Pet }) {
  const { data } = useStore(); const cloud = useCloud(); const prem = usePremium();
  const [edit, setEdit] = useState(false); const [printing, setPrinting] = useState(false); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false);
  const has = !!pet.care && (pet.care.feeding.length > 0 || !!pet.care.walks || !!pet.care.habits);
  const sections = handoverSections(pet, data);
  const link = async () => {
    if (!cloud.session || !cloud.hh) return notice('Nejdřív se přihlas', 'Odkaz pro hlídače potřebuje účet (Nastavení → Účet a záloha). Je zdarma. PDF, tisk i text fungují i bez účtu.');
    setBusy(true);
    try {
      await cloud.sync(true);
      // Premium: live sitter link (sitter can tick doses). Free: read-only link on the 1 free pass slot.
      const u = await createShareLink(cloud.hh, [pet.id], 7, prem.isPremium ? 'today' : 'pass');
      setUrl(u); await copy(u); toast('Odkaz zkopírovaný – pošli ho hlídači');
    } catch (e) {
      const m = String((e as Error).message);
      notice('Odkaz se nepovedl', m.includes('tl_limit_share_count') ? 'Zdarma můžeš mít 1 aktivní odkaz. Premium: neomezeně a s odškrtáváním dávek.' : m);
    } finally { setBusy(false); }
  };
  const pdf = async () => { const b = await handoverPdf([pet], data); await saveOrShare(b, `predavaci-karta-${pet.name}.pdf`); toast('PDF uložené'); };
  const print = () => { setPrinting(true); setTimeout(() => { window.print(); setTimeout(() => setPrinting(false), 400); }, 60); };
  const site = async () => {
    const t = handoverText([pet], data, { contacts: false, site: true });
    if (await copy(t)) notice('Zkopírováno pro hlídací web', 'Vlož text do popisu poptávky (Hlídačky.cz, Rover, Pawshake…). Telefony a adresy jsme vynechali – tyhle weby zakazují sdílet kontakty před rezervací. Po domluvě pošli celou kartu odkazem nebo PDF.');
  };
  return (
    <Card className="p-4 space-y-3" >
      <div data-handover><p className="font-semibold"><GT t="🧳 Předávací karta pro hlídače" /></p>
        <p className="text-[13px] text-muted">Krmení, léky, alergie, zvyky, venčení a kontakty na jednom místě – pro hlídače, babičku nebo hlídací web.</p></div>
      {has ? <ul className="text-[14px] space-y-1">{sections.filter((s) => ['feeding', 'meds', 'allergies', 'walks'].includes(s.key)).map((s) => <li key={s.key} className={s.alert ? 'text-red-700 dark:text-red-300 font-semibold' : ''}><b>{s.h.startsWith('⚠') ? <><Emo e="⚠️" /> {s.h.replace(/^⚠\uFE0F? /, '')}</> : s.h}:</b> {s.lines.join('; ')}</li>)}</ul>
        : <p className="text-[14px]">Zatím nevyplněno. Léky a alergie se doplní samy z karty mazlíčka.</p>}
      <button className={has ? soft + ' w-full' : 'press w-full min-h-[48px] rounded-2xl font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] shadow-[0_10px_24px_-12px_rgba(127,179,232,.8)]'} onClick={() => setEdit(true)} data-edit-care>{has ? <GT t="✎ Upravit kartu" /> : '＋ Vyplnit kartu (2 minuty)'}</button>
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted pt-1">Poslat hlídači</p>
      <div className="grid grid-cols-2 gap-2">
        <button className={soft} disabled={busy} onClick={link} data-h-link><Emo e="🔗" /> {busy ? 'Vytvářím…' : 'Odkaz'}</button>
        <button className={soft} onClick={pdf} data-h-pdf><GT t="📄 PDF" /></button>
        <button className={soft} onClick={print} data-h-print><GT t="🖨️ Tisk" /></button>
        <button className={soft} onClick={async () => { if (await copy(handoverText([pet], data))) toast('Text zkopírovaný'); }} data-h-copy><GT t="📋 Kopírovat text" /></button>
      </div>
      <button className={soft + ' w-full'} onClick={site} data-h-site><GT t="🌐 Exportovat pro hlídací web" /></button>
      {url && <p className="text-[12px] break-all text-muted" data-h-url={url}>{url}</p>}
      <Sheet open={edit} onClose={() => setEdit(false)} title={`Předávací karta – ${pet.name}`}>{edit && <CareForm pet={pet} onDone={() => setEdit(false)} />}</Sheet>
      {printing && createPortal(
        <div id="print-area" className="hidden print:block p-8 text-black bg-white">
          <h1 className="text-2xl font-bold">Předávací karta pro hlídače – {pet.name}</h1>
          {sections.map((s) => <section key={s.key} className="mt-4"><h2 className={`font-bold text-lg ${s.alert ? 'text-red-700' : ''}`}>{s.h}</h2><ul className="list-disc pl-5">{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></section>)}
          <p className="mt-6 text-xs">Tlapka · údaje zadal majitel</p>
        </div>, document.body)}
    </Card>
  );
}

/** Read-only rendering of a pet's handover data on the shared (no-account) sitter page. */
export function SharedHandover({ pet, data }: { pet: Pet; data: Pick<import('@/lib/types').AppData, 'meds' | 'allergies'> }) {
  if (!pet.care) return null;
  const s = handoverSections(pet, data).filter((x) => !['allergies', 'meds', 'about'].includes(x.key));
  return (
    <div className="space-y-2 pt-1" data-shared-handover>
      {s.map((x) => <div key={x.key}><p className="text-[13px] font-bold text-muted uppercase tracking-wide">{x.h}</p>{x.lines.map((l, i) => <p key={i} className="text-[15px]">{l.split(/(\+?\d[\d\s]{7,}\d)/).map((part, j) => /^\+?\d[\d\s]{7,}\d$/.test(part) ? <a key={j} className="text-primary font-semibold" href={`tel:${part.replace(/\s/g, '')}`}>{part}</a> : part)}</p>)}</div>)}
    </div>
  );
}
