-- Belrion — equipos: cartera personal (por defecto) + cartera de equipo opcional.
-- Sustituye por completo cualquier intento anterior de "acceso compartido total".
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.clients
  add column if not exists team_id uuid references public.teams (id) on delete cascade;

create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists clients_team_id_idx on public.clients (team_id);

-- ---------------------------------------------------------------------------
-- Funciones de apoyo (security definer para evitar recursión en las policies
-- de RLS al comprobar pertenencia a un equipo).
-- ---------------------------------------------------------------------------

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id
      and (
        (c.team_id is null and c.user_id = auth.uid())
        or (c.team_id is not null and exists (
          select 1 from public.team_members tm
          where tm.team_id = c.team_id and tm.user_id = auth.uid()
        ))
      )
  );
$$;

-- Busca el id de un usuario ya registrado por email, para que el dueño de un
-- equipo pueda añadirlo. Solo expone el id, nada más de auth.users.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- Lista los miembros de un equipo con su email, solo visible para quien ya
-- pertenece a ese equipo (auth.users no es consultable directamente).
create or replace function public.get_team_members(p_team_id uuid)
returns table (user_id uuid, email text, role text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select tm.user_id, u.email, tm.role
  from public.team_members tm
  join auth.users u on u.id = tm.user_id
  where tm.team_id = p_team_id
    and exists (
      select 1 from public.team_members tm2
      where tm2.team_id = p_team_id and tm2.user_id = auth.uid()
    );
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_owner(uuid) from public;
revoke all on function public.can_access_client(uuid) from public;
revoke all on function public.find_user_id_by_email(text) from public;
revoke all on function public.get_team_members(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.find_user_id_by_email(text) to authenticated;
grant execute on function public.get_team_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: teams y team_members
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "teams_select_member" on public.teams
  for select using (public.is_team_member(id));
create policy "teams_insert_self" on public.teams
  for insert with check (owner_id = auth.uid());
create policy "teams_update_owner" on public.teams
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "teams_delete_owner" on public.teams
  for delete using (owner_id = auth.uid());

create policy "team_members_select_member" on public.team_members
  for select using (public.is_team_member(team_id));
create policy "team_members_insert_owner" on public.team_members
  for insert with check (public.is_team_owner(team_id));
create policy "team_members_delete_owner_or_self" on public.team_members
  for delete using (public.is_team_owner(team_id) or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: clients — personal (team_id null, propio user_id) o de equipo (miembro)
-- ---------------------------------------------------------------------------

drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;
drop policy if exists "clients_select_shared" on public.clients;
drop policy if exists "clients_insert_shared" on public.clients;
drop policy if exists "clients_update_shared" on public.clients;
drop policy if exists "clients_delete_shared" on public.clients;

create policy "clients_select" on public.clients
  for select using (
    (team_id is null and user_id = auth.uid())
    or (team_id is not null and public.is_team_member(team_id))
  );
create policy "clients_insert" on public.clients
  for insert with check (
    (team_id is null and user_id = auth.uid())
    or (team_id is not null and public.is_team_member(team_id))
  );
create policy "clients_update" on public.clients
  for update using (
    (team_id is null and user_id = auth.uid())
    or (team_id is not null and public.is_team_member(team_id))
  ) with check (
    (team_id is null and user_id = auth.uid())
    or (team_id is not null and public.is_team_member(team_id))
  );
create policy "clients_delete" on public.clients
  for delete using (
    (team_id is null and user_id = auth.uid())
    or (team_id is not null and public.is_team_member(team_id))
  );

-- ---------------------------------------------------------------------------
-- RLS: contacts / products / visits / visit_comments — vía can_access_client()
-- ---------------------------------------------------------------------------

drop policy if exists "contacts_select_own" on public.contacts;
drop policy if exists "contacts_insert_own" on public.contacts;
drop policy if exists "contacts_update_own" on public.contacts;
drop policy if exists "contacts_delete_own" on public.contacts;
drop policy if exists "contacts_select_shared" on public.contacts;
drop policy if exists "contacts_insert_shared" on public.contacts;
drop policy if exists "contacts_update_shared" on public.contacts;
drop policy if exists "contacts_delete_shared" on public.contacts;

create policy "contacts_select" on public.contacts
  for select using (public.can_access_client(client_id));
create policy "contacts_insert" on public.contacts
  for insert with check (public.can_access_client(client_id));
create policy "contacts_update" on public.contacts
  for update using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));
create policy "contacts_delete" on public.contacts
  for delete using (public.can_access_client(client_id));

drop policy if exists "products_select_own" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;
drop policy if exists "products_select_shared" on public.products;
drop policy if exists "products_insert_shared" on public.products;
drop policy if exists "products_update_shared" on public.products;
drop policy if exists "products_delete_shared" on public.products;

create policy "products_select" on public.products
  for select using (public.can_access_client(client_id));
create policy "products_insert" on public.products
  for insert with check (public.can_access_client(client_id));
create policy "products_update" on public.products
  for update using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));
create policy "products_delete" on public.products
  for delete using (public.can_access_client(client_id));

drop policy if exists "visits_select_own" on public.visits;
drop policy if exists "visits_insert_own" on public.visits;
drop policy if exists "visits_update_own" on public.visits;
drop policy if exists "visits_delete_own" on public.visits;
drop policy if exists "visits_select_shared" on public.visits;
drop policy if exists "visits_insert_shared" on public.visits;
drop policy if exists "visits_update_shared" on public.visits;
drop policy if exists "visits_delete_shared" on public.visits;

create policy "visits_select" on public.visits
  for select using (public.can_access_client(client_id));
create policy "visits_insert" on public.visits
  for insert with check (public.can_access_client(client_id));
create policy "visits_update" on public.visits
  for update using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));
create policy "visits_delete" on public.visits
  for delete using (public.can_access_client(client_id));

drop policy if exists "visit_comments_select_own" on public.visit_comments;
drop policy if exists "visit_comments_insert_own" on public.visit_comments;
drop policy if exists "visit_comments_update_own" on public.visit_comments;
drop policy if exists "visit_comments_delete_own" on public.visit_comments;
drop policy if exists "visit_comments_select_shared" on public.visit_comments;
drop policy if exists "visit_comments_insert_shared" on public.visit_comments;
drop policy if exists "visit_comments_update_shared" on public.visit_comments;
drop policy if exists "visit_comments_delete_shared" on public.visit_comments;

create policy "visit_comments_select" on public.visit_comments
  for select using (
    exists (select 1 from public.visits v where v.id = visit_comments.visit_id and public.can_access_client(v.client_id))
  );
create policy "visit_comments_insert" on public.visit_comments
  for insert with check (
    exists (select 1 from public.visits v where v.id = visit_comments.visit_id and public.can_access_client(v.client_id))
  );
create policy "visit_comments_update" on public.visit_comments
  for update using (
    exists (select 1 from public.visits v where v.id = visit_comments.visit_id and public.can_access_client(v.client_id))
  ) with check (
    exists (select 1 from public.visits v where v.id = visit_comments.visit_id and public.can_access_client(v.client_id))
  );
create policy "visit_comments_delete" on public.visit_comments
  for delete using (
    exists (select 1 from public.visits v where v.id = visit_comments.visit_id and public.can_access_client(v.client_id))
  );
