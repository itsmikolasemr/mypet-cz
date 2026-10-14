'use client';
/**
 * Lightweight CS/EN localisation. Czech is the source language written in the components.
 * In English mode a DOM translator swaps every rendered text node and the aria-label / placeholder / title / alt
 * attributes using the EN dictionary (exact strings) plus regex rules for templated strings (numbers, names, dates).
 * Language: localStorage 'tlapka:lang' → otherwise device language (cs/sk → cs, anything else → en).
 */
import { EN, EN_RULES, EN_INLINE } from './i18n.en';
import { DE } from './i18n.de';

export type Lang = 'cs' | 'en';
const KEY = 'tlapka:lang';

export function deviceLang(): Lang {
  if (typeof navigator === 'undefined') return 'cs';
  const l = (navigator.languages?.[0] || navigator.language || 'cs').toLowerCase();
  return l.startsWith('cs') || l.startsWith('sk') ? 'cs' : 'en';
}
export function storedLang(): Lang | null {
  try { const v = localStorage.getItem(KEY); return v === 'cs' || v === 'en' ? v : null; } catch { return null; }
}
let cached: Lang | null = null;
export function getLang(): Lang { if (typeof window === 'undefined') return 'cs'; return (cached ??= storedLang() ?? deviceLang()); }
export function setLang(l: Lang | 'auto') {
  try { if (l === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, l); } catch {}
  location.reload();
}
/** Locale for Intl/Date formatting. */
export const loc = () => (docLang === 'de' ? 'de-DE' : docLang === 'en' ? 'en-GB' : docLang === 'cs' ? 'cs-CZ' : getLang() === 'en' ? 'en-GB' : 'cs-CZ');

/** Document language override (health passport for travel: EN / DE regardless of the UI language). DE falls back to EN. */
export type DocLang = Lang | 'de';
let docLang: DocLang | null = null;
export const curLang = (): DocLang => docLang ?? getLang();
export async function withLang<T>(l: DocLang, f: () => Promise<T>): Promise<T> { const prev = docLang; docLang = l; try { return await f(); } finally { docLang = prev; } }

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const CZ = /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]|\b(a|je|na|do|pro|se|ve|od|z)\b/;
function core(k: string, depth = 0): string | null {
  const hit = EN[k];
  if (hit !== undefined) return hit;
  // leading symbol/emoji (rendered as glyph elsewhere)
  const sym = k.match(/^([^\p{L}\p{N}(]+)\s*(.+)$/u);
  if (sym && EN[sym[2]] !== undefined) return sym[1] + ' ' + EN[sym[2]];
  for (const [re, f] of EN_RULES) { const m = k.match(re); if (m) return typeof f === 'string' ? k.replace(re, f) : f(m); }
  const tail = k.match(/^(.+?)\s*([·:–])$/);
  if (tail) { const y = core(tail[1], depth + 1); if (y) return y + ' ' + tail[2]; }
  if (depth < 3) for (const sep of [' · ', ' – ', '. ', ', ', ': ']) {
    if (!k.includes(sep)) continue;
    const parts = k.split(sep); let ch = false;
    const out = parts.map((x) => { const y = x ? core(x.trim(), depth + 1) ?? core(x.trim().replace(/\.$/, ''), depth + 1)?.concat(x.trim().endsWith('.') ? '.' : '') ?? inline(x) : x; if (y !== x) ch = true; return y; });
    if (ch) return out.join(sep);
  }
  const il = inline(k);
  return il !== k ? il : null;
}
function inline(k: string) {
  let o = k;
  for (const [re, f] of EN_INLINE) o = o.replace(re, (...a) => (typeof f === 'string' ? a[0].replace(new RegExp(re.source), f) : f(a.slice(0, -2) as unknown as RegExpMatchArray)));
  return o;
}
/** Translate one string (exact, rules, segments, inline). Returns the input when unknown. */
export function tr(s: string): string {
  const L = curLang();
  if (L === 'cs' || !s) return s;
  const k = norm(s);
  if (!k || !/[A-Za-zÀ-ž]/.test(k)) return s;
  if (L === 'de') { const d = DE[k] ?? (k.match(/^(.+?)\s*([·:–])$/) && DE[k.replace(/\s*[·:–]$/, '')] ? DE[k.replace(/\s*[·:–]$/, '')] + ' ' + k.slice(-1) : undefined); if (d) return keepWs(s, d); }
  const x = core(k);
  return x == null ? s : keepWs(s, x);
}
export const hasCzech = (s: string) => CZ.test(s);
function keepWs(orig: string, t: string) { const a = orig.match(/^\s*/)![0], b = orig.match(/\s*$/)![0]; return a + t + b; }
/** Inline helper for code paths that build strings (toasts, confirm(), share text). */
export const t = tr;

const ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
const done = new WeakMap<Node, string>();
function fixText(n: Text) {
  const v = n.nodeValue ?? '';
  if (done.get(n) === v) return;
  const x = tr(v);
  done.set(n, x);
  if (x !== v) n.nodeValue = x;
}
function fixEl(el: Element) {
  if (el.closest('[data-notr]')) return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const x = tr(v); if (x !== v) el.setAttribute(a, x); } }
}
function walk(root: Node) {
  if (root.nodeType === 3) { if (!(root.parentElement?.closest('[data-notr],script,style'))) fixText(root as Text); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (el.closest('[data-notr],script,style')) return;
  fixEl(el);
  el.querySelectorAll('*').forEach(fixEl);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (!(n.parentElement?.closest('[data-notr],script,style'))) fixText(n as Text);
}

let started = false;
export function startI18n() {
  if (typeof document === 'undefined') return;
  const l = getLang();
  document.documentElement.lang = l;
  if (l !== 'en' || started) return;
  started = true;
  const native = { alert: window.alert.bind(window), confirm: window.confirm.bind(window), prompt: window.prompt.bind(window) };
  window.alert = (m?: unknown) => native.alert(tr(String(m ?? '')));
  window.confirm = (m?: string) => native.confirm(tr(String(m ?? '')));
  window.prompt = (m?: string, d?: string) => native.prompt(tr(String(m ?? '')), d);
  const title = () => { const x = tr(document.title); if (x !== document.title) document.title = x; };
  walk(document.body); title();
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') fixEl(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  new MutationObserver(title).observe(document.head, { subtree: true, childList: true, characterData: true });
}
