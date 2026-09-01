-- Belrion — programa la Edge Function "geocode-pending-clients" cada minuto
-- (geocodifica en segundo plano hasta 5 clientes con dirección pero sin
-- latitud/longitud, respetando el límite de Nominatim de ~1 petición/seg).
-- Ejecutar DESPUÉS de haber desplegado la función (ver
-- supabase/functions/geocode-pending-clients).
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run

select
  cron.schedule(
    'geocode-pending-clients',
    '* * * * *',
    $$
    select
      net.http_post(
        url := 'https://dhvwmsfsxvjcqacebovp.supabase.co/functions/v1/geocode-pending-clients',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'sb_publishable_ZEzhv3-t0L0L9SjFiHp_6g_F4N2D52B'
        ),
        body := '{}'::jsonb
      );
    $$
  );

-- Para revisar el job:  select * from cron.job;
-- Para eliminarlo:      select cron.unschedule('geocode-pending-clients');
