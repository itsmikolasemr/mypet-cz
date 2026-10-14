// node tests/db.test.mjs – live checks against Supabase with test users (TLAPKA_TEST_PW)
import { createClient } from '@supabase/supabase-js';
const URL = 'https://owveqkchmcutoqlsjlyb.supabase.co', KEY = 'sb_publishable_EDy4Im3JrXxTsRYd62GY1A_J3gw_tcY', PW = process.env.TLAPKA_TEST_PW;
const as = async (e, dev) => { const c = createClient(URL, KEY, { global: { headers: dev ? { 'x-tlapka-device': dev } : {} }, auth: { persistSession: false }, realtime: { transport: class { close() {} } } }); const r = await c.auth.signInWithPassword({ email: e, password: PW }); if (r.error) throw r.error; return c; };
const D1 = 'device-one-0123456789', D2 = 'device-two-0123456789';
const R = {};
const A1 = await as('tlapka-e2e-a@example.com', D1), A2 = await as('tlapka-e2e-a@example.com', D2);
const hh = (await A1.rpc('tl_create_household', { p_name: 'Test', p_display: 'Jana' })).data;
R.adminRpcBlocked = (await A1.rpc('tl_admin_set_premium', { p_user: (await A1.auth.getUser()).data.user.id, p_on: true, p_until: null, p_source: 'x' })).error?.code ?? 'CALLABLE!';
R.claimD1 = (await A1.rpc('tl_claim_backup_device', { p_device: D1 })).data;
R.writeD1 = (await A1.from('tl_pets').upsert({ household_id: hh, id: 'p1', data: { name: 'Max' } })).error?.message ?? 'ok';
R.claimD2 = (await A2.rpc('tl_claim_backup_device', { p_device: D2 })).data;
R.writeD2 = (await A2.from('tl_pets').upsert({ household_id: hh, id: 'p2', data: { name: 'Mia' } })).error?.message ?? 'ok';
R.readD2 = (await A2.from('tl_pets').select('id').eq('household_id', hh)).data?.length;
R.forceD2 = (await A2.rpc('tl_claim_backup_device', { p_device: D2, p_force: true })).data;
R.writeD2after = (await A2.from('tl_pets').upsert({ household_id: hh, id: 'p2', data: { name: 'Mia' } })).error?.message ?? 'ok';
R.writeD1after = (await A1.from('tl_pets').upsert({ household_id: hh, id: 'p1', data: { name: 'Max2' } })).error?.message ?? 'ok';
// join removes the joiner's empty household
const B = await as('tlapka-e2e-b@example.com', 'device-bbb-0123456789');
const bOwn = (await B.rpc('tl_create_household', { p_name: 'Petr empty', p_display: 'Petr' })).data;
const code = (await A2.from('tl_invites').insert({ household_id: hh }).select('code').single()).data.code;
R.bJoin = (await B.rpc('tl_join', { p_code: code, p_display: 'Petr' })).error?.message ?? 'ok';
R.bHouseholds = (await B.from('tl_household_members').select('household_id')).data.map((x) => (x.household_id === hh ? 'joined' : x.household_id === bOwn ? 'OWN-EMPTY-LEFT' : '?'));
// non-empty own household is kept
const C = await as('tlapka-e2e-c@example.com', 'device-ccc-0123456789');
const cOwn = (await C.rpc('tl_create_household', { p_name: 'C data', p_display: 'C' })).data;
await C.rpc('tl_claim_backup_device', { p_device: 'device-ccc-0123456789' });
await C.from('tl_pets').upsert({ household_id: cOwn, id: 'cp', data: { name: 'Kocour' } });
console.log(JSON.stringify({ hh, cOwn, ...R }));
