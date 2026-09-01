-- ---------------------------------------------------------------------------
-- Población, comarca y provincia como columnas propias de "clients" (antes
-- solo vivían como texto libre dentro de "address"). Sin default ni
-- not null: los clientes existentes se quedan a null hasta que alguien los
-- rellene a mano. No hace falta tocar RLS, son columnas nuevas de una tabla
-- que ya tiene sus policies por fila, no por columna.
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists locality text,
  add column if not exists region text,
  add column if not exists province text;
