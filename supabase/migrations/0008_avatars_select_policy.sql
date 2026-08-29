-- Belrion — política de lectura que faltaba en storage.objects para el
-- bucket "avatars". El bucket público solo controla la URL pública directa;
-- las operaciones normales del SDK (como upload con upsert, que primero
-- comprueba si el archivo ya existe) necesitan su propia política de SELECT
-- para no chocar con RLS.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

drop policy if exists "avatars_select_all" on storage.objects;

create policy "avatars_select_all" on storage.objects
  for select
  using (bucket_id = 'avatars');
