import { Capacitor } from '@capacitor/core';

/**
 * App Tracking Transparency (iOS 14.5+) – prepared, NOT active.
 * Ask only when real personalised ads (AdMob) are enabled; house promos need no ATT.
 * To enable: install a plugin (e.g. `capacitor-plugin-app-tracking-transparency`), keep
 * NSUserTrackingUsageDescription in ios/App/App/Info.plist and set NEXT_PUBLIC_ADS=admob.
 */
export type AttStatus = 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unavailable';
export const ATT_PRE_PROMPT = {
  title: 'Reklamy, které dávají smysl',
  body: 'Tlapka je zdarma díky reklamám. Když povolíš sledování, uvidíš reklamy na věci pro mazlíčky místo náhodných. Zdravotní údaje tvých zvířat nikdy reklamním partnerům neposíláme.',
};
export async function requestAtt(): Promise<AttStatus> {
  if (Capacitor.getPlatform() !== 'ios' || process.env.NEXT_PUBLIC_ADS !== 'admob') return 'unavailable';
  const P = (Capacitor as unknown as { Plugins: Record<string, { requestPermission?: () => Promise<{ status: AttStatus }> }> }).Plugins.AppTrackingTransparency;
  if (!P?.requestPermission) return 'unavailable';
  try { return (await P.requestPermission()).status; } catch { return 'unavailable'; }
}
