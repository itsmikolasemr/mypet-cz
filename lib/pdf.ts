// Premium: PDF health pass ("zdravotní pas") with QR summary. Lazy-loaded, fully on-device.
import type { AppData, Pet } from './types';
import { age, fmtDate, speciesOf, typeOf, today } from './utils';
import { SEVERITY } from '@/components/forms';

const SEX: Record<string, string> = { samec: 'samec', samice: 'samice', nezname: 'neuvedeno' };

export async function healthPassPdf(data: AppData, pet: Pet): Promise<Blob> {
  const [{ PDFDocument, rgb }, fontkit, QR] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit').then((m) => m.default), import('qrcode')]);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [reg, bold] = await Promise.all(['/fonts/LiberationSans-Regular.ttf', '/fonts/LiberationSans-Bold.ttf'].map((u) => fetch(u).then((r) => r.arrayBuffer())));
  const F = await doc.embedFont(reg, { subset: true }), B = await doc.embedFont(bold, { subset: true });
  doc.setTitle(`Zdravotní pas – ${pet.name}`); doc.setCreator('Tlapka'); doc.setLanguage('cs');
  const W = 595, H = 842, M = 44;
  let page = doc.addPage([W, H]); let y = H - M;
  const ink = rgb(0.23, 0.16, 0.14), muted = rgb(0.46, 0.38, 0.35), brand = rgb(0.91, 0.33, 0.23), red = rgb(0.75, 0.1, 0.1);
  const ensure = (h: number) => { if (y - h < M) { page = doc.addPage([W, H]); y = H - M; } };
  const wrap = (t: string, font = F, size = 10.5, maxW = W - 2 * M) => {
    const out: string[] = []; for (const para of t.split('\n')) { let line = ''; for (const w of para.split(' ')) { const tryL = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(tryL, size) > maxW && line) { out.push(line); line = w; } else line = tryL; } out.push(line); } return out;
  };
  const text = (t: string, o: { font?: typeof F; size?: number; color?: ReturnType<typeof rgb>; x?: number; maxW?: number } = {}) => {
    const size = o.size ?? 10.5; for (const l of wrap(t, o.font ?? F, size, o.maxW)) { ensure(size + 4); page.drawText(l, { x: o.x ?? M, y: y - size, size, font: o.font ?? F, color: o.color ?? ink }); y -= size + 4; }
  };
  const h2 = (t: string) => { y -= 10; ensure(30); page.drawText(t, { x: M, y: y - 13, size: 13, font: B, color: brand }); y -= 18; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rgb(0.93, 0.85, 0.8) }); y -= 6; };

  // header band
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: brand });
  page.drawText('Zdravotní pas', { x: M, y: H - 46, size: 24, font: B, color: rgb(1, 1, 1) });
  page.drawText(`${pet.name} · vygenerováno v aplikaci Tlapka ${fmtDate(today())}`, { x: M, y: H - 70, size: 11, font: F, color: rgb(1, 0.93, 0.88) });
  y = H - 120;

  const meds = data.meds.filter((m) => m.petId === pet.id && (!m.end || m.end >= today()));
  const allergies = data.allergies.filter((a) => a.petId === pet.id);
  const w = pet.weights[pet.weights.length - 1];
  const summary = [`Tlapka – ${pet.name}`, `${speciesOf(pet.species).name}${pet.breed ? ', ' + pet.breed : ''}`, pet.microchip ? `Čip: ${pet.microchip}` : '', allergies.length ? `ALERGIE: ${allergies.map((a) => a.allergen).join(', ')}` : 'Alergie: žádné', meds.length ? `Léky: ${meds.map((m) => `${m.name} ${m.dose}`.trim()).join('; ')}` : ''].filter(Boolean).join('\n');
  const qr = await doc.embedPng(await QR.toDataURL(summary, { margin: 1, width: 300, errorCorrectionLevel: 'M' }));
  const top = y;
  page.drawImage(qr, { x: W - M - 110, y: top - 110, width: 110, height: 110 });
  page.drawText('QR: shrnutí pro veterináře', { x: W - M - 110, y: top - 122, size: 7.5, font: F, color: muted });
  if (pet.photo && /^data:image\/(jpeg|jpg|png)/.test(pet.photo)) {
    try { const img = pet.photo.includes('png') ? await doc.embedPng(pet.photo) : await doc.embedJpg(pet.photo); page.drawImage(img, { x: M, y: top - 96, width: 96, height: 96 }); } catch {}
  }
  const col = pet.photo ? M + 112 : M;
  const rows: [string, string][] = [['Jméno', pet.name], ['Druh / plemeno', `${speciesOf(pet.species).name}${pet.breed ? ' – ' + pet.breed : ''}`], ['Pohlaví', SEX[pet.sex] ?? ''], ['Narození', pet.birthDate ? `${fmtDate(pet.birthDate)} (${age(pet.birthDate)})` : 'neuvedeno'], ['Číslo čipu', pet.microchip || 'neuvedeno'], ['Barva', pet.color || '–'], ['Poslední váha', w ? `${w.kg} kg (${fmtDate(w.date)})` : 'neuvedeno']];
  for (const [k, v] of rows) { page.drawText(k, { x: col, y: y - 10, size: 8.5, font: F, color: muted }); page.drawText(v, { x: col + 92, y: y - 10, size: 10.5, font: B, color: ink, maxWidth: W - M - 120 - col - 92 }); y -= 16; }
  y = Math.min(y, top - 132);

  h2('Alergie a intolerance');
  if (!allergies.length) text('Žádné zaznamenané.', { color: muted });
  for (const a of allergies) text(`• ${a.allergen}${a.reaction ? ' – ' + a.reaction : ''} (${SEVERITY.find((s) => s.id === a.severity)?.n ?? a.severity})`, { font: B, color: red });
  h2('Aktuální léky');
  if (!meds.length) text('Žádné.', { color: muted });
  for (const m of meds) text(`• ${m.name}${m.dose ? ', ' + m.dose : ''}${m.frequency ? ', ' + m.frequency : ''} – od ${fmtDate(m.start)}${m.end ? ' do ' + fmtDate(m.end) : ''}`);
  h2('Očkování a prevence');
  const prev = data.reminders.filter((r) => r.petId === pet.id && ['ockovani', 'odcerveni', 'antiparazitika'].includes(r.type));
  if (!prev.length) text('Žádné záznamy.', { color: muted });
  for (const r of prev) text(`• ${typeOf(r.type).name}: ${r.title}${r.product ? ' (' + r.product + ')' : ''} – provedeno: ${r.history.length ? r.history.slice(-4).map(fmtDate).join(', ') : '–'}; další termín: ${r.completedAt ? 'splněno' : fmtDate(r.dueDate)}`);
  h2('Návštěvy veterináře');
  const visits = data.visits.filter((v) => v.petId === pet.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  if (!visits.length) text('Žádné záznamy.', { color: muted });
  for (const v of visits) text(`• ${fmtDate(v.date)} – ${v.reason || 'návštěva'}${v.clinic ? ', ' + v.clinic : ''}${v.notes ? '. ' + v.notes : ''}`);
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
