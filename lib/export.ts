// Free "Tvoje data jsou tvoje": one ZIP with JSON backup (re-importable), CSV per table, PDF pass per pet and all stored files.
import type { AppData } from './types';
import { loadBlob } from './docs';
import { healthPassPdf } from './pdf';

const csvCell = (v: unknown) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(rows: Record<string, unknown>[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== 'photo');
  return '\ufeff' + [cols.join(';'), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(';'))].join('\r\n');
}
const safe = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._-]+/gi, '_').slice(0, 60);

export async function exportZip(data: AppData): Promise<Blob> {
  const { zipSync, strToU8 } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  const { trash: _t, ...clean } = data; void _t;
  files['tlapka-zaloha.json'] = strToU8(JSON.stringify({ ...clean, exportedAt: new Date().toISOString() }, null, 2));
  const petName = (id: string) => data.pets.find((p) => p.id === id)?.name ?? '';
  files['csv/mazlicci.csv'] = strToU8(toCsv(data.pets.map(({ weights, ...p }) => ({ ...p, vahy: weights.map((w) => `${w.date}:${w.kg}`).join(' ') }))));
  files['csv/pripominky.csv'] = strToU8(toCsv(data.reminders.map((r) => ({ mazlicek: petName(r.petId), ...r, history: r.history.join(' ') }))));
  files['csv/navstevy.csv'] = strToU8(toCsv(data.visits.map((v) => ({ mazlicek: petName(v.petId), ...v }))));
  files['csv/leky.csv'] = strToU8(toCsv(data.meds.map((m) => ({ mazlicek: petName(m.petId), ...m }))));
  files['csv/alergie.csv'] = strToU8(toCsv(data.allergies.map((a) => ({ mazlicek: petName(a.petId), ...a }))));
  files['csv/dokumenty.csv'] = strToU8(toCsv(data.docs.map((d) => ({ mazlicek: petName(d.petId), ...d }))));
  for (const p of data.pets) {
    try { files[`pdf/${safe(p.name)}-zdravotni-pas.pdf`] = new Uint8Array(await (await healthPassPdf(data, p)).arrayBuffer()); } catch {}
  }
  for (const d of data.docs) {
    const b = await loadBlob(d.id, d.mime).catch(() => null);
    if (b) files[`soubory/${safe(petName(d.petId))}/${d.date}-${safe(d.name)}`] = new Uint8Array(await b.arrayBuffer());
  }
  files['CTI-ME.txt'] = strToU8('Export z aplikace Tlapka.\n- tlapka-zaloha.json: kompletní záloha, lze nahrát zpět (Nastavení → Obnovit ze zálohy)\n- csv/: tabulky pro Excel (oddělovač ;)\n- pdf/: zdravotní pas každého mazlíčka\n- soubory/: uložené doklady\n');
  return new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' });
}

/** Downscale a photo to a JPEG data URL (keeps AI requests small and fast). */
export async function imageToDataUrl(file: Blob, max = 1600, q = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
export const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();
