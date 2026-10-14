/**
 * Flat brand avatar of a pet (no AI needed): geometric head in the Tlapka dot language – circles and ovals only,
 * palette limited to brand tones (baby blue, graphite, light grey, white). Deterministic from species + colour + name,
 * so it is stable across devices. Used on the profile, in Story, stickers and the friend QR card.
 * AI-generated portraits (Gemini image) are an optional upgrade documented in docs/GROWTH.md.
 */
import type { Pet, Species } from './types';

const FUR: [RegExp, string, string][] = [
  [/čern|black|tmav/i, '#3A3D43', '#FFFFFF'],
  [/bíl|white|krém/i, '#F4F6F9', '#3A3D43'],
  [/šed|modr|grey|gray|blue|stříbr/i, '#B8C4D2', '#2E3138'],
  [/hněd|brown|čokol|zlat|gold|písk|rezav|red|béž/i, '#DCE3EB', '#3A3D43'],
];
const furOf = (color: string, name: string): [string, string] => {
  for (const [re, f, e] of FUR) if (re.test(color)) return [f, e];
  const pal: [string, string][] = [['#DCE3EB', '#3A3D43'], ['#A9CEF3', '#0F2540'], ['#3A3D43', '#FFFFFF']];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997; return pal[h % pal.length];
};

/** Ear geometry per species (ellipses: cx, cy, rx, ry, rot). */
const EARS: Record<Species, [number, number, number, number, number][]> = {
  pes: [[118, 132, 46, 74, -28], [394, 132, 46, 74, 28]],
  kocka: [[150, 118, 44, 70, -18], [362, 118, 44, 70, 18]],
  kralik: [[196, 60, 36, 110, -8], [316, 60, 36, 110, 8]],
  morce: [[150, 170, 40, 30, -20], [362, 170, 40, 30, 20]],
  fretka: [[150, 150, 34, 30, -10], [362, 150, 34, 30, 10]],
  ptak: [],
  plaz: [],
  jine: [[150, 150, 40, 40, 0], [362, 150, 40, 40, 0]],
};

export function avatarSvg(p: Pick<Pet, 'species' | 'color' | 'name'>, opts: { bg?: boolean; size?: number } = {}): string {
  const [fur, eye] = furOf(p.color ?? '', p.name ?? '');
  const ears = (EARS[p.species] ?? EARS.jine).map(([cx, cy, rx, ry, r]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="${fur === '#F4F6F9' ? '#DCE3EB' : fur}" stroke="${eye}" stroke-opacity=".12" stroke-width="6"/>`).join('');
  const beak = p.species === 'ptak' ? `<path d="M256 300 l38 22 -38 22 -38 -22z" fill="#3A3D43"/>` : `<ellipse cx="256" cy="318" rx="62" ry="44" fill="#FFFFFF" opacity=".92"/><ellipse cx="256" cy="300" rx="20" ry="14" fill="${eye === '#FFFFFF' ? '#0F2540' : eye}"/>`;
  const size = opts.size ?? 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${opts.bg === false ? '' : '<rect width="512" height="512" rx="118" fill="#ECEFF3"/><circle cx="420" cy="420" r="34" fill="#7FB3E8"/>'}`
    + `${ears}<circle cx="256" cy="268" r="168" fill="${fur}" stroke="${eye}" stroke-opacity=".12" stroke-width="6"/>`
    + `<circle cx="196" cy="236" r="22" fill="${eye === '#FFFFFF' ? '#FFFFFF' : '#2E3138'}"/><circle cx="316" cy="236" r="22" fill="${eye === '#FFFFFF' ? '#FFFFFF' : '#2E3138'}"/>`
    + `<circle cx="203" cy="229" r="7" fill="${eye === '#FFFFFF' ? '#2E3138' : '#FFFFFF'}"/><circle cx="323" cy="229" r="7" fill="${eye === '#FFFFFF' ? '#2E3138' : '#FFFFFF'}"/>`
    + `${beak}<circle cx="150" cy="300" r="20" fill="#7FB3E8" opacity=".55"/><circle cx="362" cy="300" r="20" fill="#7FB3E8" opacity=".55"/></svg>`;
}
export const avatarDataUrl = (p: Pick<Pet, 'species' | 'color' | 'name'>, opts?: { bg?: boolean; size?: number }) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(p, opts));
export async function avatarImage(p: Pick<Pet, 'species' | 'color' | 'name'>, size = 512, bg = true): Promise<HTMLImageElement> {
  const img = new Image(); img.src = avatarDataUrl(p, { size, bg }); await img.decode(); return img;
}
