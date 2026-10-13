'use client';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AppData } from './types';
import { parse, typeOf } from './utils';

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
  const now = Date.now();
  return data.reminders
    .filter((r) => !r.completedAt)
    .map((r) => {
      const at = parse(r.dueDate);
      at.setHours(data.settings.notifyHour, 0, 0, 0);
      if (at.getTime() < now) at.setTime(now + 60_000); // overdue → remind in 1 min once
      const pet = data.pets.find((p) => p.id === r.petId);
      return {
        id: nid(r.id + r.dueDate),
        at,
        title: `${typeOf(r.type).emoji} ${r.title}${pet ? ' – ' + pet.name : ''}`,
        body: r.product ? `Přípravek: ${r.product}` : 'Čas na péči o mazlíčka.',
      };
    })
    .filter((n) => n.at.getTime() - now < 60 * 86400000)
    .slice(0, 60);
}

export async function syncNotifications(data: AppData) {
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
