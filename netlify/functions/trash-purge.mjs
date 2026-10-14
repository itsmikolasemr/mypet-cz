// Netlify Scheduled Function: purge cloud trash (soft-deleted rows) older than 30 days. Daily 03:15 UTC.
import { adminRpc, adminConfigured } from './_supa.mjs';
export default async () => {
  if (!adminConfigured()) { console.warn('trash-purge: SUPABASE_SERVICE_ROLE_KEY missing'); return new Response('not_configured', { status: 503 }); }
  await adminRpc('tl_purge_trash'); console.log('trash-purge ok'); return new Response('ok');
};
export const config = { schedule: '15 3 * * *' };
