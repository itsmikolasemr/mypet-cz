import { chromium, webkit, devices } from 'playwright';
const BR = process.env.BROWSER || 'chromium';
import { unzipSync } from '/workspace/mypet-scan/node_modules/fflate/esm/index.mjs'; import fs from 'node:fs';
const BASE = 'http://localhost:4125/'; const S = '/workspace/mypet-shots/'; const PW = process.env.TLAPKA_TEST_PW;
const b = BR === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome' }); const errs = []; const R = {};
const mk = async () => { const c = await b.newContext({ ...devices['iPhone 14'], acceptDownloads: true, permissions: BR === 'webkit' ? [] : ['clipboard-read', 'clipboard-write', 'notifications'] }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); return p; };
const nav = async (p, l) => { if (await p.locator('[role=alertdialog]').count()) { console.log('DLG@' + l + ':', (await p.locator('[role=alertdialog]').innerText()).replace(/\n/g, ' ')); } await p.locator('nav[aria-label="Hlavní navigace"]').getByRole('button', { name: new RegExp('^' + l) }).click(); await p.waitForTimeout(500); };
const hash = async (p, h) => { await p.evaluate((h) => { history.pushState(null, '', '#' + h); dispatchEvent(new PopStateEvent('popstate')); }, h); await p.waitForTimeout(600); };
const dlg = async (p) => { const l = p.locator('[role=alertdialog]'); await l.waitFor({ timeout: 15000 }); const t = await l.innerText(); await p.getByRole('button', { name: 'Rozumím' }).click(); return t; };
const paywallOpen = async (p) => { const n = await p.getByText('79 Kč').count(); await p.keyboard.press('Escape'); await p.evaluate(() => dispatchEvent(new PopStateEvent('popstate'))); await p.waitForTimeout(300); return n > 0; };
const data = async (p) => JSON.parse(await p.evaluate(() => localStorage.getItem('tlapka:data:v1')));
const A = await mk(); await A.goto(BASE); await A.getByText('Přeskočit').click(); await A.getByText('Vyzkoušet s ukázkovými daty').click(); await A.waitForTimeout(600);
// ---- FREE ----
await nav(A, 'Nastavení');
const [dl] = await Promise.all([A.waitForEvent('download'), A.getByText('Exportovat vše').click()]);
const zp = '/workspace/pwtest/export.zip'; await dl.saveAs(zp); const z = unzipSync(new Uint8Array(fs.readFileSync(zp)));
R.zip = Object.keys(z); R.zipJsonPets = JSON.parse(new TextDecoder().decode(z['tlapka-zaloha.json'])).pets.length;
await A.getByText('Poslat testovací oznámení').click(); await A.waitForTimeout(800); R.testNotif = (await A.getByText('Testovací oznámení odesláno').count()) ? 'sent' : (await A.locator('[role=alertdialog]').count()) ? 'permission-guidance' : 'none'; if (await A.locator('[role=alertdialog]').count()) await A.getByRole('button', { name: 'Rozumím' }).click();
await A.getByRole('button', { name: 'Xiaomi / Redmi / POCO' }).click(); R.guide = await A.getByText('Automatické spuštění').count();
// late dose
await nav(A, 'Připomínky'); const before = (await data(A)).reminders.find((r) => r.intervalDays > 0 && !r.completedAt);
await A.locator('[aria-label^="Označit"]').first().click(); await A.waitForTimeout(700);
R.lateDoseToast = await A.locator('[role=status]').innerText().catch(() => '');
// trash: delete visit via store? use pet delete via UI is long; delete a reminder through UI edit sheet
await A.locator('[aria-label^="Označit"]').first().waitFor();
const d0 = await data(A);
await A.evaluate(() => 0);
await nav(A, 'Mazlíčci'); await A.getByText(d0.pets[1].name).first().click(); await A.waitForTimeout(500);
await A.getByRole('button', { name: /Smazat/ }).last().click().catch(() => {}); await A.waitForTimeout(300);
if (await A.locator('[role=alertdialog]').count()) await A.locator('[role=alertdialog] button').last().click();
await A.waitForTimeout(600);
const d1 = await data(A); R.petDeleted = d0.pets.length - d1.pets.length; R.trashItems = (d1.trash || []).length;
await nav(A, 'Nastavení'); await A.locator('[data-trash] button').first().click(); R.freeRestorePaywall = await paywallOpen(A);
await A.screenshot({ path: S + BR + '-100-v11-free-settings.png', fullPage: true });
// premium-gated
await nav(A, 'Přehled'); await A.getByText('AI sken dokladu').click(); R.scanPaywall = await paywallOpen(A);
await A.evaluate(() => { history.pushState(null, '', '#second'); dispatchEvent(new PopStateEvent('popstate')); }); await A.waitForTimeout(500); await A.fill('textarea', 'ALT 180 U/l'); await A.getByRole('button', { name: 'Vysvětlit zprávu' }).click(); R.secondPaywall = await paywallOpen(A);
R.api402 = await A.evaluate(async () => (await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tlapka-Device': localStorage.getItem('tlapka:device') }, body: JSON.stringify({ mode: 'scan', image: 'data:image/png;base64,AAAA' }) })).status);
await nav(A, 'Mazlíčci'); await A.getByText(d1.pets[0].name).first().click(); await A.waitForTimeout(500); await A.getByRole('button', { name: 'Sdílet', exact: true }).click(); await A.waitForTimeout(300);
await A.getByRole('button', { name: /^Otevřít/ }).click(); R.travelPaywall = await paywallOpen(A);
// ---- account (free): pass link limit, sitter gated ----
await nav(A, 'Nastavení'); await A.getByText('Přihlásit heslem').click(); await A.fill('input[type=email]', 'tlapka-e2e-a@example.com'); await A.fill('input[type=password]', PW);
await A.getByRole('button', { name: 'Přihlásit se', exact: true }).click(); await A.getByText('Synchronizovat teď').waitFor({ timeout: 15000 }); await A.waitForTimeout(4000);
await A.getByText('Odkaz pro hlídače').click(); R.sitterPaywallFree = await paywallOpen(A);
await nav(A, 'Mazlíčci'); await A.getByText(d1.pets[0].name).first().click(); await A.waitForTimeout(500); await A.getByRole('button', { name: 'Sdílet', exact: true }).click(); await A.waitForTimeout(300);
await A.getByText('Vytvořit odkaz a QR').click(); await A.locator('[data-pass-link]').waitFor({ timeout: 15000 }); const passUrl = await A.locator('[data-pass-link]').getAttribute('data-pass-link');
await A.locator('[data-pass-link]').scrollIntoViewIfNeeded(); await A.screenshot({ path: S + BR + '-101-v11-pass-qr.png' });
await A.getByText('Vytvořit odkaz a QR').click(); R.secondPassFree = (await dlg(A)).split('\n')[0];
const P = await mk(); await P.goto(passUrl); await P.getByText('Zdravotní pas').waitFor({ timeout: 10000 }); R.passPage = { podano: await P.getByRole('button', { name: 'Podáno' }).count(), name: await P.locator('[data-pet]').first().innerText() };
await P.screenshot({ path: S + BR + '-102-v11-pass-page.png', fullPage: true });
// ---- PREMIUM ----
await A.evaluate(async () => { const dev = localStorage.getItem('tlapka:device'); const j = await (await fetch('/api/entitlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: dev, plan: 'yearly', test: true }) })).json(); localStorage.setItem('tlapka:ent', JSON.stringify({ plan: 'yearly', exp: j.exp, token: j.token, test: true, source: 'test' })); });
await A.reload(); await A.waitForTimeout(1500);
await nav(A, 'Nastavení'); const tBefore = (await data(A)).pets.length; await A.locator('[data-trash] button').first().click(); await A.waitForTimeout(500); R.restored = (await data(A)).pets.length - tBefore;
await nav(A, 'Přehled');
await A.locator('[data-scan-input]').setInputFiles('/workspace/pwtest/scan.png'); await A.getByText('Zkontroluj, co jsem našel').waitFor({ timeout: 15000 });
await A.screenshot({ path: S + BR + '-103-v11-scan-review.png' });
const n0 = await data(A); await A.getByRole('button', { name: 'Uložit', exact: true }).click(); await A.waitForTimeout(800); const n1 = await data(A);
R.scanCreated = { visits: n1.visits.length - n0.visits.length, reminders: n1.reminders.length - n0.reminders.length, docs: n1.docs.length - n0.docs.length, cost: n1.visits.at(-1).cost, rem: n1.reminders.at(-1).title + ' ' + n1.reminders.at(-1).dueDate };
R.mockSaw = JSON.parse(fs.readFileSync('/workspace/pwtest/mock-last.json'));
await A.evaluate(() => { history.pushState(null, '', '#second'); dispatchEvent(new PopStateEvent('popstate')); }); await A.waitForTimeout(500); await A.fill('textarea', 'ALT 180 U/l, ostatní v normě');
await A.locator('input[type=file][capture]').last().setInputFiles('/workspace/pwtest/scan.png'); await A.waitForTimeout(500);
await A.getByRole('button', { name: 'Vysvětlit zprávu' }).click(); await A.locator('[data-second-reply]').waitFor({ timeout: 15000 });
R.second = (await A.locator('[data-second-reply]').innerText()).slice(0, 60); R.secondImg = JSON.parse(fs.readFileSync('/workspace/pwtest/mock-last.json')).hasImg;
await A.screenshot({ path: S + BR + '-104-v11-druhy-nazor.png', fullPage: true });
await nav(A, 'Mazlíčci'); await A.getByText(n1.pets[0].name).first().click(); await A.waitForTimeout(500);
R.travel = await A.locator('[data-travel] li').count(); await A.locator('[data-travel]').scrollIntoViewIfNeeded(); await A.screenshot({ path: S + BR + '-105-v11-travel.png' });
// as-needed med: safe-again-after
await A.getByRole('button', { name: 'Zdraví' }).click(); await A.locator('div:has(> p:text-is("💊 Léky")) button').click();
await A.getByLabel('Název léku').fill('Metacam (dle potřeby)'); await A.locator('select').filter({ hasText: 'Denně ráno' }).selectOption('Dle potřeby');
await A.locator('input[name=minHours]').fill('8'); await A.getByRole('button', { name: 'Uložit', exact: true }).click(); await A.waitForTimeout(500);
await A.locator('[data-prn] button').first().click(); await A.waitForTimeout(500);
R.prnLine = await A.locator('[data-prn] p').first().innerText();
await A.locator('[data-prn] button').first().click(); R.prnWarn = (await A.locator('[role=alertdialog]').innerText()).split('\n')[0]; await A.getByRole('button', { name: 'Zrušit' }).click();
await A.locator('[data-prn]').scrollIntoViewIfNeeded(); await A.screenshot({ path: S + BR + '-106-v11-prn.png' });
console.log(BR, JSON.stringify(R, null, 1), errs.slice(0, 5));
await b.close();
