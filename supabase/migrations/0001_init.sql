-- Belrion — esquema inicial (clientes, contactos, productos, visitas, comentarios de visita)
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  notes text,
  status text not null default 'potencial' check (status in ('activo', 'potencial', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  role text,
  is_primary boolean not null default false
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  details text
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'completada', 'cancelada')),
  reminder_minutes_before integer,
  created_at timestamptz not null default now()
);

create table if not exists public.visit_comments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices (filtros, orden y búsquedas de la sección 5.2/5.4)
-- ---------------------------------------------------------------------------

create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_company_name_idx on public.clients (company_name);

create index if not exists contacts_client_id_idx on public.contacts (client_id);
create index if not exists products_client_id_idx on public.products (client_id);

create index if not exists visits_client_id_idx on public.visits (client_id);
create index if not exists visits_scheduled_at_idx on public.visits (scheduled_at);
create index if not exists visits_status_idx on public.visits (status);

create index if not exists visit_comments_visit_id_idx on public.visit_comments (visit_id);

-- ---------------------------------------------------------------------------
-- updated_at automático en clients
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: cada usuario autenticado solo ve/edita sus propios datos
-- ---------------------------------------------------------------------------

alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.products enable row level security;
alter table public.visits enable row level security;
alter table public.visit_comments enable row level security;

-- clients: propietario directo vía user_id
create policy "clients_select_own" on public.clients
  for select using (user_id = auth.uid());
create policy "clients_insert_own" on public.clients
  for insert with check (user_id = auth.uid());
create policy "clients_update_own" on public.clients
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clients_delete_own" on public.clients
  for delete using (user_id = auth.uid());

-- contacts: propietario a través de clients.user_id
create policy "contacts_select_own" on public.contacts
  for select using (
    exists (select 1 from public.clients c where c.id = contacts.client_id and c.user_id = auth.uid())
  );
create policy "contacts_insert_own" on public.contacts
  for insert with check (
    exists (select 1 from public.clients c where c.id = contacts.client_id and c.user_id = auth.uid())
  );
create policy "contacts_update_own" on public.contacts
  for update using (
    exists (select 1 from public.clients c where c.id = contacts.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = contacts.client_id and c.user_id = auth.uid())
  );
create policy "contacts_delete_own" on public.contacts
  for delete using (
    exists (select 1 from public.clients c where c.id = contacts.client_id and c.user_id = auth.uid())
  );

-- products: propietario a través de clients.user_id
create policy "products_select_own" on public.products
  for select using (
    exists (select 1 from public.clients c where c.id = products.client_id and c.user_id = auth.uid())
  );
create policy "products_insert_own" on public.products
  for insert with check (
    exists (select 1 from public.clients c where c.id = products.client_id and c.user_id = auth.uid())
  );
create policy "products_update_own" on public.products
  for update using (
    exists (select 1 from public.clients c where c.id = products.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = products.client_id and c.user_id = auth.uid())
  );
create policy "products_delete_own" on public.products
  for delete using (
    exists (select 1 from public.clients c where c.id = products.client_id and c.user_id = auth.uid())
  );

-- visits: propietario a través de clients.user_id
create policy "visits_select_own" on public.visits
  for select using (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );
create policy "visits_insert_own" on public.visits
  for insert with check (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );
create policy "visits_update_own" on public.visits
  for update using (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );
create policy "visits_delete_own" on public.visits
  for delete using (
    exists (select 1 from public.clients c where c.id = visits.client_id and c.user_id = auth.uid())
  );

-- visit_comments: propietario a través de visits -> clients.user_id
create policy "visit_comments_select_own" on public.visit_comments
  for select using (
    exists (
      select 1 from public.visits v
      join public.clients c on c.id = v.client_id
      where v.id = visit_comments.visit_id and c.user_id = auth.uid()
    )
  );
create policy "visit_comments_insert_own" on public.visit_comments
  for insert with check (
    exists (
      select 1 from public.visits v
      join public.clients c on c.id = v.client_id
      where v.id = visit_comments.visit_id and c.user_id = auth.uid()
    )
  );
create policy "visit_comments_update_own" on public.visit_comments
  for update using (
    exists (
      select 1 from public.visits v
      join public.clients c on c.id = v.client_id
      where v.id = visit_comments.visit_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.visits v
      join public.clients c on c.id = v.client_id
      where v.id = visit_comments.visit_id and c.user_id = auth.uid()
    )
  );
create policy "visit_comments_delete_own" on public.visit_comments
  for delete using (
    exists (
      select 1 from public.visits v
      join public.clients c on c.id = v.client_id
      where v.id = visit_comments.visit_id and c.user_id = auth.uid()
    )
  );
