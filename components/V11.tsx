'use client';
import { Emo, GT } from './glyphs';
// Tlapka v1.1 features: export ZIP, trash, battery guide, Druhý názor, AI scan, pass link + QR, travel checklist.
import { useEffect, useRef, useState } from 'react';
import { useStore, TRASH_DAYS } from '@/lib/store';
import { usePremium } from '@/lib/premium';
import { useCloud } from '@/lib/cloudsync';
import { API_BASE } from '@/lib/api';
import { createShareLink } from '@/lib/cloud';
import { exportZip, imageToDataUrl, dataUrlToBlob } from '@/lib/export';
import { saveOrShare } from '@/lib/pdf';
import { saveBlob } from '@/lib/docs';
import { requestPermission, showNow } from '@/lib/notify';
import { addDays, today, uid } from '@/lib/utils';
import type { Pet, ReminderType } from '@/lib/types';
import { Card, PageHeader, Sheet, Field, inputCls, Button, DateInput } from './ui';
import { notice, toast } from './feedback';
import { PremiumBadge } from './Premium';

const soft = 'press min-h-[48px] w-full rounded-2xl font-semibold flex items-center justify-center gap-2 bg-ink/5 dark:bg-white/10';
const primary = 'press min-h-[48px] w-full rounded-2xl font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] disabled:opacity-60';

async function aiCall(headers: Record<string, string>, body: unknown) {
  const r = await fetch(`${API_BASE}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j } as { status: number; reply?: string; result?: ScanResult; error?: string };
}

// ---------- Export (free) ----------
export function ExportAll() {
  const { data } = useStore(); const [busy, setBusy] = useState(false);
  return <button disabled={busy} className={soft} onClick={async () => { setBusy(true); try { const b = await exportZip(data); await saveOrShare(b, `tlapka-export-${today()}.zip`); toast('Export hotový – vše v jednom ZIPu'); } catch { notice('Export se nepovedl'); } finally { setBusy(false); } }}>
    {busy ? 'Připravuji…' : <GT t="📦 Exportovat vše (ZIP: PDF, CSV, soubory)" />}</button>;
}

// ---------- Trash (Premium restore) ----------
export function TrashSection() {
  const { data, restoreTrash, emptyTrash } = useStore(); const prem = usePremium();
  const groups = Object.values((data.trash ?? []).reduce<Record<string, NonNullable<typeof data.trash>>>((a, t) => ((a[t.group] ||= []).push(t), a), {}));
  const label = (g: NonNullable<typeof data.trash>) => { const m = g.find((t) => t.coll === 'pets') ?? g[0]; const it = m.item as Record<string, string>; const kind = { pets: 'Mazlíček', reminders: 'Připomínka', visits: 'Návštěva', docs: 'Dokument', meds: 'Lék', allergies: 'Alergie', cards: 'Věrnostní karta' }[m.coll]; return `${kind}: ${it.name || it.title || it.allergen || it.reason || it.clinic || '—'}${g.length > 1 ? ` (+${g.length - 1})` : ''}`; };
  const left = (at: string) => Math.max(0, Math.ceil((Date.parse(at) + TRASH_DAYS * 864e5 - Date.now()) / 864e5));
  return (
    <Card className="p-4 space-y-2" >
      <div className="flex items-center gap-2"><p className="font-semibold flex-1 inline-flex items-center gap-1.5"><Emo e="🗑️" />Koš ({groups.length})</p>{!prem.isPremium && <PremiumBadge />}</div>
      <p className="text-[13px] text-muted">Smazané položky tu zůstávají {TRASH_DAYS} dní.</p>
      {!groups.length && <p className="text-[14px] text-muted">Koš je prázdný.</p>}
      {groups.slice(0, 20).map((g) => (
        <div key={g[0].group} className="flex items-center gap-2" data-trash>
          <p className="flex-1 min-w-0 text-[14px] break-words">{label(g)}<span className="block text-[12px] text-muted">ještě {left(g[0].at)} dní</span></p>
          <button className="press min-h-[44px] px-3 rounded-xl font-semibold bg-ink/5 dark:bg-white/10" onClick={() => { if (!prem.isPremium) return prem.openPaywall('kos'); restoreTrash(g[0].group); toast('Obnoveno'); }}>Obnovit</button>
        </div>
      ))}
      {!!groups.length && <button className="press min-h-[44px] text-[14px] font-semibold text-red-600" onClick={() => { emptyTrash(); toast('Koš vysypán'); }}>Vysypat koš</button>}
    </Card>
  );
}

// ---------- Notifications reliability guide (free) ----------
const GUIDE: { b: string; steps: string[] }[] = [
  { b: 'Xiaomi / Redmi / POCO', steps: ['Nastavení → Aplikace → Tlapka → Spořič baterie → Bez omezení', 'Zapni „Automatické spuštění“', 'V přehledu aplikací stáhni Tlapku dolů a zamkni ji (ikona zámku)'] },
  { b: 'Samsung', steps: ['Nastavení → Péče o baterii → Limity využití na pozadí', 'Přidej Tlapku do „Aplikace, které nikdy nespí“', 'Nastavení → Aplikace → Tlapka → Baterie → Bez omezení'] },
  { b: 'Huawei / Honor', steps: ['Nastavení → Baterie → Spouštění aplikací → Tlapka → Spravovat ručně', 'Povol automatické spuštění, sekundární spuštění i běh na pozadí'] },
  { b: 'OnePlus / OPPO / realme', steps: ['Nastavení → Baterie → Optimalizace baterie → Tlapka → Neoptimalizovat', 'Povol „Automatické spuštění“'] },
  { b: 'Google Pixel a ostatní Android', steps: ['Nastavení → Aplikace → Tlapka → Baterie → Bez omezení', 'Oznámení → povol „Připomínky“'] },
  { b: 'iPhone', steps: ['Nastavení → Oznámení → Tlapka → Povolit oznámení', 'Režimy soustředění: přidej Tlapku mezi povolené aplikace', 'Úsporný režim připomínky neblokuje'] },
];
export function BatteryGuide() {
  const [open, setOpen] = useState<string | null>(null);
  // only Android phones drop notifications to save battery; show just the detected brand (fallback: all Android brands)
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (!/Android/i.test(ua)) return null;
  const brand = GUIDE.filter((g) => g.b.split(/[ /]+/).some((w) => w.length > 2 && new RegExp(w, 'i').test(ua)));
  const list = brand.length ? brand : GUIDE.filter((g) => !/iPhone/.test(g.b));
  return (
    <Card className="p-4 space-y-2">
      <p className="font-semibold"><GT t="🔔 Spolehlivé připomínky" /></p>
      <p className="text-[13px] text-muted">Některé telefony kvůli úspoře baterie oznámení zahazují. Vyzkoušej test a případně nastav výjimku.</p>
      <button className={soft} onClick={async () => { if (!(await requestPermission())) return notice('Oznámení nejsou povolena', 'Povol je v nastavení telefonu.'); await showNow('Tlapka – test připomínky', 'Funguje to! 🐾'); toast('Testovací oznámení odesláno'); }}>Poslat testovací oznámení</button>
      {list.map((g) => (
        <div key={g.b}>
          <button aria-expanded={open === g.b} className="press w-full min-h-[44px] flex items-center justify-between text-left font-medium" onClick={() => setOpen(open === g.b ? null : g.b)}>{g.b}<span aria-hidden>{open === g.b ? '−' : '+'}</span></button>
          {open === g.b && <ol className="list-decimal pl-6 pb-2 text-[14px] space-y-1">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
        </div>
      ))}
    </Card>
  );
}

// ---------- Druhý názor (Premium) ----------
export function SecondOpinion() {
  const { data } = useStore(); const prem = usePremium();
  const [pet, setPet] = useState(data.pets[0]?.id ?? ''); const [text, setText] = useState(''); const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [reply, setReply] = useState(''); const ref = useRef<HTMLInputElement>(null);
  const p = data.pets.find((x) => x.id === pet);
  const go = async () => {
    if (!prem.isPremium) return prem.openPaywall('druhy-nazor');
    setBusy(true); setReply('');
    try {
      const w = p?.weights.at(-1)?.kg;
      const r = await aiCall(prem.headers(), { mode: 'second', text, image: img, pet: p && { name: p.name, species: p.species, weightKg: w } });
      if (r.reply) setReply(r.reply); else if (r.status === 402) prem.openPaywall('druhy-nazor'); else notice('Aivet teď neodpovídá', 'Zkus to prosím za chvíli.');
    } catch { notice('Jsi offline?', 'Druhý názor potřebuje připojení.'); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Druhý názor" sub="Aivet ti lidsky vysvětlí zprávu od veterináře" />
      <div className="space-y-4">
        {!prem.isPremium && <Card className="p-4 flex items-center gap-3"><PremiumBadge /><p className="text-[14px] flex-1">Součást Premium. Vyzkoušej 14 dní zdarma.</p></Card>}
        {data.pets.length > 1 && <Field label="Mazlíček"><select className={inputCls} value={pet} onChange={(e) => setPet(e.target.value)}>{data.pets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
        <Field label="Text zprávy nebo výsledků"><textarea className={`${inputCls} min-h-[140px]`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Vlož text zprávy, např. „ALT 180 U/l, mírně zvýšené…“" /></Field>
        <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setImg(await imageToDataUrl(f)); }} />
        <button className={soft} onClick={() => ref.current?.click()}>{img ? <GT t="✅ Fotka přiložena – změnit" /> : <GT t="📷 Vyfotit nebo nahrát zprávu" />}</button>
        {img && <img src={img} alt="Náhled zprávy" className="rounded-2xl max-h-48 mx-auto" />}
        <button disabled={busy || (!text.trim() && !img)} className={primary} onClick={go}>{busy ? 'Aivet čte zprávu…' : 'Vysvětlit zprávu'}</button>
        {reply && <Card className="p-4"><div className="whitespace-pre-wrap text-[15px] leading-relaxed" data-second-reply>{reply.replace(/\*\*/g, '')}</div></Card>}
        <p className="text-[13px] text-muted">Aivet nenahrazuje veterináře. Při zhoršení stavu volej pohotovost – mapa nonstop klinik je vždy zdarma.</p>
      </div>
    </div>
  );
}

// ---------- AI scan (Premium) ----------
export type ScanResult = { kind?: string; date?: string | null; clinic?: string | null; reason?: string | null; cost?: number | null; items?: { name: string; price: number | null }[];
  vaccinations?: { name: string; date: string | null; validUntil: string | null }[]; product?: string | null; reminderType?: ReminderType | null; intervalDays?: number | null; dose?: string | null; notes?: string | null; confidence?: number };
const KIND_DOC: Record<string, 'faktura' | 'pas' | 'zprava' | 'jine'> = { faktura: 'faktura', ockovaci_prukaz: 'pas', zprava: 'zprava', krabicka_leku: 'jine', jine: 'jine' };
const RTYPES: { v: ReminderType; l: string }[] = [{ v: 'ockovani', l: 'Očkování' }, { v: 'odcerveni', l: 'Odčervení' }, { v: 'antiparazitika', l: 'Antiparazitika' }, { v: 'leky', l: 'Léky' }, { v: 'veterina', l: 'Kontrola' }];

export function ScanButton({ petId, className }: { petId?: string; className?: string }) {
  const { data, saveVisit, saveReminder, addDoc } = useStore(); const prem = usePremium();
  const ref = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [r, setR] = useState<ScanResult | null>(null);
  const [pet, setPet] = useState(petId ?? data.pets[0]?.id ?? '');
  const [mk, setMk] = useState({ visit: true, reminder: true, doc: true });
  useEffect(() => { if (petId) setPet(petId); }, [petId]);
  const pick = () => { if (!prem.isPremium) return prem.openPaywall('ai-sken'); ref.current?.click(); };
  const scan = async (u: string) => {
    setImg(u); setBusy(true); setR(null);
    try {
      const x = await aiCall(prem.headers(), { mode: 'scan', image: u });
      if (x.result) { setR(x.result); setMk({ visit: x.result.kind === 'faktura' || !!x.result.cost || !!x.result.clinic, reminder: !!x.result.product || !!x.result.intervalDays, doc: true }); }
      else if (x.status === 402) prem.openPaywall('ai-sken'); else notice('Sken se nepovedl', 'Zkus ostřejší fotku s dobrým světlem.');
    } catch { notice('Jsi offline?', 'Sken potřebuje připojení.'); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!r || !pet) return;
    const date = r.date || today(); let n = 0;
    if (mk.visit) { saveVisit({ id: uid(), petId: pet, date, clinic: r.clinic || '', reason: r.reason || (r.items?.map((i) => i.name).slice(0, 3).join(', ') ?? ''), notes: r.items?.map((i) => `${i.name}${i.price != null ? ` – ${i.price} Kč` : ''}`).join('\n') ?? '', cost: r.cost ?? undefined }); n++; }
    if (mk.reminder && (r.product || r.intervalDays)) {
      const iv = r.intervalDays ?? 0; const type = r.reminderType ?? 'leky';
      const vacc = r.vaccinations?.find((v) => v.validUntil);
      saveReminder({ id: uid(), petId: pet, type, title: r.product || RTYPES.find((t) => t.v === type)?.l || 'Připomínka', product: r.product || '', dueDate: vacc?.validUntil || (iv ? addDays(date, iv) : addDays(today(), 30)), intervalDays: iv, notes: r.dose || '', history: [date] }); n++;
    }
    if (mk.doc && img) { const id = uid(); const b = await dataUrlToBlob(img); await saveBlob(id, b); addDoc({ id, petId: pet, name: `Sken ${r.kind?.replace('_', ' ') ?? 'dokladu'} ${date}`, kind: KIND_DOC[r.kind ?? 'jine'] ?? 'jine', mime: b.type || 'image/jpeg', size: b.size, date }); n++; }
    setR(null); setImg(null); toast(`Uloženo z fotky: ${n} ${n === 1 ? 'záznam' : n < 5 ? 'záznamy' : 'záznamů'}`);
  };
  const set = (k: keyof ScanResult, v: unknown) => setR((x) => (x ? { ...x, [k]: v } : x));
  return (
    <>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden data-scan-input onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) scan(await imageToDataUrl(f)); }} />
      <button onClick={pick} className={className ?? soft}><Emo e="✨" /> AI sken dokladu {!prem.isPremium && <PremiumBadge />}</button>
      <Sheet open={busy || !!r} onClose={() => { setR(null); setImg(null); setBusy(false); }} title={busy ? 'Aivet čte doklad…' : 'Zkontroluj, co jsem našel'}>
        {busy && <div className="py-8 text-center text-muted" role="status">Čtu fotku, chvilku…</div>}
        {r && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
            {data.pets.length > 1 && <Field label="Mazlíček"><select className={inputCls} value={pet} onChange={(e) => setPet(e.target.value)}>{data.pets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Datum"><DateInput value={r.date ?? ''} onChange={(v) => set('date', v)} /></Field>
              <Field label="Cena (Kč)"><input inputMode="decimal" className={inputCls} value={r.cost ?? ''} onChange={(e) => set('cost', e.target.value ? Number(e.target.value.replace(',', '.')) : null)} /></Field>
            </div>
            <Field label="Klinika"><input className={inputCls} value={r.clinic ?? ''} onChange={(e) => set('clinic', e.target.value)} /></Field>
            <Field label="Přípravek"><input className={inputCls} value={r.product ?? ''} onChange={(e) => set('product', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Typ"><select className={inputCls} value={r.reminderType ?? 'leky'} onChange={(e) => set('reminderType', e.target.value)}>{RTYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></Field>
              <Field label="Opakovat po (dní)"><input inputMode="numeric" className={inputCls} value={r.intervalDays ?? ''} onChange={(e) => set('intervalDays', e.target.value ? Number(e.target.value) : null)} /></Field>
            </div>
            <fieldset className="space-y-1 text-[15px]"><legend className="font-semibold mb-1">Vytvořit</legend>
              {([['visit', 'Návštěvu s výdajem'], ['reminder', 'Připomínku dalšího termínu'], ['doc', 'Doklad (fotku)']] as const).map(([k, l]) => (
                <label key={k} className="flex items-center gap-3 min-h-[44px]"><input type="checkbox" className="w-5 h-5 accent-[#7FB3E8]" checked={mk[k]} onChange={(e) => setMk({ ...mk, [k]: e.target.checked })} />{l}</label>))}
            </fieldset>
            {r.confidence != null && r.confidence < 0.6 && <p className="text-[13px] text-amber-700 dark:text-amber-300">Fotka nebyla úplně čitelná – zkontroluj údaje.</p>}
            <Button type="submit" className="w-full">Uložit</Button>
          </form>
        )}
      </Sheet>
    </>
  );
}

// ---------- Pass link + QR + travel checklist ----------
export function PassShare({ pet }: { pet: Pet }) {
  const cloud = useCloud(); const prem = usePremium();
  const [url, setUrl] = useState<string | null>(null); const [qr, setQr] = useState<string | null>(null); const [days, setDays] = useState(7); const [busy, setBusy] = useState(false);
  const make = async () => {
    if (!cloud.session || !cloud.hh) return notice('Nejdřív se přihlas', 'Odkaz na pas potřebuje účet (Nastavení → Účet a záloha). Je zdarma.');
    setBusy(true);
    try {
      await cloud.sync(true);
      const u = await createShareLink(cloud.hh, [pet.id], prem.isPremium ? days : 7, 'pass');
      setUrl(u); const QR = await import('qrcode'); setQr(await QR.toDataURL(u, { margin: 1, width: 480 }));
      await navigator.clipboard?.writeText(u).catch(() => {});
    } catch (e) {
      const m = String((e as Error).message);
      if (m.includes('tl_limit_share_count')) { notice('Už máš aktivní odkaz', 'Zdarma můžeš mít 1 platný odkaz na pas. Premium: neomezeně a až na 30 dní.'); }
      else notice('Odkaz se nepovedl', m);
    } finally { setBusy(false); }
  };
  return (
    <Card className="p-4 space-y-3">
      <p className="font-semibold"><GT t="🔗 Pas přes odkaz / QR" /></p>
      <p className="text-[13px] text-muted">Pro veterinu, hotel nebo hlídače – bez instalace appky. {prem.isPremium ? 'Premium: neomezeně odkazů, až 30 dní.' : 'Zdarma: 1 aktivní odkaz na 7 dní.'}</p>
      {prem.isPremium && <Field label="Platnost"><select className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'den' : d < 5 ? 'dny' : 'dní'}</option>)}</select></Field>}
      <button disabled={busy} className={soft} onClick={make}>{busy ? 'Vytvářím…' : 'Vytvořit odkaz a QR'}</button>
      {url && qr && <div className="text-center space-y-2" data-pass-link={url}><img src={qr} alt={`QR kód pasu – ${pet.name}`} className="w-48 h-48 mx-auto rounded-xl bg-white p-2" /><p className="text-[12px] break-all text-muted">{url}</p><p className="text-[13px]">Odkaz je zkopírovaný.</p></div>}
    </Card>
  );
}

type Dest = 'eu' | 'special' | 'uk' | 'third';
export function TravelChecklist({ pet }: { pet: Pet }) {
  const { data } = useStore(); const prem = usePremium();
  const [dest, setDest] = useState<Dest>('eu'); const [date, setDate] = useState(addDays(today(), 30));
  const rabies = data.reminders.filter((r) => r.petId === pet.id && r.type === 'ockovani' && /vztekl|rabi|rabis/i.test(`${r.title} ${r.product}`));
  const lastRabies = rabies.flatMap((r) => r.history).sort().at(-1);
  const rabiesValid = rabies.some((r) => r.dueDate >= date);
  const daysSince = lastRabies ? Math.floor((Date.parse(date) - Date.parse(lastRabies)) / 864e5) : null;
  const items: { ok: boolean | null; t: string; d?: string }[] = [
    { ok: !!pet.microchip, t: 'Čip ISO (15 číslic)', d: pet.microchip ? `Čip ${pet.microchip}` : 'Doplň číslo čipu v profilu. Čip musí být dřív než očkování proti vzteklině.' },
    { ok: null, t: 'Evropský pas zvířete (EU pet passport)', d: 'Vydává soukromý veterinář. Vezmi originál.' },
    { ok: rabies.length ? rabiesValid && (daysSince == null || daysSince >= 21) : false, t: 'Platné očkování proti vzteklině', d: rabies.length ? `${lastRabies ? `Poslední ${new Date(lastRabies).toLocaleDateString('cs-CZ')}. ` : ''}${daysSince != null && daysSince < 21 ? 'Po prvním očkování musí uplynout 21 dní! ' : ''}${rabiesValid ? 'Platí v den odjezdu.' : 'V den odjezdu už neplatí – přeočkuj.'}` : 'V Tlapce nemáš připomínku vztekliny (typ Očkování, název „vzteklina“).' },
  ];
  if (dest === 'special') items.push({ ok: null, t: 'Odčervení proti tasemnici (psi)', d: 'Finsko, Irsko, Malta, Norsko, Severní Irsko: 24–120 h před vstupem, zapsané veterinářem v pasu.' });
  if (dest === 'uk') items.push({ ok: null, t: 'Animal Health Certificate', d: 'Vydá úřední veterinář max. 10 dní před cestou (pas z EU nestačí).' }, { ok: null, t: 'Odčervení proti tasemnici (psi)', d: '1–5 dní před příjezdem do Velké Británie.' });
  if (dest === 'third') items.push({ ok: null, t: 'Test titru protilátek proti vzteklině', d: 'Krev min. 30 dní po očkování; při návratu do EU čekací lhůta 3 měsíce od odběru. Plánuj s předstihem!' }, { ok: null, t: 'Podmínky cílové země', d: 'Ověř na webu velvyslanectví a SVS.' });
  items.push({ ok: null, t: 'Max. 5 zvířat při nekomerčním převozu' }, { ok: null, t: 'Kopie dokladů v telefonu', d: 'Pas PDF z Tlapky + fotka EU pasu.' });
  if (!prem.isPremium) return (
    <Card className="p-4 flex items-center gap-3"><span className="text-2xl" aria-hidden><Emo e="✈️" className="w-6 h-6" /></span><div className="flex-1"><p className="font-semibold">Cestovní checklist</p><p className="text-[13px] text-muted">Co potřebuje {pet.name} na cestu – lhůty, pas, vzteklina.</p></div><button className="press min-h-[44px] px-3 rounded-xl font-semibold bg-ink/5 dark:bg-white/10" onClick={() => prem.openPaywall('cestovni-checklist')}>Otevřít <PremiumBadge /></button></Card>
  );
  return (
    <Card className="p-4 space-y-3" >
      <p className="font-semibold"><GT t="✈️ Cestovní checklist" /></p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Kam"><select className={inputCls} value={dest} onChange={(e) => setDest(e.target.value as Dest)}><option value="eu">EU (běžně)</option><option value="special">FI, IE, MT, NO</option><option value="uk">Velká Británie</option><option value="third">Mimo EU</option></select></Field>
        <Field label="Odjezd"><DateInput value={date} onChange={(v) => setDate(v)} /></Field>
      </div>
      <ul className="space-y-2" data-travel>{items.map((i) => (
        <li key={i.t} className="flex gap-3"><span aria-hidden className={i.ok === true ? 'text-green-600 dark:text-green-400' : i.ok === false ? 'text-red-600 dark:text-red-400' : 'text-muted'}><Emo e={i.ok === true ? '✅' : i.ok === false ? '⚠️' : '☐'} className="w-6 h-6" /></span><div><p className="font-medium">{i.t}<span className="sr-only">{i.ok === true ? ' – splněno' : i.ok === false ? ' – chybí' : ''}</span></p>{i.d && <p className="text-[13px] text-muted">{i.d}</p>}</div></li>))}</ul>
      <p className="text-[12px] text-muted">Orientační přehled pravidel EU. Před cestou vždy ověř aktuální podmínky na svscr.cz.</p>
    </Card>
  );
}

// ---------- As-needed meds: "bezpečné znovu po…" ----------
export function prnStatus(m: { minHours?: number; given?: { at: string; by?: string }[] }, now = Date.now()) {
  const last = m.given?.at(-1); if (!last) return { last: null, nextAt: null as number | null, ok: true };
  const nextAt = Date.parse(last.at) + (m.minHours ?? 0) * 3600e3;
  return { last, nextAt, ok: now >= nextAt };
}
export function PrnRow({ med }: { med: import('@/lib/types').Medication }) {
  const { saveMed } = useStore(); const cloud = useCloud();
  const [, tick] = useState(0); useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  const st = prnStatus(med);
  const hm = (t: number | string) => new Date(t).toLocaleString('cs-CZ', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const give = async () => {
    if (!st.ok && !(await (await import('./feedback')).ask({ title: 'Ještě není bezpečné podat', text: `Podle nastavení až ${hm(st.nextAt!)}. Opravdu zapsat dávku?`, ok: 'Přesto zapsat', danger: true }))) return;
    const prev = med; saveMed({ ...med, given: [...(med.given ?? []), { at: new Date().toISOString(), by: cloud.name }].slice(-50) });
    toast(`${med.name} – zapsáno ${new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`, () => saveMed(prev));
  };
  return (
    <div className="flex items-center gap-3 px-3 pb-2.5 -mt-1" data-prn={med.id}>
      <p className={`flex-1 text-[13px] ${st.ok ? 'text-muted' : 'text-amber-700 dark:text-amber-300 font-semibold'}`}>
        {st.last ? <>Naposledy {hm(st.last.at)}{st.last.by ? ` (${st.last.by})` : ''} · {st.ok ? 'lze znovu podat' : `bezpečně znovu po ${hm(st.nextAt!)}`}</> : med.minHours ? `Dle potřeby, nejdřív po ${med.minHours} h` : 'Dle potřeby'}
      </p>
      <button onClick={give} className="press min-h-[44px] px-3 rounded-xl font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">Podáno teď</button>
    </div>
  );
}

/** Pravidelné léky: odškrtávání dnešních dávek (Denně / 2× / 3× denně) s historií a jménem podávajícího. */
export const dosesPerDay = (f: string) => (f === '3× denně' ? 3 : f === '2× denně' ? 2 : f === 'Denně ráno' || f === 'Denně večer' ? 1 : 0);
export function DoseRow({ med }: { med: import('@/lib/types').Medication }) {
  const { saveMed } = useStore(); const cloud = useCloud();
  const n = dosesPerDay(med.frequency); if (!n) return null;
  const day = new Date().toISOString().slice(0, 10);
  const todays = (med.given ?? []).filter((g) => new Date(g.at).toLocaleDateString('sv') === new Date().toLocaleDateString('sv'));
  const hm = (t: string) => new Date(t).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const give = () => { const prev = med; saveMed({ ...med, given: [...(med.given ?? []), { at: new Date().toISOString(), by: cloud.name }].slice(-120) }); toast(`${med.name}: dávka zapsána ✓`, () => saveMed(prev)); };
  const streak = (() => { let s = 0; for (let i = 1; i < 60; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toLocaleDateString('sv'); if ((med.given ?? []).filter((g) => new Date(g.at).toLocaleDateString('sv') === k).length >= n) s++; else break; } return s; })();
  return (
    <div className="flex items-center gap-3 px-3 pb-2.5 -mt-1" data-dose-row={med.id} data-day={day}>
      <span className="flex gap-1" aria-label={`Dnes podáno ${todays.length} z ${n}`}>{Array.from({ length: n }, (_, i) => <span key={i} className={`w-6 h-6 rounded-full text-[12px] font-bold flex items-center justify-center ${i < todays.length ? 'bg-primary text-[#0F2540]' : 'ring-2 ring-ink/15 dark:ring-white/20 text-muted'}`}>{i < todays.length ? '✓' : i + 1}</span>)}</span>
      <p className="flex-1 text-[13px] text-muted">{todays.length >= n ? `Dnes hotovo${streak ? ` · ${streak + 1} dní v řadě` : ''}` : todays.length ? `Naposledy ${hm(todays[todays.length - 1].at)}${todays[todays.length - 1].by ? ` (${todays[todays.length - 1].by})` : ''}` : 'Dnes zatím nepodáno'}</p>
      {todays.length < n && <button onClick={give} className="press min-h-[44px] px-3 rounded-xl font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">Podáno</button>}
    </div>
  );
}
