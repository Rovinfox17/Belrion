"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProduct(input: {
  clientId: string;
  name: string;
  details: string;
}) {
  const name = input.name.trim();
  if (!name) {
    return { error: "El nombre del producto es obligatorio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    client_id: input.clientId,
    name,
    details: input.details.trim() || null,
  });

  if (error) {
    return { error: "No se pudo añadir el producto." };
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}

export async function deleteProduct(input: { id: string; clientId: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", input.id);

  if (error) {
    return { error: "No se pudo eliminar el producto." };
  }

  revalidatePath(`/clientes/${input.clientId}`);
  revalidatePath("/");
  return { success: true as const };
}
