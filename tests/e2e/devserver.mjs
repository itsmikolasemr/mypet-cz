// Local dev: serves out/ + Netlify functions (web-standard handlers) on :4125; mock OpenAI-compatible model on :4198.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
process.env.AIVET_API_KEY = 'dev-dummy'; process.env.AIVET_BASE_URL = 'http://localhost:4198/'; process.env.ENTITLEMENT_SECRET = 'dev-secret'; process.env.AIVET_FALLBACK_MODELS = '';
const ROOT = '/workspace/mypet-scan';
const fns = { '/api/aivet': 'aivet.mjs', '/api/ai': 'ai.mjs', '/api/entitlement': 'entitlement.mjs', '/api/vets': 'vets.mjs', '/api/account/delete': 'account-delete.mjs', '/api/billing/revenuecat': 'billing-revenuecat.mjs', '/api/billing/stripe': 'billing-stripe.mjs' };
const loaded = {};
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:4125');
  if (fns[u.pathname]) {
    loaded[u.pathname] ||= (await import(path.join(ROOT, 'netlify/functions', fns[u.pathname]))).default;
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = new Request(u, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const out = await loaded[u.pathname](r, { ip: '127.0.0.1' });
    res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer())); return;
  }
  let f = path.join(ROOT, 'out', decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
  if (!fs.existsSync(f)) f = path.join(ROOT, 'out/index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(4125);
// mock model
global.LAST = null;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c); const b = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  const sys = b.messages?.[0]?.content || ''; const user = b.messages?.at(-1)?.content;
  const hasImg = Array.isArray(user) && user.some((p) => p.type === 'image_url');
  fs.writeFileSync('/workspace/pwtest/mock-last.json', JSON.stringify({ model: b.model, json: !!b.response_format, hasImg, sys: String(sys).slice(0, 60) }));
  let content = 'Jsem Aivet. Toto je testovací odpověď.';
  if (String(sys).startsWith('Extrahuj')) content = JSON.stringify({ kind: 'faktura', date: '2026-10-10', clinic: 'Veterina Brno-střed', reason: 'Očkování + antiparazitika', cost: 1490, items: [{ name: 'Nobivac DHPPi+L', price: 690 }, { name: 'Bravecto 20–40 kg', price: 800 }], vaccinations: [], product: 'Bravecto', reminderType: 'antiparazitika', intervalDays: 84, dose: '1 tableta', notes: null, confidence: 0.92 });
  else if (String(sys).includes('Druhý názor')) content = '**Co ve zprávě stojí**\nALT 180 U/l je mírně zvýšený jaterní enzym.\n**Na co se zeptat veterináře**\n- Je potřeba kontrola za 4 týdny?\n**Na co si dát pozor doma**\n- žloutnutí sliznic. Rada nenahrazuje vyšetření.';
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content } }] }));
}).listen(4198);
console.log('dev on 4125');
