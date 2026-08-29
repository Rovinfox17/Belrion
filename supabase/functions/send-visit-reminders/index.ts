// Belrion — recordatorios de visitas por notificación push.
// Se ejecuta periódicamente vía pg_cron (ver supabase/migrations/0003_schedule_reminders.sql).
// Secrets necesarios (Project Settings -> Edge Functions -> Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ej. "mailto:tucorreo@ejemplo.com")
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:no-reply@belrion.es";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type VisitRow = {
  id: string;
  client_id: string;
  scheduled_at: string;
  reminder_minutes_before: number;
  clients: { company_name: string; user_id: string } | null;
};

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  const { data, error } = await supabase
    .from("visits")
    .select(
      "id, client_id, scheduled_at, reminder_minutes_before, clients(company_name, user_id)"
    )
    .eq("status", "pendiente")
    .is("notified_at", null)
    .not("reminder_minutes_before", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const visits = (data ?? []) as unknown as VisitRow[];

  const due = visits.filter((v) => {
    const remindAt = new Date(v.scheduled_at).getTime() - v.reminder_minutes_before * 60_000;
    return remindAt <= now.getTime();
  });

  let sent = 0;

  for (const visit of due) {
    const userId = visit.clients?.user_id;
    if (userId) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

      const scheduledTime = new Date(visit.scheduled_at).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const payload = JSON.stringify({
        title: "Recordatorio de visita",
        body: `Visita a ${visit.clients?.company_name ?? "cliente"} a las ${scheduledTime}`,
        url: `/clientes/${visit.client_id}`,
      });

      for (const sub of subscriptions ?? []) {
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
    }

    await supabase.from("visits").update({ notified_at: now.toISOString() }).eq("id", visit.id);
  }

  return new Response(
    JSON.stringify({ checked: visits.length, due: due.length, sent }),
    { headers: { "Content-Type": "application/json" } }
  );
});
