// AIVET – server-side proxy to an OpenAI-compatible chat API. The API key never reaches the client.
// Env: AIVET_API_KEY (required), AIVET_BASE_URL (default Gemini OpenAI-compat), AIVET_MODEL (default gemini-flash-latest)
import { getStore } from '@netlify/blobs';

const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-flash-latest';
// Tried in order when the primary model is overloaded (503/429/404). Override with AIVET_FALLBACK_MODELS (comma-separated).
const DEFAULT_FALLBACKS = 'gemini-flash-lite-latest,gemini-3.6-flash';

const CORS = {
  Vary: 'Origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra } });
const env = (k) => (typeof Netlify !== 'undefined' && Netlify.env?.get(k)) || process.env[k] || '';
const clip = (s, n) => String(s ?? '').slice(0, n);

// ---- origin check ----
const DEFAULT_ORIGINS = 'https://mypet-cz.netlify.app,capacitor://localhost,https://localhost,http://localhost,ionic://localhost';
function originOk(req) {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') === 'same-origin';
  const allowed = (env('AIVET_ALLOWED_ORIGINS') || DEFAULT_ORIGINS).split(',').map((x) => x.trim());
  if (allowed.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+--mypet-cz\.netlify\.app$/.test(origin); // deploy previews
}
const corsFor = (req) => ({ ...CORS, ...(req.headers.get('origin') && originOk(req) ? { 'Access-Control-Allow-Origin': req.headers.get('origin') } : {}) });

// ---- per-IP rate limit (Netlify Blobs, with in-memory fallback) ----
const LIMITS = [
  { win: 10 * 60 * 1000, max: Number(env('AIVET_LIMIT_10MIN')) || 15, label: '10 minut' },
  { win: 24 * 60 * 60 * 1000, max: Number(env('AIVET_LIMIT_DAY')) || 60, label: 'den' },
];
const mem = new Map();
async function hashIp(ip) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tlapka:' + ip));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function rateLimit(ip) {
  const key = await hashIp(ip || 'unknown');
  const now = Date.now();
  let store = null;
  try { store = getStore({ name: 'aivet-ratelimit', consistency: 'strong' }); } catch { store = null; }
  let hits = [];
  try { hits = store ? ((await store.get(key, { type: 'json' })) ?? []) : (mem.get(key) ?? []); } catch { hits = mem.get(key) ?? []; }
  hits = hits.filter((t) => now - t < LIMITS[1].win);
  for (const l of LIMITS) {
    const inWin = hits.filter((t) => now - t < l.win);
    if (inWin.length >= l.max) return { ok: false, retryAfter: Math.ceil((inWin[0] + l.win - now) / 1000), label: l.label, remaining: 0 };
  }
  hits.push(now);
  try { if (store) await store.setJSON(key, hits); else mem.set(key, hits); } catch { mem.set(key, hits); }
  return { ok: true, remaining: LIMITS[0].max - hits.filter((t) => now - t < LIMITS[0].win).length };
}

const SYSTEM = `Jsi AIVET, opatrný virtuální asistent aplikace Tlapka pro majitele domácích zvířat v Česku.
Odpovídej česky, tykej, stručně a srozumitelně (max. ~180 slov, odrážky jsou v pořádku).
Nejsi veterinář a nestanovuješ diagnózu – pomáháš s orientací (triáží), péčí doma a přípravou na návštěvu veterináře.
Pravidla:
- Nejdřív zhodnoť naléhavost. Pokud popis naznačuje možný akutní stav (potíže s dýcháním, bezvědomí, křeče, silné krvácení, podezření na otravu nebo pozření cizího předmětu, nafouklé břicho a neúspěšné pokusy o zvracení, neschopnost močit, úraz, úpal, opakované zvracení/průjem s krví, náhlá ochrnutí, těžká alergická reakce), začni odpověď PŘESNĚ řetězcem [POHOTOVOST] a jasně doporuč okamžitý kontakt s veterinární pohotovostí. Pokud stav akutní není, tento řetězec vůbec nepiš ani nezmiňuj.
- Nikdy nedoporučuj humánní léky ani konkrétní dávkování léků na předpis. Upozorni na toxické látky (např. paracetamol/ibuprofen, xylitol, čokoláda, hrozny, cibule, lilie u koček).
- Zohledni profil zvířete (druh, věk, váha, léky, alergie) – zvlášť alergie a interakce s užívanými léky.
- Když chybí důležitá informace, polož 1–3 doplňující otázky.
- Při jakýchkoli přetrvávajících nebo závažných příznacích vždy doporuč návštěvu veterináře.
- Na konci připoj krátkou větu, že rada nenahrazuje vyšetření veterinářem.`;

function profileText(p) {
  if (!p || typeof p !== 'object') return 'Profil zvířete není k dispozici.';
  const lines = [
    `Jméno: ${clip(p.name, 60)}`,
    `Druh: ${clip(p.species, 40)}${p.breed ? `, plemeno: ${clip(p.breed, 60)}` : ''}`,
    p.sex ? `Pohlaví: ${clip(p.sex, 20)}` : '',
    p.age ? `Věk: ${clip(p.age, 30)}` : '',
    p.weightKg ? `Poslední váha: ${clip(p.weightKg, 10)} kg` : '',
    `Léky: ${Array.isArray(p.meds) && p.meds.length ? p.meds.slice(0, 15).map((m) => clip(m, 120)).join('; ') : 'žádné uvedené'}`,
    `Alergie: ${Array.isArray(p.allergies) && p.allergies.length ? p.allergies.slice(0, 15).map((a) => clip(a, 120)).join('; ') : 'žádné uvedené'}`,
    p.notes ? `Poznámky: ${clip(p.notes, 300)}` : '',
  ];
  return 'Profil zvířete, o kterém se mluví:\n' + lines.filter(Boolean).join('\n');
}

export default async (req, context) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: originOk(req) ? 204 : 403, headers: cors });
  const key = env('AIVET_API_KEY');
  if (req.method === 'GET') return json({ configured: !!key }, 200, cors);
  if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
  if (!originOk(req)) return json({ error: 'forbidden_origin' }, 403, cors);
  if (!key) return json({ error: 'not_configured' }, 503, cors);
  if (Number(req.headers.get('content-length') || 0) > 32_000) return json({ error: 'too_large' }, 413, cors);

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const rl = await rateLimit(ip);
  if (!rl.ok) return json({ error: 'rate_limited_client', retryAfter: rl.retryAfter, window: rl.label }, 429, { ...cors, 'Retry-After': String(rl.retryAfter), 'X-RateLimit-Remaining': '0' });

  let body;
  try { body = JSON.parse(clip(await req.text(), 32_000)); } catch { return json({ error: 'bad_json' }, 400, cors); }
  const history = Array.isArray(body?.messages) ? body.messages : [];
  const messages = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: clip(m.content, 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'no_message' }, 400, cors);

  const base = (env('AIVET_BASE_URL') || DEFAULT_BASE).replace(/\/+$/, '') + '/';
  const primary = env('AIVET_MODEL') || DEFAULT_MODEL;
  const fallbacks = (env('AIVET_FALLBACK_MODELS') || (env('AIVET_BASE_URL') ? '' : DEFAULT_FALLBACKS)).split(',').map((x) => x.trim()).filter(Boolean);
  const models = [primary, ...fallbacks.filter((m) => m !== primary)];
  const chat = [{ role: 'system', content: SYSTEM + '\n\n' + profileText(body.pet) }, ...messages];
  const started = Date.now();
  let lastStatus = 0;
  for (const model of models) {
    if (Date.now() - started > 20000) break;
    try {
      const r = await fetch(base + 'chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: chat, max_tokens: 1500, ...(base.includes('generativelanguage') ? { reasoning_effort: 'low' } : {}) }),
        // primary gets a short slot so an overloaded model doesn't eat the whole budget
        signal: AbortSignal.timeout(Math.max(3000, Math.min(model === models[0] && models.length > 1 ? 8000 : 22000, 24000 - (Date.now() - started)))),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        lastStatus = r.status;
        console.error('AIVET upstream error', model, r.status, JSON.stringify(data).slice(0, 400));
        if ([429, 500, 503, 404].includes(r.status)) continue;
        return json({ error: r.status === 401 || r.status === 403 ? 'auth' : 'upstream', status: r.status }, 502, cors);
      }
      let text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      const emergency = text.startsWith('[POHOTOVOST]');
      text = text.replace(/\[POHOTOVOST\][^\n]*?(neplatí|není)[^\n]*\n?/gi, '').replace(/\[POHOTOVOST\]\s*/g, '').trim();
      if (!text) { lastStatus = 502; continue; }
      return json({ reply: text, emergency }, 200, { ...cors, 'X-RateLimit-Remaining': String(rl.remaining) });
    } catch (e) {
      console.error('AIVET fetch failed', model, e?.message);
      lastStatus = 504;
    }
  }
  return json({ error: lastStatus === 429 || lastStatus === 503 ? 'rate_limited' : 'upstream', status: lastStatus }, 502, cors);
};

export const config = { path: '/api/aivet' };
