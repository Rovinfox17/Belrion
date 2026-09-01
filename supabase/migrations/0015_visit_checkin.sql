-- ---------------------------------------------------------------------------
-- Check-in GPS al completar una visita: ubicación del dispositivo en ese
-- momento (API nativa del navegador, sin coste). Sin default ni not null:
-- las visitas ya completadas se quedan sin check-in retroactivo, y si el
-- usuario deniega el permiso, la visita se completa igual sin estos datos.
-- ---------------------------------------------------------------------------

alter table public.visits
  add column if not exists checkin_latitude double precision,
  add column if not exists checkin_longitude double precision,
  add column if not exists checkin_accuracy double precision;
