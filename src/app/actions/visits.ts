"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { haversineDistanceMeters } from "@/lib/geo-distance";

type VisitStatus = "pendiente" | "completada" | "cancelada";
type CheckinCoords = { latitude: number; longitude: number; accuracy: number };

export async function createVisit(input: {
  clientId: string;
  scheduledAt: string;
  reminderMinutesBefore: number | null;
  teamIds?: string[];
}) {
  const t = await getTranslations("calendar.errors");
  if (!input.clientId) {
    return { error: t("selectClient") };
  }
  if (!input.scheduledAt) {
    return { error: t("selectDateTime") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("visits").insert({
    client_id: input.clientId,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    reminder_minutes_before: input.reminderMinutesBefore,
  });

  if (error) {
    return { error: t("createFailed") };
  }

  // Compartir la visita con un equipo significa compartir su cliente con ese
  // equipo (así el resto de visitas y el historial también quedan visibles).
  // Best-effort: si ya estaba compartido o el usuario no es el dueño del
  // cliente, se ignora sin bloquear la creación de la visita.
  for (const teamId of input.teamIds ?? []) {
    await supabase.from("client_teams").insert({ client_id: input.clientId, team_id: teamId });
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}

export async function updateVisit(input: {
  id: string;
  clientId: string;
  scheduledAt: string;
  status: VisitStatus;
  reminderMinutesBefore: number | null;
}) {
  const t = await getTranslations("calendar.errors");
  if (!input.scheduledAt) {
    return { error: t("selectDateTime") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      status: input.status,
      reminder_minutes_before: input.reminderMinutesBefore,
      notified_at: null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: t("updateFailed") };
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}

export async function setVisitStatus(input: {
  id: string;
  clientId: string;
  status: VisitStatus;
  checkin?: CheckinCoords | null;
}) {
  const supabase = await createClient();

  const hasCheckin = input.status === "completada" && Boolean(input.checkin);
  const { error } = await supabase
    .from("visits")
    .update({
      status: input.status,
      checkin_latitude: hasCheckin ? input.checkin!.latitude : undefined,
      checkin_longitude: hasCheckin ? input.checkin!.longitude : undefined,
      checkin_accuracy: hasCheckin ? input.checkin!.accuracy : undefined,
    })
    .eq("id", input.id);

  if (error) {
    const t = await getTranslations("calendar.errors");
    return { error: t("statusUpdateFailed") };
  }

  let distanceMeters: number | null = null;
  if (input.status === "completada" && input.checkin) {
    const { data: client } = await supabase
      .from("clients")
      .select("latitude, longitude")
      .eq("id", input.clientId)
      .maybeSingle();
    if (client?.latitude != null && client?.longitude != null) {
      distanceMeters = haversineDistanceMeters(
        input.checkin.latitude,
        input.checkin.longitude,
        client.latitude,
        client.longitude
      );
    }
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const, distanceMeters };
}

export async function deleteVisit(input: { id: string; clientId: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("visits").delete().eq("id", input.id);

  if (error) {
    const t = await getTranslations("calendar.errors");
    return { error: t("deleteFailed") };
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}
