-- Útulky z /workspace/tlapka-research/shelters.json (ARES). verified_at = now(): všech 12 útulků schválil uživatel 14. 10. 2026 → v aplikaci se zobrazí.
-- Spustit ručně service rolí až po schválení migrace. Idempotentní podle IČO.
insert into public.tl_shelters(name, ico, city, region, web, donate_url, contact_email, contact_phone, verified_at)
select name, ico, city, region, web, donate_url, contact_email, contact_phone, now() from (values
  ('Městský útulek Brno (Městská policie Brno)', '44992785', 'Brno', 'Jihomoravský', 'https://www.mpb.cz/cs/utulek', null, null, null),
  ('Brněnská nadace ochrany zvířat, o.p.s. (útulek S.O.S. zvířatům, Kociánka)', '65278381', 'Brno', 'Jihomoravský', null, null, null, null),
  ('Kočičí domov Sissi, z.s.', '14288443', 'Rosice', 'Jihomoravský', 'https://www.kociciutulek.cz', 'https://www.darujme.cz/organizace/1201187', null, null),
  ('Útulek pro opuštěná zvířata Troja (hl. m. Praha)', '00064581', 'Praha', 'Praha', 'https://www.upozpraha.cz/', null, null, null),
  ('Nadace na ochranu zvířat', '61387878', 'Praha', 'Praha', 'https://www.ochranazvirat.cz/', null, null, null),
  ('Městský útulek Pardubice', '00274046', 'Pardubice', 'Pardubický', 'https://www.utulekpardubice.cz/', null, null, null),
  ('Kočky v nouzi, z.s.', '03020517', 'Pardubice', 'Pardubický', null, null, null, null),
  ('Liga na ochranu zvířat ČR místní organizace Olomouc', '62335791', 'Olomouc', 'Olomoucký', 'https://www.olomouckyutulek.cz/', null, null, null),
  ('Útulek Zlín, z.s. (Útulek Zlín-Vršava)', '08633045', 'Zlín', 'Zlínský', 'https://www.utulekzlin.cz/', null, null, null),
  ('Útulek pro opuštěná zvířata BONA, o.p.s.', '02492172', 'Kozly (Česká Lípa)', 'Liberecký', 'https://www.utulekbona.cz/', null, null, null),
  ('1. Kočičí útulek na Vysočině z.s.', '03731821', 'Polná-Skrýšov', 'Vysočina', null, null, null, null),
  ('Psí útulek U Šmudliny', '02280906', 'Stříbro', 'Plzeňský', null, null, null, null)
) v(name, ico, city, region, web, donate_url, contact_email, contact_phone)
where not exists (select 1 from public.tl_shelters s where s.ico = v.ico);
