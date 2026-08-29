"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function addVisitComment(input: {
  visitId: string;
  clientId: string;
  comment: string;
}) {
  const comment = input.comment.trim();
  const t = await getTranslations("calendar.errors");
  if (!comment) {
    return { error: t("commentRequired") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("visit_comments")
    .insert({ visit_id: input.visitId, comment });

  if (error) {
    return { error: t("commentSaveFailed") };
  }

  revalidatePath("/calendario");
  revalidatePath(`/clientes/${input.clientId}`);
  return { success: true as const };
}
