insert into storage.buckets (id, name, public, file_size_limit) values ('tl-docs', 'tl-docs', false, 20971520) on conflict (id) do nothing;
create or replace function tl_private.hh_from_path(p text) returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(p, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p, '/', 1)::uuid end $$;
grant execute on function tl_private.hh_from_path(text) to authenticated;
create policy "tl-docs read" on storage.objects for select to authenticated using (bucket_id = 'tl-docs' and (select tl_private.tl_can_read(tl_private.hh_from_path(name))));
create policy "tl-docs insert" on storage.objects for insert to authenticated with check (bucket_id = 'tl-docs' and (select tl_private.tl_can_write(tl_private.hh_from_path(name))));
create policy "tl-docs update" on storage.objects for update to authenticated using (bucket_id = 'tl-docs' and (select tl_private.tl_can_write(tl_private.hh_from_path(name))));
create policy "tl-docs delete" on storage.objects for delete to authenticated using (bucket_id = 'tl-docs' and (select tl_private.tl_can_write(tl_private.hh_from_path(name))));
alter publication supabase_realtime add table public.tl_pets, public.tl_reminders, public.tl_visits, public.tl_meds, public.tl_allergies, public.tl_documents, public.tl_dose_logs;
