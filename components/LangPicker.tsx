'use client';
import { useEffect, useState } from 'react';
import { deviceLang, setLang, storedLang, type Lang } from '@/lib/i18n';
import { Card } from './ui';

/** Settings › Vzhled › Jazyk. 'auto' follows the device language; choice is persisted in localStorage and reloads the app. */
export function LangPicker() {
  const [cur, setCur] = useState<Lang | 'auto'>('auto');
  const [dev, setDev] = useState<Lang>('cs');
  useEffect(() => { setCur(storedLang() ?? 'auto'); setDev(deviceLang()); }, []);
  const opts: [Lang | 'auto', string, string][] = [['auto', 'Podle zařízení', dev === 'cs' ? 'Čeština' : 'English'], ['cs', 'Čeština', 'CS'], ['en', 'English', 'EN']];
  return (
    <Card className="p-3 mt-3">
      <p id="jazyk-h" className="text-[13px] font-semibold px-1 mb-2">Jazyk</p>
      <div role="radiogroup" aria-labelledby="jazyk-h" className="grid grid-cols-3 gap-2">
        {opts.map(([v, l, s]) => {
          const on = cur === v;
          return (
            <button key={v} role="radio" aria-checked={on} onClick={() => { if (!on) { setCur(v); setLang(v); } }}
              className={`press min-h-[44px] rounded-2xl px-2 py-2 text-center ring-2 transition ${on ? 'ring-primary bg-primary/10' : 'ring-ink/10 dark:ring-white/10'}`}>
              <span className="block text-[13px] font-semibold" {...(v !== 'auto' ? { 'data-notr': '' } : {})}>{on && <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-[#3D7FC4] dark:bg-[#A9CEF3] mr-1 align-middle" />}{l}</span>
              <span className="block text-[11px] text-muted" data-notr>{s}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
