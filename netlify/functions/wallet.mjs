// v1.2 Wallet passes – SCAFFOLD (not deployed, not wired to UI until certificates exist). See docs/WALLET.md.
// POST /api/wallet/apple   { name, species, chip?, allergies?, url }  → .pkpass (needs Apple Pass Type ID certificate)
// POST /api/wallet/google  { … same … }                              → { saveUrl } (needs Google Wallet issuer + service account)
// Without the env below both endpoints answer 501 so nothing half-works in production.
import { env, json } from './_supa.mjs';
const clean = (s, n = 40) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, n);
const card = (b) => ({ name: clean(b.name), species: clean(b.species, 20), chip: clean(b.chip, 15).replace(/\D/g, ''), allergies: clean(b.allergies, 120), url: /^https:\/\//.test(b.url || '') ? clean(b.url, 300) : '' });

async function apple(c) {
  const [cert, key, wwdr, passType, team] = ['APPLE_PASS_CERT_PEM', 'APPLE_PASS_KEY_PEM', 'APPLE_WWDR_PEM', 'APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID'].map(env);
  if (!cert || !key || !wwdr || !passType || !team) return json({ error: 'apple_wallet_not_configured', docs: 'docs/WALLET.md' }, 501);
  // passkit-generator is added only once certificates exist: npm i passkit-generator
  const { PKPass } = await import('passkit-generator').catch(() => ({}));
  if (!PKPass) return json({ error: 'passkit_generator_missing' }, 501);
  const pass = new PKPass({}, { signerCert: cert, signerKey: key, wwdr, signerKeyPassphrase: env('APPLE_PASS_KEY_PASS') || undefined }, {
    formatVersion: 1, passTypeIdentifier: passType, teamIdentifier: team, organizationName: 'Tlapka', description: `Tlapka – ${c.name}`,
    serialNumber: `tlapka-${Date.now().toString(36)}`, backgroundColor: 'rgb(236,239,243)', foregroundColor: 'rgb(58,61,67)', labelColor: 'rgb(127,179,232)',
  });
  pass.type = 'generic';
  pass.primaryFields.push({ key: 'pet', label: 'Mazlíček', value: c.name });
  pass.secondaryFields.push({ key: 'species', label: 'Druh', value: c.species }, ...(c.chip ? [{ key: 'chip', label: 'Čip', value: c.chip }] : []));
  if (c.allergies) pass.auxiliaryFields.push({ key: 'alg', label: 'Alergie', value: c.allergies });
  if (c.url) pass.setBarcodes({ format: 'PKBarcodeFormatQR', message: c.url, messageEncoding: 'iso-8859-1' });
  // icon.png / logo.png (+@2x) must be added from public/wallet/ – see docs
  return new Response(pass.getAsBuffer(), { headers: { 'Content-Type': 'application/vnd.apple.pkpass', 'Content-Disposition': `attachment; filename="tlapka-${encodeURIComponent(c.name)}.pkpass"` } });
}

async function google(c) {
  const [issuer, email, keyPem] = ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SA_EMAIL', 'GOOGLE_WALLET_SA_KEY_PEM'].map(env);
  if (!issuer || !email || !keyPem) return json({ error: 'google_wallet_not_configured', docs: 'docs/WALLET.md' }, 501);
  const { createSign } = await import('node:crypto');
  const id = `${issuer}.tlapka-${Date.now().toString(36)}`;
  const obj = { id, classId: `${issuer}.tlapka_pet`, state: 'ACTIVE', hexBackgroundColor: '#ECEFF3',
    cardTitle: { defaultValue: { language: 'cs', value: 'Tlapka' } }, header: { defaultValue: { language: 'cs', value: c.name } },
    textModulesData: [{ id: 'species', header: 'Druh', body: c.species }, ...(c.chip ? [{ id: 'chip', header: 'Čip', body: c.chip }] : []), ...(c.allergies ? [{ id: 'alg', header: 'Alergie', body: c.allergies }] : [])],
    ...(c.url ? { barcode: { type: 'QR_CODE', value: c.url } } : {}) };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: email, aud: 'google', typ: 'savetowallet', origins: [], payload: { genericObjects: [obj] } })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(keyPem.replace(/\\n/g, '\n')).toString('base64url');
  return json({ saveUrl: `https://pay.google.com/gp/v/save/${unsigned}.${sig}` });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const b = await req.json().catch(() => null); if (!b?.name) return json({ error: 'bad_request' }, 400);
  const which = new URL(req.url).pathname.endsWith('/google') ? 'google' : 'apple';
  return which === 'google' ? google(card(b)) : apple(card(b));
};
export const config = { path: ['/api/wallet/apple', '/api/wallet/google'] };
