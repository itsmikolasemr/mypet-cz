'use client';
import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { status } from '@/lib/utils';
import { Icon } from './ui';
import dynamic from 'next/dynamic';
import Aivet from './Aivet';
import { PremiumProvider } from '@/lib/premium';
import { Expenses, Paywall } from './Premium';
import { FeedbackHost } from './feedback';
import { CalendarScreen, Dashboard, Onboarding, PetDetail, PetsList, Reminders, Settings, type Tab } from './screens';

const VetMap = dynamic(() => import('./VetMap'), { ssr: false, loading: () => <div className="h-[46dvh] rounded-[26px] bg-ink/5 animate-pulse mt-20" /> });
const EXTRA: Tab[] = ['map', 'ai', 'expenses'];

const TABS: { id: Tab; l: string; i: 'home' | 'paw' | 'bell' | 'heart' | 'cog' }[] = [
  { id: 'home', l: 'Přehled', i: 'home' }, { id: 'pets', l: 'Mazlíčci', i: 'paw' }, { id: 'reminders', l: 'Připomínky', i: 'bell' }, { id: 'calendar', l: 'Kalendář', i: 'heart' }, { id: 'settings', l: 'Nastavení', i: 'cog' },
];

function Shell() {
  const { data, ready } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [petId, setPetId] = useState<string | null>(null);
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
  useEffect(() => { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  const nav = (t: Tab, p: string | null = null) => {
    const h = `#${t}${p ? '/' + p : ''}`; if (location.hash !== h) { history.pushState(null, '', h); dispatchEvent(new HashChangeEvent('hashchange')); }
    setTab(t); setPetId(p); window.scrollTo({ top: 0 });
  };
  if (!ready) return <div className="min-h-[100dvh]" />;
  if (!data.settings.onboarded) return <Onboarding />;
  const overdue = data.reminders.filter((r) => status(r) === 'overdue').length;
  return (
    <div className="min-h-[100dvh]">
      <main className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+var(--badge,0px)+132px)]">
        <div key={tab + (petId ?? '')} className="animate-screen">
          {tab === 'home' && <Dashboard go={(t) => nav(t)} openPet={(id) => nav('pets', id)} />}
          {tab === 'map' && <VetMap initialNonstop={petId === 'nonstop'} />}
          {tab === 'ai' && <Aivet initialPet={petId ?? undefined} openMap={() => nav('map', 'nonstop')} />}
          {tab === 'pets' && (petId ? <PetDetail id={petId} back={() => history.length > 1 ? history.back() : nav('pets')} ask={() => nav('ai', petId)} /> : <PetsList openPet={(id) => nav('pets', id)} />)}
          {tab === 'reminders' && <Reminders />}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'settings' && <Settings />}
          {tab === 'expenses' && <Expenses />}
        </div>
      </main>
      <nav aria-label="Hlavní navigace" className="fixed inset-x-0 z-40 flex justify-center px-5 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px) + 12px)' }}>
        <div className="pointer-events-auto relative w-full max-w-[400px] grid grid-cols-5 p-1.5 rounded-[30px] bg-surface/70 dark:bg-[#2a201b]/70 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-ink/[0.06] dark:ring-white/10 shadow-float dark:shadow-float-d">
          <span aria-hidden className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[24px] bg-gradient-to-br from-[#FF9A5A] to-[#E8553A] shadow-[0_6px_16px_-4px_rgba(232,85,58,.55)] transition-[transform,opacity] duration-500 ease-spring"
            style={{ width: 'calc((100% - 12px) / 5)', transform: `translateX(${Math.max(0, TABS.findIndex((t) => t.id === tab)) * 100}%)`, opacity: TABS.some((t) => t.id === tab) ? 1 : 0 }} />
          {TABS.map((t) => {
            const a = tab === t.id;
            return (
              <button key={t.id} onClick={() => nav(t.id)} aria-current={a ? 'page' : undefined}
                className={`relative z-10 h-14 flex flex-col items-center justify-center gap-0.5 rounded-[24px] transition-colors duration-300 ${a ? 'text-white' : 'text-muted hover:text-ink dark:hover:text-white'}`}>
                <span className={`transition-transform duration-300 ease-spring ${a ? 'scale-110 -translate-y-px' : 'scale-100'}`}>{t.id === 'calendar' ? <CalIcon /> : <Icon name={t.i} fill={a && t.i !== 'cog'} className="w-6 h-6" />}</span>
                <span className="text-[12px] font-semibold leading-none tracking-tight">{t.l}</span>
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
  return <StoreProvider><PremiumProvider><Shell /><Paywall /><FeedbackHost /></PremiumProvider></StoreProvider>;
}
