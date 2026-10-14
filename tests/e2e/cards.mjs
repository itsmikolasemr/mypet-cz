import { chromium, webkit, devices } from 'playwright';
const BR = process.env.BROWSER || 'chromium'; const BASE = 'http://localhost:4125/'; const S = '/workspace/mypet-shots/';
const b = BR === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome' }); const errs = []; const R = {};
const c = await b.newContext({ ...devices['iPhone 14'] }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
const ean = (s) => { const d = [...s].map(Number); const sum = d.reduce((a, x, i) => a + x * (i % 2 ? 3 : 1), 0); return s + ((10 - (sum % 10)) % 10); };
const E = ean('859123456789');
const data = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('tlapka:data:v1')));
await p.goto(BASE); await p.getByText('Vyzkoušet s ukázkovými daty').click(); await p.waitForTimeout(600);
await p.getByText('Věrnostní karty').first().click(); await p.waitForTimeout(400);
R.empty = await p.getByText('Zatím žádná karta').count();
await p.screenshot({ path: S + `cards-empty-${BR}.png` });
// 1) manual EAN-13 (Super zoo)
await p.getByRole('button', { name: 'Přidat kartu' }).first().click();
await p.locator('[data-store=superzoo]').click(); await p.fill('[name=cardCode]', E); await p.fill('[name=cardNotes]', 'Úterky −10 %');
await p.locator('[data-barcode=EAN13]').waitFor(); R.previewEan = true;
await p.screenshot({ path: S + `cards-form-${BR}.png` });
await p.locator('[data-save-card]').click(); await p.waitForTimeout(400);
// invalid EAN is blocked
await p.getByRole('button', { name: 'Přidat kartu' }).first().click(); await p.locator('[data-store=zoobonus]').click();
await p.getByRole('radio', { name: 'EAN-13' }).click().catch(async () => p.getByText('EAN-13', { exact: true }).click());
await p.fill('[name=cardCode]', '8591234567890' === E ? '8591234567891' : '8591234567890'); await p.waitForTimeout(300);
R.invalidBlocked = (await p.locator('[data-code-invalid]').count()) > 0 && await p.locator('[data-save-card]').isDisabled();
// 2) Code128 Zoo Bonus
await p.getByText('Code 128', { exact: true }).click(); await p.fill('[name=cardCode]', 'ZB-778812'); await p.locator('[data-barcode=CODE128]').waitFor(); await p.locator('[data-save-card]').click(); await p.waitForTimeout(300);
// 3) custom QR
await p.getByRole('button', { name: 'Přidat kartu' }).first().click(); await p.locator('[data-store=custom]').click(); await p.fill('[name=cardName]', 'Zverimex U Tlapky');
await p.getByText('QR', { exact: true }).click(); await p.fill('[name=cardCode]', 'TLAPKA:CLUB:4242'); await p.locator('[data-barcode=QR]').waitFor(); await p.locator('[data-save-card]').click(); await p.waitForTimeout(300);
// cashier view for EAN, screenshot barcode for photo scan
await p.getByRole('button', { name: 'Ukázat kartu Super zoo' }).click({ position: { x: 60, y: 24 } }); await p.locator('[data-cashier] [data-barcode=EAN13]').waitFor();
R.cashierWhite = await p.locator('[data-cashier]').evaluate((e) => getComputedStyle(e).backgroundColor);
await p.screenshot({ path: S + `cards-cashier-${BR}.png` });
await p.locator('[data-cashier] [data-barcode]').screenshot({ path: `/workspace/pwtest/ean-${BR}.png` });
await p.keyboard.press('Escape');
// QR cashier + use count -> sort
await p.getByRole('button', { name: 'Ukázat kartu Zverimex U Tlapky' }).click({ position: { x: 60, y: 24 } }); await p.locator('[data-cashier] [data-barcode=QR]').waitFor();
await p.locator('[data-cashier] [data-barcode=QR]').screenshot({ path: `/workspace/pwtest/qr-${BR}.png` }); await p.keyboard.press('Escape');
await p.getByRole('button', { name: 'Ukázat kartu Zverimex U Tlapky' }).click({ position: { x: 60, y: 24 } }); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
R.order = await p.locator('[data-card-title]').allInnerTexts();
await p.screenshot({ path: S + `cards-wallet-${BR}.png` });
// 4) photo scan (zxing or BarcodeDetector) from rendered images
for (const [f, want] of [[`ean-${BR}.png`, E], [`qr-${BR}.png`, 'TLAPKA:CLUB:4242']]) {
  await p.getByRole('button', { name: 'Přidat kartu' }).first().click(); await p.locator('[data-store=petcenter]').click();
  await p.locator('[data-scan-photo]').setInputFiles('/workspace/pwtest/' + f); await p.waitForFunction((w) => document.querySelector('[name=cardCode]')?.value === w, want, { timeout: 15000 }).catch(() => {});
  R['photo:' + f] = await p.inputValue('[name=cardCode]') === want ? 'ok' : await p.inputValue('[name=cardCode]');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
}
// edit + delete -> trash
await p.getByRole('button', { name: 'Upravit Zoo Bonus' }).click(); await p.getByRole('button', { name: 'Smazat' }).click(); await p.locator('[role=alertdialog] button').last().click(); await p.waitForTimeout(400);
const d = await data(); R.cards = d.cards.map((x) => `${x.store}:${x.format}:${x.code}:${x.uses}`); R.trash = (d.trash || []).filter((t) => t.coll === 'cards').length;
console.log(JSON.stringify(R, null, 1), errs); await b.close();
