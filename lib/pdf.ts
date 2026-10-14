import { tr, curLang, withLang, type DocLang } from './i18n';
import { loc } from './i18n';
// Premium: PDF health pass ("zdravotní pas") with QR summary. Lazy-loaded, fully on-device.
import type { AppData, Pet } from './types';
import type { PDFPage, rgb as RgbFn } from 'pdf-lib';
import { age, fmtDate, speciesOf, typeOf, today } from './utils';
import { SEVERITY } from '@/components/forms';

const SEX: Record<string, string> = { samec: 'samec', samice: 'samice', nezname: 'neuvedeno' };

/** Polštářek brand mark (light tile, 4 graphite toes, baby-blue pad) drawn as vectors; s = tile size in pt, (x,y) = bottom-left. */
function drawMark(page: PDFPage, rgb: typeof RgbFn, x: number, y: number, s: number) {
  const k = s / 1024, r = 230 * k;
  page.drawSvgPath(`M${r},0 H${s - r} A${r},${r} 0 0 1 ${s},${r} V${s - r} A${r},${r} 0 0 1 ${s - r},${s} H${r} A${r},${r} 0 0 1 0,${s - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`, { x, y: y + s, color: rgb(0.925, 0.937, 0.953) });
  const toe = rgb(0.227, 0.239, 0.263);
  // toe beans: rotated ellipses (SVG rotation is clockwise with y down → negate for PDF's y-up)
  for (const [cx, cy, a] of [[255, 424.7, -56], [411.1, 304.9, -19], [612.9, 304.9, 19], [769, 424.7, 56]]) page.drawEllipse({ x: x + cx * k, y: y + s - cy * k, xScale: 62 * k, yScale: 82 * k, rotate: { type: 'degrees', angle: -a } as never, color: toe });
  page.drawCircle({ x: x + 512 * k, y: y + s - 598 * k, size: 200 * k, color: rgb(0.498, 0.702, 0.91) });
}

/** lang: document language override – 'en' / 'de' for travel (Cestovní režim), default = UI language. */
export async function healthPassPdf(data: AppData, pet: Pet, lang?: DocLang): Promise<Blob> {
  return lang ? withLang(lang, () => passPdf(data, pet)) : passPdf(data, pet);
}
const ageText = (b: string) => { const a = age(b); if (curLang() !== 'de') return tr(a); const n = a.match(/\d+/)?.[0] ?? ''; return /měs/.test(a) ? `${n} Monate` : /týd/.test(a) ? `${n} Wochen` : `${n} Jahre`; };
async function passPdf(data: AppData, pet: Pet): Promise<Blob> {
  const [{ PDFDocument, rgb }, fontkit, QR] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit').then((m) => m.default), import('qrcode')]);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [reg, bold] = await Promise.all(['/fonts/LiberationSans-Regular.ttf', '/fonts/LiberationSans-Bold.ttf'].map((u) => fetch(u).then((r) => r.arrayBuffer())));
  const F = await doc.embedFont(reg, { subset: true }), B = await doc.embedFont(bold, { subset: true });
  doc.setTitle(`${tr('Zdravotní pas')} – ${pet.name}`); doc.setCreator('Tlapka'); doc.setLanguage(curLang());
  const W = 595, H = 842, M = 44;
  let page = doc.addPage([W, H]); let y = H - M;
  const ink = rgb(0.114, 0.118, 0.133), muted = rgb(0.337, 0.357, 0.388), brand = rgb(0.498, 0.702, 0.91), brandText = rgb(0.141, 0.376, 0.624), navy = rgb(0.059, 0.145, 0.251), red = rgb(0.75, 0.1, 0.1);
  const ensure = (h: number) => { if (y - h < M) { page = doc.addPage([W, H]); y = H - M; } };
  const wrap = (t: string, font = F, size = 10.5, maxW = W - 2 * M) => {
    const out: string[] = []; for (const para of t.split('\n')) { let line = ''; for (const w of para.split(' ')) { const tryL = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(tryL, size) > maxW && line) { out.push(line); line = w; } else line = tryL; } out.push(line); } return out;
  };
  const text = (t0: string, o: { font?: typeof F; size?: number; color?: ReturnType<typeof rgb>; x?: number; maxW?: number } = {}) => { const t = tr(t0);
    const size = o.size ?? 10.5; for (const l of wrap(t, o.font ?? F, size, o.maxW)) { ensure(size + 4); page.drawText(l, { x: o.x ?? M, y: y - size, size, font: o.font ?? F, color: o.color ?? ink }); y -= size + 4; }
  };
  const h2 = (t0: string) => { const t = tr(t0); y -= 10; ensure(30); page.drawText(t, { x: M, y: y - 13, size: 13, font: B, color: brandText }); y -= 18; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rgb(0.85, 0.9, 0.96) }); y -= 6; };

  // header band
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: brand });
  drawMark(page, rgb, W - M - 56, H - 76, 56);
  page.drawText(tr('Zdravotní pas'), { x: M, y: H - 46, size: 24, font: B, color: navy });
  page.drawText(`${pet.name} · ${tr('vygenerováno v aplikaci Tlapka')} ${fmtDate(today())}`, { x: M, y: H - 70, size: 11, font: F, color: navy });
  y = H - 120;

  const meds = data.meds.filter((m) => m.petId === pet.id && (!m.end || m.end >= today()));
  const allergies = data.allergies.filter((a) => a.petId === pet.id);
  const w = pet.weights[pet.weights.length - 1];
  const summary = [`Tlapka – ${pet.name}`, `${tr(speciesOf(pet.species).name)}${pet.breed ? ', ' + pet.breed : ''}`, pet.microchip ? `${tr('Čip')}: ${pet.microchip}` : '', allergies.length ? `${tr('ALERGIE')}: ${allergies.map((a) => a.allergen).join(', ')}` : `${tr('Alergie')}: ${tr('žádné')}`, meds.length ? `Léky: ${meds.map((m) => `${m.name} ${m.dose}`.trim()).join('; ')}` : ''].filter(Boolean).join('\n');
  const qr = await doc.embedPng(await QR.toDataURL(summary, { margin: 1, width: 300, errorCorrectionLevel: 'M' }));
  const top = y;
  page.drawImage(qr, { x: W - M - 110, y: top - 110, width: 110, height: 110 });
  page.drawText(tr('QR: shrnutí pro veterináře'), { x: W - M - 110, y: top - 122, size: 7.5, font: F, color: muted });
  if (pet.photo && /^data:image\/(jpeg|jpg|png)/.test(pet.photo)) {
    try { const img = pet.photo.includes('png') ? await doc.embedPng(pet.photo) : await doc.embedJpg(pet.photo); page.drawImage(img, { x: M, y: top - 96, width: 96, height: 96 }); } catch {}
  }
  const col = pet.photo ? M + 112 : M;
  const rows: [string, string][] = [['Jméno', pet.name], ['Druh / plemeno', `${tr(speciesOf(pet.species).name)}${pet.breed ? ' – ' + pet.breed : ''}`], ['Pohlaví', tr(SEX[pet.sex] ?? '')], ['Narození', pet.birthDate ? `${fmtDate(pet.birthDate)} (${ageText(pet.birthDate)})` : tr('neuvedeno')], ['Číslo čipu', pet.microchip || tr('neuvedeno')], ['Barva', pet.color || '–'], ['Poslední váha', w ? `${w.kg.toLocaleString(loc())} kg (${fmtDate(w.date)})` : tr('neuvedeno')]];
  for (const [k, v] of rows) { page.drawText(tr(k), { x: col, y: y - 10, size: 8.5, font: F, color: muted }); page.drawText(v, { x: col + 92, y: y - 10, size: 10.5, font: B, color: ink, maxWidth: W - M - 120 - col - 92 }); y -= 16; }
  y = Math.min(y, top - 132);

  h2('Alergie a intolerance');
  if (!allergies.length) text('Žádné zaznamenané.', { color: muted });
  for (const a of allergies) text(`• ${a.allergen}${a.reaction ? ' – ' + a.reaction : ''} (${tr(SEVERITY.find((s) => s.id === a.severity)?.n ?? a.severity).toLowerCase()})`, { font: B, color: red });
  h2('Aktuální léky');
  if (!meds.length) text('Žádné.', { color: muted });
  for (const m of meds) text(`• ${m.name}${m.dose ? ', ' + m.dose : ''}${m.frequency ? ', ' + tr(m.frequency) : ''} – ${tr('od')} ${fmtDate(m.start)}${m.end ? ` ${tr('do')} ` + fmtDate(m.end) : ''}`);
  h2('Očkování a prevence');
  const prev = data.reminders.filter((r) => r.petId === pet.id && ['ockovani', 'odcerveni', 'antiparazitika'].includes(r.type));
  if (!prev.length) text('Žádné záznamy.', { color: muted });
  for (const r of prev) text(`• ${tr(typeOf(r.type).name)}: ${tr(r.title)}${r.product ? ' (' + r.product + ')' : ''} – ${tr('provedeno')}: ${r.history.length ? r.history.slice(-4).map(fmtDate).join(', ') : '–'}; ${tr('další termín')}: ${r.completedAt ? tr('splněno') : fmtDate(r.dueDate)}`);
  h2('Návštěvy veterináře');
  const visits = data.visits.filter((v) => v.petId === pet.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  if (!visits.length) text('Žádné záznamy.', { color: muted });
  for (const v of visits) text(`• ${fmtDate(v.date)} – ${v.reason ? tr(v.reason) : tr('návštěva')}${v.clinic ? ', ' + v.clinic : ''}${v.notes ? '. ' + v.notes : ''}`);
  if (pet.notes) { h2('Poznámky'); text(pet.notes); }
  y -= 14; text('Dokument vytvořil majitel v aplikaci Tlapka z vlastních záznamů. Nejde o úřední doklad ani o EU pas zvířete.', { size: 8, color: muted });
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

export async function saveOrShare(blob: Blob, name: string) {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    const w = await Filesystem.writeFile({ path: name, data: b64, directory: Directory.Documents, recursive: true });
    return w.uri;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return name;
}

/** Generic simple document (sections of lines) in the Tlapka style — used for the sitter handover card. */
export async function simplePdf(title: string, subtitle: string, sections: { h: string; lines: string[]; alert?: boolean }[], footer: string): Promise<Blob> {
  const [{ PDFDocument, rgb }, fontkit] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit').then((m) => m.default)]);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const [reg, bold] = await Promise.all(['/fonts/LiberationSans-Regular.ttf', '/fonts/LiberationSans-Bold.ttf'].map((u) => fetch(u).then((r) => r.arrayBuffer())));
  const F = await doc.embedFont(reg, { subset: true }), B = await doc.embedFont(bold, { subset: true });
  doc.setTitle(title); doc.setCreator('Tlapka'); doc.setLanguage(curLang());
  const W = 595, H = 842, M = 44; let page = doc.addPage([W, H]); let y = H - M;
  const ink = rgb(0.114, 0.118, 0.133), muted = rgb(0.337, 0.357, 0.388), navy = rgb(0.059, 0.145, 0.251), brandText = rgb(0.141, 0.376, 0.624), red = rgb(0.7, 0.08, 0.08);
  const ensure = (h: number) => { if (y - h < M) { page = doc.addPage([W, H]); y = H - M; } };
  const wrap = (t: string, font: typeof F, size: number) => { const out: string[] = []; for (const para of t.split('\n')) { let line = ''; for (const w of para.split(' ')) { const tryL = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(tryL, size) > W - 2 * M && line) { out.push(line); line = w; } else line = tryL; } out.push(line); } return out; };
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: rgb(0.498, 0.702, 0.91) });
  drawMark(page, rgb, W - M - 56, H - 76, 56);
  page.drawText(title, { x: M, y: H - 46, size: 22, font: B, color: navy }); page.drawText(subtitle, { x: M, y: H - 70, size: 11, font: F, color: navy });
  y = H - 120;
  for (const s of sections) {
    if (!s.lines.length) continue;
    y -= 8; ensure(34); page.drawText(s.h, { x: M, y: y - 13, size: 13, font: B, color: s.alert ? red : brandText }); y -= 18;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rgb(0.85, 0.9, 0.96) }); y -= 6;
    for (const t of s.lines) for (const l of wrap(t, s.alert ? B : F, 10.5)) { ensure(15); page.drawText(l, { x: M, y: y - 10.5, size: 10.5, font: s.alert ? B : F, color: s.alert ? red : ink }); y -= 14.5; }
  }
  y -= 14; ensure(12); page.drawText(footer, { x: M, y: y - 8, size: 8, font: F, color: muted });
  return new Blob([(await doc.save()) as BlobPart], { type: 'application/pdf' });
}
