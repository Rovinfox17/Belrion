-- Belrion — solicitud de acceso con aprobación manual + panel de admin + feedback.
-- Sustituye el registro público libre: nadie crea cuenta por su cuenta, solo
-- pide acceso y un admin la aprueba (lo que crea la cuenta de verdad) o la
-- rechaza. No afecta a las invitaciones de equipo (0004_shared_access.sql),
-- que siguen siendo un flujo aparte para gente que ya tiene o va a tener cuenta.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  reason text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('error', 'mejora', 'otro')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_at_idx on public.feedback_submissions (created_at desc);

-- ---------------------------------------------------------------------------
-- Funciones de apoyo (security definer, mismo patrón que is_team_member en
-- 0004_shared_access.sql, para evitar recursión en las policies de RLS).
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Feedback con el email de quien lo mandó, solo para admins (auth.users no
-- es consultable directamente) — mismo patrón que get_team_members.
create or replace function public.get_feedback_submissions()
returns table (
  id uuid,
  user_id uuid,
  email text,
  category text,
  message text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select f.id, f.user_id, u.email, f.category, f.message, f.created_at
  from public.feedback_submissions f
  join auth.users u on u.id = f.user_id
  where public.is_admin()
  order by f.created_at desc;
$$;

revoke all on function public.get_feedback_submissions() from public;
grant execute on function public.get_feedback_submissions() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.access_requests enable row level security;
alter table public.app_admins enable row level security;
alter table public.feedback_submissions enable row level security;

-- access_requests: cualquiera (con o sin sesión) puede crear una solicitud
-- desde el formulario público. Solo un admin puede leerlas o revisarlas.
create policy access_requests_insert on public.access_requests
  for insert
  to anon, authenticated
  with check (true);

create policy access_requests_select on public.access_requests
  for select
  using (public.is_admin());

create policy access_requests_update on public.access_requests
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- app_admins: cada usuario solo puede leer si SU PROPIO id está en la tabla
-- (para que la app pueda comprobar "¿soy admin?"), nunca la lista completa.
-- Sin policies de insert/update/delete a propósito: la gestión de admins es
-- manual por SQL, no una función más de la app.
create policy app_admins_select_self on public.app_admins
  for select
  using (user_id = auth.uid());

-- feedback_submissions: cualquier usuario autenticado puede mandar el suyo;
-- solo lo puede leer quien lo mandó o un admin (vista de todo el feedback).
create policy feedback_submissions_insert on public.feedback_submissions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy feedback_submissions_select on public.feedback_submissions
  for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin inicial (tu propia cuenta, la que usamos para depurar RLS esta sesión)
-- ---------------------------------------------------------------------------

insert into public.app_admins (user_id)
select id from auth.users where email = 'rovinshop17@gmail.com'
on conflict (user_id) do nothing;
