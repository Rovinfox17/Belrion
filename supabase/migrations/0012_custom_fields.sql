-- Belrion — campos personalizados de cliente: cada usuario define sus propios
-- campos extra (texto, número, fecha, lista o sí/no), privados o compartidos
-- con su equipo, y los rellena por cliente.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('texto', 'numero', 'fecha', 'lista', 'booleano')),
  options text[],
  team_id uuid references public.teams (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_field_definitions_owner_id_idx on public.custom_field_definitions (owner_id);
create index if not exists custom_field_definitions_team_id_idx on public.custom_field_definitions (team_id);

drop trigger if exists custom_field_definitions_set_updated_at on public.custom_field_definitions;
create trigger custom_field_definitions_set_updated_at
  before update on public.custom_field_definitions
  for each row
  execute function public.set_updated_at();

create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  field_id uuid not null references public.custom_field_definitions (id) on delete cascade,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, field_id)
);

create index if not exists custom_field_values_client_id_idx on public.custom_field_values (client_id);
create index if not exists custom_field_values_field_id_idx on public.custom_field_values (field_id);

drop trigger if exists custom_field_values_set_updated_at on public.custom_field_values;
create trigger custom_field_values_set_updated_at
  before update on public.custom_field_values
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Funciones de apoyo (security definer, mismo patrón que can_access_client en
-- 0006_client_teams.sql, para evitar recursión en las policies de RLS).
-- ---------------------------------------------------------------------------

create or replace function public.can_access_custom_field(p_field_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.custom_field_definitions d
    where d.id = p_field_id
      and (
        d.owner_id = auth.uid()
        or (d.team_id is not null and public.is_team_member(d.team_id))
      )
  );
$$;

revoke all on function public.can_access_custom_field(uuid) from public;
grant execute on function public.can_access_custom_field(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_values enable row level security;

-- custom_field_definitions: cualquiera con acceso (dueño o miembro del equipo
-- si es compartido) puede ver la definición, pero solo quien la creó puede
-- gestionarla (editar tipo/opciones/nombre, reordenar, borrar) — el resto del
-- equipo solo rellena valores en los clientes, no redefine el campo.
create policy custom_field_definitions_select on public.custom_field_definitions
  for select
  using (
    owner_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id))
  );

create policy custom_field_definitions_insert on public.custom_field_definitions
  for insert
  with check (
    owner_id = auth.uid()
    and (team_id is null or public.is_team_member(team_id))
  );

create policy custom_field_definitions_update on public.custom_field_definitions
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy custom_field_definitions_delete on public.custom_field_definitions
  for delete
  using (owner_id = auth.uid());

-- custom_field_values: quien pueda ver el cliente Y el campo puede leer y
-- escribir su valor en ese cliente (así un compañero de equipo puede rellenar
-- un campo compartido en un cliente compartido).
create policy custom_field_values_select on public.custom_field_values
  for select
  using (
    public.can_access_client(client_id)
    and public.can_access_custom_field(field_id)
  );

create policy custom_field_values_insert on public.custom_field_values
  for insert
  with check (
    public.can_access_client(client_id)
    and public.can_access_custom_field(field_id)
  );

create policy custom_field_values_update on public.custom_field_values
  for update
  using (
    public.can_access_client(client_id)
    and public.can_access_custom_field(field_id)
  )
  with check (
    public.can_access_client(client_id)
    and public.can_access_custom_field(field_id)
  );

create policy custom_field_values_delete on public.custom_field_values
  for delete
  using (
    public.can_access_client(client_id)
    and public.can_access_custom_field(field_id)
  );
