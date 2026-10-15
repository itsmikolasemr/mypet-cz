'use client';
import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { status } from '@/lib/utils';
import { Icon, Logo } from './ui';
import dynamic from 'next/dynamic';
const Aivet = dynamic(() => import('./Aivet'), { loading: () => <div className="h-40 rounded-[26px] bg-ink/5 dark:bg-white/5 animate-pulse mt-4" /> });
import { PremiumProvider } from '@/lib/premium';
import { CloudProvider } from '@/lib/cloudsync';
const SharedPage = dynamic(() => import('./Shared').then((m) => m.SharedPage), { loading: () => <div className="h-40 rounded-[26px] bg-ink/5 dark:bg-white/5 animate-pulse mt-4" /> });
const SecondOpinion = dynamic(() => import('./V11').then((m) => m.SecondOpinion), { loading: () => <div className="h-40 rounded-[26px] bg-ink/5 dark:bg-white/5 animate-pulse mt-4" /> });
const Wallet = dynamic(() => import('./Wallet').then((m) => m.Wallet), { ssr: false });
import { BannerSlot, Expenses, Paywall } from './Premium';
import { FeedbackHost } from './feedback';
const TodayScreen = dynamic(() => import('./Today').then((m) => m.TodayScreen), { loading: () => <div className="h-40 rounded-[26px] bg-ink/5 dark:bg-white/5 animate-pulse mt-4" /> });
import { BadgeWatcher, GrowthLinks } from './Growth';
const Tlapkari = dynamic(() => import('./Growth').then((m) => m.Tlapkari), { loading: () => <div className="h-40 rounded-[26px] bg-ink/5 dark:bg-white/5 animate-pulse mt-4" /> });
import { useCloud } from '@/lib/cloudsync';
import { captureRef, claimPendingRef } from '@/lib/growth';
function RefCapture() { const c = useCloud(); useEffect(() => { captureRef(); }, []); useEffect(() => { if (c.session) claimPendingRef().then((r) => { if (r?.ok) import('./feedback').then((f) => f.notice('Vítej v Tlapce', `Od kamaráda máš ${r.days} dní Premium.`)); }); }, [c.session]); return null; }
import { startI18n } from '@/lib/i18n';
const Privacy = dynamic(() => import('./Legal').then((m) => m.Privacy));
const Terms = dynamic(() => import('./Legal').then((m) => m.Terms));
const About = dynamic(() => import('./Legal').then((m) => m.About));
import { CalendarScreen, Dashboard, Onboarding, PetDetail, PetsList, Reminders, Settings, type Tab } from './screens';

const VetMap = dynamic(() => import('./VetMap'), { ssr: false, loading: () => <div className="h-[46dvh] rounded-[26px] bg-ink/5 animate-pulse mt-20" /> });
const EXTRA: Tab[] = ['today', 'tlapkari', 'map', 'ai', 'expenses', 'second', 'cards', 'privacy', 'terms', 'about'];
const FROM_SETTINGS: Tab[] = ['privacy', 'terms', 'about'];

const TABS: { id: Tab; l: string; i: 'home' | 'paw' | 'bell' | 'heart' | 'cog' }[] = [
  { id: 'home', l: 'Přehled', i: 'home' }, { id: 'pets', l: 'Mazlíčci', i: 'paw' }, { id: 'reminders', l: 'Připomínky', i: 'bell' }, { id: 'calendar', l: 'Kalendář', i: 'heart' }, { id: 'settings', l: 'Nastavení', i: 'cog' },
];

/** Polštářek mark as a nav glyph – single colour (currentColor) so it reads on the active pill. */
function NavPaw() {
  return (
    <svg viewBox="0 0 1024 1024" className="w-6 h-6" aria-hidden data-navpaw>
      {[[255, 424.7, -56], [411.1, 304.9, -19], [612.9, 304.9, 19], [769, 424.7, 56]].map(([cx, cy, r], i) => <ellipse key={i} cx={cx} cy={cy} rx="70" ry="92" transform={`rotate(${r} ${cx} ${cy})`} fill="currentColor" />)}
      <circle cx="512" cy="610" r="215" fill="currentColor" />
    </svg>
  );
}

function Shell() {
  const { data, ready } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [petId, setPetId] = useState<string | null>(null);
  const [share, setShare] = useState<string | null>(null);
  useEffect(() => { const f = () => setShare(location.hash.startsWith('#share/') ? location.hash.slice(7) : null); f(); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => {
    const read = () => { const [t, p] = location.hash.slice(1).split('/'); if (TABS.some((x) => x.id === t) || EXTRA.includes(t as Tab)) setTab(t as Tab); setPetId(p || null); };
    read(); addEventListener('popstate', read); return () => removeEventListener('popstate', read);
  }, []);
  // Netlify's "Powered by Netlify" badge iframe sits bottom-right on the web build: lift floating UI above it.
  useEffect(() => {
    const f = () => { const b = document.getElementById('nl-badge-frame') || document.querySelector('iframe[id*="badge" i]'); const h = b && b.getBoundingClientRect().height; document.documentElement.style.setProperty('--badge', h ? `${Math.ceil(h) + 10}px` : '0px'); };
    f(); const mo = new MutationObserver(f); mo.observe(document.body, { childList: true }); const t = setInterval(f, 2000); setTimeout(() => clearInterval(t), 12000);
    return () => { mo.disconnect(); clearInterval(t); };
  }, []);
  useEffect(() => { const f = () => document.documentElement.classList.toggle('scrolled', scrollY > 6); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  useEffect(() => { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  const nav = (t: Tab, p: string | null = null) => {
    const h = `#${t}${p ? '/' + p : ''}`; if (location.hash !== h) { history.pushState(null, '', h); dispatchEvent(new HashChangeEvent('hashchange')); }
    setTab(t); setPetId(p); window.scrollTo({ top: 0 });
  };
  if (share) return <SharedPage token={share} />;
  if (!ready) return <main data-splash data-notr className="min-h-[100dvh] flex items-center justify-center"><Logo className="h-20" /></main>;
  if (!data.settings.onboarded) return <Onboarding />;
  const overdue = data.reminders.filter((r) => status(r) === 'overdue').length;
  return (
    <div className="min-h-[100dvh]">
      <div aria-hidden className="hdr-cover" />
      <main className="max-w-md mx-auto overflow-x-clip px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+var(--badge,0px)+var(--banner,0px)+132px)]">
        {EXTRA.includes(tab) && <button onClick={() => (FROM_SETTINGS.includes(tab) ? (tab === 'about' ? nav('settings') : nav('about')) : nav('home'))} className="press -ml-1 mb-1 flex items-center gap-1 text-primary-d dark:text-primary font-semibold min-h-[44px] pr-3"><Icon name="back" /> {FROM_SETTINGS.includes(tab) ? (tab === 'about' ? 'Nastavení' : 'O aplikaci') : 'Přehled'}</button>}
        <div key={tab + (petId ?? '')} className="animate-screen">
          {tab === 'home' && <Dashboard go={(t) => nav(t)} openPet={(id) => nav('pets', id)} />}
          {tab === 'today' && <TodayScreen />}
          {tab === 'tlapkari' && <Tlapkari />}
          {tab === 'map' && <VetMap initialNonstop={petId === 'nonstop'} />}
          {tab === 'ai' && <Aivet initialPet={petId ?? undefined} openMap={() => nav('map', 'nonstop')} />}
          {tab === 'pets' && (petId ? <PetDetail id={petId} back={() => history.length > 1 ? history.back() : nav('pets')} ask={() => nav('ai', petId)} /> : <PetsList openPet={(id) => nav('pets', id)} />)}
          {tab === 'reminders' && <Reminders />}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'settings' && <Settings />}
          {tab === 'expenses' && <Expenses />}
          {tab === 'second' && <SecondOpinion />}
          {tab === 'cards' && <Wallet />}
          {tab === 'privacy' && <Privacy />}
          {tab === 'terms' && <Terms />}
          {tab === 'about' && <About open={(t) => nav(t)} />}
        </div>
      </main>
      {tab !== 'map' && tab !== 'ai' && petId !== 'nonstop' && <BannerSlot />}
      <nav aria-label="Hlavní navigace" className="fixed inset-x-0 z-40 flex justify-center px-5 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px) + 12px)' }}>
        <div className="pointer-events-auto relative w-full max-w-[400px] grid grid-cols-5 p-1.5 rounded-[30px] bg-surface/70 dark:bg-[#1C222A]/70 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-ink/[0.06] dark:ring-white/10 shadow-float dark:shadow-float-d">
          <span aria-hidden className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[24px] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] shadow-[0_6px_16px_-4px_rgba(127,179,232,.55)] transition-[transform,opacity] duration-500 ease-spring"
            style={{ width: 'calc((100% - 12px) / 5)', transform: `translateX(${(FROM_SETTINGS.includes(tab) ? 4 : Math.max(0, TABS.findIndex((t) => t.id === tab))) * 100}%)`, opacity: 1 }} />
          {TABS.map((t) => {
            const a = tab === t.id || (t.id === 'home' && EXTRA.includes(tab) && !FROM_SETTINGS.includes(tab)) || (t.id === 'settings' && FROM_SETTINGS.includes(tab));
            return (
              <button key={t.id} onClick={() => nav(t.id)} aria-label={t.l} title={t.l} aria-current={a ? 'page' : undefined}
                className={`relative z-10 h-12 min-w-[44px] flex flex-col items-center justify-center rounded-[24px] transition-colors duration-300 ${a ? 'text-white' : 'text-muted hover:text-ink dark:hover:text-white'}`}>
                <span className={`transition-transform duration-300 ease-spring ${a ? 'scale-110 -translate-y-px' : 'scale-100'}`}>{t.id === 'calendar' ? <CalIcon /> : t.id === 'pets' ? <NavPaw /> : <Icon name={t.i} fill={a && t.i !== 'cog'} className="w-6 h-6" />}</span>
                {a && <span aria-hidden className="absolute bottom-1.5 h-1 w-1 rounded-full bg-white/90" />}
                {t.id === 'reminders' && overdue > 0 && <span className="absolute top-0.5 right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center ring-2 ring-surface dark:ring-surface-d">{overdue}</span>}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
const CalIcon = () => (<svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /><circle cx="12" cy="15" r="1.4" fill="currentColor" /></svg>);

export default function App() {
  useEffect(() => { startI18n(); }, []);
  return <StoreProvider><PremiumProvider><CloudProvider><Shell /><Paywall /><FeedbackHost /><BadgeWatcher /><GrowthLinks /><RefCapture /></CloudProvider></PremiumProvider></StoreProvider>;
}
