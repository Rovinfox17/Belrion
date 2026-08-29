"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addVisitComment(input: {
  visitId: string;
  clientId: string;
  comment: string;
}) {
  const comment = input.comment.trim();
  if (!comment) {
    return { error: "Escribe un comentario." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("visit_comments")
    .insert({ visit_id: input.visitId, comment });

  if (error) {
    return { error: "No se pudo guardar el comentario." };
  }

  revalidatePath("/calendario");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}
