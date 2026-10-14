// RevenueCat webhook -> tl_profiles.is_premium. Configure in RevenueCat: URL https://<site>/api/billing/revenuecat,
// Authorization header = REVENUECAT_WEBHOOK_AUTH. App must call Purchases.logIn(<supabase user id>) so app_user_id = Supabase uid.
import { env, json, isUuid, setPremium } from './_supa.mjs';
const ON = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT']);
const OFF = new Set(['EXPIRATION']); // CANCELLATION/BILLING_ISSUE keep access until expiration_at_ms
const safeEq = (a, b) => { if (!a || !b || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const secret = env('REVENUECAT_WEBHOOK_AUTH');
  if (!secret) return json({ error: 'not_configured' }, 503);
  if (!safeEq(req.headers.get('authorization') || '', secret)) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => null); const e = b?.event;
  if (!e?.type) return json({ error: 'bad_event' }, 400);
  const ent = env('REVENUECAT_ENTITLEMENT') || 'premium';
  if (Array.isArray(e.entitlement_ids) && e.entitlement_ids.length && !e.entitlement_ids.includes(ent)) return json({ ok: true, ignored: 'entitlement' });
  const users = [e.app_user_id, ...(e.aliases || []), ...(e.transferred_to || [])].filter(isUuid);
  if (!users.length) return json({ ok: true, ignored: 'no_supabase_uid' });
  const until = e.expiration_at_ms ? new Date(e.expiration_at_ms) : null;
  if (ON.has(e.type)) { for (const u of new Set(users)) await setPremium(u, true, until, 'revenuecat'); return json({ ok: true, premium: true }); }
  if (OFF.has(e.type)) { for (const u of new Set(users)) await setPremium(u, false, until, 'revenuecat'); return json({ ok: true, premium: false }); }
  if (e.type === 'TRANSFER') { for (const u of (e.transferred_from || []).filter(isUuid)) await setPremium(u, false, null, 'revenuecat'); for (const u of (e.transferred_to || []).filter(isUuid)) await setPremium(u, true, until, 'revenuecat'); return json({ ok: true }); }
  return json({ ok: true, ignored: e.type });
};
export const config = { path: '/api/billing/revenuecat' };
