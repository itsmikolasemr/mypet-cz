'use client';
/**
 * v1.2 growth layer – client side of the tl_ RPCs in supabase/migrations/20261014120000_tlapka_v12_growth.sql.
 * Everything that grants Premium (promo, referral, badges) is decided by the server; this file only asks.
 */
import { cloud } from './cloud';
import type { AppData, PetFriend, Species } from './types';
import { dayKey } from './today';

// ── who am I (for "kdo dnes venčil") ──
const ME = 'tlapka:me';
export const myName = () => { try { return localStorage.getItem(ME) || 'Já'; } catch { return 'Já'; } };
export const setMyName = (n: string) => { try { localStorage.setItem(ME, n.trim().slice(0, 30) || 'Já'); } catch {} };

/** Fair-share stats from the synced daily log + med doses: who fed/walked/gave meds, today and last 7 days. */
export function fairShare(data: AppData, now = new Date()) {
  const me = myName();
  const today = dayKey(now);
  const from = new Date(now); from.setDate(from.getDate() - 6); const week0 = dayKey(from);
  type Row = { name: string; today: number; week: number; walks: number; feeds: number; meds: number };
  const rows = new Map<string, Row>();
  const add = (name: string | undefined, day: string, kind: 'walk' | 'feed' | 'med') => {
    const n = name && name !== 'test' ? name : me;
    const r = rows.get(n) ?? { name: n, today: 0, week: 0, walks: 0, feeds: 0, meds: 0 };
    if (day === today) r.today++;
    if (day >= week0 && day <= today) { r.week++; if (kind === 'walk') r.walks++; else if (kind === 'feed') r.feeds++; else r.meds++; }
    rows.set(n, r);
  };
  for (const e of data.daily ?? []) add(e.by, e.day, e.kind);
  for (const m of data.meds) for (const g of m.given ?? []) add(g.by, dayKey(new Date(g.at)), 'med');
  const list = [...rows.values()].filter((r) => r.week > 0).sort((a, b) => b.week - a.week);
  const total = list.reduce((a, r) => a + r.week, 0);
  const share = list.map((r) => ({ ...r, pct: total ? Math.round((r.week / total) * 100) : 0 }));
  // gentle "tvoje řada": whoever did fewer walks this week, never a scolding
  const walkers = share.filter((r) => r.walks || r.name === me);
  const next = share.length > 1 ? [...share].sort((a, b) => a.walks - b.walks)[0]?.name : undefined;
  return { me, share, total, nextWalk: next, solo: share.length <= 1, walkers };
}

// ── cloud RPCs ──
type Res<T> = { ok: true; data: T } | { ok: false; error: string };
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<Res<T>> {
  try {
    const r = await cloud().rpc(fn, args);
    if (r.error) return { ok: false, error: /not authenticated|JWT/i.test(r.error.message) ? 'auth' : /does not exist|schema cache|PGRST202/i.test(r.error.message + (r.error.code ?? '')) ? 'server' : r.error.message };
    return { ok: true, data: r.data as T };
  } catch (e) { return { ok: false, error: String((e as Error).message ?? e) }; }
}
/** Same answer whether the chip exists or not – the owner must approve before anything is shared. */
export const chipRequest = (chip: string, name: string) => rpc<string>('tl_chip_request', { p_chip: chip.replace(/\D/g, ''), p_name: name });
export const decideLink = (id: string, approve: boolean) => rpc<string>('tl_pet_link_decide', { p_id: id, p_approve: approve });
export async function linkRequests() {
  try { const r = await cloud().from('tl_pet_link_requests').select('id, requester_name, target_pet, status, created_at').eq('status', 'pending').order('created_at'); return (r.data ?? []) as { id: string; requester_name: string | null; target_pet: string; status: string; created_at: string }[]; } catch { return []; }
}

export interface Challenge { id: string; code: string; title: string; goal: number; members: { user_id: string; display_name: string | null; count: number }[] }
export const weekStart = (d = new Date()) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return dayKey(x); };
export const createChallenge = (title: string, goal: number, name: string) => rpc<{ id: string; code: string }>('tl_challenge_create', { p_title: title, p_goal: goal, p_name: name });
export const joinChallenge = (code: string, name: string) => rpc<string>('tl_challenge_join', { p_code: code, p_name: name });
export const reportChallenge = (id: string, count: number) => rpc<number>('tl_challenge_report', { p_challenge: id, p_count: count });
export const leaveChallenge = (id: string) => rpc<null>('tl_challenge_leave', { p_challenge: id });
export async function myChallenges(): Promise<Challenge[]> {
  try {
    const c = cloud(); const wk = weekStart();
    const [ch, mem, prog] = await Promise.all([c.from('tl_challenges').select('id, code, title, goal'), c.from('tl_challenge_members').select('challenge_id, user_id, display_name'), c.from('tl_challenge_progress').select('challenge_id, user_id, count').eq('week', wk)]);
    return (ch.data ?? []).map((x) => ({ ...x, members: (mem.data ?? []).filter((m) => m.challenge_id === x.id).map((m) => ({ user_id: m.user_id, display_name: m.display_name, count: (prog.data ?? []).find((p) => p.challenge_id === x.id && p.user_id === m.user_id)?.count ?? 0 })) })) as Challenge[];
  } catch { return []; }
}
/** walks this ISO week (all pets), the number reported to challenges */
export const walksThisWeek = (data: AppData, now = new Date()) => { const w = weekStart(now), t = dayKey(now); return (data.daily ?? []).filter((e) => e.kind === 'walk' && e.day >= w && e.day <= t && (!e.by || e.by === myName())).length; };

export const redeemPromo = (code: string) => rpc<{ ok: boolean; days?: number; reason?: string; creator?: string }>('tl_redeem_promo', { p_code: code.trim().toUpperCase() });

// ── referral ──
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mypet-cz.netlify.app';
export const refCode = (uid: string) => uid.replace(/-/g, '').slice(0, 10);
export const refLink = (uid: string) => `${SITE}/?ref=${refCode(uid)}`;
const REF = 'tlapka:ref';
/** remember ?ref= from the landing URL until the friend signs in */
export function captureRef() { try { const r = new URLSearchParams(location.search).get('ref'); if (r && /^[0-9a-f]{10}$/i.test(r)) localStorage.setItem(REF, r.toLowerCase()); } catch {} }
export async function claimPendingRef(): Promise<{ ok: boolean; days?: number; reason?: string } | null> {
  const r = typeof localStorage !== 'undefined' ? localStorage.getItem(REF) : null; if (!r) return null;
  const res = await rpc<{ ok: boolean; days?: number; reason?: string }>('tl_referral_claim', { p_code: r });
  if (res.ok || (!res.ok && res.error !== 'server')) localStorage.removeItem(REF);
  return res.ok ? res.data : null;
}
export async function myReferrals() {
  try { const r = await cloud().from('tl_referrals').select('status, created_at, qualified_at'); return (r.data ?? []) as { status: string; created_at: string; qualified_at: string | null }[]; } catch { return []; }
}
export async function rewardDays() {
  try { const r = await cloud().from('tl_reward_ledger').select('days, source, granted_at'); return ((r.data ?? []) as { days: number; source: string; granted_at: string }[]).filter((x) => x.source !== 'promo' && Date.parse(x.granted_at) > Date.now() - 365 * 864e5).reduce((a, x) => a + x.days, 0); } catch { return 0; }
}
export const claimBadge = (id: string, petId = '') => rpc<{ verified: boolean; days: number }>('tl_claim_badge', { p_badge: id, p_pet: petId });

// ── pet friends via QR (offline, nothing leaves the phone until scanned) ──
export interface FriendCard { v: 1; n: string; s: Species; b?: string; o?: string; x?: string[] }
export const friendPayload = (c: FriendCard) => `${SITE}/#friend/${btoa(unescape(encodeURIComponent(JSON.stringify(c)))).replace(/=+$/, '')}`;
export function parseFriend(text: string): FriendCard | null {
  const m = text.match(/#friend\/([A-Za-z0-9+/_-]+)/); if (!m) return null;
  try { const j = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); return j && j.v === 1 && typeof j.n === 'string' ? { ...j, n: j.n.slice(0, 40), o: j.o?.slice(0, 40) } : null; } catch { return null; }
}
export const toFriend = (c: FriendCard, place?: string): PetFriend => ({ id: `${c.n}:${c.s}:${c.b ?? ''}:${c.o ?? ''}`, name: c.n, species: c.s, birthDate: c.b, owner: c.o, badges: c.x?.slice(0, 3), addedAt: new Date().toISOString(), place });
