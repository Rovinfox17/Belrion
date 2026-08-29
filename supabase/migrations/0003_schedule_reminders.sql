-- Belrion — programa la Edge Function "send-visit-reminders" cada 5 minutos.
-- Ejecutar DESPUÉS de haber desplegado la función (ver supabase/functions/send-visit-reminders).
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'send-visit-reminders',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := 'https://dhvwmsfsxvjcqacebovp.supabase.co/functions/v1/send-visit-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'sb_publishable_ZEzhv3-t0L0L9SjFiHp_6g_F4N2D52B'
        ),
        body := '{}'::jsonb
      );
    $$
  );

-- Para revisar el job:  select * from cron.job;
-- Para eliminarlo:      select cron.unschedule('send-visit-reminders');
