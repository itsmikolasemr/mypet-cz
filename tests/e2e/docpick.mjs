// Dokument quick-add: pet picker with >1 pet, direct with 1 pet; Sklo theme distinct from Světlý.
import { chromium, webkit, devices } from 'playwright';
const BR = process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium'; const BASE = 'http://localhost:4125/'; const R = {}; const errs = [];
const b = BR === 'webkit' ? await webkit.launch() : await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone 14'] })).newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(BASE); await p.getByText('Přeskočit').click(); await p.getByText('Vyzkoušet s ukázkovými daty').click(); await p.waitForTimeout(600);
await p.locator('main button', { hasText: 'Dokument' }).first().click(); await p.waitForTimeout(500);
R.pickerNames = await p.locator('[data-doc-picker] button').allInnerTexts();
await p.locator('[data-doc-picker] button', { hasText: 'Mia' }).click(); await p.waitForTimeout(800);
R.openedPet = await p.locator('h1').first().innerText(); R.docsTab = await p.locator('button[class*="text-ink"]', { hasText: 'Doklady' }).count() > 0; R.hash = await p.evaluate(() => location.hash);
// single pet: no picker
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('tlapka:data:v1')); d.pets = d.pets.slice(0, 1); localStorage.setItem('tlapka:data:v1', JSON.stringify(d)); history.replaceState(null, '', '#home'); }); await p.reload(); await p.waitForTimeout(1000);
await p.locator('main button', { hasText: 'Dokument' }).first().click(); await p.waitForTimeout(800);
R.singleNoPicker = (await p.locator('[data-doc-picker]').count()) === 0; R.singleHash = await p.evaluate(() => location.hash);
// theme distinct
const bg = async (t) => { await p.evaluate((t) => { const d = JSON.parse(localStorage.getItem('tlapka:data:v1')); d.settings.theme = t; localStorage.setItem('tlapka:data:v1', JSON.stringify(d)); history.replaceState(null, '', '#home'); }, t); await p.reload(); await p.waitForTimeout(800); return p.evaluate(() => [getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.querySelector('main [class*="bg-surface"]')).backgroundImage.slice(0, 30), getComputedStyle(document.querySelector('main [class*="bg-surface"]')).backdropFilter]); };
R.light = await bg('light'); R.glass = await bg('glass'); R.distinct = R.light[0] !== R.glass[0] && R.glass[2] !== 'none';
const ok = R.pickerNames.length === 2 && R.openedPet === 'Mia' && R.singleNoPicker && R.distinct && !errs.length;
console.log(BR, ok ? 'PASS' : 'FAIL', JSON.stringify(R), errs); process.exit(ok ? 0 : 1);
