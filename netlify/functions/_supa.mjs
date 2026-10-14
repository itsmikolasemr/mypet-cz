// Server-only Supabase helpers. SUPABASE_SERVICE_ROLE_KEY must live only in Netlify env (never in the client bundle).
const env = (k) => (typeof Netlify !== 'undefined' && Netlify.env?.get(k)) || process.env[k] || '';
export const SUPA_URL = () => (env('SUPABASE_URL') || 'https://owveqkchmcutoqlsjlyb.supabase.co').replace(/\/+$/, '');
const ANON = () => env('SUPABASE_ANON_KEY') || 'sb_publishable_EDy4Im3JrXxTsRYd62GY1A_J3gw_tcY';
const SERVICE = () => env('SUPABASE_SERVICE_ROLE_KEY');
export const adminConfigured = () => !!SERVICE();
const adminHeaders = () => { const k = SERVICE(); return { apikey: k, ...(k.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${k}` }), 'Content-Type': 'application/json' }; };

/** Verify a user's access token with Supabase Auth; returns { id, email } or null. */
export async function userFromToken(token) {
  if (!token || token.length < 20) return null;
  const r = await fetch(`${SUPA_URL()}/auth/v1/user`, { headers: { apikey: ANON(), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u?.id ? { id: u.id, email: u.email } : null;
}
export const bearer = (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

export async function admin(path, init = {}) {
  if (!SERVICE()) throw new Error('service_role_not_configured');
  const r = await fetch(`${SUPA_URL()}${path}`, { ...init, headers: { ...adminHeaders(), ...(init.headers || {}) } });
  const text = await r.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) throw Object.assign(new Error(`supabase ${r.status} ${path}`), { status: r.status, body });
  return body;
}
export const adminRpc = (fn, args = {}) => admin(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
export const setPremium = (userId, on, until, source) => adminRpc('tl_admin_set_premium', { p_user: userId, p_on: !!on, p_until: until ? new Date(until).toISOString() : null, p_source: source });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => UUID.test(String(s || ''));
export const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
export { env };
