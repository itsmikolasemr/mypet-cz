// POST /api/entitlement  { deviceId, plan: 'monthly'|'yearly'|'family'|'trial', test: true }
// TEST ONLY: issues a signed Premium token without payment while PREMIUM_DEV_MODE != 'off'.
// Replace with RevenueCat webhook / receipt validation before charging real money.
import { sign, verify, devModeOn } from './_entitlement.mjs';
import { adminConfigured, bearer, setPremium, userFromToken } from './_supa.mjs';
// TEST ONLY DB sync: with a valid Supabase session the toggle also sets tl_profiles.is_premium for THAT user (source 'test'), so app and DB agree.
async function syncDb(req, on, exp) { const t = bearer(req); if (!t || !adminConfigured()) return false; const u = await userFromToken(t); if (!u) return false; await setPremium(u.id, on, on ? exp : null, 'test'); return true; }
const H = { 'Content-Type': 'application/json; charset=utf-8' };
const DAY = 86400000;
export default async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ devMode: devModeOn() }), { headers: H });
  let b; try { b = await req.json(); } catch { return new Response('{"error":"bad_json"}', { status: 400, headers: H }); }
  const dev = String(b?.deviceId || '');
  if (!/^[a-z0-9-]{16,64}$/i.test(dev)) return new Response('{"error":"bad_device"}', { status: 400, headers: H });
  if (b.verify) return new Response(JSON.stringify({ valid: !!(await verify(b.token, dev)) }), { headers: H });
  if (b.deactivate === true) { if (!devModeOn()) return new Response('{"error":"test_mode_off"}', { status: 403, headers: H }); return new Response(JSON.stringify({ ok: true, db: await syncDb(req, false).catch(() => false) }), { headers: H }); }
  if (!devModeOn() || b.test !== true) return new Response('{"error":"test_mode_off"}', { status: 403, headers: H });
  const plan = ['monthly', 'yearly', 'family', 'founder', 'trial'].includes(b.plan) ? b.plan : 'monthly';
  const exp = Date.now() + (plan === 'trial' ? 14 : plan === 'monthly' ? 31 : 366) * DAY;
  const db = await syncDb(req, true, exp).catch((e) => { console.error('premium db sync', e.message); return false; });
  return new Response(JSON.stringify({ token: await sign({ dev, plan, exp, test: true }), plan, exp, db }), { headers: H });
};
export const config = { path: '/api/entitlement' };
