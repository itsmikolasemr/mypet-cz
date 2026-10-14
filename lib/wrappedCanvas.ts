import { tr } from './i18n';
/** Renders one Wrapped slide to a 1080×1920 canvas (IG story) – brand: #7FB3E8 polštářek, grafit #3A3D43, světle šedá #ECEFF3, Manrope. */
import type { Slide } from './wrapped';

export const THEMES = [
  { bg: ['#A9CEF3', '#7FB3E8'], ink: '#0F2540', sub: 'rgba(15,37,64,.72)', dot: '#FFFFFF', toe: '#3A3D43' },
  { bg: ['#2E3138', '#1D1F24'], ink: '#FFFFFF', sub: 'rgba(255,255,255,.7)', dot: '#7FB3E8', toe: '#FFFFFF' },
  { bg: ['#F4F6F9', '#E2E6EC'], ink: '#2E3138', sub: 'rgba(46,49,56,.66)', dot: '#7FB3E8', toe: '#3A3D43' },
] as const;
export const themeFor = (i: number, key: string) => (key === 'intro' || key === 'persona' ? THEMES[0] : key === 'invite' ? THEMES[1] : THEMES[1 + (i % 2)]);

function fontFamily() { try { return getComputedStyle(document.body).fontFamily || 'Manrope, sans-serif'; } catch { return 'Manrope, sans-serif'; } }
function fit(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight: number, ff: string) {
  let s = size; do { ctx.font = `${weight} ${s}px ${ff}`; if (ctx.measureText(text).width <= max) break; s -= 6; } while (s > 60); return s;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
/** Polštářek mark: 4 oval toes on an arc + baby blue pad (same geometry as PawMark). */
export function drawPaw(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, toe: string, tile?: string) {
  const k = size / 1024; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  if (tile) { ctx.fillStyle = tile; ctx.beginPath(); ctx.roundRect(0, 0, 1024, 1024, 230); ctx.fill(); }
  for (const [cx, cy, a] of [[255, 424.7, -56], [411.1, 304.9, -19], [612.9, 304.9, 19], [769, 424.7, 56]]) { ctx.save(); ctx.translate(cx, cy); ctx.rotate((a * Math.PI) / 180); ctx.fillStyle = toe; ctx.beginPath(); ctx.ellipse(0, 0, 62, 82, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#7FB3E8'; ctx.beginPath(); ctx.arc(512, 598, 200, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export async function renderSlide(s: Slide, i: number, total: number, opts: { photo?: string; qr?: string } = {}): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1920; const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!;
  { const f = ctx.fillText.bind(ctx), m = ctx.measureText.bind(ctx); ctx.fillText = (t: string, x: number, y: number, w?: number) => f(tr(t), x, y, w); ctx.measureText = (t: string) => m(tr(t)); }
  const th = themeFor(i, s.key); const ff = fontFamily();
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // dot pattern (brand system: tečky)
  ctx.fillStyle = th.ink; ctx.globalAlpha = 0.05; for (let y = 60; y < H; y += 72) for (let x = 60 + ((y / 72) % 2) * 36; x < W; x += 72) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  // progress
  for (let k = 0; k < total; k++) { ctx.fillStyle = th.ink; ctx.globalAlpha = k <= i ? 0.9 : 0.22; ctx.beginPath(); ctx.roundRect(64 + k * ((W - 128 + 12) / total), 64, (W - 128 + 12) / total - 12, 10, 5); ctx.fill(); } ctx.globalAlpha = 1;
  // header logo
  drawPaw(ctx, 64, 112, 92, th.toe, th === THEMES[1] ? '#3A3D43' : '#ECEFF3');
  ctx.fillStyle = th.ink; ctx.font = `800 54px ${ff}`; ctx.textBaseline = 'middle'; ctx.fillText('Tlapka', 176, 160); const tw = ctx.measureText('Tlapka').width; ctx.fillStyle = '#7FB3E8'; if (th === THEMES[0]) ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(176 + tw + 13, 176, 9, 0, 7); ctx.fill();
  ctx.textBaseline = 'alphabetic';
  // photo bubble on intro
  let y = 560;
  if (s.key === 'intro' && opts.photo) { const img = new Image(); img.src = opts.photo; await img.decode().catch(() => {}); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 520, 190, 0, 7); ctx.clip(); ctx.drawImage(img, W / 2 - 190, 330, 380, 380); ctx.restore(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(W / 2, 520, 197, 0, 7); ctx.stroke(); y = 860; }
  else if (s.key === 'intro' || s.key === 'persona') { drawPaw(ctx, W / 2 - 200, 300, 400, th.toe); y = 860; }
  // kicker
  ctx.textAlign = 'center'; ctx.fillStyle = th.sub; ctx.font = `800 46px ${ff}`; ctx.fillText(s.kicker.toUpperCase(), W / 2, y);
  // big
  const big = s.big + (s.unit ? ' ' + s.unit : '');
  const bs = fit(ctx, big, W - 140, s.big.length > 10 ? 150 : 260, 800, ff); ctx.font = `800 ${bs}px ${ff}`; ctx.fillStyle = th.ink;
  const bl = s.big.length > 12 ? wrap(ctx, s.big, W - 140) : [big];
  bl.forEach((l, k) => ctx.fillText(l, W / 2, y + 40 + bs * (k + 0.92)));
  y += 40 + bs * bl.length + 60;
  // pad dot as full stop
  ctx.fillStyle = th.dot; ctx.beginPath(); ctx.arc(W / 2, y, 16, 0, 7); ctx.fill(); y += 90;
  ctx.fillStyle = th.ink; ctx.font = `600 52px ${ff}`; wrap(ctx, s.line, W - 180).forEach((l, k) => ctx.fillText(l, W / 2, y + k * 68)); y += wrap(ctx, s.line, W - 180).length * 68 + 30;
  if (s.foot) { ctx.fillStyle = th.sub; ctx.font = `600 40px ${ff}`; wrap(ctx, s.foot, W - 200).forEach((l, k) => ctx.fillText(l, W / 2, y + 30 + k * 54)); }
  if (s.dots) { for (let k = 0; k < 4; k++) { ctx.fillStyle = k < s.dots ? th.dot : th.sub; ctx.globalAlpha = k < s.dots ? 1 : 0.3; ctx.beginPath(); ctx.arc(W / 2 - 84 + k * 56, H - 300, 16, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  if (s.key === 'invite' && opts.qr) { const q = new Image(); q.src = opts.qr; await q.decode().catch(() => {}); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(W / 2 - 230, H - 720, 460, 460, 48); ctx.fill(); ctx.drawImage(q, W / 2 - 200, H - 690, 400, 400); }
  ctx.fillStyle = th.sub; ctx.font = `600 34px ${ff}`; ctx.fillText('#TlapkaWrapped', W / 2, H - 120);
  return c;
}
