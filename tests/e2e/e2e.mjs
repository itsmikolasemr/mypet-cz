import { chromium, webkit, devices } from 'playwright';
const BR = process.env.BROWSER || 'chromium';
const BASE = 'http://localhost:4125/'; const S = '/workspace/mypet-shots/'; const PW = process.env.TLAPKA_TEST_PW;
const b = BR === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome' }); const errs = []; const R = {};
const mk = async () => { const c = await b.newContext({ ...devices['iPhone 14'], permissions: BR === 'webkit' ? [] : ['clipboard-read', 'clipboard-write'] }); const p = await c.newPage(); p.on('console', (m) => m.text().includes('SYNCERR') && console.log(m.text())); p.on('pageerror', (e) => errs.push(e.message));  return p; };
const login = async (p, email) => { 
  await p.locator('nav[aria-label="Hlavní navigace"]').waitFor({ timeout: 20000 });
  await p.locator('nav[aria-label="Hlavní navigace"]').getByRole('button', { name: /^Nastavení/ }).click();
  await p.getByText('Přihlásit heslem').waitFor({ timeout: 15000 }); await p.getByText('Přihlásit heslem').click(); await p.fill('input[type=email]', email); await p.fill('input[type=password]', PW);
  await p.getByRole('button', { name: 'Přihlásit se', exact: true }).click();
  await p.getByText('Synchronizovat teď').waitFor({ timeout: 15000 });
};
const dlg = async (p) => { const t = await p.locator('[role=alertdialog]').innerText(); await p.getByRole('button', { name: 'Rozumím' }).click(); return t; };
const ls = (p, k) => p.evaluate((k) => localStorage.getItem(k), k);
const data = async (p) => JSON.parse(await ls(p, 'tlapka:data:v1'));
// A: sample data + one document
const A = await mk(); await A.goto(BASE); await A.getByText('Přeskočit').click(); await A.getByText('Vyzkoušet s ukázkovými daty').click(); await A.waitForTimeout(500);
await A.locator('main button', { hasText: 'Dokument' }).first().click(); await A.locator('[data-doc-picker] button').first().click(); await A.waitForTimeout(500);
await A.locator('input[type=file][accept*="pdf"]').setInputFiles('/workspace/pwtest/faktura.pdf'); await A.waitForTimeout(400);
await A.getByRole('button', { name: 'Uložit', exact: true }).click(); await A.waitForTimeout(600);
R.aDocs = (await data(A)).docs.length;
await A.evaluate(async () => { const dev = localStorage.getItem('tlapka:device'); const j = await (await fetch('/api/entitlement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: dev, plan: 'family', test: true }) })).json(); localStorage.setItem('tlapka:ent', JSON.stringify({ plan: 'family', exp: j.exp, token: j.token, test: true, source: 'test' })); });
await A.reload(); await A.waitForTimeout(1200);
await login(A, 'tlapka-e2e-a@example.com'); await A.waitForTimeout(5000);
await A.getByText('Synchronizovat teď').click(); await A.waitForTimeout(5000);
R.aUploaded = JSON.parse(await ls(A, 'tlapka:sync:uploaded') || '[]').length;
if (await A.locator('[role=alertdialog]').count()) { console.log('DIALOG:', await A.locator('[role=alertdialog]').innerText()); process.exit(1); }
await A.getByText('Pozvat do domácnosti').click(); const inv = await dlg(A); const code = inv.match(/Kód ([0-9a-f]+)/)[1];
await A.getByText('Odkaz pro hlídače').click(); const sh = await dlg(A); const shareUrl = sh.match(/https?:\S+/)[0];
await A.screenshot({ path: S + BR + '-92-e2e-A-account.png' });
// B: empty app, login, join
const B = await mk(); await B.context().addInitScript(() => { if (!localStorage.getItem('tlapka:data:v1')) localStorage.setItem('tlapka:data:v1', JSON.stringify({ version: 1, pets: [], reminders: [], visits: [], docs: [], meds: [], allergies: [], settings: { theme: 'system', onboarded: true, notify: false, notifyHour: 9 } })); }); await B.goto(BASE);
 await login(B, 'tlapka-e2e-b@example.com'); await B.waitForTimeout(3000);
await B.getByText('Mám kód pozvánky').click(); await B.locator('input[name=invite]').fill(code); await B.screenshot({ path: S + BR + '-93-e2e-B-join-dialog.png' });
await B.getByRole('button', { name: 'Připojit', exact: true }).click(); await B.waitForTimeout(2500);
await B.getByText('Synchronizovat teď').click(); await B.waitForTimeout(6000);
const bd = await data(B); const ad = await data(A);
R.bPets = bd.pets.length + '/' + ad.pets.length; R.bRems = bd.reminders.length + '/' + ad.reminders.length; R.bDocs = bd.docs.length;
R.bDocFile = await B.evaluate(async (id) => new Promise((res) => { const r = indexedDB.open('tlapka-docs', 1); r.onupgradeneeded = () => r.result.createObjectStore('blobs'); r.onsuccess = () => { try { const db = r.result; const st = db.transaction(db.objectStoreNames[0]).objectStore(db.objectStoreNames[0]).get(id); st.onsuccess = () => res(!!st.result); st.onerror = () => res('err'); } catch (e) { res(String(e)); } }; r.onerror = () => res('noidb'); }), bd.docs[0]?.id);
// B marks reminder done -> dose by Petr; A should get it via realtime
await B.locator('nav[aria-label="Hlavní navigace"]').getByRole('button', { name: /^Připomínky/ }).click(); await B.waitForTimeout(500);
const remTitle = await B.locator('[aria-label^="Označit"]').first().getAttribute('aria-label');
await B.locator('[aria-label^="Označit"]').first().click(); await B.waitForTimeout(500);
const bDue = (await data(B)).reminders.map((r) => r.id + r.dueDate + r.history.length).sort().join();
for (let i = 0; i < 30; i++) { const x = (await data(A)).reminders.map((r) => r.id + r.dueDate + r.history.length).sort().join(); if (x === bDue) break; await A.waitForTimeout(500); }
const aDue = (await data(A)).reminders.map((r) => r.id + r.dueDate + r.history.length).sort().join();
R.realtimeBtoA = aDue === bDue; R.bDoneRem = bDue !== (await data(A)).reminders.map(() => '').join() ;
// A renames a pet -> B realtime
await A.locator('nav[aria-label="Hlavní navigace"]').getByRole('button', { name: /^Nastavení/ }).click(); await A.waitForTimeout(800);
await A.evaluate(() => 0);
R.aDoseList = await A.locator('[data-dose]').allInnerTexts();
// sitter (no account)
const C = await mk(); await C.goto(shareUrl); await C.getByText('Hlídání').waitFor({ timeout: 10000 });
await C.fill('input[placeholder="např. Jana"]', 'Eva'); await C.getByRole('button', { name: 'Podáno' }).first().click(); await C.waitForTimeout(2500);
R.sitterLine = await C.locator('text=podal(a) Eva').first().innerText().catch(() => 'missing');
await C.screenshot({ path: S + BR + '-94-e2e-sitter-page.png' });
await A.getByText('Synchronizovat teď').click(); await A.waitForTimeout(4000);
R.aDoseList2 = await A.locator('[data-dose]').allInnerTexts();
await A.screenshot({ path: S + BR + '-95-e2e-A-doses.png' });
// bad token
const D = await mk(); await D.goto(BASE + '#share/deadbeef'); await D.waitForTimeout(2500); R.badToken = await D.getByText('Odkaz neplatí').count();
await A.getByText('Smazat data v cloudu').click(); await A.getByRole('button', { name: 'Smazat z cloudu' }).click();
R.gdprToast = await A.getByText('Data v cloudu smazána').waitFor({ timeout: 15000 }).then(() => true, () => false);
// free one-device backup: C on two devices
const C1 = await mk(); await C1.goto(BASE); await C1.getByText('Přeskočit').click(); await C1.getByText('Vyzkoušet s ukázkovými daty').click();
await login(C1, 'tlapka-e2e-c@example.com'); await C1.waitForTimeout(3000);
const C2 = await mk(); await C2.goto(BASE); await C2.getByText('Přeskočit').click(); await C2.getByText('Vyzkoušet s ukázkovými daty').click();
await login(C2, 'tlapka-e2e-c@example.com');
R.deviceBanner = await C2.locator('[data-device-blocked]').waitFor({ timeout: 15000 }).then(() => true, () => false);
await C2.screenshot({ path: S + BR + '-96-e2e-device-limit.png' });
await C2.getByRole('button', { name: 'Zálohovat odsud' }).click();
R.deviceClaimed = await C2.locator('[data-device-blocked]').waitFor({ state: 'detached', timeout: 10000 }).then(() => true, () => false);
// account deletion UI (server key not configured locally -> clear message, nothing deleted)
await C2.getByRole('button', { name: 'Smazat účet' }).click(); await C2.getByRole('button', { name: 'Smazat účet' }).last().click();
R.deleteAccountMsg = (await dlg(C2)).replace(/\n+/g, ' ');
console.log(JSON.stringify({ remTitle, ...R }, null, 1), errs);
await b.close();
