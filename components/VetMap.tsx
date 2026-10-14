'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Card, Icon, PageHeader, Sheet } from './ui';
import { API_BASE } from '@/lib/api';

type Vet = { id: string; lat: number; lon: number; name: string; tags: Record<string, string>; dist: number; nonstop: boolean; park?: boolean };
const BRNO = { lat: 49.1951, lon: 16.6068 };
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
const address = (t: Record<string, string>) =>
  [[t['addr:street'] ?? t['addr:place'], t['addr:housenumber'] ?? t['addr:conscriptionnumber']].filter(Boolean).join(' '), [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ')].filter(Boolean).join(', ');

type Raw = { elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
const toVet = (c: { lat: number; lon: number }, id: string, lat: number, lon: number, tags: Record<string, string>): Vet => ({ id, lat, lon, tags, name: tags.name ?? tags.operator ?? 'Veterinární ordinace', dist: km(c, { lat, lon }), nonstop: is247(tags) });

let bundledP: Promise<[number, number, Record<string, string>, string][]> | null = null;
/** Bundled snapshot of all Czech clinics (OSM + a few verified 24/7 corrections). Instant & offline. */
export async function bundledVets(c: { lat: number; lon: number }): Promise<Vet[]> {
  bundledP ??= fetch('/vets-cz.json').then((r) => r.json());
  const all = await bundledP;
  return all.map(([lat, lon, tags, id]) => toVet(c, id, lat, lon, tags)).sort((a, b) => a.dist - b.dist);
}

let parksP: Promise<[number, number, Record<string, string>, string][]> | null = null;
/** Bundled OSM leisure=dog_park snapshot for CZ (public/dogparks-cz.json). */
export async function bundledParks(c: { lat: number; lon: number }): Promise<Vet[]> {
  parksP ??= fetch('/dogparks-cz.json').then((r) => r.json());
  return (await parksP).map(([lat, lon, tags, id]) => ({ id, lat, lon, tags, name: tags.name ?? 'Psí výběh', dist: km(c, { lat, lon }), nonstop: false, park: true })).sort((a, b) => a.dist - b.dist);
}
const PARK_FACTS: [string, (v: string) => string][] = [['fence', (v) => (v === 'yes' ? 'Oplocený' : v === 'no' ? 'Neoplocený' : '')], ['barrier', (v) => (v === 'fence' ? 'Oplocený' : '')], ['lit', (v) => (v === 'yes' ? 'Osvětlený' : '')], ['surface', (v) => ({ grass: 'Tráva', dirt: 'Hlína', sand: 'Písek', gravel: 'Štěrk', woodchips: 'Štěpka' } as Record<string, string>)[v] ?? '']];
export const parkFacts = (t: Record<string, string>) => [...new Set(PARK_FACTS.map(([k, f]) => (t[k] ? f(t[k]) : '')).filter(Boolean))];

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
      return j.elements.flatMap((e) => { const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon; return lat == null || lon == null ? [] : [toVet(c, `${e.type}/${e.id}`, lat, lon, e.tags ?? {})]; });
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export default function VetMap({ initialNonstop = false }: { initialNonstop?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [locNote, setLocNote] = useState('');
  const [vets, setVets] = useState<Vet[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [nonstop, setNonstopRaw] = useState(initialNonstop);
  const [parksOn, setParksOn] = useState(false);
  const [parks, setParks] = useState<Vet[]>([]);
  const setNonstop = (v: boolean) => { setNonstopRaw(v); if (v) setParksOn(false); };
  const toggleParks = () => { setParksOn((x) => !x); setNonstopRaw(false); };
  const [sel, setSel] = useState<Vet | null>(null);
  const [stale, setStale] = useState(false);


  useEffect(() => {
    if (!navigator.geolocation) { setLocNote('Poloha není dostupná – zobrazuji Brno.'); setCenter(BRNO); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCenter({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => { setLocNote('Bez přístupu k poloze – zobrazuji Brno.'); setCenter(BRNO); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const [allNs, setAllNs] = useState<Vet[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const shown = useMemo(() => {
    if (parksOn) { const near = parks.filter((v) => v.dist <= 15); return near.length >= 3 ? near : parks.slice(0, 10); }
    if (!nonstop) return vets;
    const m = new Map([...allNs, ...vets.filter((v) => v.nonstop)].map((v) => [v.id, v]));
    return [...m.values()].sort((a, b) => a.dist - b.dist).slice(0, 15);
  }, [vets, nonstop, allNs, parksOn, parks]);
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
        L.control.zoom({ position: 'bottomright' }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
        setMapReady(true);
        L.marker([center.lat, center.lon], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18] }) }).addTo(map.current);
      }
    })();
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
        L.marker([v.lat, v.lon], { icon: L.divIcon({ className: '', html: v.park ? '<div class="park-pin"><span>🐕</span></div>' : `<div class="vet-pin ${v.nonstop ? 'ns' : ''}"><span>${v.nonstop ? '24' : '🩺'}</span></div>`, iconSize: [44, 44], iconAnchor: [22, 44] }) })
          .on('click', () => setSel(v)).addTo(layer.current!);
      });
      if ((nonstop || parksOn) && shown.length && map.current && center) {
        const pts = [[center.lat, center.lon] as [number, number], ...shown.slice(0, 3).map((v) => [v.lat, v.lon] as [number, number])];
        map.current.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [30, 90], paddingBottomRight: [30, 40], maxZoom: 14, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
      }
    })();
  }, [shown, nonstop, parksOn, center, mapReady]);

  const focus = (v: Vet) => { map.current?.setView([v.lat, v.lon], 16, { animate: true }); setSel(v); };
  const t = sel?.tags ?? {};
  return (
    <div>
      <PageHeader title={parksOn ? 'Výběhy pro psy' : nonstop ? 'Nonstop pohotovost' : 'Veteriny v okolí'} sub={locNote || 'Podle tvé polohy'} />
      <div className="relative rounded-[26px] overflow-hidden shadow-float dark:shadow-float-d ring-1 ring-ink/5 dark:ring-white/10">
        <div ref={el} className="h-[46dvh] w-full bg-ink/5" data-testid="map" />
        <div className="absolute inset-x-2 top-2 z-[500] grid grid-cols-2 gap-2">
          <button onClick={() => setNonstop(!nonstop)} aria-pressed={nonstop}
            className={`press rounded-full px-2 min-h-[44px] text-[13px] font-bold whitespace-nowrap backdrop-blur-xl shadow-card ring-1 transition ${nonstop ? 'bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-[#0F2540] ring-transparent' : 'bg-surface/85 dark:bg-surface-d/85 ring-ink/10 dark:ring-white/10'}`}>
            🚨 Nonstop
          </button>
          <button onClick={toggleParks} aria-pressed={parksOn} data-filter="parks"
            className={`press rounded-full px-2 min-h-[44px] text-[13px] font-bold whitespace-nowrap backdrop-blur-xl shadow-card ring-1 transition ${parksOn ? 'bg-[#2F7D4A] text-white ring-transparent' : 'bg-surface/85 dark:bg-surface-d/85 ring-ink/10 dark:ring-white/10'}`}>
            🐕 Výběhy pro psy
          </button>
        </div>
        {state === 'loading' && <div className="absolute inset-x-0 bottom-3 z-[500] mx-auto w-max rounded-full bg-surface/90 dark:bg-surface-d/90 backdrop-blur px-4 py-2 text-sm shadow-card animate-fade">Hledám veteriny…</div>}
      </div>
      <p className="text-[13px] text-muted mt-3 px-1 leading-snug">Klepni na značku nebo vyber místo ze seznamu. <b>V nouzi vždy nejdřív zavolej.</b></p>
      <details className="text-[12px] text-muted mt-1 px-1 leading-snug"><summary className="cursor-pointer min-h-[32px] flex items-center">Odkud jsou data?</summary>Z komunitní mapy <a className="underline" href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> (snímek říjen 2026), mohou být neúplná. „Nonstop“ ukazuje místa s otevírací dobou 24/7 včetně několika pražských klinik ověřených na jejich webu.</details>
      <div className="mt-4 space-y-3 stagger">
        {state === 'error' && (
          <Card className="p-4 text-center"><p className="font-semibold">Nepodařilo se načíst data</p><p className="text-sm text-muted mt-1">Mapová služba OpenStreetMap (Overpass) je teď přetížená. Zkus to za pár minut.</p><Button variant="soft" className="mt-3" onClick={() => center && load(center)}>Zkusit znovu</Button></Card>
        )}
        {stale && <p className="text-[12px] text-muted px-1">Ukazuji uložený seznam klinik, čerstvá data se načítají na pozadí.</p>}
        {state === 'ok' && !shown.length && (
          <Card className="p-4 text-center text-sm text-muted">{parksOn ? 'V okolí není v OSM žádný psí výběh.' : nonstop ? 'V okolí není v OSM žádná ordinace označená jako nonstop (24/7). Zkus vypnout filtr a obvolat nejbližší kliniky.' : 'V okolí jsme nic nenašli.'}</Card>
        )}
        {shown.slice(0, 30).map((v) => (
          <Card key={v.id} onClick={() => focus(v)} className="p-4 flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${v.park ? 'bg-[#2F7D4A]/12 dark:bg-[#5FBF7F]/15' : v.nonstop ? 'bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8] text-[#0F2540] font-bold text-sm' : 'bg-primary/10'}`}>{v.park ? '🐕' : v.nonstop ? '24/7' : '🩺'}</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{v.name}</p>
              <p className="text-[13px] text-muted truncate">{[v.dist < 1 ? `${Math.round(v.dist * 1000)} m` : `${v.dist.toFixed(1).replace('.', ',')} km`, v.park ? parkFacts(v.tags).join(', ') : address(v.tags)].filter(Boolean).join(' · ')}</p>
            </div>
            <Icon name="chev" className="w-4 h-4 text-muted" />
          </Card>
        ))}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="space-y-3">
            {sel.nonstop && <span className="inline-block rounded-full px-3 py-1 text-xs font-bold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]">{sel.tags['source:ns'] ? 'Nonstop 24/7 (ověřeno na webu kliniky)' : 'Nonstop 24/7 (dle OSM)'}</span>}
            <Card className="p-4 space-y-2.5 text-[15px]">
              {sel.park ? <p data-park-facts><span className="text-muted text-xs block">Výběh</span>{parkFacts(t).join(' · ') || 'Bez dalších údajů v OSM'}{t.description ? <span className="block text-sm text-muted mt-1">{t.description}</span> : null}</p> : <p><span className="text-muted text-xs block">Adresa</span>{address(t) || 'Neuvedena'}</p>}
              <p><span className="text-muted text-xs block">Otevírací doba</span>{t.opening_hours ? <code className="text-sm">{t.opening_hours}</code> : 'Neuvedena v OSM'}</p>
              {(t.phone || t['contact:phone']) && <p><span className="text-muted text-xs block">Telefon</span><a className="text-primary font-semibold" href={`tel:${(t.phone || t['contact:phone']).split(';')[0].replace(/\s/g, '')}`}>{t.phone || t['contact:phone']}</a></p>}
              {(t.website || t['contact:website']) && <p className="truncate"><span className="text-muted text-xs block">Web</span><a className="text-primary" target="_blank" rel="noreferrer" href={t.website || t['contact:website']}>{(t.website || t['contact:website']).replace(/^https?:\/\//, '')}</a></p>}
              <p className="text-muted text-sm">{sel.dist.toFixed(1).replace('.', ',')} km od {locNote ? 'centra Brna' : 'tebe'}</p>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <a className="press inline-flex items-center justify-center rounded-2xl px-4 py-3.5 font-semibold text-[#0F2540] bg-gradient-to-br from-[#A9CEF3] to-[#7FB3E8]" target="_blank" rel="noreferrer" href={`https://mapy.cz/fnc/v1/route?end=${sel.lon},${sel.lat}&routeType=${sel.park ? 'foot_fast' : 'car_fast'}`}>Navigovat (Mapy.cz)</a>
              <a className="press inline-flex items-center justify-center rounded-2xl px-4 py-3.5 font-semibold ring-1 ring-ink/10 dark:ring-white/15" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lon}`}>Google Maps</a>
            </div>
            {(t.phone || t['contact:phone']) && <a className="press flex items-center justify-center rounded-2xl px-4 py-3.5 font-semibold bg-primary/10 text-primary" href={`tel:${(t.phone || t['contact:phone']).split(';')[0].replace(/\s/g, '')}`}>📞 Zavolat</a>}
            <a className="block text-center text-xs text-muted underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/${sel.id}`}>Opravit údaje v OpenStreetMap</a>
          </div>
        )}
      </Sheet>
    </div>
  );
}
