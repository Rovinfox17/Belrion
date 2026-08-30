// Belrion — aprueba una solicitud de acceso: crea la cuenta de verdad e
// invita por email (con enlace para poner contraseña), y marca la solicitud
// como aprobada. Vive aquí (no en el frontend) porque necesita la Service
// Role key para invitar usuarios.
//
// Verifica primero, con el JWT de quien llama, que es un admin real (tabla
// app_admins) — mismo patrón de dos clientes que delete-account.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL")!;

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

  const supabaseAsUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await supabaseAsUser.auth.getUser();

  if (callerError || !caller) {
    return json({ error: "No autenticado." }, 401);
  }

  const { data: adminRow } = await supabaseAsUser
    .from("app_admins")
    .select("user_id")
    .eq("user_id", caller.id)
    .maybeSingle();

  if (!adminRow) {
    return json({ error: "No autorizado." }, 403);
  }

  let requestId: string | undefined;
  try {
    ({ requestId } = await req.json());
  } catch {
    // body ausente o inválido, se valida abajo
  }

  if (!requestId) {
    return json({ error: "Falta requestId." }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: accessRequest, error: fetchError } = await supabaseAdmin
    .from("access_requests")
    .select("id, name, email, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !accessRequest) {
    return json({ error: "Solicitud no encontrada." }, 404);
  }

  if (accessRequest.status !== "pendiente") {
    return json({ error: "Esta solicitud ya se ha revisado." }, 409);
  }

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    accessRequest.email,
    {
      data: { full_name: accessRequest.name },
      redirectTo: `${SITE_URL}/auth/callback?next=/restablecer`,
    }
  );

  if (inviteError) {
    console.error("inviteUserByEmail failed", inviteError);
    return json({ error: `No se pudo enviar la invitación: ${inviteError.message}` }, 500);
  }

  const { error: updateError } = await supabaseAdmin
    .from("access_requests")
    .update({ status: "aprobada", reviewed_at: new Date().toISOString(), reviewed_by: caller.id })
    .eq("id", requestId);

  if (updateError) {
    return json({ error: "Invitación enviada, pero no se pudo actualizar la solicitud." }, 500);
  }

  return json({ success: true });
});
