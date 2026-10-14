// GDPR: delete the signed-in user's account. Removes files + data of households they own (cascade), their memberships and the Auth user.
import { admin, bearer, json, userFromToken, adminConfigured } from './_supa.mjs';
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!adminConfigured()) return json({ error: 'not_configured' }, 503);
  const user = await userFromToken(bearer(req)); if (!user) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  if (b?.confirm !== 'SMAZAT') return json({ error: 'confirm_required' }, 400);
  const owned = await admin(`/rest/v1/tl_household_members?select=household_id&user_id=eq.${user.id}&role=eq.owner`);
  let files = 0;
  for (const { household_id: hh } of owned) {
    for (;;) {
      const list = await admin('/storage/v1/object/list/tl-docs', { method: 'POST', body: JSON.stringify({ prefix: hh, limit: 100, offset: 0 }) });
      if (!list?.length) break;
      await admin('/storage/v1/object/tl-docs', { method: 'DELETE', body: JSON.stringify({ prefixes: list.map((f) => `${hh}/${f.name}`) }) });
      files += list.length;
    }
    await admin(`/rest/v1/tl_households?id=eq.${hh}`, { method: 'DELETE' });
  }
  await admin(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE' }); // cascades profile + remaining memberships + invites
  return json({ ok: true, households: owned.length, files });
};
export const config = { path: '/api/account/delete' };
