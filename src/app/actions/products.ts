"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(input: {
  clientId: string;
  name: string;
  details: string;
}) {
  const name = input.name.trim();
  const t = await getTranslations("clients.products.errors");
  if (!name) {
    return { error: t("nameRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    client_id: input.clientId,
    name,
    details: input.details.trim() || null,
  });

  if (error) {
    return { error: t("addFailed") };
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}

export async function deleteProduct(input: { id: string; clientId: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", input.id);

  if (error) {
    const t = await getTranslations("clients.products.errors");
    return { error: t("deleteFailed") };
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}
