// Premium AI tools: "Druhý názor" (explain a vet report from text/photo) and AI scan (invoice / pet passport / medicine box -> structured JSON).
// Same key/model env as Aivet. Premium enforced here (signed entitlement); never trust the client.
import { verify, env } from './_entitlement.mjs';

const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const MODELS = () => [env('AIVET_MODEL') || 'gemini-flash-latest', ...(env('AIVET_FALLBACK_MODELS') || 'gemini-flash-lite-latest').split(',').map((x) => x.trim()).filter(Boolean)];
const ORIGINS = () => (env('AIVET_ALLOWED_ORIGINS') || 'https://mypet-cz.netlify.app,capacitor://localhost,https://localhost,http://localhost,ionic://localhost').split(',').map((x) => x.trim());
const originOk = (req) => { const o = req.headers.get('origin'); if (!o) return req.headers.get('sec-fetch-site') === 'same-origin'; return ORIGINS().includes(o) || /^https:\/\/[a-z0-9-]+--mypet-cz\.netlify\.app$/.test(o) || /^http:\/\/localhost:\d+$/.test(o); };
const cors = (req) => ({ Vary: 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Tlapka-Device, X-Tlapka-Entitlement', ...(originOk(req) && req.headers.get('origin') ? { 'Access-Control-Allow-Origin': req.headers.get('origin') } : {}) });
const json = (req, b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } });
const clip = (s, n) => String(s ?? '').slice(0, n);
const hits = new Map(); // per-device soft limit per warm instance
const limited = (id) => { const now = Date.now(); const h = (hits.get(id) || []).filter((t) => now - t < 3600e3); if (h.length >= 60) return true; h.push(now); hits.set(id, h); return false; };

const SECOND = `Jsi Aivet z aplikace Tlapka. Majitel ti posílá zprávu nebo výsledky od veterináře (text nebo fotka).
Úkol – „Druhý názor“: česky, tykej, lidsky a klidně:
1) **Co ve zprávě stojí** – vysvětli odborné termíny a hodnoty jednoduše (u laboratorních hodnot řekni, co je mimo normu a co to obvykle znamená).
2) **Na co se zeptat veterináře** – 3–6 konkrétních otázek.
3) **Na co si dát pozor doma** – varovné příznaky, kdy hned na pohotovost.
Nezpochybňuj veterináře a nestanovuj novou diagnózu ani dávkování. Když je text nečitelný nebo neúplný, řekni co chybí. Max ~300 slov. Na konci: rada nenahrazuje vyšetření.`;

const SCAN = `Extrahuj data z fotky dokladu pro aplikaci péče o zvíře (Česko). Vrať POUZE JSON:
{"kind":"faktura|ockovaci_prukaz|krabicka_leku|zprava|jine","date":"YYYY-MM-DD|null","clinic":"string|null","reason":"stručný důvod návštěvy|null",
 "cost":number|null (celkem Kč),"items":[{"name":"string","price":number|null}],
 "vaccinations":[{"name":"string","date":"YYYY-MM-DD|null","validUntil":"YYYY-MM-DD|null"}],
 "product":"název přípravku|null","reminderType":"ockovani|odcerveni|antiparazitika|leky|veterina|null","intervalDays":number|null,
 "dose":"string|null","notes":"string|null","confidence":0..1}
intervalDays odvoď z přípravku (např. Bravecto 84, NexGard 30, Milbemax 90, vzteklina dle průkazu typicky 365–1095), když nevíš, null. Nic si nevymýšlej.`;

async function callModel(messages, wantJson) {
  const key = env('AIVET_API_KEY'); if (!key) return { error: 'not_configured', status: 503 };
  const base = (env('AIVET_BASE_URL') || DEFAULT_BASE).replace(/\/+$/, '') + '/';
  const t0 = Date.now(); let last = 0;
  for (const model of MODELS()) {
    if (Date.now() - t0 > 20000) break;
    try {
      const r = await fetch(base + 'chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_tokens: 2000, ...(wantJson ? { response_format: { type: 'json_object' } } : {}), ...(base.includes('generativelanguage') ? { reasoning_effort: 'low' } : {}) }),
        signal: AbortSignal.timeout(Math.max(4000, 24000 - (Date.now() - t0))) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { last = r.status; if ([429, 500, 503, 404].includes(r.status)) continue; return { error: 'upstream', status: 502 }; }
      const text = String(d?.choices?.[0]?.message?.content ?? '').trim(); if (text) return { text };
    } catch { last = 504; }
  }
  return { error: last === 429 ? 'rate_limited' : 'upstream', status: 502 };
}
const img = (s) => (typeof s === 'string' && /^data:image\/(png|jpe?g|webp|heic);base64,/.test(s) && s.length < 6_000_000 ? s : null);

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: originOk(req) ? 204 : 403, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
  if (!originOk(req)) return json(req, { error: 'forbidden_origin' }, 403);
  const dev = clip(req.headers.get('x-tlapka-device'), 64);
  const ent = await verify(req.headers.get('x-tlapka-entitlement'), dev);
  if (!ent) return json(req, { error: 'premium_required' }, 402);
  if (limited(dev)) return json(req, { error: 'rate_limited_client' }, 429);
  let b; try { b = JSON.parse(await req.text()); } catch { return json(req, { error: 'bad_json' }, 400); }
  const image = img(b.image);
  if (b.mode === 'second') {
    const text = clip(b.text, 8000);
    if (!text && !image) return json(req, { error: 'empty' }, 400);
    const pet = b.pet ? `Zvíře: ${clip(b.pet.name, 40)}, ${clip(b.pet.species, 20)}${b.pet.age ? ', věk ' + clip(b.pet.age, 20) : ''}${b.pet.weightKg ? ', ' + clip(b.pet.weightKg, 8) + ' kg' : ''}.` : '';
    const content = [{ type: 'text', text: `${pet}\n${text || 'Zpráva je na fotce.'}` }, ...(image ? [{ type: 'image_url', image_url: { url: image } }] : [])];
    const r = await callModel([{ role: 'system', content: SECOND }, { role: 'user', content }], false);
    return r.text ? json(req, { reply: r.text }) : json(req, { error: r.error }, r.status);
  }
  if (b.mode === 'scan') {
    if (!image) return json(req, { error: 'no_image' }, 400);
    const r = await callModel([{ role: 'system', content: SCAN }, { role: 'user', content: [{ type: 'text', text: `Dnešní datum: ${new Date().toISOString().slice(0, 10)}` }, { type: 'image_url', image_url: { url: image } }] }], true);
    if (!r.text) return json(req, { error: r.error }, r.status);
    try { const m = r.text.match(/\{[\s\S]*\}/); return json(req, { result: JSON.parse(m ? m[0] : r.text) }); } catch { return json(req, { error: 'parse' }, 502); }
  }
  return json(req, { error: 'mode' }, 400);
};
export const config = { path: '/api/ai' };
