"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type VisitStatus = "pendiente" | "completada" | "cancelada";

export async function createVisit(input: {
  clientId: string;
  scheduledAt: string;
  reminderMinutesBefore: number | null;
}) {
  if (!input.clientId) {
    return { error: "Selecciona un cliente." };
  }
  if (!input.scheduledAt) {
    return { error: "Selecciona una fecha y hora." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("visits").insert({
    client_id: input.clientId,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    reminder_minutes_before: input.reminderMinutesBefore,
  });

  if (error) {
    return { error: "No se pudo crear la visita." };
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
  if (!input.scheduledAt) {
    return { error: "Selecciona una fecha y hora." };
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
    return { error: "No se pudo actualizar la visita." };
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
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({ status: input.status })
    .eq("id", input.id);

  if (error) {
    return { error: "No se pudo actualizar el estado de la visita." };
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}

export async function deleteVisit(input: { id: string; clientId: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("visits").delete().eq("id", input.id);

  if (error) {
    return { error: "No se pudo eliminar la visita." };
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}
