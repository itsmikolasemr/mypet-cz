/**
 * Bridge to native home-screen widgets (v1.2 „Tlapka Den“).
 * Web: payload stays in localStorage['tlapka:widget'] (also read by tests / PWA).
 * Native: custom Capacitor plugin `TlapkaWidget` (ios/App/App/TlapkaWidgetPlugin.swift, android/.../TlapkaWidgetPlugin.java)
 *   setData({ json })  → App Group UserDefaults (group.cz.tlapka.app) / SharedPreferences "tlapka_widget" + reload timelines
 *   consumeTicks()     → { ticks: [{ id, at }] } queued by widget buttons (AppIntent / broadcast) while the app was closed
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppData } from './types';
import { weeklySummary } from './notify';
import { widgetToday } from './today';

interface WidgetPlugin { setData(o: { json: string }): Promise<void>; consumeTicks(): Promise<{ ticks: { id: string; at: string }[] }> }
const Native = registerPlugin<WidgetPlugin>('TlapkaWidget');
const native = () => Capacitor.isNativePlatform();

export function widgetPayload(data: AppData, now = new Date()) {
  return { ...weeklySummary(data), today: widgetToday(data, now) };
}
export async function pushWidget(data: AppData) {
  const json = JSON.stringify(widgetPayload(data));
  try { localStorage.setItem('tlapka:widget', json); } catch {}
  if (native()) await Native.setData({ json }).catch(() => {});
}
/** Ticks made on the widget while the app was closed. */
export async function pullWidgetTicks(): Promise<{ id: string; at: string }[]> {
  if (!native()) {
    try { const q = JSON.parse(localStorage.getItem('tlapka:widget:ticks') || '[]'); localStorage.removeItem('tlapka:widget:ticks'); return Array.isArray(q) ? q : []; } catch { return []; }
  }
  return (await Native.consumeTicks().catch(() => ({ ticks: [] }))).ticks ?? [];
}
