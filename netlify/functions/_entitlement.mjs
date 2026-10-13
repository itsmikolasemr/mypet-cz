// Shared entitlement helpers. In production the RevenueCat webhook (or Stripe) is the source of truth;
// until then a signed token proves Premium. Signing secret never leaves the server.
const env = (k) => (typeof Netlify !== 'undefined' && Netlify.env?.get(k)) || process.env[k] || '';
async function secretKey() {
  const raw = env('ENTITLEMENT_SECRET') || ('derived:' + env('AIVET_API_KEY'));
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tlapka-ent:' + raw));
  return crypto.subtle.importKey('raw', h, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function sign(payload) {
  const body = b64u(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await secretKey(), new TextEncoder().encode(body));
  return body + '.' + b64u(sig);
}
export async function verify(token, deviceId) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expect = b64u(await crypto.subtle.sign('HMAC', await secretKey(), new TextEncoder().encode(body)));
    if (expect !== sig) return null;
    const p = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (p.exp < Date.now() || p.dev !== deviceId) return null;
    return p;
  } catch { return null; }
}
export const devModeOn = () => env('PREMIUM_DEV_MODE') !== 'off';
export { env };
