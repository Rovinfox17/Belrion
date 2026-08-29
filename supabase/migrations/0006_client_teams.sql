-- Belrion — un cliente ya no pertenece SOLO a personal o SOLO a un equipo:
-- ahora puede estar en tu cartera personal y compartirse con uno o varios
-- equipos a la vez, mediante la tabla puente client_teams.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists public.client_teams (
  client_id uuid not null references public.clients (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (client_id, team_id)
);

create index if not exists client_teams_team_id_idx on public.client_teams (team_id);

-- Migra lo que hubiera en clients.team_id a la nueva tabla puente.
insert into public.client_teams (client_id, team_id)
select id, team_id from public.clients where team_id is not null
on conflict do nothing;

alter table public.clients drop column if exists team_id;

-- ---------------------------------------------------------------------------
-- can_access_client(): propiedad directa o vía client_teams (antes miraba
-- clients.team_id, que ya no existe).
-- ---------------------------------------------------------------------------

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
        c.user_id = auth.uid()
        or exists (
          select 1 from public.client_teams ct
          where ct.client_id = c.id and public.is_team_member(ct.team_id)
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- clients: RLS simplificada
-- ---------------------------------------------------------------------------

drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;

create policy "clients_select" on public.clients
  for select using (public.can_access_client(id));
create policy "clients_insert" on public.clients
  for insert with check (user_id = auth.uid());
create policy "clients_update" on public.clients
  for update using (public.can_access_client(id)) with check (public.can_access_client(id));
create policy "clients_delete" on public.clients
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- client_teams: quién puede ver / compartir / dejar de compartir un cliente
-- ---------------------------------------------------------------------------

alter table public.client_teams enable row level security;

create policy "client_teams_select" on public.client_teams
  for select using (public.can_access_client(client_id));

create policy "client_teams_insert_owner" on public.client_teams
  for insert with check (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
    and public.is_team_member(team_id)
  );

create policy "client_teams_delete_owner_or_team_owner" on public.client_teams
  for delete using (
    exists (select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid())
    or public.is_team_owner(team_id)
  );
