"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addClientToTeam(input: { clientId: string; teamId: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_teams")
    .insert({ client_id: input.clientId, team_id: input.teamId });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese cliente ya está compartido con ese equipo." };
    }
    return { error: "No se pudo compartir el cliente con el equipo." };
  }

  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}

export async function addClientsToTeam(input: { teamId: string; clientIds: string[] }) {
  if (input.clientIds.length === 0) {
    return { error: "Selecciona al menos un cliente." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_teams")
    .insert(input.clientIds.map((clientId) => ({ client_id: clientId, team_id: input.teamId })));

  if (error) {
    return { error: "No se pudieron añadir los clientes al equipo." };
  }

  revalidatePath("/");
  return { success: true as const, count: input.clientIds.length };
}

export async function removeClientFromTeam(input: { clientId: string; teamId: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_teams")
    .delete()
    .eq("client_id", input.clientId)
    .eq("team_id", input.teamId);

  if (error) {
    return { error: "No se pudo quitar el cliente del equipo." };
  }

  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}
