"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type FieldType = "texto" | "numero" | "fecha" | "lista" | "booleano";

export async function createCustomField(input: {
  name: string;
  fieldType: FieldType;
  options: string[];
  teamId: string | null;
}) {
  const name = input.name.trim();
  const t = await getTranslations("settings.customFields.errors");
  const tErrors = await getTranslations("errors");

  if (!name) {
    return { error: t("nameRequired") };
  }

  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (input.fieldType === "lista" && options.length === 0) {
    return { error: t("optionsRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: tErrors("notAuthenticated") };
  }

  const { data: existing } = await supabase
    .from("custom_field_definitions")
    .select("sort_order")
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  // Se genera el id aquí y no se llama a .select() tras el insert, siguiendo
  // el mismo patrón defensivo que el resto de inserts nuevos del proyecto.
  const fieldId = randomUUID();
  const { error } = await supabase.from("custom_field_definitions").insert({
    id: fieldId,
    owner_id: user.id,
    name,
    field_type: input.fieldType,
    options: input.fieldType === "lista" ? options : null,
    team_id: input.teamId,
    sort_order: nextSortOrder,
  });

  if (error) {
    return { error: t("createFailed") };
  }

  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: true as const, id: fieldId };
}

export async function updateCustomField(input: {
  id: string;
  name: string;
  options: string[];
  teamId: string | null;
}) {
  const name = input.name.trim();
  const t = await getTranslations("settings.customFields.errors");

  if (!name) {
    return { error: t("nameRequired") };
  }

  const options = input.options.map((o) => o.trim()).filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_field_definitions")
    .update({ name, options: options.length > 0 ? options : null, team_id: input.teamId })
    .eq("id", input.id);

  if (error) {
    return { error: t("updateFailed") };
  }

  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: true as const };
}

export async function deleteCustomField(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_field_definitions").delete().eq("id", id);

  if (error) {
    const t = await getTranslations("settings.customFields.errors");
    return { error: t("deleteFailed") };
  }

  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: true as const };
}

export async function moveCustomField(id: string, direction: "up" | "down") {
  const t = await getTranslations("settings.customFields.errors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const tErrors = await getTranslations("errors");
    return { error: tErrors("notAuthenticated") };
  }

  const { data: fields } = await supabase
    .from("custom_field_definitions")
    .select("id, sort_order")
    .eq("owner_id", user.id)
    .order("sort_order", { ascending: true });

  const ordered = fields ?? [];
  const index = ordered.findIndex((f) => f.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
    return { error: t("moveFailed") };
  }

  const current = ordered[index];
  const target = ordered[targetIndex];

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabase
      .from("custom_field_definitions")
      .update({ sort_order: target.sort_order })
      .eq("id", current.id),
    supabase
      .from("custom_field_definitions")
      .update({ sort_order: current.sort_order })
      .eq("id", target.id),
  ]);

  if (error1 || error2) {
    return { error: t("moveFailed") };
  }

  revalidatePath("/ajustes");
  return { success: true as const };
}

export async function upsertCustomFieldValues(
  clientId: string,
  values: { fieldId: string; value: string | null }[]
) {
  const t = await getTranslations("clients.customFields.errors");
  const supabase = await createClient();

  const { error } = await supabase.from("custom_field_values").upsert(
    values.map((v) => ({ client_id: clientId, field_id: v.fieldId, value: v.value })),
    { onConflict: "client_id,field_id" }
  );

  if (error) {
    return { error: t("saveFailed") };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { success: true as const };
}
