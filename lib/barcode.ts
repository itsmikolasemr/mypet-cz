'use client';
// Věrnostní karty: format detection, rendering (EAN-13 / Code128 via JsBarcode, QR via qrcode), scanning.
// Native: @capacitor-mlkit/barcode-scanning. Web: BarcodeDetector when available, else zxing-js.
import type { CardFormat } from './types';

export function eanOk(code: string) {
  if (!/^\d{13}$/.test(code)) return false;
  const d = [...code].map(Number); const sum = d.slice(0, 12).reduce((s, x, i) => s + x * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === d[12];
}
export const guessFormat = (code: string): CardFormat => (eanOk(code) ? 'EAN13' : /^[\x20-\x7e]{1,80}$/.test(code) ? 'CODE128' : 'QR');
/** Normalizes a raw scanner format name (ML Kit, BarcodeDetector, zxing) to ours. */
export function mapFormat(f: string | number | undefined, code: string): CardFormat {
  const s = String(f ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.includes('qr')) return 'QR';
  if (s.includes('ean13') && eanOk(code)) return 'EAN13';
  if (s.includes('upca') && /^\d{12}$/.test(code) && eanOk('0' + code)) return 'EAN13';
  return guessFormat(code) === 'QR' ? 'QR' : s.includes('code128') ? 'CODE128' : guessFormat(code);
}
export const normCode = (code: string, f: CardFormat) => (f === 'EAN13' && /^\d{12}$/.test(code) && eanOk('0' + code) ? '0' + code : code.trim());

/** Returns an SVG string, or null when the code cannot be encoded in that format. */
export async function renderSvg(code: string, format: CardFormat): Promise<string | null> {
  if (!code) return null;
  if (format === 'QR') { const QR = await import('qrcode'); return QR.toString(code, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' }); }
  if (format === 'EAN13' && !eanOk(code)) return null;
  const JsBarcode = (await import('jsbarcode')).default;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  let ok = true;
  try { JsBarcode(svg, code, { format, displayValue: true, margin: 8, height: 90, width: 2.4, fontSize: 18, background: '#ffffff', lineColor: '#000000', valid: (v: boolean) => { ok = v; } }); } catch { ok = false; }
  return ok ? svg.outerHTML : null;
}

export type ScanResult = { code: string; format: CardFormat };
const native = async () => { try { const { Capacitor } = await import('@capacitor/core'); return Capacitor.isNativePlatform(); } catch { return false; } };

/** Native camera scanner (ML Kit). */
async function scanNative(): Promise<ScanResult | null> {
  const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
  const perm = await BarcodeScanner.requestPermissions();
  if (perm.camera !== 'granted' && perm.camera !== 'limited') throw new Error('camera-denied');
  const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.QrCode] });
  const b = barcodes[0]; if (!b?.rawValue) return null;
  const format = mapFormat(b.format, b.rawValue); return { code: normCode(b.rawValue, format), format };
}

type Detector = { detect: (s: CanvasImageSource | ImageBitmap) => Promise<{ rawValue: string; format: string }[]> };
async function detector(): Promise<Detector | null> {
  const BD = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (!BD) return null;
  try { const sup = (await BD.getSupportedFormats?.()) ?? []; if (!sup.length) return null; return new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'qr_code'].filter((f) => sup.includes(f)) }); } catch { return null; }
}

/** Decode a still photo of a card (web fallback, also works without camera permission). */
export async function scanImage(file: Blob): Promise<ScanResult | null> {
  const bd = await detector();
  if (bd) { try { const r = (await bd.detect(await createImageBitmap(file)))[0]; if (r) { const f = mapFormat(r.format, r.rawValue); return { code: normCode(r.rawValue, f), format: f }; } } catch { /* fall through */ } }
  // no hit (or no native detector): zxing
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const { DecodeHintType } = await import('@zxing/library');
  const url = URL.createObjectURL(file);
  try {
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
    const r = await new BrowserMultiFormatReader(hints).decodeFromImageUrl(url);
    const raw = r.getText(); const { BarcodeFormat } = await import('@zxing/library');
    const f = mapFormat(BarcodeFormat[r.getBarcodeFormat()], raw); return { code: normCode(raw, f), format: f };
  } catch {
    // retry on downscaled canvases (huge phone photos, some engines' image decode paths)
    try {
      const img = await createImageBitmap(file); const { BarcodeFormat } = await import('@zxing/library');
      for (const max of [640, 400, 1000]) {
        const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k) + 40; cv.height = Math.round(img.height * k) + 40; const g = cv.getContext('2d')!;
        g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 20, 20, cv.width - 40, cv.height - 40);
        try { const r = new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER, true]])).decodeFromCanvas(cv); const raw = r.getText(); const f = mapFormat(BarcodeFormat[r.getBarcodeFormat()], raw); return { code: normCode(raw, f), format: f }; } catch { /* next size */ }
      }
    } catch { /* unreadable */ }
    return null;
  } finally { URL.revokeObjectURL(url); }
}

/** Live web camera scan into a <video>; resolves on first code. Returns a stop() too. */
export function scanVideo(video: HTMLVideoElement): { result: Promise<ScanResult>; stop: () => void } {
  let stopped = false, stream: MediaStream | null = null, zx: { stop: () => void } | null = null;
  const stop = () => { stopped = true; zx?.stop(); stream?.getTracks().forEach((t) => t.stop()); };
  const result = (async () => {
    const bd = await detector();
    if (bd) {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream; await video.play();
      while (!stopped) {
        try { const r = (await bd.detect(video))[0]; if (r) { stop(); const f = mapFormat(r.format, r.rawValue); return { code: normCode(r.rawValue, f), format: f }; } } catch { /* frame not ready */ }
        await new Promise((ok) => setTimeout(ok, 150));
      }
      throw new Error('stopped');
    }
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    return await new Promise<ScanResult>((ok, bad) => {
      new BrowserMultiFormatReader().decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (r, _e, ctl) => {
        zx = ctl; if (stopped) { ctl.stop(); bad(new Error('stopped')); return; }
        if (r) { ctl.stop(); stop(); const raw = r.getText(); import('@zxing/library').then(({ BarcodeFormat }) => { const f = mapFormat(BarcodeFormat[r.getBarcodeFormat()], raw); ok({ code: normCode(raw, f), format: f }); }); }
      }).then((c) => { zx = c; }).catch(bad);
    });
  })();
  return { result, stop };
}

export const isNative = native;
export const scanNativeCamera = scanNative;

/** Cashier mode: max brightness + keep screen on. Returns restore(). */
export async function cashierMode(): Promise<() => void> {
  let lock: { release: () => Promise<void> } | null = null, restoreB: (() => void) | null = null;
  try { lock = await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { /* unsupported */ }
  if (await native()) {
    try {
      const { ScreenBrightness } = await import('@capacitor-community/screen-brightness');
      const { brightness } = await ScreenBrightness.getBrightness(); await ScreenBrightness.setBrightness({ brightness: 1 });
      restoreB = () => { ScreenBrightness.setBrightness({ brightness }).catch(() => {}); };
    } catch { /* plugin missing */ }
  }
  return () => { lock?.release().catch(() => {}); restoreB?.(); };
}
