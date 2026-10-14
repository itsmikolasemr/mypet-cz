'use client';
// Tlapka v1.1 cloud layer: optional Supabase account + offline-first sync (local stays the source of truth).
// Model: each local record <-> row (household_id, id, pet_id, data jsonb, deleted, updated_at). Last-write-wins per record,
// server-stamped updated_at as pull cursor. Doses (reminder history growth) are also written to tl_dose_logs with who gave it.
import { createClient, type Provider, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData, DocMeta } from './types';
import { loadBlob, saveBlob } from './docs';
import { deviceId } from './premium';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://owveqkchmcutoqlsjlyb.supabase.co';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_EDy4Im3JrXxTsRYd62GY1A_J3gw_tcY';
export const NATIVE_REDIRECT = 'cz.tlapka.app://auth-callback';

let sb: SupabaseClient | null = null;
export function cloud(): SupabaseClient {
  const dev = typeof localStorage !== 'undefined' ? deviceId() : ''; // same id premium/Aivet use; created here if first
  if (!sb) sb = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: dev ? { 'x-tlapka-device': dev } : {} }, auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'tlapka:auth' } });
  return sb;
}
const isNative = () => typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
export const redirectTo = () => (isNative() ? NATIVE_REDIRECT : `${location.origin}/#settings`);

// ---------- Auth ----------
export type OAuth = Extract<Provider, 'google' | 'apple' | 'facebook'>;
export const auth = {
  magicLink: (email: string) => cloud().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } }),
  signUp: (email: string, password: string) => cloud().auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } }),
  signIn: (email: string, password: string) => cloud().auth.signInWithPassword({ email, password }),
  resetPassword: (email: string) => cloud().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }),
  oauth: (provider: OAuth) => cloud().auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo(), skipBrowserRedirect: isNative() } }),
  signOut: () => cloud().auth.signOut(),
  session: async (): Promise<Session | null> => (await cloud().auth.getSession()).data.session,
  onChange: (f: (s: Session | null) => void) => cloud().auth.onAuthStateChange((_e, s) => f(s)).data.subscription,
  /** GDPR: remove all files, then the household (cascades every row). Owner only (RLS). Non-owners just leave. */
  deleteCloudData: async (hh: string) => {
    const c = cloud();
    for (;;) { const l = (await c.storage.from('tl-docs').list(hh, { limit: 100 })).data ?? []; if (!l.length) break; const r = await c.storage.from('tl-docs').remove(l.map((f) => `${hh}/${f.name}`)); if (r.error) throw r.error; }
    const d = await c.from('tl_households').delete().eq('id', hh).select('id');
    if (d.error) throw d.error;
    if (!d.data?.length) { const uidv = (await c.auth.getUser()).data.user?.id; await c.from('tl_household_members').delete().eq('household_id', hh).eq('user_id', uidv ?? ''); }
  },
};

// ---------- Households ----------
export async function ensureHousehold(displayName?: string): Promise<string> {
  const c = cloud();
  const k = 'tlapka:hh';
  const cached = localStorage.getItem(k);
  const { data } = await c.from('tl_household_members').select('household_id, role').order('joined_at');
  if (cached && data?.some((m) => m.household_id === cached)) return cached;
  let hh = data?.[0]?.household_id as string | undefined;
  if (!hh) { const r = await c.rpc('tl_create_household', { p_name: 'Domácnost', p_display: displayName ?? null }); if (r.error) throw r.error; hh = r.data as string; }
  localStorage.setItem(k, hh);
  return hh;
}
export async function createInvite(hh: string, role: 'editor' | 'sitter' = 'editor') {
  const r = await cloud().from('tl_invites').insert({ household_id: hh, role }).select('code, expires_at').single();
  if (r.error) throw r.error; return r.data as { code: string; expires_at: string };
}
export async function joinHousehold(code: string, name?: string) {
  const r = await cloud().rpc('tl_join', { p_code: code.trim(), p_display: name ?? null });
  if (r.error) throw r.error; localStorage.setItem('tlapka:hh', r.data as string); localStorage.removeItem(SNAP); localStorage.removeItem(CURSOR);
  return r.data as string;
}
async function sha256hex(s: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
/** Caretaker link without account. Returns the raw token (only place it exists); DB stores its hash. */
export async function createShareLink(hh: string, petIds: string[], days = 7, scope: 'today' | 'pass' = 'today') {
  const raw = [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, '0')).join('');
  const r = await cloud().from('tl_share_links').insert({ household_id: hh, pet_ids: petIds, token_hash: await sha256hex(raw), scope, expires_at: new Date(Date.now() + Math.min(days, 30) * 864e5).toISOString() });
  if (r.error) throw r.error;
  return `${location.origin}/#share/${raw}`;
}
export const sharedView = (token: string) => cloud().rpc('tl_shared_view', { p_token: token });
export const sharedLogDose = (token: string, pet: string, reminder: string | null, med: string | null, name: string) => cloud().rpc('tl_shared_log_dose', { p_token: token, p_pet: pet, p_reminder: reminder, p_med: med, p_name: name });

// ---------- Sync ----------
type Coll = 'pets' | 'reminders' | 'visits' | 'meds' | 'allergies' | 'docs' | 'cards' | 'daily';
const TABLE: Record<Coll, string> = { pets: 'tl_pets', reminders: 'tl_reminders', visits: 'tl_visits', meds: 'tl_meds', allergies: 'tl_allergies', docs: 'tl_documents', cards: 'tl_loyalty_cards', daily: 'tl_daily' };
/** v1.2 tables may not exist yet on an older backend – those collections are skipped instead of failing the whole sync. */
const OPTIONAL = new Set<Coll>(['daily']);
const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message ?? ''));
const COLLS = Object.keys(TABLE) as Coll[];
const SNAP = 'tlapka:sync:snap', CURSOR = 'tlapka:sync:cursor';
type Rec = { id: string; petId?: string; history?: string[] };
type Snap = Record<Coll, Record<string, string>>; // id -> JSON of last synced version
const emptySnap = (): Snap => ({ pets: {}, reminders: {}, visits: {}, meds: {}, allergies: {}, docs: {}, cards: {}, daily: {} });
const stable = (o: unknown) => JSON.stringify(o);

export type SyncResult = { pushed: number; pulled: number; doses: number; at: string; uploaded: number; downloaded: number; pendingFiles: number };

const UP = 'tlapka:sync:uploaded';
/** Offline-safe file queue: anything not marked uploaded is retried every sync. */
export async function syncFiles(hh: string, docs: DocMeta[]) {
  const c = cloud(); const done = new Set<string>(JSON.parse(localStorage.getItem(UP) || '[]'));
  let uploaded = 0, downloaded = 0, pending = 0;
  const seen = new Set<string>();
  for (const d of docs) {
    if (seen.has(d.id)) continue; seen.add(d.id);
    const path = `${hh}/${d.id}`;
    const local = await loadBlob(d.id, d.mime).catch(() => null);
    if (local && !done.has(d.id)) {
      const r = await c.storage.from('tl-docs').upload(path, local, { contentType: d.mime || 'application/octet-stream', upsert: true });
      if (r.error) pending++; else { done.add(d.id); uploaded++; }
    } else if (!local) {
      const r = await c.storage.from('tl-docs').download(path);
      if (r.data) { await saveBlob(d.id, r.data); done.add(d.id); downloaded++; } else pending++;
    }
  }
  localStorage.setItem(UP, JSON.stringify([...done]));
  return { uploaded, downloaded, pendingFiles: pending };
}

/** One full round: push local changes since last snapshot, then pull remote changes since cursor and merge (LWW). */
export async function syncNow(hh: string, data: AppData, apply: (f: (d: AppData) => AppData) => void, who?: string, opts: { files?: boolean; push?: boolean } = {}): Promise<SyncResult> {
  const c = cloud();
  const snap: Snap = { ...emptySnap(), ...JSON.parse(localStorage.getItem(SNAP) || 'null') };
  let pushed = 0, doses = 0;
  // 1) push (skipped when this device is not the free backup device)
  for (const k of opts.push === false ? [] : COLLS) {
    snap[k] ??= {};
    const cur = new Map(((data[k] ?? []) as Rec[]).map((r) => [r.id, r]));
    const rows: Record<string, unknown>[] = [];
    for (const [id, r] of cur) {
      const s = stable(r);
      if (snap[k][id] !== s) {
        rows.push({ household_id: hh, id, pet_id: k === 'pets' ? id : r.petId ?? null, data: r, deleted: false, ...(k === 'docs' ? { storage_path: `${hh}/${id}` } : {}) });
        const given = (r as { given?: { at: string; by?: string }[] }).given;
        if (k === 'meds' && given) {
          const before = snap[k][id] ? (JSON.parse(snap[k][id]).given ?? []).length : given.length;
          for (const g of given.slice(before)) { const ins = await c.from('tl_dose_logs').insert({ household_id: hh, pet_id: r.petId, med_id: id, given_by_name: g.by ?? who ?? null, given_at: g.at }); if (!ins.error) doses++; }
        }
        if (k === 'reminders' && r.history) {
          const before: string[] = snap[k][id] ? (JSON.parse(snap[k][id]).history ?? []) : r.history;
          for (const day of r.history.slice(before.length)) {
            const ins = await c.from('tl_dose_logs').insert({ household_id: hh, pet_id: r.petId, reminder_id: id, given_by_name: who ?? null, given_at: day === new Date().toISOString().slice(0, 10) ? new Date().toISOString() : `${day}T12:00:00Z` });
            if (!ins.error) doses++;
          }
        }
      }
    }
    for (const id of Object.keys(snap[k])) if (!cur.has(id)) rows.push({ household_id: hh, id, pet_id: null, data: JSON.parse(snap[k][id]), deleted: true });
    if (rows.length) { const r = await c.from(TABLE[k]).upsert(rows, { onConflict: 'household_id,id' }); if (r.error) { if (OPTIONAL.has(k) && missingTable(r.error)) continue; throw r.error; } pushed += rows.length; }
    snap[k] = Object.fromEntries([...cur].map(([id, r]) => [id, stable(r)]));
  }
  // 2) pull
  const cursor = localStorage.getItem(CURSOR) || '1970-01-01T00:00:00Z';
  let max = cursor, pulled = 0;
  const remote: Partial<Record<Coll, { id: string; data: Rec; deleted: boolean }[]>> = {};
  for (const k of COLLS) {
    const r = await c.from(TABLE[k]).select('id,data,deleted,updated_at,updated_by').eq('household_id', hh).gt('updated_at', cursor).order('updated_at').limit(1000);
    if (r.error) { if (OPTIONAL.has(k) && missingTable(r.error)) continue; throw r.error; }
    const mine = (await c.auth.getUser()).data.user?.id;
    const rows = (r.data ?? []).filter((x) => x.updated_by !== mine || cursor === '1970-01-01T00:00:00Z');
    for (const x of r.data ?? []) if (x.updated_at > max) max = x.updated_at;
    if (rows.length) remote[k] = rows; pulled += rows.length;
  }
  for (const k of COLLS) for (const x of remote[k] ?? []) { snap[k] ??= {}; if (x.deleted) delete snap[k][x.id]; else snap[k][x.id] = stable(x.data); }
  if (pulled) apply((d) => {
    const n = { ...d } as AppData & Record<Coll, Rec[]>;
    for (const k of COLLS) {
      const rows = remote[k]; if (!rows) continue;
      const m = new Map(((n[k] ?? []) as Rec[]).map((r) => [r.id, r]));
      for (const x of rows) { if (x.deleted) m.delete(x.id); else m.set(x.id, x.data); }
      (n as Record<Coll, Rec[]>)[k] = [...m.values()];
    }
    return n;
  });
  localStorage.setItem(SNAP, JSON.stringify(snap)); localStorage.setItem(CURSOR, max);
  // 3) files: upload queue (local docs not yet in Storage), download docs from others missing locally
  const files = opts.files === false ? { uploaded: 0, downloaded: 0, pendingFiles: data.docs.length } : await syncFiles(hh, [...data.docs, ...((remote.docs ?? []).filter((x) => !x.deleted).map((x) => x.data as unknown as DocMeta))]);
  const at = new Date().toISOString(); localStorage.setItem('tlapka:sync:at', at);
  return { pushed, pulled, doses, at, ...files };
}

/** Realtime: call back when someone else in the household changes data or logs a dose. Requires tables in supabase_realtime publication. */
export function subscribeHousehold(hh: string, onChange: () => void) {
  const ch = cloud().channel(`hh-${hh}`);
  let me: string | undefined; cloud().auth.getUser().then((u) => { me = u.data.user?.id; });
  let t: ReturnType<typeof setTimeout> | undefined;
  const f = (p: { new?: Record<string, unknown> }) => {
    const by = (p.new?.updated_by ?? p.new?.given_by) as string | undefined;
    if (me && by === me && !(p.new && 'given_by_name' in p.new && p.new.note === 'via share link')) return; // own echo
    clearTimeout(t); t = setTimeout(onChange, 400);
  };
  for (const tb of [...Object.values(TABLE), 'tl_dose_logs']) ch.on('postgres_changes', { event: '*', schema: 'public', table: tb, filter: `household_id=eq.${hh}` }, f);
  ch.subscribe();
  return () => { cloud().removeChannel(ch); };
}

export async function recentDoses(hh: string, petId?: string) {
  let q = cloud().from('tl_dose_logs').select('pet_id,reminder_id,med_id,given_at,given_by_name').eq('household_id', hh).order('given_at', { ascending: false }).limit(20);
  if (petId) q = q.eq('pet_id', petId);
  return (await q).data ?? [];
}
export function resetSyncState() { [SNAP, CURSOR, UP, 'tlapka:hh', 'tlapka:sync:at'].forEach((k) => localStorage.removeItem(k)); }
