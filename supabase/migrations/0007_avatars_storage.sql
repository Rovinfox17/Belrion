-- Belrion — bucket de Storage para las fotos de perfil.
-- Cada archivo se guarda como "{user_id}/nombre-de-archivo", y solo el propio
-- usuario puede subir/actualizar/borrar dentro de su propia carpeta. El
-- bucket es público en lectura (son fotos de perfil, no datos sensibles),
-- así la cabecera de la app puede mostrarlas con una URL directa.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_all" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

-- El flag "public" del bucket solo afecta a la URL pública directa; las
-- operaciones normales del SDK (como upload con upsert, que primero
-- comprueba si el archivo ya existe) necesitan su propia política de SELECT.
create policy "avatars_select_all" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
