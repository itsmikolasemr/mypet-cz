/**
 * Tlapka Story (v1.2): one-tap 1080×1920 IG story of the pet's day (photo/avatar + today's ticked tasks + streak + invite QR),
 * and the sticker pack (512×512 transparent PNG, avatar + Polštářek phrases) for WhatsApp / iMessage / IG.
 */
import type { AppData, Pet } from './types';
import { todayTasks } from './today';
import { careDays, streak } from './badges';
import { drawPaw } from './wrappedCanvas';
import { avatarImage } from './avatar';
import { tr, loc } from './i18n';

const ff = () => { try { return getComputedStyle(document.body).fontFamily || 'Manrope, sans-serif'; } catch { return 'Manrope, sans-serif'; } };
async function img(src: string) { const i = new Image(); i.src = src; await i.decode(); return i; }
function trCtx(ctx: CanvasRenderingContext2D) { const f = ctx.fillText.bind(ctx), m = ctx.measureText.bind(ctx); ctx.fillText = (t, x, y, w) => f(tr(t), x, y, w); ctx.measureText = (t) => m(tr(t)); }

export async function renderStory(data: AppData, pet: Pet, opts: { qr?: string; theme?: 'light' | 'dark' } = {}): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!; trCtx(ctx);
  const dark = opts.theme === 'dark', F = ff();
  const ink = dark ? '#FFFFFF' : '#2E3138', sub = dark ? 'rgba(255,255,255,.66)' : 'rgba(46,49,56,.62)', card = dark ? '#2E3138' : '#FFFFFF';
  const g = ctx.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, dark ? '#2E3138' : '#F4F6F9'); g.addColorStop(1, dark ? '#16181C' : '#DCE3EB'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ink; ctx.globalAlpha = 0.05; for (let y = 60; y < H; y += 72) for (let x = 60 + ((y / 72) % 2) * 36; x < W; x += 72) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  drawPaw(ctx, 72, 96, 96, dark ? '#FFFFFF' : '#3A3D43', dark ? '#3A3D43' : '#ECEFF3');
  ctx.textBaseline = 'middle'; ctx.fillStyle = ink; ctx.font = `800 56px ${F}`; ctx.fillText('Tlapka', 188, 146); const tw = ctx.measureText('Tlapka').width;
  ctx.fillStyle = '#7FB3E8'; ctx.beginPath(); ctx.arc(188 + tw + 14, 162, 9, 0, 7); ctx.fill();
  const date = new Date().toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
  ctx.fillStyle = sub; ctx.font = `700 40px ${F}`; ctx.textAlign = 'right'; ctx.fillText(date, W - 72, 146); ctx.textAlign = 'left';
  // portrait
  const R = 250, cx = W / 2, cy = 520;
  ctx.fillStyle = '#7FB3E8'; ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
  const pic = pet.photo ? await img(pet.photo).catch(() => null) : null;
  if (pic) { const s = Math.max((2 * R) / pic.width, (2 * R) / pic.height); ctx.drawImage(pic, cx - (pic.width * s) / 2, cy - (pic.height * s) / 2, pic.width * s, pic.height * s); }
  else { ctx.fillStyle = '#ECEFF3'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); ctx.drawImage(await avatarImage(pet, 2 * R, false), cx - R, cy - R, 2 * R, 2 * R); }
  ctx.restore();
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = `800 104px ${F}`; ctx.fillText(pet.name, cx, cy + R + 120);
  const tasks = todayTasks(data).filter((t) => t.petId === pet.id); const done = tasks.filter((t) => t.done);
  const st = streak(careDays(data, pet.id));
  ctx.fillStyle = sub; ctx.font = `700 44px ${F}`;
  ctx.fillText(tasks.length ? `${done.length} z ${tasks.length} hotovo` : 'Den v pohodě', cx, cy + R + 200); ctx.textAlign = 'left';
  // task card
  const top = cy + R + 270, rows = (done.length ? done : tasks).slice(0, 5), ch = 120 + rows.length * 104;
  ctx.fillStyle = card; ctx.globalAlpha = dark ? 0.9 : 0.94; ctx.beginPath(); ctx.roundRect(72, top, W - 144, Math.max(ch, 200), 48); ctx.fill(); ctx.globalAlpha = 1;
  rows.forEach((t, i) => {
    const y = top + 92 + i * 104;
    ctx.fillStyle = t.done ? '#7FB3E8' : 'rgba(127,179,232,.25)'; ctx.beginPath(); ctx.arc(140, y, 30, 0, 7); ctx.fill();
    if (t.done) { ctx.strokeStyle = '#0F2540'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(126, y + 1); ctx.lineTo(137, y + 12); ctx.lineTo(156, y - 10); ctx.stroke(); }
    ctx.fillStyle = ink; ctx.font = `700 46px ${F}`; ctx.fillText(t.kind === 'walk' ? 'Venčení' : t.title, 200, y - 4, W - 360);
    if (t.time) { ctx.fillStyle = sub; ctx.font = `600 36px ${F}`; ctx.textAlign = 'right'; ctx.fillText(t.time, W - 120, y); ctx.textAlign = 'left'; }
  });
  if (!rows.length) { ctx.fillStyle = sub; ctx.font = `600 42px ${F}`; ctx.fillText('Dnes žádné úkoly – jen mazlení.', 130, top + 100); }
  // streak dots (max 7) – the brand "řada teček"
  const dy = top + Math.max(ch, 200) + 90;
  for (let k = 0; k < 7; k++) { ctx.fillStyle = k < Math.min(7, st) ? '#7FB3E8' : (dark ? 'rgba(255,255,255,.18)' : 'rgba(46,49,56,.14)'); ctx.beginPath(); ctx.arc(cx - 3 * 64 + k * 64, dy, 20, 0, 7); ctx.fill(); }
  ctx.fillStyle = sub; ctx.font = `700 38px ${F}`; ctx.textAlign = 'center'; ctx.fillText(st > 1 ? `${st} dní péče v řadě` : 'Péče začíná dnes', cx, dy + 70); ctx.textAlign = 'left';
  // footer invite
  if (opts.qr) { const q = await img(opts.qr); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(W - 72 - 220, H - 72 - 220, 220, 220, 28); ctx.fill(); ctx.drawImage(q, W - 72 - 205, H - 72 - 205, 190, 190); }
  ctx.fillStyle = ink; ctx.font = `800 46px ${F}`; ctx.fillText('Pečuj s námi', 72, H - 210);
  ctx.fillStyle = sub; ctx.font = `600 36px ${F}`; ctx.fillText('Tlapka – péče o mazlíčky, zdarma', 72, H - 150);
  return c;
}

export const STICKERS = ['Krmeno ✓', 'Jdeme ven', 'Dobré ráno', 'Venčeno', 'Hotovo!', 'Spinkám', 'Mazlení', 'Díky!'];
export async function renderSticker(pet: Pet, text: string, size = 512): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d')!; trCtx(ctx); const k = size / 512, F = ff();
  // white die-cut outline like real stickers
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(256 * k, 216 * k, 196 * k, 0, 7); ctx.fill();
  ctx.drawImage(await avatarImage(pet, Math.round(360 * k), false), 76 * k, 36 * k, 360 * k, 360 * k);
  ctx.font = `800 ${54 * k}px ${F}`; const label = tr(text); const w = Math.min(470 * k, ctx.measureText(label).width + 64 * k);
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect((512 * k - w) / 2 - 8 * k, 370 * k, w + 16 * k, 112 * k, 56 * k); ctx.fill();
  ctx.fillStyle = '#7FB3E8'; ctx.beginPath(); ctx.roundRect((512 * k - w) / 2, 378 * k, w, 96 * k, 48 * k); ctx.fill();
  ctx.fillStyle = '#0F2540'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256 * k, 428 * k, w - 32 * k);
  return c;
}
export const toBlob = (c: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>((r) => c.toBlob((b) => r(b!), type));
