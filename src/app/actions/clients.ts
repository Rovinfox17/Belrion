"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type ClientStatus = "activo" | "potencial" | "inactivo";

export async function createClientWithContact(input: {
  companyName: string;
  contactName: string;
  status: ClientStatus;
  teamIds?: string[];
}) {
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();
  const t = await getTranslations("clients.newDialog.errors");
  const tErrors = await getTranslations("errors");

  if (!companyName || !contactName) {
    return { error: t("fieldsRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: tErrors("notAuthenticated") };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ company_name: companyName, status: input.status, user_id: user.id })
    .select("id")
    .single();

  if (clientError || !client) {
    return { error: t("createFailed") };
  }

  const { error: contactError } = await supabase
    .from("contacts")
    .insert({ client_id: client.id, name: contactName, is_primary: true });

  if (contactError) {
    return { error: t("contactSaveFailed") };
  }

  const teamIds = input.teamIds ?? [];
  if (teamIds.length > 0) {
    const { error: teamsError } = await supabase
      .from("client_teams")
      .insert(teamIds.map((teamId) => ({ client_id: client.id, team_id: teamId })));

    if (teamsError) {
      return { error: t("teamShareFailed") };
    }
  }

  revalidatePath("/");
  return { success: true as const, id: client.id as string };
}

export async function updateClient(input: {
  id: string;
  companyName: string;
  status: ClientStatus;
  address: string;
  notes: string;
}) {
  const companyName = input.companyName.trim();
  const t = await getTranslations("clients.editDialog.errors");

  if (!companyName) {
    return { error: t("nameRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      company_name: companyName,
      status: input.status,
      address: input.address.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: t("saveFailed") };
  }

  revalidatePath("/");
  revalidatePath(`/clientes/${input.id}`);
  return { success: true as const };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    const t = await getTranslations("clients.deleteDialog.errors");
    return { error: t("deleteFailed") };
  }

  revalidatePath("/");
  return { success: true as const };
}
