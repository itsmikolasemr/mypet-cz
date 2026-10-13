'use client';
import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from '@/lib/store';
import { status } from '@/lib/utils';
import { Icon } from './ui';
import { CalendarScreen, Dashboard, Onboarding, PetDetail, PetsList, Reminders, Settings, type Tab } from './screens';

const TABS: { id: Tab; l: string; i: 'home' | 'paw' | 'bell' | 'heart' | 'cog' }[] = [
  { id: 'home', l: 'Přehled', i: 'home' }, { id: 'pets', l: 'Mazlíčci', i: 'paw' }, { id: 'reminders', l: 'Připomínky', i: 'bell' }, { id: 'calendar', l: 'Kalendář', i: 'heart' }, { id: 'settings', l: 'Nastavení', i: 'cog' },
];

function Shell() {
  const { data, ready } = useStore();
  const [tab, setTab] = useState<Tab>('home');
  const [petId, setPetId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => { const [t, p] = location.hash.slice(1).split('/'); if (TABS.some((x) => x.id === t)) setTab(t as Tab); setPetId(t === 'pets' && p ? p : null); };
    read(); addEventListener('popstate', read); return () => removeEventListener('popstate', read);
  }, []);
  useEffect(() => { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {}); }, []);
  const nav = (t: Tab, p: string | null = null) => {
    const h = `#${t}${p ? '/' + p : ''}`; if (location.hash !== h) history.pushState(null, '', h);
    setTab(t); setPetId(p); window.scrollTo({ top: 0 });
  };
  if (!ready) return <div className="min-h-[100dvh]" />;
  if (!data.settings.onboarded) return <Onboarding />;
  const overdue = data.reminders.filter((r) => status(r) === 'overdue').length;
  return (
    <div className="min-h-[100dvh]">
      <main className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <div key={tab + (petId ?? '')} className="animate-screen">
          {tab === 'home' && <Dashboard go={(t) => nav(t)} openPet={(id) => nav('pets', id)} />}
          {tab === 'pets' && (petId ? <PetDetail id={petId} back={() => history.length > 1 ? history.back() : nav('pets')} /> : <PetsList openPet={(id) => nav('pets', id)} />)}
          {tab === 'reminders' && <Reminders />}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'settings' && <Settings />}
        </div>
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/85 dark:bg-surface-d/85 backdrop-blur-xl border-t border-ink/[0.06] dark:border-white/[0.07]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map((t) => {
            const a = tab === t.id;
            return (
              <button key={t.id} onClick={() => nav(t.id)} aria-current={a ? 'page' : undefined} className={`relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-semibold transition ${a ? 'text-primary' : 'text-muted'}`}>
                <span className={`transition-transform ${a ? 'scale-110' : ''}`}>{t.id === 'calendar' ? <CalIcon /> : <Icon name={t.i} fill={a && t.i !== 'cog'} className="w-6 h-6" />}</span>
                {t.l}
                {t.id === 'reminders' && overdue > 0 && <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{overdue}</span>}
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
  return <StoreProvider><Shell /></StoreProvider>;
}
