// AIVET – server-side proxy to an OpenAI-compatible chat API. The API key never reaches the client.
// Env: AIVET_API_KEY (required), AIVET_BASE_URL (default Gemini OpenAI-compat), AIVET_MODEL (default gemini-flash-latest)
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-flash-latest';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const env = (k) => (typeof Netlify !== 'undefined' && Netlify.env?.get(k)) || process.env[k] || '';
const clip = (s, n) => String(s ?? '').slice(0, n);

const SYSTEM = `Jsi AIVET, opatrný virtuální asistent aplikace Tlapka pro majitele domácích zvířat v Česku.
Odpovídej česky, tykej, stručně a srozumitelně (max. ~180 slov, odrážky jsou v pořádku).
Nejsi veterinář a nestanovuješ diagnózu – pomáháš s orientací (triáží), péčí doma a přípravou na návštěvu veterináře.
Pravidla:
- Nejdřív zhodnoť naléhavost. Pokud popis naznačuje možný akutní stav (potíže s dýcháním, bezvědomí, křeče, silné krvácení, podezření na otravu nebo pozření cizího předmětu, nafouklé břicho a neúspěšné pokusy o zvracení, neschopnost močit, úraz, úpal, opakované zvracení/průjem s krví, náhlá ochrnutí, těžká alergická reakce), začni odpověď PŘESNĚ řetězcem [POHOTOVOST] a jasně doporuč okamžitý kontakt s veterinární pohotovostí.
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

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const key = env('AIVET_API_KEY');
  if (req.method === 'GET') return json({ configured: !!key, model: env('AIVET_MODEL') || DEFAULT_MODEL });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!key) return json({ error: 'not_configured' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const history = Array.isArray(body?.messages) ? body.messages : [];
  const messages = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: clip(m.content, 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'no_message' }, 400);

  const base = (env('AIVET_BASE_URL') || DEFAULT_BASE).replace(/\/+$/, '') + '/';
  try {
    const r = await fetch(base + 'chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: env('AIVET_MODEL') || DEFAULT_MODEL,
        messages: [{ role: 'system', content: SYSTEM + '\n\n' + profileText(body.pet) }, ...messages],
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(25000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('AIVET upstream error', r.status, JSON.stringify(data).slice(0, 500));
      return json({ error: r.status === 429 ? 'rate_limited' : 'upstream', status: r.status }, 502);
    }
    let text = String(data?.choices?.[0]?.message?.content ?? '').trim();
    const emergency = text.startsWith('[POHOTOVOST]');
    text = text.replace(/^\[POHOTOVOST\]\s*/, '');
    if (!text) return json({ error: 'empty' }, 502);
    return json({ reply: text, emergency });
  } catch (e) {
    console.error('AIVET fetch failed', e?.message);
    return json({ error: 'network' }, 502);
  }
};

export const config = { path: '/api/aivet' };
