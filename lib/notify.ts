'use client';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AppData } from './types';
import { parse } from './utils';

const native = () => Capacitor.isNativePlatform();
let webTimers: number[] = [];

export async function requestPermission(): Promise<boolean> {
  if (native()) {
    const p = await LocalNotifications.requestPermissions();
    return p.display === 'granted';
  }
  if (typeof Notification === 'undefined') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notifySupported() {
  return native() || typeof Notification !== 'undefined';
}

// Stable 31-bit int id from string (native requires numeric ids)
const nid = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647;
};

function plan(data: AppData) {
  const now = Date.now(); const H = data.settings.notifyHour;
  const out: { id: number; at: Date; title: string; body: string }[] = [];
  for (const r of data.reminders.filter((x) => !x.completedAt)) {
    const pet = data.pets.find((p) => p.id === r.petId);
    const at = parse(r.dueDate); at.setHours(H, 0, 0, 0);
    const due = at.getTime() < now;
    if (due) at.setTime(now + 60_000); // overdue → remind in 1 min once
    out.push({ id: nid(r.id + r.dueDate), at, title: `${r.title}${pet ? ' – ' + pet.name : ''}${due ? ' (po termínu)' : ''}`, body: r.product ? `Dnes: ${r.product}` : 'Dnes je čas na péči.' });
    if (data.settings.dayBefore !== false && !due) {
      const pre = new Date(at); pre.setDate(pre.getDate() - 1);
      if (pre.getTime() > now) out.push({ id: nid('pre' + r.id + r.dueDate), at: pre, title: `Zítra: ${r.title}${pet ? ' – ' + pet.name : ''}`, body: r.product ? `Připrav si ${r.product}.` : 'Ať tě to zítra nepřekvapí.' });
    }
  }
  if (data.settings.weekly !== false) {
    const s = weeklySummary(data); const at = new Date(); at.setDate(at.getDate() + ((7 - at.getDay()) % 7)); at.setHours(18, 0, 0, 0);
    if (at.getTime() <= now) at.setDate(at.getDate() + 7);
    out.push({ id: nid('weekly' + at.toDateString()), at, title: 'Tlapka: tvůj týden', body: s.line });
  }
  return out.filter((n) => n.at.getTime() - now < 60 * 86400000).sort((x, y) => x.at.getTime() - y.at.getTime()).slice(0, 60);
}

/** Widget-ready weekly summary (also written to localStorage 'tlapka:widget' for a native home-screen widget). */
export function weeklySummary(data: AppData) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0); const t7 = t0.getTime() + 7 * 86400000;
  const active = data.reminders.filter((r) => !r.completedAt);
  const week = active.filter((r) => { const d = parse(r.dueDate).getTime(); return d >= t0.getTime() && d < t7; }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = active.filter((r) => parse(r.dueDate).getTime() < t0.getTime());
  const done7 = data.reminders.reduce((n, r) => n + (r.history ?? []).filter((h) => Date.now() - parse(String(h).slice(0, 10)).getTime() < 7 * 86400000).length, 0);
  const items = week.slice(0, 5).map((r) => ({ title: r.title, pet: data.pets.find((p) => p.id === r.petId)?.name ?? '', date: r.dueDate }));
  const line = week.length || overdue.length ? `${week.length ? `Tento týden ${week.length}× péče` : 'Tento týden nic nového'}${overdue.length ? `, ${overdue.length} po termínu` : ''}.${items[0] ? ` Nejbližší: ${items[0].title}${items[0].pet ? ' (' + items[0].pet + ')' : ''}.` : ''}` : 'Tento týden máš klid – všechno je hotové. 🐾';
  return { week: week.length, overdue: overdue.length, done7, items, line, updated: new Date().toISOString() };
}

export async function syncNotifications(data: AppData) {
  try { localStorage.setItem('tlapka:widget', JSON.stringify(weeklySummary(data))); } catch {}
  webTimers.forEach((t) => clearTimeout(t));
  webTimers = [];
  if (native()) {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!data.settings.notify) return;
    const items = plan(data);
    if (items.length)
      await LocalNotifications.schedule({
        notifications: items.map((n) => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true } })),
      });
    return;
  }
  // Web fallback: Notification API while the app is open (browsers can't schedule offline).
  if (!data.settings.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  for (const n of plan(data)) {
    const ms = n.at.getTime() - Date.now();
    if (ms < 2_147_000_000) webTimers.push(window.setTimeout(() => showNow(n.title, n.body), Math.max(0, ms)));
  }
}

export async function showNow(title: string, body: string) {
  if (native()) {
    await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Math.random() * 1e9), title, body, schedule: { at: new Date(Date.now() + 1500) } }] });
    return;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: '/icons/icon-192.png' });
  } catch {}
  new Notification(title, { body, icon: '/icons/icon-192.png' });
}
