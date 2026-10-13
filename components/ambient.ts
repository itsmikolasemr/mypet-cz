'use client';
import { useEffect, useState } from 'react';

const cache = new Map<string, string>();
/** Dominant, slightly saturated colour of a pet photo (data URL) – used to tint the UI around that pet. */
export function useAmbient(photo?: string) {
  const [c, setC] = useState<string | undefined>(photo ? cache.get(photo) : undefined);
  useEffect(() => {
    if (!photo) { setC(undefined); return; }
    if (cache.has(photo)) { setC(cache.get(photo)); return; }
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 24;
      const g = cv.getContext('2d', { willReadFrequently: true }); if (!g) return;
      g.drawImage(img, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data;
      let r = 0, gg = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const sat = mx ? (mx - mn) / mx : 0, lum = (mx + mn) / 2;
        const wt = 0.15 + sat * (lum > 30 && lum < 235 ? 1 : 0.1); // favour colourful mid-tones over background white/black
        r += d[i] * wt; gg += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
      }
      const hex = '#' + [r, gg, b].map((v) => Math.round(v / w).toString(16).padStart(2, '0')).join('');
      cache.set(photo, hex); setC(hex);
    };
    img.src = photo;
  }, [photo]);
  return c;
}
