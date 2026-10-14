// report4 regression: settings/legal, free expenses total, paywall compare+restore, onboarding wizard, map city search/call/open-now, quick card brands
import { chromium, webkit } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4125/';
const B = process.env.BROWSER === 'webkit' ? webkit : chromium;
const b = await B.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'cs-CZ' });
const p = await ctx.newPage(); p.setDefaultTimeout(15000);
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const out = {};
const seed = (extra = {}) => p.evaluate((x) => localStorage.setItem('tlapka:data:v1', JSON.stringify({ version: 1, cards: [], pets: [{ id: 'max', name: 'Max', species: 'pes', breed: '', sex: 'samec', birthDate: '', color: '', microchip: '', notes: '', weights: [], createdAt: '2026-01-01' }], reminders: [], visits: [{ id: 'v', petId: 'max', date: new Date().getFullYear() + '-02-03', cost: 1200, reason: 'x', clinic: '', notes: '' }], docs: [], meds: [], allergies: [], settings: { theme: 'light', notify: false, notifyHour: 9, onboarded: true }, ...x })), extra);
const open = async (hash) => { await p.evaluate((h) => history.replaceState(null, '', h), hash); await p.reload({ waitUntil: 'load' }); };

// 1) onboarding wizard (fresh)
await p.goto(BASE, { waitUntil: 'load' });
await p.getByRole('button', { name: 'Začít', exact: true }).click();
await p.fill('#ob-name', 'Bára'); await p.locator('[data-species=kocka]').click();
await p.getByRole('button', { name: 'Další' }).click();
out.suggest = await p.locator('[data-suggest]').count();
await p.locator('[data-suggest]').first().click(); // untick one
await p.getByRole('button', { name: 'Další' }).click();
await p.getByRole('button', { name: 'Teď ne' }).click();
await p.waitForFunction(() => JSON.parse(localStorage.getItem('tlapka:data:v1') || '{}').settings?.onboarded === true);
const d = await p.evaluate(() => JSON.parse(localStorage.getItem('tlapka:data:v1')));
out.obPet = d.pets.map((x) => `${x.name}/${x.species}`).join(); out.obRem = d.reminders.length;

// 2) settings → legal
await seed(); await open('#settings');
await p.locator('main button', { hasText: /(Přihlásit|Spravovat) ›/ }).first().waitFor();
out.acctRow = 1;
await p.getByRole('button', { name: /Podmínky užívání/ }).evaluate((e) => e.click());
await p.waitForFunction(() => location.hash === '#terms'); out.placeholders = await p.locator('[data-placeholder]').count();

// 3) free expenses total
await open('#expenses');
out.freeTotal = (await p.locator('[data-free-total]').innerText()).replace(/\s+/g, ' ');

// 4) paywall
await open('#settings');
await p.getByRole('button', { name: /Získat Premium/ }).evaluate((e) => e.click());
await p.locator('[data-compare]').waitFor();
out.compare = await p.locator('[data-compare] tr').count(); out.restore = await p.locator('[data-restore]').count();
await p.screenshot({ path: `/workspace/mypet-shots/r4-paywall-${process.env.BROWSER || 'chromium'}.png` });

// 5) cards quick brands
await seed(); await open('#cards');
await p.locator('[data-quick-brands] [data-brand]').first().waitFor();
out.brands = await p.locator('[data-quick-brands] [data-brand]').count();
await p.locator('[data-brand=petcenter]').click();
out.brandPre = await p.locator('[data-store=petcenter][aria-pressed=true], [data-store=petcenter][aria-checked=true]').count();

// 6) map: Praha default (no geolocation), city search
await open('#map');
await p.locator('[data-city-search] input').fill('Olom');
await p.getByRole('option', { name: 'Olomouc' }).click();
await p.getByText('Zobrazuji Olomouc').waitFor();
await p.locator('main [data-call], main [data-open]').first().waitFor({ timeout: 20000 }).catch(() => {});
out.call = await p.locator('[data-call]').count(); out.openNow = await p.locator('[data-open]').count();
await p.screenshot({ path: `/workspace/mypet-shots/r4-map-${process.env.BROWSER || 'chromium'}.png` });

const ok = out.suggest >= 2 && out.obPet === 'Bára/kocka' && out.obRem === out.suggest - 1 && out.placeholders > 0 && /1\s?200/.test(out.freeTotal) && out.compare >= 9 && out.restore && out.brands === 6 && out.call > 0 && !errs.length;
console.log(ok ? `${process.env.BROWSER || 'chromium'} PASS` : 'FAIL', JSON.stringify(out), errs);
await b.close(); process.exit(ok ? 0 : 1);
