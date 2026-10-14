'use client';
// In-app toasts (with 5 s undo) and confirm/notice dialogs – replaces browser confirm()/alert().
import { useEffect, useRef, useState } from 'react';

type Toast = { id: number; msg: string; undo?: () => void };
type Ask = { title: string; text?: string; ok?: string; cancel?: string | null; danger?: boolean; resolve: (v: boolean) => void };
const subs = new Set<(e: { toast?: Toast; ask?: Ask }) => void>();
let n = 0;
export function toast(msg: string, undo?: () => void) { subs.forEach((f) => f({ toast: { id: ++n, msg, undo } })); }
export function ask(o: Omit<Ask, 'resolve'>): Promise<boolean> {
  if (!subs.size) return Promise.resolve(typeof window !== 'undefined' && window.confirm(o.title));
  return new Promise((resolve) => subs.forEach((f) => f({ ask: { ...o, resolve } })));
}
export const notice = (title: string, text?: string) => ask({ title, text, ok: 'Rozumím', cancel: null }).then(() => undefined);

export function FeedbackHost() {
  const [t, setT] = useState<Toast | null>(null);
  const [a, setA] = useState<Ask | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const f = (e: { toast?: Toast; ask?: Ask }) => {
      if (e.toast) { clearTimeout(timer.current); setT(e.toast); timer.current = setTimeout(() => setT(null), e.toast.undo ? 5000 : 2600); }
      if (e.ask) setA(e.ask);
    };
    subs.add(f); return () => { subs.delete(f); };
  }, []);
  useEffect(() => { if (a) okRef.current?.focus(); }, [a]);
  const close = (v: boolean) => { a?.resolve(v); setA(null); };
  return (
    <>
      {t && (
        <div role="status" aria-live="polite" className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-[400px] flex items-center gap-3 rounded-2xl bg-[#2B201C] text-white px-4 py-2 shadow-float animate-up"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px) + var(--banner, 0px) + 96px)' }}>
          <span className="flex-1 text-[15px] py-2">{t.msg}</span>
          {t.undo && <button onClick={() => { t.undo?.(); setT(null); toast('Vráceno zpět'); }} className="press min-h-[44px] px-3 -mr-2 font-bold text-[#FFB48A]">Zpět</button>}
        </div>
      )}
      {a && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 bg-black/40 animate-fade" onClick={() => close(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && close(false)}
            className="w-full max-w-sm rounded-[28px] bg-surface dark:bg-surface-d p-5 shadow-float animate-up" style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + var(--badge, 0px))' }}>
            <p id="dlg-t" className="text-lg font-bold">{a.title}</p>
            {a.text && <p className="text-[15px] text-muted mt-1.5">{a.text}</p>}
            <div className="flex gap-2 mt-5">
              {a.cancel !== null && <button onClick={() => close(false)} className="press flex-1 min-h-[48px] rounded-2xl font-semibold bg-ink/5 dark:bg-white/10">{a.cancel ?? 'Zrušit'}</button>}
              <button ref={okRef} onClick={() => close(true)} className={`press flex-1 min-h-[48px] rounded-2xl font-bold text-white ${a.danger ? 'bg-red-600' : 'bg-gradient-to-br from-[#FF9A5A] to-[#E8553A]'}`}>{a.ok ?? 'OK'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
