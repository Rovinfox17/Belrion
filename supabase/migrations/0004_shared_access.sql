-- Belrion — pasa de cartera aislada por usuario a cartera compartida por equipo.
-- Cualquier usuario autenticado (tú y tus compañeros) ve y edita los mismos
-- clientes, contactos, productos y visitas. push_subscriptions sigue siendo
-- privada por usuario (cada uno gestiona sus propias notificaciones).
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

-- clients ---------------------------------------------------------------
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;

create policy "clients_select_shared" on public.clients
  for select using (auth.uid() is not null);
create policy "clients_insert_shared" on public.clients
  for insert with check (auth.uid() is not null);
create policy "clients_update_shared" on public.clients
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "clients_delete_shared" on public.clients
  for delete using (auth.uid() is not null);

-- contacts ----------------------------------------------------------------
drop policy if exists "contacts_select_own" on public.contacts;
drop policy if exists "contacts_insert_own" on public.contacts;
drop policy if exists "contacts_update_own" on public.contacts;
drop policy if exists "contacts_delete_own" on public.contacts;

create policy "contacts_select_shared" on public.contacts
  for select using (auth.uid() is not null);
create policy "contacts_insert_shared" on public.contacts
  for insert with check (auth.uid() is not null);
create policy "contacts_update_shared" on public.contacts
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "contacts_delete_shared" on public.contacts
  for delete using (auth.uid() is not null);

-- products ------------------------------------------------------------------
drop policy if exists "products_select_own" on public.products;
drop policy if exists "products_insert_own" on public.products;
drop policy if exists "products_update_own" on public.products;
drop policy if exists "products_delete_own" on public.products;

create policy "products_select_shared" on public.products
  for select using (auth.uid() is not null);
create policy "products_insert_shared" on public.products
  for insert with check (auth.uid() is not null);
create policy "products_update_shared" on public.products
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "products_delete_shared" on public.products
  for delete using (auth.uid() is not null);

-- visits ----------------------------------------------------------------
drop policy if exists "visits_select_own" on public.visits;
drop policy if exists "visits_insert_own" on public.visits;
drop policy if exists "visits_update_own" on public.visits;
drop policy if exists "visits_delete_own" on public.visits;

create policy "visits_select_shared" on public.visits
  for select using (auth.uid() is not null);
create policy "visits_insert_shared" on public.visits
  for insert with check (auth.uid() is not null);
create policy "visits_update_shared" on public.visits
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "visits_delete_shared" on public.visits
  for delete using (auth.uid() is not null);

-- visit_comments ----------------------------------------------------------
drop policy if exists "visit_comments_select_own" on public.visit_comments;
drop policy if exists "visit_comments_insert_own" on public.visit_comments;
drop policy if exists "visit_comments_update_own" on public.visit_comments;
drop policy if exists "visit_comments_delete_own" on public.visit_comments;

create policy "visit_comments_select_shared" on public.visit_comments
  for select using (auth.uid() is not null);
create policy "visit_comments_insert_shared" on public.visit_comments
  for insert with check (auth.uid() is not null);
create policy "visit_comments_update_shared" on public.visit_comments
  for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "visit_comments_delete_shared" on public.visit_comments
  for delete using (auth.uid() is not null);
