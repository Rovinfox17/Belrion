-- Belrion — chat de equipo en tiempo real (canal único por equipo), con
-- adjuntos en Storage y preferencia de notificación de mensajes por usuario.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------------------
-- Tabla: team_messages
-- ---------------------------------------------------------------------------

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text,
  message_type text not null default 'texto' check (message_type in ('texto', 'imagen', 'documento', 'video')),
  -- Ruta del objeto en el bucket "team-files" (no una URL pública: el bucket
  -- es privado), p.ej. "{team_id}/{uuid}-nombre.pdf". Null si el mensaje es
  -- solo texto.
  file_url text,
  file_name text,
  created_at timestamptz not null default now(),
  constraint team_messages_content_or_file check (content is not null or file_url is not null)
);

create index if not exists team_messages_team_id_created_at_idx
  on public.team_messages (team_id, created_at);

alter table public.team_messages enable row level security;

drop policy if exists "team_messages_select" on public.team_messages;
drop policy if exists "team_messages_insert" on public.team_messages;

create policy "team_messages_select" on public.team_messages
  for select using (public.is_team_member(team_id));
create policy "team_messages_insert" on public.team_messages
  for insert with check (public.is_team_member(team_id) and user_id = auth.uid());

-- Sin RLS de update/delete: los mensajes no se editan ni se borran a mano,
-- solo por la limpieza automática de 30 días (Edge Function con service role,
-- ver 0010_schedule_chat_cleanup.sql).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages'
  ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tabla: user_notification_preferences
-- ---------------------------------------------------------------------------

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chat_notifications boolean not null default true
);

alter table public.user_notification_preferences enable row level security;

drop policy if exists "user_notification_preferences_select_own" on public.user_notification_preferences;
drop policy if exists "user_notification_preferences_upsert_own" on public.user_notification_preferences;
drop policy if exists "user_notification_preferences_update_own" on public.user_notification_preferences;

create policy "user_notification_preferences_select_own" on public.user_notification_preferences
  for select using (user_id = auth.uid());
create policy "user_notification_preferences_upsert_own" on public.user_notification_preferences
  for insert with check (user_id = auth.uid());
create policy "user_notification_preferences_update_own" on public.user_notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: bucket privado "team-files", acceso restringido a miembros del
-- equipo. Convención de ruta: "{team_id}/{uuid}-nombre-original.ext", así la
-- política puede leer el team_id del primer segmento de la ruta.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('team-files', 'team-files', false)
on conflict (id) do nothing;

drop policy if exists "team_files_select_members" on storage.objects;
drop policy if exists "team_files_insert_members" on storage.objects;

create policy "team_files_select_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'team-files'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );

create policy "team_files_insert_members" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'team-files'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- get_team_members(): se amplía con name/avatar_url (antes solo email/role)
-- para poder pintar el remitente de cada mensaje del chat sin otra consulta.
-- Hay que borrarla primero: Postgres no permite cambiar las columnas de
-- salida de una función con CREATE OR REPLACE.
-- ---------------------------------------------------------------------------

drop function if exists public.get_team_members(uuid);

create function public.get_team_members(p_team_id uuid)
returns table (user_id uuid, email text, role text, name text, avatar_url text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    tm.user_id,
    u.email,
    tm.role,
    u.raw_user_meta_data ->> 'full_name' as name,
    u.raw_user_meta_data ->> 'avatar_url' as avatar_url
  from public.team_members tm
  join auth.users u on u.id = tm.user_id
  where tm.team_id = p_team_id
    and exists (
      select 1 from public.team_members tm2
      where tm2.team_id = p_team_id and tm2.user_id = auth.uid()
    );
$$;

revoke all on function public.get_team_members(uuid) from public;
grant execute on function public.get_team_members(uuid) to authenticated;
