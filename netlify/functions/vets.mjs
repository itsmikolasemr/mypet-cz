// Cached proxy for Overpass (OSM) vet clinics. Coordinates are rounded so the CDN can cache per ~1 km area.
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CORS = { 'Access-Control-Allow-Origin': '*' };

export default async (req) => {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get('lat')), lon = Number(u.searchParams.get('lon'));
  const r = Math.min(50000, Math.max(1000, Number(u.searchParams.get('r')) || 12000));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return new Response('{"error":"bad_coords"}', { status: 400, headers: CORS });
  const q = `[out:json][timeout:20];nwr["amenity"="veterinary"](around:${r},${lat.toFixed(2)},${lon.toFixed(2)});out center tags;`;
  for (const m of MIRRORS) {
    try {
      const res = await fetch(m, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Tlapka/1.0 (https://mypet-cz.netlify.app)', Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
      if (!res.ok) { console.error('overpass', m, res.status); continue; }
      const text = await res.text();
      if (!text.startsWith('{')) continue;
      return new Response(text, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'Netlify-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', ...CORS } });
    } catch (e) { console.error('overpass', m, e?.message); }
  }
  return new Response('{"error":"unavailable"}', { status: 502, headers: CORS });
};

export const config = { path: '/api/vets' };
