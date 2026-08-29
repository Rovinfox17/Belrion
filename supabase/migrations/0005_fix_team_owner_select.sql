-- Belrion — corrige que el dueño de un equipo no podía leer su propio equipo
-- justo al crearlo (todavía no existía la fila de team_members en ese instante).
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

drop policy if exists "teams_select_member" on public.teams;

create policy "teams_select_member" on public.teams
  for select using (owner_id = auth.uid() or public.is_team_member(id));
