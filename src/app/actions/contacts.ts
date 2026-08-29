"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function createContact(input: {
  clientId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  isPrimary: boolean;
}) {
  const name = input.name.trim();
  const t = await getTranslations("clients.contacts.errors");
  if (!name) {
    return { error: t("nameRequired") };
  }

  const supabase = await createClient();

  if (input.isPrimary) {
    await supabase
      .from("contacts")
      .update({ is_primary: false })
      .eq("client_id", input.clientId);
  }

  const { error } = await supabase.from("contacts").insert({
    client_id: input.clientId,
    name,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    role: input.role.trim() || null,
    is_primary: input.isPrimary,
  });

  if (error) {
    return { error: t("addFailed") };
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}

export async function updateContact(input: {
  id: string;
  clientId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  isPrimary: boolean;
}) {
  const name = input.name.trim();
  const t = await getTranslations("clients.contacts.errors");
  if (!name) {
    return { error: t("nameRequired") };
  }

  const supabase = await createClient();

  if (input.isPrimary) {
    await supabase
      .from("contacts")
      .update({ is_primary: false })
      .eq("client_id", input.clientId)
      .neq("id", input.id);
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      name,
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      role: input.role.trim() || null,
      is_primary: input.isPrimary,
    })
    .eq("id", input.id);

  if (error) {
    return { error: t("updateFailed") };
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}

export async function deleteContact(input: { id: string; clientId: string }) {
  const supabase = await createClient();
  const t = await getTranslations("clients.contacts.errors");

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("client_id", input.clientId);

  if ((count ?? 0) <= 1) {
    return { error: t("minOneContact") };
  }

  const { data: deleted, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", input.id)
    .select("is_primary")
    .single();

  if (error) {
    return { error: t("deleteFailed") };
  }

  if (deleted?.is_primary) {
    const { data: remaining } = await supabase
      .from("contacts")
      .select("id")
      .eq("client_id", input.clientId)
      .limit(1)
      .single();

    if (remaining) {
      await supabase.from("contacts").update({ is_primary: true }).eq("id", remaining.id);
    }
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}
