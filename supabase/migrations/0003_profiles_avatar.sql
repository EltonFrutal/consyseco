-- avatar (foto do usuário)
alter table public.profiles add column if not exists avatar_url text;

-- bucket público de avatares: leitura livre, escrita só para admins ativos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Admins can upload avatars" on storage.objects;
create policy "Admins can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and public.is_active_admin());

drop policy if exists "Admins can update avatars" on storage.objects;
create policy "Admins can update avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and public.is_active_admin())
  with check (bucket_id = 'avatars' and public.is_active_admin());

drop policy if exists "Admins can delete avatars" on storage.objects;
create policy "Admins can delete avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and public.is_active_admin());
