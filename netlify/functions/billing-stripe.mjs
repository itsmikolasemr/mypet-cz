// Stripe webhook -> tl_profiles.is_premium. Checkout: set client_reference_id = Supabase uid and subscription_data.metadata.user_id = uid.
// Events: checkout.session.completed, customer.subscription.created|updated|deleted. Secret: STRIPE_WEBHOOK_SECRET (whsec_...).
import { env, json, isUuid, setPremium } from './_supa.mjs';
const enc = new TextEncoder();
async function verifyStripe(raw, header, secret, tolerance = 300) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')).filter((x) => x.length === 2).map(([k, v]) => [k, v]));
  const sigs = String(header || '').split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t); if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - t) > tolerance) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => s.length === mac.length && [...s].every((c, i) => c === mac[i]));
}
const ACTIVE = new Set(['active', 'trialing', 'past_due']);
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const secret = env('STRIPE_WEBHOOK_SECRET'); if (!secret) return json({ error: 'not_configured' }, 503);
  const raw = await req.text();
  if (!(await verifyStripe(raw, req.headers.get('stripe-signature'), secret))) return json({ error: 'bad_signature' }, 400);
  const ev = JSON.parse(raw); const o = ev.data?.object || {};
  if (ev.type === 'checkout.session.completed') {
    const uid = o.client_reference_id || o.metadata?.user_id;
    if (!isUuid(uid)) return json({ ok: true, ignored: 'no_uid' });
    await setPremium(uid, true, null, 'stripe'); return json({ ok: true, premium: true });
  }
  if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
    const uid = o.metadata?.user_id; if (!isUuid(uid)) return json({ ok: true, ignored: 'no_uid' });
    const on = ev.type !== 'customer.subscription.deleted' && ACTIVE.has(o.status);
    const end = o.current_period_end ?? o.items?.data?.[0]?.current_period_end;
    await setPremium(uid, on, end ? end * 1000 : null, 'stripe'); return json({ ok: true, premium: on });
  }
  return json({ ok: true, ignored: ev.type });
};
export const config = { path: '/api/billing/stripe' };
export { verifyStripe };
