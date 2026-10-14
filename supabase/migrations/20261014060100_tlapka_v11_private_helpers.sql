create schema if not exists tl_private;
grant usage on schema tl_private to authenticated;
alter function public.tl_role(uuid) set schema tl_private;
alter function public.tl_can_read(uuid) set schema tl_private;
alter function public.tl_can_write(uuid) set schema tl_private;
alter function public.tl_touch() set schema tl_private;
