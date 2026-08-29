"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function addClientToTeam(input: { clientId: string; teamId: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_teams")
    .insert({ client_id: input.clientId, team_id: input.teamId });

  if (error) {
    const t = await getTranslations("clients.teams.errors");
    if (error.code === "23505") {
      return { error: t("alreadyShared") };
    }
    return { error: t("shareFailed") };
  }

  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}

export async function addClientsToTeam(input: { teamId: string; clientIds: string[] }) {
  const t = await getTranslations("clients.teams.errors");
  if (input.clientIds.length === 0) {
    return { error: t("selectAtLeastOne") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_teams")
    .insert(input.clientIds.map((clientId) => ({ client_id: clientId, team_id: input.teamId })));

  if (error) {
    return { error: t("addMultipleFailed") };
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
    const t = await getTranslations("clients.teams.errors");
    return { error: t("removeFailed") };
  }

  revalidatePath("/");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}
