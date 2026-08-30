// Belrion — notificación push cuando llega un mensaje nuevo al chat de un
// equipo. Se invoca directamente desde la Server Action que crea el mensaje
// (src/app/actions/team-messages.ts), no por cron, así que no necesita CORS.
// Secrets necesarios (Project Settings -> Edge Functions -> Secrets), ya
// configurados para send-visit-reminders:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:no-reply@belrion.es";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type SubscriptionRow = { endpoint: string; p256dh: string; auth: string };

function messagePreview(content: string | null, messageType: string): string {
  if (content && content.trim()) {
    return content.length > 80 ? `${content.slice(0, 80)}…` : content;
  }
  if (messageType === "imagen") return "📷 Imagen";
  if (messageType === "video") return "🎬 Vídeo";
  if (messageType === "documento") return "📄 Documento";
  return "Nuevo mensaje";
}

Deno.serve(async (req) => {
  const { teamId, messageId } = await req.json().catch(() => ({}));

  if (!teamId || !messageId) {
    return new Response(JSON.stringify({ error: "teamId y messageId son obligatorios" }), {
      status: 400,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: message, error: messageError } = await supabase
    .from("team_messages")
    .select("id, user_id, content, message_type")
    .eq("id", messageId)
    .single();

  if (messageError || !message) {
    return new Response(JSON.stringify({ error: "Mensaje no encontrado" }), { status: 404 });
  }

  const [{ data: team }, { data: sender }, { data: members }] = await Promise.all([
    supabase.from("teams").select("name").eq("id", teamId).single(),
    supabase.auth.admin.getUserById(message.user_id),
    supabase.from("team_members").select("user_id").eq("team_id", teamId),
  ]);

  const senderName =
    (sender?.user?.user_metadata?.full_name as string | undefined) ||
    sender?.user?.email ||
    "Alguien";
  const teamName = team?.name ?? "Equipo";

  const recipientIds = (members ?? [])
    .map((m) => m.user_id as string)
    .filter((id) => id !== message.user_id);

  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: preferences } = await supabase
    .from("user_notification_preferences")
    .select("user_id, chat_notifications")
    .in("user_id", recipientIds);

  const optedOut = new Set(
    (preferences ?? []).filter((p) => p.chat_notifications === false).map((p) => p.user_id)
  );
  const targetIds = recipientIds.filter((id) => !optedOut.has(id));

  if (targetIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", targetIds);

  const payload = JSON.stringify({
    title: teamName,
    body: `${senderName}: ${messagePreview(message.content, message.message_type)}`,
    url: `/equipo/${teamId}`,
  });

  let sent = 0;
  for (const sub of (subscriptions ?? []) as SubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      console.error("push send failed", statusCode, err);
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
