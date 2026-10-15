'use client';
/** v1.2 growth & community UI – Párový režim, výzvy, promo, doporučení, odznaky, Story/avatar/nálepky, kamarádi, check-iny, Tlapkaři, útulky, Dar z Tlapky. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCloud } from '@/lib/cloudsync';
import { createInvite, joinHousehold } from '@/lib/cloud';
import type { Pet } from '@/lib/types';
import { BADGES, GROUPS, RARITY, badge as badgeOf, krajOf, newlyEarned, nextBadge, progress, type Rarity } from '@/lib/badges';
import {
  chipRequest, claimBadge, createChallenge, decideLink, feed, feedBadge, fairShare, friendAdd, friendPayload, friendToken, interestHref, joinChallenge, leaveChallenge,
  levelOf, linkRequests, myChallenges, myName, myProfile, myReferrals, parseFriend, react, redeemPromo, refLink, reportChallenge, rewardDays, saveProfile, setMyName, shelters,
  toFriend, walksThisWeek, type Adoption, type Challenge, type FeedItem, type Shelter, type Tlapkar,
} from '@/lib/growth';
import { renderSticker, renderStory, STICKERS, toBlob } from '@/lib/story';
import { avatarDataUrl, avatarImage } from '@/lib/avatar';
import { zip } from '@/lib/zip';
import { Button, Card, Sheet } from './ui';
import { Emo, GT } from './glyphs';
import { ask, notice, toast } from './feedback';
import { tr } from '@/lib/i18n';

const H = ({ e, t, sub }: { e: string; t: string; sub?: string }) => (<div className="mb-2"><p className="font-semibold"><GT t={`${e} ${t}`} /></p>{sub && <p className="text-[13px] text-muted">{sub}</p>}</div>);
const inp = 'w-full rounded-2xl bg-ink/[0.04] dark:bg-white/[0.06] px-4 min-h-[44px] text-[15px] outline-none focus:ring-2 ring-primary';
const qr = (text: string) => import('qrcode').then((Q) => Q.toDataURL(text, { margin: 1, width: 420, color: { dark: '#2E3138', light: '#FFFFFF' } }));
const download = (b: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
async function shareOrSave(b: Blob, name: string, text?: string) {
  const f = new File([b], name, { type: b.type });
  try { if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], text }); return; } } catch (e) { if ((e as Error).name === 'AbortError') return; }
  download(b, name);
}
const needAuth = (e: string) => (/invalid code|expired/i.test(e) ? 'Kód neplatí nebo vypršel.' : e === 'auth' ? 'Nejdřív se přihlas v Nastavení › Účet a záloha.' : e === 'server' ? 'Komunitní funkce ještě nejsou na serveru zapnuté.' : 'Nepovedlo se, zkus to znovu.');
const RAR_CLS: Record<Rarity, string> = { tecka: 'bg-ink/5 dark:bg-white/10', bricho: 'bg-[#7FB3E8]/15 dark:bg-[#7FB3E8]/12', tlapka: 'bg-[#7FB3E8]/30 dark:bg-[#7FB3E8]/16', zlata: 'bg-[#E9D9A6]/50 dark:bg-[#E9D9A6]/12', sezonni: 'bg-[#BFE3D6]/50 dark:bg-[#BFE3D6]/12' };

/* ───────── Fair share (Today / Dashboard) ───────── */
export function FairShareCard() {
  const { data } = useStore();
  const [name, setName] = useState(''); const [edit, setEdit] = useState(false);
  useEffect(() => setName(myName()), []);
  const fs = useMemo(() => fairShare(data), [data]);
  return (
    <Card className="p-4" >
      <div data-fairshare className="flex items-center justify-between"><H e="👥" t="Kdo se dnes staral" sub={fs.solo ? 'Až se přidá partner, uvidíte spravedlivé rozdělení péče.' : 'Posledních 7 dní, krmení, venčení i léky.'} />
        <button onClick={() => setEdit(true)} className="text-[13px] font-semibold text-primary min-h-[44px] min-w-[44px] px-2">{name || 'Já'}</button></div>
      {fs.share.length > 0 ? (
        <ul className="space-y-2">{fs.share.map((r) => (
          <li key={r.name}><div className="flex justify-between text-[13px]"><b>{r.name}</b><span className="text-muted tabular-nums">{`${tr('dnes')} ${r.today} · ${tr('týden')} ${r.week} (${r.pct} %)`}</span></div>
            <div className="h-2 rounded-full bg-ink/5 dark:bg-white/10 mt-1"><div className="h-2 rounded-full bg-primary" style={{ width: `${r.pct}%` }} /></div></li>
        ))}</ul>
      ) : <p className="text-[13px] text-muted">Odškrtni krmení nebo venčení v Tlapka Dni.</p>}
      {!fs.solo && fs.nextWalk && <p className="text-[13px] mt-2">Další procházka by mohla být na: <b>{fs.nextWalk}</b></p>}
      <Sheet open={edit} onClose={() => setEdit(false)} title="Jak ti říkat">
        <form onSubmit={(e) => { e.preventDefault(); setMyName(name); setEdit(false); toast('Uloženo'); }} className="space-y-3">
          <input aria-label="Tvoje jméno" className={inp} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Např. Jana" />
          <p className="text-[13px] text-muted">Jméno se ukáže partnerovi u odškrtnutých úkolů.</p>
          <Button className="w-full">Uložit</Button>
        </form>
      </Sheet>
    </Card>
  );
}

/* ───────── Co-owners (Párový režim) – pet Sdílet tab ───────── */
export function CoOwnerCard({ pet }: { pet: Pet }) {
  const cloud = useCloud();
  const [inv, setInv] = useState<{ code: string; img: string } | null>(null);
  const [chip, setChip] = useState(''); const [reqs, setReqs] = useState<Awaited<ReturnType<typeof linkRequests>>>([]);
  useEffect(() => { if (cloud.session) linkRequests().then(setReqs); }, [cloud.session]);
  const invite = async () => {
    if (!cloud.session || !cloud.hh) return notice('Párový režim', needAuth('auth'));
    try { const i = await createInvite(cloud.hh); setInv({ code: i.code, img: await qr(`${location.origin}/#join/${i.code}`) }); } catch { notice('Pozvánka', needAuth('x')); }
  };
  const byChip = async () => {
    const r = await chipRequest(chip, myName());
    if (!r.ok) return notice('Žádost podle čipu', needAuth(r.error));
    setChip(''); notice('Žádost odeslána', 'Pokud mazlíček s tímto čipem v Tlapce je, majitel dostane žádost ke schválení. Bez jeho souhlasu se nic nesdílí.');
  };
  return (
    <Card className="p-4 space-y-3">
      <H e="👨‍👩‍👧" t="Párový režim" sub={`Starejte se o ${pet.name} spolu: kdo venčil, kdo krmil, kdo dal lék.`} />
      <Button variant="soft" className="w-full" onClick={invite}><Emo e="🔳" className="w-5 h-5" /> Pozvat partnera (QR)</Button>
      {inv && <div className="text-center" data-invite><img src={inv.img} alt="QR pozvánka" className="w-44 h-44 mx-auto rounded-xl" /><p className="text-[13px] mt-1">Kód <b className="tracking-widest">{inv.code}</b> · platí 7 dní</p></div>}
      <details className="text-[13px]"><summary className="cursor-pointer min-h-[44px] flex items-center font-semibold">Máte stejného mazlíčka? Požádat podle čipu</summary>
        <div className="flex gap-2 mt-1"><input aria-label="Číslo čipu" inputMode="numeric" className={inp} value={chip} onChange={(e) => setChip(e.target.value)} placeholder="15 číslic" />
          <Button disabled={chip.replace(/\D/g, '').length !== 15} onClick={byChip}>Požádat</Button></div>
        <p className="text-muted mt-1">Shoda čipu jen navrhne propojení. Majitel ho musí schválit, nikdo neuvidí data jen podle čipu.</p>
      </details>
      {reqs.length > 0 && <div className="space-y-2" data-link-requests><p className="text-[13px] font-semibold">Žádosti o propojení</p>
        {reqs.map((r) => <div key={r.id} className="flex items-center gap-2 text-[13px]"><span className="flex-1">{r.requester_name || 'Někdo'} chce spoluspravovat mazlíčka</span>
          <Button variant="soft" onClick={async () => { await decideLink(r.id, false); setReqs((x) => x.filter((y) => y.id !== r.id)); }}>Odmítnout</Button>
          <Button onClick={async () => { const x = await decideLink(r.id, true); if (x.ok) { toast('Propojeno'); setReqs((y) => y.filter((z) => z.id !== r.id)); } }}>Schválit</Button></div>)}</div>}
    </Card>
  );
}

/* ───────── Story, avatar, stickers, friend QR – pet Sdílet tab ───────── */
export function ShareExtras({ pet }: { pet: Pet }) {
  const { data } = useStore();
  const [busy, setBusy] = useState(''); const [fq, setFq] = useState('');
  const run = (k: string, f: () => Promise<void>) => async () => { setBusy(k); try { await f(); } catch { notice('Nepovedlo se', 'Zkus to prosím znovu.'); } finally { setBusy(''); } };
  const story = run('story', async () => { const c = await renderStory(data, pet, { qr: `${location.origin}/?ref=story` }); await shareOrSave(await toBlob(c), `tlapka-story-${pet.name}.png`, tr('Můj den s Tlapkou')); });
  const avatar = run('avatar', async () => { const img = await avatarImage(pet, 1024); const c = document.createElement('canvas'); c.width = c.height = 1024; c.getContext('2d')!.drawImage(img, 0, 0, 1024, 1024); await shareOrSave(await toBlob(c), `tlapka-avatar-${pet.name}.png`); });
  const stickers = run('stickers', async () => { const files = await Promise.all(STICKERS.map(async (t, i) => ({ name: `tlapka-${i + 1}.png`, data: await toBlob(await renderSticker(pet, tr(t))) }))); download(await zip(files), `tlapka-nalepky-${pet.name}.zip`); });
  const friend = async () => { const mine = (data.badges ?? []).filter((b) => b.petId === pet.id).slice(-3).map((b) => b.id); setFq(await qr(friendPayload({ v: 1, n: pet.name, s: pet.species, b: pet.birthDate, o: myName(), x: mine }))); };
  return (
    <Card className="p-4 space-y-2">
      <H e="✨" t="Sdílej a ukaž" sub="Story na Instagram, avatar, nálepky a QR pro kamarády ve výběhu." />
      <div className="flex items-center gap-3"><img src={avatarDataUrl(pet, { bg: true, size: 96 })} alt={`Avatar ${pet.name}`} className="w-16 h-16 rounded-2xl" />
        <p className="text-[13px] text-muted flex-1">Plochý avatar v barvách Tlapky. Vytváří se přímo v telefonu, fotka nikam neodchází.</p></div>
      <div className="grid grid-cols-2 gap-2 [&>button]:whitespace-nowrap [&>button]:text-[14px]">
        <Button variant="soft" disabled={!!busy} onClick={story}><Emo e="📷" className="w-5 h-5" /> {busy === 'story' ? 'Kreslím…' : 'Story'}</Button>
        <Button variant="soft" disabled={!!busy} onClick={avatar}><Emo e="🖼️" className="w-5 h-5" /> Avatar</Button>
        <Button variant="soft" disabled={!!busy} onClick={stickers}><Emo e="🏷️" className="w-5 h-5" /> {busy === 'stickers' ? 'Balím…' : 'Nálepky'}</Button>
        <Button variant="soft" onClick={friend}><Emo e="🔳" className="w-5 h-5" /> QR kamarád</Button>
      </div>
      {fq && <div className="text-center" data-friend-qr><img src={fq} alt="QR kamarád" className="w-44 h-44 mx-auto rounded-xl" /><p className="text-[13px] text-muted">Ať si ho kamarád načte fotoaparátem. Obsahuje jen jméno, druh, narozeniny a 3 odznaky.</p></div>}
    </Card>
  );
}

/* ───────── Badges ───────── */
export function BadgesCard({ pet }: { pet: Pet }) {
  const { data, patch } = useStore();
  const [all, setAll] = useState(false);
  if (data.settings.badges === false) return null;
  const earned = new Set((data.badges ?? []).filter((b) => b.petId === pet.id || b.petId === '').map((b) => b.id));
  const nb = nextBadge(data, pet);
  const list = BADGES.filter((b) => all || earned.has(b.id));
  return (
    <Card className="p-4" >
      <div data-badges className="flex items-center justify-between"><H e="🏅" t="Odznaky" sub={`${earned.size} ${tr('z')} ${BADGES.length}${pet.memorial ? ' · vzpomínkový profil, odznaky jsou zamrzlé' : ''}`} />
        <button className="text-[13px] font-semibold text-primary min-h-[44px] min-w-[44px] px-2" onClick={() => setAll(!all)}>{all ? 'Jen získané' : 'Všechny'}</button></div>
      {nb && !pet.memorial && <p className="text-[13px] mb-2 tabular-nums">{tr('Nejblíž:')} <b>{tr(nb.b.name)}</b> · {nb.p.have}/{nb.p.need}</p>}
      {!list.length ? <p className="text-[13px] text-muted">Zatím žádný. První získáš odškrtnutím úkolu v Tlapka Dni.</p> : (
        <ul className="grid grid-cols-2 gap-2">{list.map((b) => { const got = earned.has(b.id); const p = progress(b, data, pet);
          return <li key={b.id} className={`rounded-2xl p-2.5 ${RAR_CLS[b.rarity]} ${got ? '' : 'border border-dashed border-ink/25 dark:border-white/30'}`}>
            <p className="text-[13px] font-bold leading-tight">{b.name}</p>
            <p className="text-[12px] uppercase tracking-[0.06em] font-bold text-[#2C68A8] dark:text-[#A9CEF3] mt-0.5">{RARITY[b.rarity].name}</p>{!b.noReward && RARITY[b.rarity].reward && <p className="text-[12px] font-semibold text-muted">{RARITY[b.rarity].reward}</p>}
            <p className="text-[12px] text-muted leading-snug mt-0.5">{b.desc}</p>
            {!got && <p className="text-[12px] text-muted mt-0.5">{b.server ? 'ověřuje server' : `${Math.min(p.have, p.need)}/${p.need}`}</p>}
          </li>; })}</ul>
      )}
      <label className="flex items-center gap-2 text-[13px] mt-3 min-h-[44px]"><input type="checkbox" checked={!!pet.memorial} onChange={(e) => patch((d) => ({ ...d, pets: d.pets.map((x) => (x.id === pet.id ? { ...x, memorial: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined } : x)) }))} /> Vzpomínkový profil (bez připomínek odznaků)</label>
      <p className="text-[12px] text-muted">{GROUPS.zdravi}: odměňujeme péči podle plánu, nikdy počet léků, návštěv veterináře ani změnu váhy.</p>
    </Card>
  );
}
/** Global: awards new badges (local), toasts, asks the server to verify server badges and posts badge events to friends feed. */
export function BadgeWatcher() {
  const { data, patch } = useStore(); const cloud = useCloud();
  const [server, setServer] = useState<Record<string, boolean>>({});
  useEffect(() => { if (!cloud.session) return; (async () => { const out: Record<string, boolean> = {}; for (const id of ['family', 'party3', 'ambassador10', 'founder']) { const r = await claimBadge(id); if (r.ok && r.data.verified) out[id] = true; } setServer(out); })(); }, [cloud.session]);
  useEffect(() => {
    const t = setTimeout(() => {
      const n = newlyEarned(data, new Date(), server); if (!n.length) return;
      const at = new Date().toISOString();
      patch((d) => ({ ...d, badges: [...(d.badges ?? []), ...n.map((x) => ({ ...x, at }))] }));
      const b = badgeOf(n[0].id); if (b) toast(`${tr('Nový odznak')}: ${tr(b.name)}${n.length > 1 ? ` +${n.length - 1}` : ''}`);
      if (cloud.session) n.forEach(async (x) => { const r = await claimBadge(x.id, x.petId); if (r.ok) feedBadge(x.id); });
    }, 1200);
    return () => clearTimeout(t);
  }, [data, server]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
export function BadgeToggle() {
  const { data, patch } = useStore(); const on = data.settings.badges !== false;
  return (
    <button role="switch" aria-checked={on} onClick={() => patch((d) => ({ ...d, settings: { ...d.settings, badges: !on } }))} className="press w-full flex items-center gap-3 px-4 py-3.5 text-left">
      <span className="w-7 text-center"><Emo e="🏅" className="w-6 h-6 mx-auto" /></span>
      <span className="flex-1"><span className="block font-medium">Odznaky a úrovně</span><span className="block text-[13px] text-muted">Jemné ocenění pravidelné péče. Můžeš kdykoli vypnout.</span></span>
      <span className={`w-12 h-7 rounded-full p-0.5 transition ${on ? 'bg-primary' : 'bg-ink/15 dark:bg-white/20'}`}><span className={`block w-6 h-6 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`} /></span>
    </button>
  );
}

/* ───────── Promo + referral (Settings › Předplatné, Tlapkaři) ───────── */
export function PromoRow() {
  const cloud = useCloud();
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); const r = await redeemPromo(code); setBusy(false);
    if (!r.ok) return notice('Promo kód', needAuth(r.error));
    if (!r.data.ok) return notice('Promo kód', r.data.reason === 'already' || r.data.reason === 'used' ? 'Kód už jsi jednou uplatnil/a.' : r.data.reason === 'exhausted' ? 'Kód už je vyčerpaný.' : 'Tenhle kód neznáme nebo už neplatí.');
    setCode(''); cloud.refreshPremium(); notice('Hotovo', `Premium prodlouženo o ${r.data.days} dní.`); };
  return (
    <form onSubmit={go} className="flex gap-2 px-4 py-3" data-promo>
      <input aria-label="Promo kód" className={inp + ' uppercase'} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo kód" maxLength={24} />
      <Button disabled={busy || code.trim().length < 3}>Uplatnit</Button>
    </form>
  );
}
export function ReferralCard() {
  const cloud = useCloud();
  const [st, setSt] = useState<{ n: number; waiting: number; days: number } | null>(null);
  useEffect(() => { if (cloud.session) Promise.all([myReferrals(), rewardDays()]).then(([r, d]) => setSt({ n: r.filter((x) => x.status === 'rewarded').length, waiting: r.filter((x) => x.status === 'pending').length, days: d })); }, [cloud.session]);
  const link = cloud.session ? refLink(cloud.session.user.id) : '';
  return (
    <Card className="p-4 space-y-2" >
      <div data-referral><H e="🎁" t="Pozvi kamaráda" sub="Oba dostanete měsíc Premium. Počítá se, až bude kamarád 7 dní aktivní. Max. 12 měsíců za rok." /></div>
      {cloud.session ? (<>
        <Button className="w-full" onClick={() => (navigator.share ? navigator.share({ url: link, text: tr('Hlídá mi odčervení i očkování. Zkus Tlapku, oba dostaneme měsíc Premium.') }).catch(() => {}) : navigator.clipboard?.writeText(link).then(() => toast('Odkaz zkopírován')))}>Sdílet pozvánku</Button>
        {st && <p className="text-[13px] text-muted">{`${st.n} ${tr('přátel')} · ${st.waiting} ${tr('čeká na 7 aktivních dní')} · ${Math.min(st.days, 365)} ${tr('dní Premium za poslední rok')}`}</p>}
      </>) : <p className="text-[13px] text-muted">{needAuth('auth')}</p>}
    </Card>
  );
}

/* ───────── Challenges ───────── */
export function ChallengesCard() {
  const { data } = useStore(); const cloud = useCloud();
  const [list, setList] = useState<Challenge[]>([]); const [code, setCode] = useState('');
  const load = () => myChallenges().then(setList);
  useEffect(() => { if (cloud.session) load(); }, [cloud.session]); // eslint-disable-line react-hooks/exhaustive-deps
  const walks = walksThisWeek(data);
  const nm = () => { const n = myName(); return n === 'Já' ? (data.pets.find((p) => !p.memorial)?.name ?? n) : n; };
  useEffect(() => { list.forEach((c) => { const mine = c.members.find((m) => m.user_id === cloud.session?.user.id); if (mine && mine.count < walks) reportChallenge(c.id, walks); }); }, [list, walks]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => { const r = await createChallenge('Týden procházek', 14, nm()); if (!r.ok) return notice('Výzva', needAuth(r.error)); load(); notice('Výzva založena', `Kód pro kamarády: ${r.data.code.toUpperCase()}`); };
  const join = async () => { const r = await joinChallenge(code, nm()); if (!r.ok) return notice('Výzva', needAuth(r.error)); setCode(''); load(); };
  return (
    <Card className="p-4 space-y-3">
      <div data-challenges><H e="🏁" t="Výzvy s kamarády" sub="Společný cíl na týden: procházky se počítají z Tlapka Dne. Žádné žebříčky, jen parta." /></div>
      {list.map((c) => { const sum = c.members.reduce((a, m) => a + m.count, 0); return (
        <div key={c.id} className="rounded-2xl bg-ink/[0.03] dark:bg-white/[0.05] p-3">
          <div className="flex justify-between text-[13px]"><b>{c.title}</b><span className="text-muted">{`${tr('kód')} ${c.code.toUpperCase()}`}</span></div>
          <div className="h-2 rounded-full bg-ink/5 dark:bg-white/10 my-1.5"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (sum / c.goal) * 100)}%` }} /></div>
          <p className="text-[12px] text-muted tabular-nums">{sum}/{c.goal} · {c.members.map((m) => `${m.display_name || '?'} ${m.count}`).join(' · ')}</p>
          <button className="text-[12px] text-muted underline min-h-[44px]" onClick={async () => { if (await ask({ title: 'Opustit výzvu?', ok: 'Opustit' })) { await leaveChallenge(c.id); load(); } }}>Opustit</button>
        </div>); })}
      <div className="flex gap-2"><input aria-label="Kód výzvy" className={inp + ' uppercase'} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Kód výzvy" />
        <Button variant="soft" disabled={code.trim().length < 4} onClick={join}>Přidat se</Button></div>
      <Button variant="soft" className="w-full" onClick={create}>Založit výzvu (14 procházek / týden)</Button>
    </Card>
  );
}

/* ───────── Park check-in (map park sheet) ───────── */
const R = (d: number) => (d * Math.PI) / 180;
const meters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => { const x = R(b.lon - a.lon) * Math.cos(R((a.lat + b.lat) / 2)), y = R(b.lat - a.lat); return Math.sqrt(x * x + y * y) * 6371e3; };
export function ParkCheckin({ park }: { park: { id: string; name: string; lat: number; lon: number } }) {
  const { data, patch } = useStore();
  const [petId, setPetId] = useState(data.pets.find((p) => !p.memorial)?.id ?? '');
  const day = new Date().toISOString().slice(0, 10);
  const done = (data.checkins ?? []).some((c) => c.parkId === park.id && c.petId === petId && c.at.slice(0, 10) === day);
  if (!data.pets.length) return null;
  const go = () => navigator.geolocation.getCurrentPosition((pos) => {
    const me = { lat: pos.coords.latitude, lon: pos.coords.longitude }; const d = meters(me, park);
    if (d > 100) return notice('Jsi trochu daleko', `Check-in jde jen přímo ve výběhu (do 100 m). Teď jsi ${Math.round(d)} m od něj.`);
    patch((x) => ({ ...x, checkins: [...(x.checkins ?? []), { id: `${park.id}:${petId}:${day}`, petId, parkId: park.id, name: park.name, lat: park.lat, lon: park.lon, region: krajOf(park.lat, park.lon), at: new Date().toISOString() }] }));
    toast('Check-in uložen');
  }, () => notice('Poloha', 'Bez polohy check-in nejde. Povol ji v nastavení telefonu.'), { enableHighAccuracy: true, timeout: 12000 });
  return (
    <div className="flex gap-2 items-center" data-checkin>
      {data.pets.length > 1 && <select aria-label="Mazlíček" className="bg-transparent font-semibold text-[14px] min-h-[44px]" value={petId} onChange={(e) => setPetId(e.target.value)}>{data.pets.filter((p) => !p.memorial).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      <Button variant="soft" className="flex-1" disabled={done} onClick={go}><Emo e="🌳" className="w-5 h-5" /> {done ? 'Dnes už tu jste' : 'Jsme tady (check-in)'}</Button>
    </div>
  );
}

/* ───────── Hash links: #friend/… (pet card + optional cloud token), #join/CODE ───────── */
export function GrowthLinks() {
  const { data, patch } = useStore(); const cloud = useCloud();
  const seen = useRef('');
  useEffect(() => {
    const run = async () => {
      const h = location.hash; if (!h || h === seen.current) return;
      if (h.startsWith('#friend/')) {
        seen.current = h; const c = parseFriend(h); history.replaceState(null, '', '#tlapkari'); dispatchEvent(new PopStateEvent('popstate'));
        if (!c) return notice('QR kamarád', 'Tenhle kód neznáme.');
        const f = toFriend(c); if (!(data.friends ?? []).some((x) => x.id === f.id)) patch((d) => ({ ...d, friends: [...(d.friends ?? []), f] }));
        if (c.t && cloud.session) await friendAdd(c.t);
        toast(`${tr('Nový kamarád')}: ${c.n}`);
      } else if (h.startsWith('#join/')) {
        seen.current = h; const code = h.slice(6).toUpperCase(); history.replaceState(null, '', '#settings'); dispatchEvent(new PopStateEvent('popstate'));
        if (!cloud.session) return notice('Pozvánka do domácnosti', `${tr('Přihlas se v Nastavení › Účet a záloha a zadej kód')} ${code}.`);
        if (await ask({ title: 'Připojit se k domácnosti?', text: 'Uvidíte stejné mazlíčky a péči.', ok: 'Připojit' })) { try { cloud.setHh(await joinHousehold(code, myName())); toast('Připojeno k domácnosti'); } catch { notice('Pozvánka', 'Kód neplatí nebo vypršel.'); } }
      }
    };
    run(); addEventListener('hashchange', run); return () => removeEventListener('hashchange', run);
  }, [cloud.session, data.friends]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/* ───────── Tlapkaři screen ───────── */
export function Tlapkari() {
  const { data } = useStore(); const cloud = useCloud();
  const [prof, setProf] = useState<Tlapkar | null>(null); const [edit, setEdit] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]); const [tok, setTok] = useState('');
  const pet = data.pets.find((p) => !p.memorial) ?? data.pets[0];
  const lvl = levelOf((data.badges ?? []).length);
  useEffect(() => { if (!cloud.session) return; myProfile().then(setProf); feed().then(setItems); }, [cloud.session]);
  const myQr = async () => {
    if (!pet) return;
    let t: string | undefined; if (cloud.session) { const r = await friendToken(); if (r.ok) t = r.data; }
    setTok(await qr(friendPayload({ v: 1, n: pet.name, s: pet.species, b: pet.birthDate, o: myName(), x: (data.badges ?? []).slice(-3).map((b) => b.id), t })));
  };
  const reactTo = async (e: FeedItem, k: 'paw' | 'dot') => { const next = e.reactions.mine === k ? null : k; if (await react(e.id, next)) setItems(await feed()); };
  const label = (e: FeedItem) => e.kind === 'badge' ? `${tr('získal/a odznak')} „${tr(badgeOf(e.ref ?? '')?.name ?? e.ref ?? '')}“` : e.kind === 'birthday' ? tr('má dnes narozeniny') : e.kind === 'friend' ? `${tr('má nového kamaráda')}: ${e.ref ?? ''}` : e.kind === 'level' ? `${tr('je teď')} ${tr(levelOf(Number(e.ref) * 5).name)}` : tr('našel/la domov');
  return (
    <div className="space-y-4 stagger">
      <div><h1 className="text-3xl font-extrabold tracking-tight">Tlapkaři</h1><p className="text-muted text-[13px]">Kamarádi z výběhu. Bez veřejného feedu, bez komentářů, bez sbírek.</p></div>
      <Card className="p-4">
        <div className="flex items-center gap-3" data-profile>
          {pet && <img src={avatarDataUrl(pet, { bg: true, size: 96 })} alt="" className="w-14 h-14 rounded-2xl" />}
          <div className="flex-1 min-w-0"><p className="font-bold">{prof?.pet_name ?? pet?.name ?? 'Tvůj mazlíček'}</p><p className="text-[13px] text-muted">{prof?.city || 'Město neuvedeno'} · {tr(lvl.name)}</p>
            <div className="h-1.5 rounded-full bg-ink/5 dark:bg-white/10 mt-1"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(lvl.i / 5) * 100}%` }} /></div></div>
          <Button variant="soft" onClick={() => (cloud.session ? setEdit(true) : notice('Profil Tlapkaře', needAuth('auth')))}>Upravit</Button>
        </div>
        <p className="text-[12px] text-muted mt-2">Úrovně: Štěňátko → Tlapkař → Výběhový štamgast → Parťák party → Legenda tlapek. Jen kosmetika, nic neodemykají.</p>
      </Card>
      <Card className="p-4 space-y-2">
        <H e="🔳" t="Kamarádi přes QR" sub="Ve výběhu si navzájem načtěte QR fotoaparátem. Kód platí 15 minut." />
        <Button className="w-full" onClick={myQr}>Ukázat můj QR</Button>
        {tok && <img data-my-qr src={tok} alt="Můj QR" className="w-48 h-48 mx-auto rounded-xl" />}
        {(data.friends ?? []).length > 0 && <ul className="divide-y divide-ink/5 dark:divide-white/5" data-friends>{data.friends!.map((f) => <li key={f.id} className="py-2 flex items-center gap-2 text-[14px]"><img src={avatarDataUrl({ species: f.species, name: f.name, color: '' }, { bg: true, size: 64 })} alt="" className="w-9 h-9 rounded-xl" /><span className="flex-1"><b>{f.name}</b>{f.owner && <span className="text-muted"> · {f.owner}</span>}</span><span className="text-[12px] text-muted">{f.place ?? ''}</span></li>)}</ul>}
      </Card>
      <Card className="p-4">
        <H e="🐾" t="Co je nového u kamarádů" sub="Jen automatické události: odznaky, narozeniny, noví kamarádi." />
        {!cloud.session ? <p className="text-[13px] text-muted">{needAuth('auth')}</p> : !items.length ? <p className="text-[13px] text-muted">Zatím tu nic není. Přidej kamaráda přes QR.</p> : (
          <ul className="space-y-2" data-feed>{items.map((e) => <li key={e.id} className="flex items-center gap-2 text-[14px]">
            <span className="flex-1"><b>{e.who?.pet_name ?? '?'}</b> {label(e)}</span>
            {(['paw', 'dot'] as const).map((k) => <button key={k} aria-label={k === 'paw' ? 'Reakce tlapka' : 'Reakce tečka'} aria-pressed={e.reactions.mine === k} onClick={() => reactTo(e, k)} className={`press min-h-[44px] min-w-[44px] rounded-full px-2 text-[13px] font-semibold ${e.reactions.mine === k ? 'bg-primary/20 text-primary-d dark:text-primary' : 'text-muted'}`}>{k === 'paw' ? <Emo e="🐾" className="w-4 h-4 inline" /> : '•'} {e.reactions[k] || ''}</button>)}
          </li>)}</ul>)}
      </Card>
      <ChallengesCard />
      <ReferralCard />
      <SheltersSection />
      <Sheet open={edit} onClose={() => setEdit(false)} title="Profil Tlapkaře">
        <ProfileForm init={prof ?? { pet_name: pet?.name ?? '', species: pet?.species ?? 'pes', breed: pet?.breed, city: '', birthday: pet?.birthDate ?? null }} level={lvl.i} onDone={(p) => { setProf(p); setEdit(false); }} />
      </Sheet>
    </div>
  );
}
function ProfileForm({ init, level, onDone }: { init: Tlapkar; level: number; onDone: (p: Tlapkar) => void }) {
  const [p, setP] = useState(init);
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const v = { ...p, level }; if (await saveProfile(v)) { toast('Uloženo'); onDone(v); } else notice('Profil', needAuth('server')); }}>
      <input aria-label="Jméno mazlíčka" className={inp} value={p.pet_name} maxLength={40} onChange={(e) => setP({ ...p, pet_name: e.target.value })} placeholder="Jméno mazlíčka" required />
      <input aria-label="Město" className={inp} value={p.city ?? ''} maxLength={60} onChange={(e) => setP({ ...p, city: e.target.value })} placeholder="Město (jen město, žádná adresa)" />
      <p className="text-[13px] text-muted">Profil vidí jen tví kamarádi. Ukazujeme jen město, nikdy přesnou polohu.</p>
      <Button className="w-full">Uložit</Button>
    </form>
  );
}

/* ───────── Shelters: adoption showcase + Dar z Tlapky ───────── */
export function SheltersSection() {
  const [st, setSt] = useState<{ shelters: Shelter[]; adoptions: Adoption[]; month: { month: string; shelter_id: string; donated_czk: number | null; proof_url: string | null } | null } | null>(null);
  useEffect(() => { shelters().then(setSt); }, []);
  const som = st?.month ? st.shelters.find((s) => s.id === st.month!.shelter_id) : undefined;
  return (<>
    <Card className="p-4">
      <div data-dar><H e="🎁" t="Dar z Tlapky" sub="5 % z příjmů Premium posíláme každý měsíc útulku měsíce. Platí to firma Tlapka, ty nic navíc neplatíš." /></div>
      {som ? <p className="text-[14px]">Útulek měsíce: <b>{som.name}</b>, {som.city}{st!.month!.donated_czk ? ` · ${tr('předáno')} ${st!.month!.donated_czk.toLocaleString()} Kč` : ''}{st!.month!.proof_url && <> · <a className="text-primary underline" href={st!.month!.proof_url} target="_blank" rel="noreferrer">potvrzení</a></>}</p>
        : <p className="text-[13px] text-muted">Prvního útulka měsíce vybereme po spuštění. Částku a potvrzení o převodu tu vždy zveřejníme.</p>}
    </Card>
    <Card className="p-4">
      <div data-adopce><H e="🐾" t="Hledají domov" sub="Jen z ověřených útulků. Kontakt vede přímo na útulek." /></div>
      {!st?.adoptions.length ? (!st?.shelters.length ? <p className="text-[13px] text-muted">Zatím tu nikdo není. Útulky teprve ověřujeme.</p> : (<>
        <p className="text-[13px] text-muted mb-2">Konkrétní zvířata brzy. Zatím ověřené útulky, se kterými spolupracujeme:</p>
        <ul className="divide-y divide-ink/5 dark:divide-white/10" data-shelters>{st.shelters.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2 min-h-[48px]"><span className="flex-1 min-w-0"><b className="block text-[14px] leading-snug">{s.name}</b><span className="text-[12px] text-muted">{s.city} · {s.region}</span></span>
            {(s.web || s.donate_url) && <a className="press shrink-0 inline-flex items-center min-h-[44px] px-3 rounded-xl text-[13px] font-semibold bg-primary/10 text-primary-d dark:text-primary" href={s.web ?? s.donate_url!} target="_blank" rel="noreferrer">Mám zájem</a>}</li>))}</ul>
      </>)) : (
        <ul className="grid grid-cols-2 gap-2">{st.adoptions.map((a) => { const s = st.shelters.find((x) => x.id === a.shelter_id); if (!s) return null; return (
          <li key={a.id} className="rounded-2xl bg-ink/[0.03] dark:bg-white/[0.05] p-2.5 text-[13px]">
            {a.photo_url && <img src={a.photo_url} alt={a.name} className="w-full aspect-square object-cover rounded-xl mb-1.5" />}
            <b>{a.name}</b><p className="text-muted">{[a.age_text, a.sex, s.city].filter(Boolean).join(' · ')}</p>
            <a className="press mt-1.5 inline-flex items-center justify-center w-full rounded-xl min-h-[44px] font-semibold bg-primary/15 text-primary-d dark:text-primary" href={interestHref(s, a)}>Mám zájem</a>
          </li>); })}</ul>)}
    </Card>
  </>);
}
