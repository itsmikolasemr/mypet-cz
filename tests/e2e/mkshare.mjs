import { createClient } from '/workspace/mypet-scan/node_modules/@supabase/supabase-js/dist/index.mjs'; import crypto from 'node:crypto';
const c = createClient('https://owveqkchmcutoqlsjlyb.supabase.co', 'sb_publishable_EDy4Im3JrXxTsRYd62GY1A_J3gw_tcY', { global: { headers: { 'x-tlapka-device': 'dev-a-0123456789' } }, auth: { persistSession: false }, realtime: { transport: class { close() {} } } });
const r = await c.auth.signInWithPassword({ email: 'tlapka-e2e-a@example.com', password: process.env.TLAPKA_TEST_PW }); if (r.error) throw r.error;
const hh = (await c.rpc('tl_create_household', { p_name: 'H', p_display: 'Jana' })).data; await c.rpc('tl_claim_backup_device', { p_device: 'dev-a-0123456789' });
const pet = { id: 'max', name: 'Max', species: 'pes', breed: 'Labrador', sex: 'samec', birthDate: '2020-03-01', color: '', microchip: '203', notes: '', weights: [{ id: 'w', date: '2026-10-01', kg: 31 }], createdAt: '2026-10-01',
  care: { feeding: [{ id: 'f', what: 'Granule Brit Care Lamb', amount: '150 g', timesPerDay: 2, times: '7:00, 18:00' }], walks: '3× denně 30 min', habits: 'Spí v obýváku', owner: { name: 'Jana', phone: '+420 777 123 456' }, vet: { name: 'Veterina Brno-střed', phone: '543 210 987' }, emergency: 'Při zvracení volat veterináře' } };
let e = (await c.from('tl_pets').upsert({ household_id: hh, id: 'max', pet_id: 'max', data: pet })).error; if (e) throw e;
e = (await c.from('tl_allergies').upsert({ household_id: hh, id: 'a1', pet_id: 'max', data: { id: 'a1', petId: 'max', allergen: 'Kuřecí maso', reaction: 'svědění', severity: 'stredni' } })).error; if (e) throw e;
const raw = crypto.randomBytes(24).toString('hex'); const th = crypto.createHash('sha256').update(raw).digest('hex');
e = (await c.from('tl_share_links').insert({ household_id: hh, pet_ids: ['max'], token_hash: th, scope: 'pass', expires_at: new Date(Date.now() + 864e5).toISOString() })).error; if (e) throw e;
console.log('http://localhost:4125/#share/' + raw);
