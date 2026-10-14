import { chromium, webkit, devices } from 'playwright';
const BASE = 'http://localhost:4123/'; const S = '/workspace/mypet-shots/';
for (const [name, eng] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await (name === 'chromium' ? eng.launch({ channel: 'chrome' }) : eng.launch());
  const ctx = await b.newContext({ ...devices['iPhone 14'], locale: 'cs-CZ' }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE); await p.getByText('Vyzkoušet s ukázkovými daty').click();
  await p.waitForTimeout(600);
  const ad = async () => (await p.locator('#ad-banner').count()) ? await p.locator('#ad-banner').boundingBox() : null;
  const navBox = async () => p.locator('nav[aria-label="Hlavní navigace"]').boundingBox();
  const r = { home: await ad() }; const nb = await navBox();
  r.gap = r.home ? Math.round(nb.y - (r.home.y + r.home.height)) : null;
  await p.screenshot({ path: `${S}80-ad-banner-home-${name}.png` });
  await p.getByRole('button', { name: 'Kalendář' }).click(); await p.waitForTimeout(500);
  const grid = p.locator('[data-month]'); const m = () => grid.getAttribute('data-month');
  const box = await grid.boundingBox(); const y = box.y + box.height / 2;
  const swipe = async (x0, x1) => {
    if (name === 'chromium') {
      const c = await ctx.newCDPSession(p);
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
      for (let i = 1; i <= 8; i++) await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 8, y }] });
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await p.evaluate(([x0, x1, y]) => { const el = document.elementFromPoint(x0, y); const ev = (t, x) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })); ev('pointerdown', x0); for (let i = 1; i <= 8; i++) ev('pointermove', x0 + (x1 - x0) * i / 8); ev('pointerup', x1); }, [x0, x1, y]);
    }
    await p.waitForTimeout(120);
  };
  const seq = [await m()];
  await swipe(box.x + box.width - 20, box.x + 30); seq.push(await m());
  await p.screenshot({ path: `${S}81-cal-swipe-anim-${name}.png` }); await p.waitForTimeout(400);
  await swipe(box.x + box.width - 20, box.x + 30); seq.push(await m());
  await swipe(box.x + 30, box.x + box.width - 20); seq.push(await m());
  await p.getByLabel('Předchozí měsíc').click(); seq.push(await m());
  await p.getByLabel('Další měsíc').click(); seq.push(await m());
  await p.waitForTimeout(400); await p.screenshot({ path: `${S}82-cal-${name}.png` });
  r.cal = await ad();
  await p.evaluate(() => location.hash = 'map'); await p.waitForTimeout(500); r.map = await ad();
  await p.evaluate(() => location.hash = 'ai'); await p.waitForTimeout(500); r.ai = await ad(); await p.evaluate(() => location.hash = 'map/nonstop'); await p.waitForTimeout(500); r.em = await ad(); await p.evaluate(() => location.hash = 'home');
  await p.evaluate(() => localStorage.setItem('tlapka:ent', JSON.stringify({ plan: 'year', exp: Date.now() + 9e8, token: 't', test: true, source: 'mock' })));
  await p.reload(); await p.waitForTimeout(800); r.prem = await ad();
  await p.screenshot({ path: `${S}83-premium-no-banner-${name}.png` });
  console.log(name, 'months', seq.join('→'), '| ad home', !!r.home, 'gap', r.gap, r.home && `${r.home.width}x${r.home.height}`, '| cal', !!r.cal, '| map', !!r.map, '| ai', !!r.ai, '| emerg', !!r.em, '| premium', !!r.prem, errs);
  await b.close();
}
