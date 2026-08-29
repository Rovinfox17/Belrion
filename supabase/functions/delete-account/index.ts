// Belrion — elimina la cuenta del usuario autenticado que llama a esta función
// y todos sus datos (RGPD, derecho de supresión).
//
// Necesita la Service Role key para borrar de auth.users, por eso vive aquí
// como Edge Function y nunca en el frontend. SUPABASE_URL, SUPABASE_ANON_KEY
// y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
//
// Verifica primero, con el JWT que envía el propio cliente (no con la
// service role), que quien llama es un usuario real y autenticado, y solo
// borra los datos de ESE usuario — nunca acepta un id por parámetro.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Se llama directamente desde el navegador, así que necesita cabeceras CORS
// (a diferencia de send-visit-reminders, que solo la invoca el cron).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "No autenticado." }, 401);
  }

  // Cliente "como el usuario": solo sirve para confirmar quién es, con su
  // propio JWT. No tiene privilegios de service role.
  const supabaseAsUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAsUser.auth.getUser();

  if (userError || !user) {
    return json({ error: "No autenticado." }, 401);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: ownedClients, error: clientsError } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", user.id);

  if (clientsError) {
    return json({ error: "No se pudieron leer los datos a borrar." }, 500);
  }

  const clientIds = (ownedClients ?? []).map((c) => c.id);

  if (clientIds.length > 0) {
    const { data: ownedVisits } = await supabaseAdmin
      .from("visits")
      .select("id")
      .in("client_id", clientIds);
    const visitIds = (ownedVisits ?? []).map((v) => v.id);

    if (visitIds.length > 0) {
      await supabaseAdmin.from("visit_comments").delete().in("visit_id", visitIds);
      await supabaseAdmin.from("visits").delete().in("id", visitIds);
    }

    await supabaseAdmin.from("products").delete().in("client_id", clientIds);
    await supabaseAdmin.from("contacts").delete().in("client_id", clientIds);
    await supabaseAdmin.from("clients").delete().in("id", clientIds);
  }

  await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", user.id);

  // Equipos, membresías y comparticiones cliente-equipo de este usuario se
  // limpian solos vía ON DELETE CASCADE al borrar el usuario de auth.users.
  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return json({ error: "No se pudo eliminar la cuenta." }, 500);
  }

  return json({ success: true });
});
