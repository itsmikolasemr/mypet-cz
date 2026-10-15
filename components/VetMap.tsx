'use client';
import { ParkCheckin } from './Growth';
import { useStore as useStoreG } from '@/lib/store';
import { Emo, GT } from './glyphs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Card, Icon, PageHeader, PawLoader, Sheet } from './ui';
import { API_BASE } from '@/lib/api';
import { useStore } from '@/lib/store';
import { getLang } from '@/lib/i18n';
import type { CardStore } from '@/lib/types';
import { isPromoted, promotedListings, type Listing } from '@/lib/revenue';
import { PromotedLabel } from './Revenue';

type Vet = { id: string; lat: number; lon: number; name: string; tags: Record<string, string>; dist: number; nonstop: boolean; park?: boolean; shop?: boolean; friendly?: boolean };
const SVG = {"shop": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 9.5 5 4.5h14l1.5 5M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0M5 11.5V20h14v-8.5M10 20v-5h4v5\"/></svg>", "park": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5 17 11h-2.5l3.5 5H6l3.5-5H7ZM12 16v4.5\"/></svg>", "vet": "<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 3.5H5v5a4 4 0 0 0 8 0v-5h-1M9 12.5v2a5 5 0 0 0 10 0M17 14.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z\"/></svg>"} as const;
const PRAHA = { lat: 50.0755, lon: 14.4378 };
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const km = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const is247 = (t: Record<string, string>) => {
  const oh = (t.opening_hours ?? '').replace(/\s+/g, ' ').trim();
  return /^24 ?\/ ?7$/.test(oh) || /^(Mo-Su )?00:00-(24:00|23:59)$/.test(oh);
};
/** Grooming salons are often mis-tagged as amenity=veterinary in OSM – keep them out of the vet list. */
export const isGroomer = (t: Record<string, string>) => /(salon|stříh|střih|grooming|groomer|kadeřn|psí kosmetik|trimování)/i.test(`${t.name ?? ''} ${t.description ?? ''} ${t.shop ?? ''}`) && !/(vet|klinik|ordinac|nemocnic|MVDr)/i.test(`${t.name ?? ''} ${t.operator ?? ''}`);
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
/** Simple OSM opening_hours evaluator (24/7, "Mo-Fr 08:00-18:00; Sa 09:00-12:00", "PH off" ignored). null = unknown. */
export function openNow(t: Record<string, string>, now = new Date()): boolean | null {
  if (is247(t)) return true;
  const oh = (t.opening_hours ?? '').trim(); if (!oh) return null;
  const d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes(); let known = false, open = false;
  for (const part of oh.split(';').map((x) => x.trim()).filter((x) => x && !/^PH/.test(x))) {
    const m = part.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s+(.+)$/);
    if (!m) return null;
    const hit = m[1].split(',').some((g) => { const [a, b] = g.split('-').map((x) => DAYS.indexOf(x)); return b == null ? a === d : a <= b ? d >= a && d <= b : d >= a || d <= b; });
    if (!hit) continue; known = true;
    if (/^off|closed$/.test(m[2])) { open = false; continue; }
    for (const rg of m[2].split(',')) { const q = rg.trim().match(/^(\d\d):(\d\d)-(\d\d):(\d\d)$/); if (!q) return null; const a = +q[1] * 60 + +q[2], b = +q[3] * 60 + +q[4]; if (mins >= a && mins < b) open = true; }
  }
  return known ? open : false;
}
/** Offline CZ city list for search without location (Nominatim fallback for anything else). */
export const CITIES: [string, number, number][] = [['Praha', 50.0755, 14.4378], ['Brno', 49.1951, 16.6068], ['Ostrava', 49.8209, 18.2625], ['Plzeň', 49.7384, 13.3736], ['Liberec', 50.7663, 15.0543], ['Olomouc', 49.5938, 17.2509], ['České Budějovice', 48.9745, 14.4743], ['Hradec Králové', 50.2104, 15.8252], ['Ústí nad Labem', 50.6611, 14.0531], ['Pardubice', 50.0343, 15.7812], ['Zlín', 49.2265, 17.6707], ['Havířov', 49.7798, 18.4369], ['Kladno', 50.1473, 14.1029], ['Most', 50.503, 13.6362], ['Opava', 49.9387, 17.9026], ['Frýdek-Místek', 49.6882, 18.3533], ['Jihlava', 49.3961, 15.5912], ['Karviná', 49.854, 18.5417], ['Teplice', 50.6404, 13.8245], ['Děčín', 50.7822, 14.2148], ['Karlovy Vary', 50.2319, 12.8713], ['Chomutov', 50.4605, 13.4178], ['Jablonec nad Nisou', 50.7243, 15.1711], ['Mladá Boleslav', 50.4113, 14.9032], ['Prostějov', 49.4719, 17.1118], ['Přerov', 49.4551, 17.4509], ['Česká Lípa', 50.6856, 14.5377], ['Třebíč', 49.2149, 15.8817], ['Třinec', 49.6776, 18.6708], ['Tábor', 49.4144, 14.6578], ['Znojmo', 48.8555, 16.0488], ['Kolín', 50.0281, 15.2006], ['Příbram', 49.6899, 14.0104], ['Cheb', 50.0796, 12.3739], ['Písek', 49.3088, 14.1475], ['Trutnov', 50.561, 15.9127], ['Kroměříž', 49.2979, 17.3931], ['Šumperk', 49.9653, 16.9706], ['Vsetín', 49.3388, 17.9962], ['Uherské Hradiště', 49.0698, 17.4597], ['Břeclav', 48.759, 16.882], ['Hodonín', 48.8489, 17.1324], ['Český Krumlov', 48.8127, 14.3175], ['Beroun', 49.9638, 14.072], ['Benešov', 49.7816, 14.687], ['Mělník', 50.3505, 14.4741], ['Litoměřice', 50.5335, 14.1318], ['Havlíčkův Brod', 49.6079, 15.5807], ['Vyškov', 49.2775, 16.999], ['Blansko', 49.3631, 16.6445]];
const fold = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export async function searchCity(q: string): Promise<{ name: string; lat: number; lon: number }[]> {
  const f = fold(q.trim()); if (f.length < 2) return [];
  const local = CITIES.filter(([n]) => fold(n).startsWith(f) || fold(n).includes(' ' + f)).slice(0, 6).map(([name, lat, lon]) => ({ name, lat, lon }));
  if (local.length) return local;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=${getLang()}&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(6000) });
    return ((await r.json()) as { display_name: string; lat: string; lon: string }[]).map((x) => ({ name: x.display_name.split(',').slice(0, 2).join(','), lat: +x.lat, lon: +x.lon }));
  } catch { return []; }
}
const address = (t: Record<string, string>) =>
  [[t['addr:street'] ?? t['addr:place'], t['addr:housenumber'] ?? t['addr:conscriptionnumber']].filter(Boolean).join(' '), [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ')].filter(Boolean).join(', ');

type Raw = { elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
const toVet = (c: { lat: number; lon: number }, id: string, lat: number, lon: number, tags: Record<string, string>): Vet => ({ id, lat, lon, tags, name: tags.name ?? tags.operator ?? 'Veterinární ordinace', dist: km(c, { lat, lon }), nonstop: is247(tags) });

let bundledP: Promise<[number, number, Record<string, string>, string][]> | null = null;
/** Bundled snapshot of all Czech clinics (OSM + a few verified 24/7 corrections). Instant & offline. */
export async function bundledVets(c: { lat: number; lon: number }): Promise<Vet[]> {
  bundledP ??= fetch('/vets-cz.json').then((r) => r.json());
  const all = await bundledP;
  return all.filter(([, , tags]) => !isGroomer(tags)).map(([lat, lon, tags, id]) => toVet(c, id, lat, lon, tags)).sort((a, b) => a.dist - b.dist);
}

let parksP: Promise<[number, number, Record<string, string>, string][]> | null = null;
/** Bundled OSM leisure=dog_park snapshot for CZ (public/dogparks-cz.json). */
export async function bundledParks(c: { lat: number; lon: number }): Promise<Vet[]> {
  parksP ??= fetch('/dogparks-cz.json').then((r) => r.json());
  return (await parksP).map(([lat, lon, tags, id]) => ({ id, lat, lon, tags, name: tags.name ?? 'Psí výběh', dist: km(c, { lat, lon }), nonstop: false, park: true })).sort((a, b) => a.dist - b.dist);
}
const PARK_FACTS: [string, (v: string) => string][] = [['fence', (v) => (v === 'yes' ? 'Oplocený' : v === 'no' ? 'Neoplocený' : '')], ['barrier', (v) => (v === 'fence' ? 'Oplocený' : '')], ['lit', (v) => (v === 'yes' ? 'Osvětlený' : '')], ['surface', (v) => ({ grass: 'Tráva', dirt: 'Hlína', sand: 'Písek', gravel: 'Štěrk', woodchips: 'Štěpka' } as Record<string, string>)[v] ?? '']];
let shopsP: Promise<[number, number, Record<string, string>, string][]> | null = null;
/** Bundled OSM shop=pet (+ chains Super zoo, Pet Center, Fressnapf/Maxi Zoo, Zoo Bonus) snapshot for CZ (public/petshops-cz.json). */
export async function bundledShops(c: { lat: number; lon: number }): Promise<Vet[]> {
  shopsP ??= fetch('/petshops-cz.json').then((r) => r.json());
  return (await shopsP).map(([lat, lon, tags, id]) => ({ id, lat, lon, tags, name: tags.name ?? 'Zverimex', dist: km(c, { lat, lon }), nonstop: false, shop: true })).sort((a, b) => a.dist - b.dist);
}
/** OSM opening_hours → čitelná čeština (Mo-Fr 09:00-18:00; Sa off → Po–Pá 9:00–18:00 / So zavřeno). */
export const czHours = (oh: string) => oh === '24/7' ? ['Nonstop 24/7'] : oh.split(';').map((x) => x.trim()).filter(Boolean).map((x) => x
  .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => ({ Mo: 'Po', Tu: 'Út', We: 'St', Th: 'Čt', Fr: 'Pá', Sa: 'So', Su: 'Ne', PH: 'svátky' } as Record<string, string>)[d])
  .replace(/(\p{L})-(\p{L})/gu, '$1–$2').replace(/\b0(\d):/g, '$1:').replace(/(\d)-(\d)/g, '$1–$2').replace(/\b(off|closed)\b/g, 'zavřeno').replace(/,/g, ', '));
export const CHAIN_NAME: Record<string, string> = { superzoo: 'Super zoo', petcenter: 'Pet Center', fressnapf: 'Fressnapf / Maxi Zoo', zoobonus: 'Zoo Bonus', hulin: 'Krmiva Hulín' };
export const parkFacts = (t: Record<string, string>) => [...new Set(PARK_FACTS.map(([k, f]) => (t[k] ? f(t[k]) : '')).filter(Boolean))];

/** Rough CZ bounding box – outside it the map switches to Cestovní režim (live OSM worldwide, no bundled CZ lists). */
export const inCZ = (c: { lat: number; lon: number }) => c.lat > 48.55 && c.lat < 51.06 && c.lon > 12.09 && c.lon < 18.86;
const FRIENDLY_KIND: Record<string, string> = { cafe: 'Kavárna', restaurant: 'Restaurace', bar: 'Bar', pub: 'Hospoda', biergarten: 'Zahrádka', fast_food: 'Bistro', hotel: 'Hotel', guest_house: 'Penzion', hostel: 'Hostel', apartment: 'Apartmán', motel: 'Motel', camp_site: 'Kemp' };
export const friendlyKind = (t: Record<string, string>) => FRIENDLY_KIND[t.amenity ?? t.tourism ?? ''] ?? 'Místo';
export const friendlyRule = (t: Record<string, string>) => (t['source:tlapka'] ? 'Ověřeno Tlapkou' : t.dog === 'leashed' ? 'Pes na vodítku' : t.dog === 'outside' ? 'Pes jen venku / na zahrádce' : 'Psi vítáni');
let curatedP: Promise<[number, number, Record<string, string>, string][]> | null = null;
/** Pet-friendly places: OSM dog=yes|leashed|outside on cafés, restaurants, pubs and accommodation + curated list (public/petfriendly-curated.json). */
async function liveFriendly(c: { lat: number; lon: number }, radius: number): Promise<Vet[]> {
  const q = `[out:json][timeout:25];(nwr["dog"~"^(yes|leashed|outside)$"]["amenity"~"^(cafe|restaurant|bar|pub|biergarten|fast_food)$"](around:${radius},${c.lat},${c.lon});nwr["dog"~"^(yes|leashed)$"]["tourism"~"^(hotel|guest_house|hostel|apartment|motel|camp_site)$"](around:${radius},${c.lat},${c.lon}););out center tags 200;`;
  curatedP ??= fetch('/petfriendly-curated.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const curated = (await curatedP).map(([lat, lon, tags, id]) => ({ id, lat, lon, tags: { ...tags, 'source:tlapka': '1' }, name: tags.name ?? 'Místo', dist: km(c, { lat, lon }), nonstop: false, friendly: true })).filter((v) => v.dist * 1000 <= radius);
  let live: Vet[] = [];
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = (await r.json()) as Raw;
      live = j.elements.flatMap((e) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon, tags = e.tags ?? {}; return lat == null || lon == null || !tags.name ? [] : [{ id: `${e.type}/${e.id}`, lat, lon, tags, name: tags.name, dist: km(c, { lat, lon }), nonstop: false, friendly: true }]; });
      break;
    } catch { /* next endpoint */ }
  }
  const ids = new Set(curated.map((v) => v.id));
  return [...curated, ...live.filter((v) => !ids.has(v.id))].sort((a, b) => a.dist - b.dist);
}

/** Live refresh: browser → Overpass (de, kumi), then optional /api/vets proxy. */
async function liveVets(c: { lat: number; lon: number }, radius: number): Promise<Vet[]> {
  const q = `[out:json][timeout:25];nwr["amenity"="veterinary"](around:${radius},${c.lat},${c.lon});out center tags;`;
  let lastErr: unknown;
  const sources: (() => Promise<Response>)[] = [
    ...ENDPOINTS.map((ep) => () => fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(12000) })),
    () => fetch(`${API_BASE}/api/vets?lat=${c.lat.toFixed(2)}&lon=${c.lon.toFixed(2)}&r=${radius}`, { signal: AbortSignal.timeout(10000) }),
  ];
  for (const src of sources) {
    try {
      const r = await src();
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = (await r.json()) as Raw;
      if (!Array.isArray(j.elements)) throw new Error('bad');
      return j.elements.flatMap((e) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; return lat == null || lon == null || isGroomer(e.tags ?? {}) ? [] : [toVet(c, `${e.type}/${e.id}`, lat, lon, e.tags ?? {})]; });
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export default function VetMap({ initialNonstop = false }: { initialNonstop?: boolean }) {
  const { patch: patchStore } = useStoreG();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [locNote, setLocNote] = useState('');
  const [promo, setPromo] = useState<Map<string, Listing>>(new Map());
  useEffect(() => { promotedListings().then(setPromo); }, []);
  const [vets, setVets] = useState<Vet[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [nonstop, setNonstopRaw] = useState(initialNonstop);
  const [parksOn, setParksOn] = useState(false);
  const [parks, setParks] = useState<Vet[]>([]);
  const [shopsOn, setShopsOn] = useState(false);
  const [friendlyOn, setFriendlyOn] = useState(false);
  const [friendly, setFriendly] = useState<Vet[] | null>(null);
  const [shops, setShops] = useState<Vet[]>([]);
  const { data } = useStore();
  const setNonstop = (v: boolean) => { setNonstopRaw(v); if (v) { setParksOn(false); setShopsOn(false); setFriendlyOn(false); } };
  const toggleParks = () => { setParksOn((x) => !x); setNonstopRaw(false); setShopsOn(false); setFriendlyOn(false); };
  const toggleShops = () => { setShopsOn((x) => !x); setNonstopRaw(false); setParksOn(false); setFriendlyOn(false); };
  const toggleFriendly = () => { setFriendlyOn((x) => !x); setNonstopRaw(false); setParksOn(false); setShopsOn(false); };
  const abroad = !!center && !inCZ(center);
  const [sel, setSel] = useState<Vet | null>(null);
  const [stale, setStale] = useState(false);


  useEffect(() => {
    if (!navigator.geolocation) { setLocNote('Poloha není dostupná – zobrazuji Prahu.'); setCenter(PRAHA); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = { lat: p.coords.latitude, lon: p.coords.longitude }; setCenter(c); if (!inCZ(c)) { const at = new Date().toISOString(); patchStore((d) => ({ ...d, flags: { ...(d.flags ?? {}), ...Object.fromEntries(d.pets.filter((x) => !x.memorial).map((x) => [`abroad:${x.id}`, d.flags?.[`abroad:${x.id}`] ?? at])) } })); } },
      () => { setLocNote('Bez přístupu k poloze – zobrazuji Prahu.'); setCenter(PRAHA); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const [allNs, setAllNs] = useState<Vet[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const shown = useMemo(() => {
    if (friendlyOn) return (friendly ?? []).slice(0, 40);
    if (shopsOn) { const near = shops.filter((v) => v.dist <= 10); return near.length >= 3 ? near : shops.slice(0, 10); }
    if (parksOn) { const near = parks.filter((v) => v.dist <= 15); return near.length >= 3 ? near : parks.slice(0, 10); }
    if (!nonstop) return vets;
    const m = new Map([...allNs, ...vets.filter((v) => v.nonstop)].map((v) => [v.id, v]));
    return [...m.values()].sort((a, b) => a.dist - b.dist).slice(0, 15);
  }, [vets, nonstop, allNs, parksOn, parks, shopsOn, shops, friendlyOn, friendly]);
  useEffect(() => {
    if (!friendlyOn || !center || friendly != null) return;
    let off = false;
    (async () => { let x = await liveFriendly(center, 3000).catch(() => [] as Vet[]); if (x.length < 3) x = await liveFriendly(center, 8000).catch(() => x); if (!off) setFriendly(x); })();
    return () => { off = true; };
  }, [friendlyOn, center, friendly]);
  useEffect(() => { if (shopsOn && center && !shops.length) bundledShops(center).then(setShops).catch(() => {}); }, [shopsOn, center, shops.length]);
  useEffect(() => { if (parksOn && center && !parks.length) bundledParks(center).then(setParks).catch(() => {}); }, [parksOn, center, parks.length]);
  const load = useCallback(async (c: { lat: number; lon: number }) => {
    setState('loading');
    let base: Vet[] = [];
    try {
      const all = await bundledVets(c);
      setAllNs(all.filter((v) => v.nonstop));
      base = all.filter((v) => v.dist <= 12);
      if (base.length < 5) base = all.filter((v) => v.dist <= 35);
      if (base.length) { setVets(base); setState('ok'); setStale(true); }
    } catch {}
    try {
      const live = await liveVets(c, base.length >= 5 && base[base.length - 1].dist > 12 ? 35000 : 12000);
      const curated = new Map(base.filter((v) => v.tags['source:ns']).map((v) => [v.id, v]));
      const merged = [...live.map((v) => curated.get(v.id) ?? v), ...[...curated.values()].filter((v) => !live.some((l) => l.id === v.id))].sort((a, b) => a.dist - b.dist);
      if (merged.length) { setVets(merged); setState('ok'); setStale(false); }
    } catch { if (!base.length) setState('error'); }
  }, []);

  useEffect(() => {
    if (!center || !el.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lon], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map.current);
        L.control.zoom({ position: 'bottomright', zoomInTitle: getLang() === 'en' ? 'Zoom in' : 'Přiblížit', zoomOutTitle: getLang() === 'en' ? 'Zoom out' : 'Oddálit' }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
        setMapReady(true);
        L.marker([center.lat, center.lon], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18] }) }).addTo(map.current);
      }
    })();
    if (map.current) map.current.setView([center.lat, center.lon], 13);
    setShops([]); setParks([]); setFriendly(null);
    load(center);
    return () => { cancelled = true; };
  }, [center, load]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  useEffect(() => {
    (async () => {
      if (!layer.current) return;
      const L = (await import('leaflet')).default;
      layer.current.clearLayers();
      shown.forEach((v) => {
        L.marker([v.lat, v.lon], { icon: L.divIcon({ className: '', html: v.friendly ? `<div class="friendly-pin">${SVG.shop}</div>` : v.shop ? `<div class="shop-pin${v.tags.chain ? ' chain' : ''}">${SVG.shop}</div>` : v.park ? `<div class="park-pin">${SVG.park}</div>` : `<div class="vet-pin ${v.nonstop ? 'ns' : ''}">${v.nonstop ? '<span>24</span>' : SVG.vet}</div>`, iconSize: [44, 44], iconAnchor: [22, 44] }) })
          .on('click', () => setSel(v)).addTo(layer.current!);
      });
      if ((nonstop || parksOn || shopsOn || friendlyOn) && shown.length && map.current && center) {
        const pts = [[center.lat, center.lon] as [number, number], ...shown.slice(0, 3).map((v) => [v.lat, v.lon] as [number, number])];
        map.current.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [30, 90], paddingBottomRight: [30, 40], maxZoom: 14, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
      }
    })();
  }, [shown, nonstop, parksOn, shopsOn, friendlyOn, center, mapReady]);

  const focus = (v: Vet) => { map.current?.setView([v.lat, v.lon], 16, { animate: true }); setSel(v); };
  const t = sel?.tags ?? {};
  return (
    <div>
      <PageHeader title={friendlyOn ? 'Se psem vítán' : shopsOn ? 'Zverimexy v okolí' : parksOn ? 'Výběhy pro psy' : nonstop ? 'Nonstop pohotovost' : 'Veteriny v okolí'} sub={locNote || 'Podle tvé polohy'} />
      {abroad && <p data-travel className="mb-3 rounded-2xl px-4 py-3 text-[13px] bg-primary/10 ring-1 ring-primary/30"><b>Cestovní režim</b> · jsi mimo Česko – veteriny a nonstop hledám živě v OpenStreetMap kolem tebe. Mezinárodní tísňová linka 112.</p>}
      <CitySearch onPick={(c) => { setLocNote(`Zobrazuji ${c.name}`); setSel(null); setCenter({ lat: c.lat, lon: c.lon }); }} />
      <div className="relative rounded-[26px] overflow-hidden shadow-float dark:shadow-float-d ring-1 ring-ink/5 dark:ring-white/10">
        <div ref={el} className="h-[46dvh] w-full bg-ink/5" data-testid="map" />
        <div className="absolute inset-x-2 top-2 z-[500] flex gap-1.5 overflow-x-auto no-scrollbar" role="toolbar" aria-label="Filtry mapy">
          <button onClick={() => setNonstop(!nonstop)} aria-pressed={nonstop}
            className={`press shrink-0 rounded-full px-3 min-h-[44px] text-[12.5px] font-bold whitespace-nowrap backdrop-blur-xl shadow-card ring-1 transition ${nonstop ? 'bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-[#0F2540] ring-transparent' : 'bg-surface/85 dark:bg-surface-d/85 ring-ink/10 dark:ring-white/10'}`}>
            <GT t="🚨 Nonstop" /></button>
          <button onClick={toggleParks} aria-pressed={parksOn} data-filter="parks"
            className={`press shrink-0 rounded-full px-3 min-h-[44px] text-[12.5px] font-bold whitespace-nowrap backdrop-blur-xl shadow-card ring-1 transition ${parksOn ? 'bg-[#2F7D4A] text-white ring-transparent' : 'bg-surface/85 dark:bg-surface-d/85 ring-ink/10 dark:ring-white/10'}`}>
            <GT t="🌳 Výběhy" /></button>
          <button onClick={toggleShops} aria-pressed={shopsOn} data-filter="shops"
            className={`press shrink-0 rounded-full px-3 min-h-[44px] text-[12.5px] font-bold whitespace-nowrap backdrop-blur-xl shadow-card ring-1 transition ${shopsOn ? 'bg-[#3A3D43] text-white ring-transparent' : 'bg-surface/85 dark:bg-surface-d/85 ring-ink/10 dark:ring-white/10'}`}>
            <GT t="🛍️ Zverimexy" /></button>
          <button onClick={toggleFriendly} aria-pressed={friendlyOn} data-filter="friendly"
            className={`press shrink-0 rounded-full px-3 min-h-[44px] text-[12.5px] font-bold whitespace-nowrap backdrop-blur-xl shadow-card ring-1 transition ${friendlyOn ? 'bg-[#7FB3E8] text-[#0F2540] ring-transparent' : 'bg-surface/85 dark:bg-surface-d/85 ring-ink/10 dark:ring-white/10'}`}>
            <GT t="☕ Se psem" /></button>
        </div>
        {state === 'loading' && <div className="absolute inset-x-0 bottom-3 z-[500] mx-auto w-max rounded-full bg-surface/90 dark:bg-surface-d/90 backdrop-blur px-4 py-2 text-sm shadow-card animate-fade"><PawLoader label="Hledám veteriny…" className="w-5 h-5" /></div>}
      </div>
      <p className="text-[13px] text-muted mt-3 px-1 leading-snug">Klepni na značku nebo vyber místo ze seznamu. <b>V nouzi vždy nejdřív zavolej.</b></p>
      <details className="text-[12px] text-muted mt-1 px-1 leading-snug"><summary className="cursor-pointer min-h-[44px] flex items-center gap-1.5 text-[13px] font-semibold text-primary-d dark:text-primary underline underline-offset-4 decoration-1"><Icon name="chev" className="w-4 h-4 shrink-0 rotate-90" />Odkud jsou data?</summary>Z komunitní mapy <a className="underline" href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> (snímek říjen 2026), mohou být neúplná. „Nonstop“ ukazuje místa s otevírací dobou 24/7 včetně několika pražských klinik ověřených na jejich webu. Zverimexy (624) a výběhy (402) jsou uložené v appce, fungují i offline.</details>
      <div className="mt-4 space-y-3 stagger">
        {state === 'error' && (
          <Card className="p-4 text-center"><p className="font-semibold">Nepodařilo se načíst data</p><p className="text-sm text-muted mt-1">Mapová služba OpenStreetMap (Overpass) je teď přetížená. Zkus to za pár minut.</p><Button variant="soft" className="mt-3" onClick={() => center && load(center)}>Zkusit znovu</Button></Card>
        )}
        {stale && <p className="text-[12px] text-muted px-1">Ukazuji uložený seznam klinik, čerstvá data se načítají na pozadí.</p>}
        {friendlyOn && friendly == null && <p className="text-[13px] text-muted px-1"><PawLoader label="Hledám kavárny a ubytování se psem…" className="w-5 h-5" /></p>}
        {state === 'ok' && !shown.length && !(friendlyOn && friendly == null) && (
          <Card className="p-4 text-center text-sm text-muted">{friendlyOn ? 'V okolí zatím nikdo v OSM neoznačil podnik jako dog-friendly. Znáš nějaký? Přidej mu v OpenStreetMap značku dog=yes.' : shopsOn ? 'V okolí není v OSM žádný zverimex.' : parksOn ? 'V okolí není v OSM žádný psí výběh.' : nonstop ? 'V okolí není v OSM žádná ordinace označená jako nonstop (24/7). Zkus vypnout filtr a obvolat nejbližší kliniky.' : 'V okolí jsme nic nenašli.'}</Card>
        )}
        {shown.slice(0, 30).map((v) => (
          <Card key={v.id} onClick={() => focus(v)} className="p-4 flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${v.shop ? 'bg-[#3A3D43]/12 dark:bg-[#C9D2DE]/15' : v.park ? 'bg-[#2F7D4A]/12 dark:bg-[#5FBF7F]/15' : v.nonstop ? 'bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-[#0F2540] font-bold text-sm' : 'bg-primary/10'}`}>{v.shop ? <Emo e="🛍️" className="w-6 h-6" /> : v.park ? <Emo e="🌳" className="w-6 h-6" /> : v.nonstop ? '24/7' : <Emo e="🩺" className="w-6 h-6" />}</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold flex items-center gap-1.5"><span className="line-clamp-2 break-words">{v.name}</span>{!v.park && !v.friendly && isPromoted(promo.get(v.id)) && <PromotedLabel />}</p>
              {!v.park && (() => { const o = openNow(v.tags); return o == null ? null : <p data-open={o ? 'yes' : 'no'} className={`text-[12px] font-bold ${o ? 'text-[#1F7A43] dark:text-[#6FD39A]' : 'text-muted'}`}>{o ? (v.nonstop ? 'Otevřeno teď · nonstop' : 'Otevřeno teď') : 'Teď zavřeno'}</p>; })()}
              <p className="text-[13px] text-muted line-clamp-2">{[v.dist < 1 ? `${Math.round(v.dist * 1000)} m` : `${v.dist.toFixed(1).replace('.', ',')} km`, v.friendly ? `${friendlyKind(v.tags)} · ${friendlyRule(v.tags)}` : v.park ? parkFacts(v.tags).join(', ') : address(v.tags), v.shop && data.cards.some((c) => c.store === v.tags.chain) ? '💳 máš kartu' : ''].filter(Boolean).join(' · ')}</p>
            </div>
            {(() => { const ph = (v.tags.phone || v.tags['contact:phone'] || '').split(';')[0].replace(/\s+/g, ''); return ph && !v.park ? <a href={`tel:${ph}`} data-call onClick={(e) => e.stopPropagation()} aria-label={`Zavolat ${v.name}`} className="press shrink-0 min-h-[44px] px-3.5 rounded-full flex items-center gap-1.5 text-[13px] font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]"><Icon name="phone" className="w-4 h-4" />Zavolat</a> : <Icon name="chev" className="w-4 h-4 text-muted" />; })()}
          </Card>
        ))}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="space-y-3">
            {sel.shop && (() => { const card = data.cards.find((c) => c.store === (sel.tags.chain as CardStore)); return (<>
              {sel.tags.chain && <span className="inline-block rounded-full px-3 py-1 text-xs font-bold bg-[#3A3D43]/12 text-[#6B3A0E] dark:text-[#F0B880]">Řetězec {CHAIN_NAME[sel.tags.chain] ?? sel.tags.chain}</span>}
              {card && <Card className="p-4 flex items-center gap-3">
                <span className="text-2xl" data-shop-card><Emo e="💳" className="w-6 h-6" /></span><span className="flex-1"><b className="block">Máš tu věrnostní kartu</b><span className="text-sm text-muted">{card.name} – ukaž ji u pokladny</span></span>
                <button className="press rounded-2xl px-3.5 min-h-[44px] font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]" onClick={() => { sessionStorage.setItem('tlapka:openCard', card.id); history.pushState(null, '', '#cards'); dispatchEvent(new PopStateEvent('popstate')); }} data-open-card>Ukázat</button>
              </Card>}
            </>); })()}
            {sel.friendly && <span data-friendly-rule className="inline-block rounded-full px-3 py-1 text-xs font-bold bg-primary/15 text-[#245B92] dark:text-[#A9CEF3]">{friendlyKind(sel.tags)} · {friendlyRule(sel.tags)}</span>}
            {sel.nonstop && <span className="inline-block rounded-full px-3 py-1 text-xs font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">{sel.tags['source:ns'] ? 'Nonstop 24/7 (ověřeno na webu kliniky)' : 'Nonstop 24/7 (dle OSM)'}</span>}
            <Card className="p-4 space-y-2.5 text-[14px]">
              {sel.park ? <p data-park-facts><span className="text-muted text-xs block">Výběh</span>{parkFacts(t).join(' · ') || 'Bez dalších údajů v OSM'}{t.description ? <span className="block text-sm text-muted mt-1">{t.description}</span> : null}</p> : <p><span className="text-muted text-xs block">Adresa</span>{address(t) || 'Neuvedena'}</p>}
              {sel.park && <ParkCheckin park={sel} />}
              <p><span className="text-muted text-xs block">Otevírací doba</span>{t.opening_hours ? czHours(t.opening_hours).map((l, i) => <span key={i} className="block">{l}</span>) : 'Neuvedena v OSM'}</p>
              {(t.phone || t['contact:phone']) && <p><span className="text-muted text-xs block">Telefon</span><a className="text-primary font-semibold" href={`tel:${(t.phone || t['contact:phone']).split(';')[0].replace(/\s/g, '')}`}>{t.phone || t['contact:phone']}</a></p>}
              {(t.website || t['contact:website']) && <p className="truncate"><span className="text-muted text-xs block">Web</span><a className="text-primary" target="_blank" rel="noreferrer" href={t.website || t['contact:website']}>{(t.website || t['contact:website']).replace(/^https?:\/\//, '')}</a></p>}
              <p className="text-muted text-sm">{sel.dist.toFixed(1).replace('.', ',')} km od {locNote ? `středu mapy (${/Prah/.test(locNote) ? 'Praha' : locNote.replace(/^Zobrazuji /, '')})` : 'tebe'}</p>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <a className="press inline-flex items-center justify-center rounded-2xl px-4 py-3.5 font-semibold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]" target="_blank" rel="noreferrer" href={`https://mapy.cz/fnc/v1/route?end=${sel.lon},${sel.lat}&routeType=${sel.park ? 'foot_fast' : 'car_fast'}`}>Navigovat (Mapy.cz)</a>
              <a className="press inline-flex items-center justify-center rounded-2xl px-4 py-3.5 font-semibold ring-1 ring-ink/10 dark:ring-white/15" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lon}`}>Google Maps</a>
            </div>
            {(t.phone || t['contact:phone']) && <a className="press flex items-center justify-center rounded-2xl px-4 py-3.5 font-semibold bg-primary/10 text-primary" href={`tel:${(t.phone || t['contact:phone']).split(';')[0].replace(/\s/g, '')}`}><GT t="📞 Zavolat" /></a>}
            <a className="block text-center text-xs text-muted underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/${sel.id}`}>Opravit údaje v OpenStreetMap</a>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function CitySearch({ onPick }: { onPick: (c: { name: string; lat: number; lon: number }) => void }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<{ name: string; lat: number; lon: number }[]>([]);
  useEffect(() => { const h = setTimeout(() => { searchCity(q).then(setRes); }, 250); return () => clearTimeout(h); }, [q]);
  return (
    <div className="relative mb-3" data-city-search>
      <label htmlFor="city-q" className="sr-only">Hledat město</label>
      <input id="city-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat město, např. Olomouc" autoComplete="off" enterKeyHint="search"
        className="w-full rounded-full px-4 min-h-[46px] text-[14px] bg-surface dark:bg-surface-d shadow-card dark:shadow-card-d ring-1 ring-ink/5 dark:ring-white/10 outline-none focus:ring-2 focus:ring-primary" />
      {res.length > 0 && q && (
        <ul role="listbox" aria-label="Nalezená místa" className="absolute z-[600] inset-x-0 top-[52px] rounded-2xl bg-surface dark:bg-surface-d shadow-float dark:shadow-float-d ring-1 ring-ink/10 dark:ring-white/10 overflow-hidden">
          {res.map((c) => <li key={c.name + c.lat}><button role="option" aria-selected={false} onClick={() => { onPick(c); setQ(''); setRes([]); }} className="press w-full text-left px-4 min-h-[44px] text-[14px] border-b last:border-0 border-ink/5 dark:border-white/5">{c.name}</button></li>)}
        </ul>
      )}
    </div>
  );
}
