// Belrion — borra mensajes de chat de equipo (y sus adjuntos en Storage) con
// más de 30 días de antigüedad. Se ejecuta una vez al día vía pg_cron (ver
// supabase/migrations/0010_schedule_chat_cleanup.sql), igual que
// send-visit-reminders. No necesita CORS: solo se invoca por cron.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RETENTION_DAYS = 30;

type MessageRow = { id: string; file_url: string | null };

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("team_messages")
    .select("id, file_url")
    .lt("created_at", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const messages = (data ?? []) as MessageRow[];

  if (messages.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const filePaths = messages.map((m) => m.file_url).filter((path): path is string => !!path);

  if (filePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from("team-files").remove(filePaths);
    if (storageError) {
      console.error("failed to remove team-files objects", storageError);
    }
  }

  const { error: deleteError } = await supabase
    .from("team_messages")
    .delete()
    .in(
      "id",
      messages.map((m) => m.id)
    );

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
