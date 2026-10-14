const C = 'tlapka-v4';
const CORE = ['/', '/vets-cz.json', '/dogparks-cz.json', '/manifest.webmanifest', '/favicon.svg'];
// Precache the shell AND the hashed JS/CSS it references, so the first offline reload works.
async function precache() {
  const c = await caches.open(C);
  const res = await fetch('/', { cache: 'reload' });
  const html = await res.clone().text();
  await c.put('/', res);
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))];
  await Promise.all([...CORE.slice(1), ...assets].map((u) => c.add(u).catch(() => {})));
}
self.addEventListener('install', (e) => { e.waitUntil(precache().catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(C).then((c) => c.put('/', cp)); } return r; })
      .catch(() => caches.match('/', { ignoreSearch: true }).then((r) => r || caches.open(C).then((c) => c.match('/')).then((r2) => r2 || Response.error()))));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/brand/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(C).then((c) => c.put(req, cp)); } return r; })));
    return;
  }
  if (url.pathname === '/vets-cz.json' || url.pathname === '/dogparks-cz.json') {
    // stale-while-revalidate
    e.respondWith(caches.open(C).then((c) => c.match(req).then((hit) => { const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })));
  }
});
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('/')))); });
