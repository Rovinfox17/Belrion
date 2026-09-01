-- ---------------------------------------------------------------------------
-- Preferencia: cada cuántos meses se considera que un cliente "toca"
-- revisita, usada por el generador de rutas de visita. Misma tabla y RLS que
-- ya cubre chat_notifications (solo el propio usuario puede leer/escribir su
-- fila) - no hace falta ningún cambio de policies.
-- ---------------------------------------------------------------------------

alter table public.user_notification_preferences
  add column if not exists revisit_cycle_months integer not null default 3
    check (revisit_cycle_months in (1, 2, 3, 6));
