-- Belrion — programa la Edge Function "cleanup-team-chat" una vez al día
-- (borrado de mensajes de chat de equipo con más de 30 días).
-- Ejecutar DESPUÉS de haber desplegado la función (ver supabase/functions/cleanup-team-chat).
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

select
  cron.schedule(
    'cleanup-team-chat',
    '0 3 * * *',
    $$
    select
      net.http_post(
        url := 'https://dhvwmsfsxvjcqacebovp.supabase.co/functions/v1/cleanup-team-chat',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'sb_publishable_ZEzhv3-t0L0L9SjFiHp_6g_F4N2D52B'
        ),
        body := '{}'::jsonb
      );
    $$
  );

-- Para revisar el job:  select * from cron.job;
-- Para eliminarlo:      select cron.unschedule('cleanup-team-chat');
