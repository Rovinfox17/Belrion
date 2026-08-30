"use server";

import { randomUUID } from "node:crypto";
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

  // Se genera el id aquí en vez de pedirlo de vuelta con .select() porque un
  // INSERT ... RETURNING bajo RLS también exige que la fila nueva pase la
  // política de SELECT, y la de "clients" se apoya en una función que
  // vuelve a consultar la propia tabla — para una fila creada en la misma
  // sentencia, Postgres no la da por visible todavía y el insert se rechaza
  // aunque el usuario sea el dueño legítimo.
  const clientId = randomUUID();
  const { error: clientError } = await supabase
    .from("clients")
    .insert({ id: clientId, company_name: companyName, status: input.status, user_id: user.id });

  if (clientError) {
    console.error("createClientWithContact failed", { userId: user.id, clientError });
    return { error: t("createFailed") };
  }

  const { error: contactError } = await supabase
    .from("contacts")
    .insert({ client_id: clientId, name: contactName, is_primary: true });

  if (contactError) {
    return { error: t("contactSaveFailed") };
  }

  const teamIds = input.teamIds ?? [];
  if (teamIds.length > 0) {
    const { error: teamsError } = await supabase
      .from("client_teams")
      .insert(teamIds.map((teamId) => ({ client_id: clientId, team_id: teamId })));

    if (teamsError) {
      return { error: t("teamShareFailed") };
    }
  }

  revalidatePath("/");
  return { success: true as const, id: clientId };
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
