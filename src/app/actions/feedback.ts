"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type FeedbackCategory = "error" | "mejora" | "otro";

export async function submitFeedback(input: { category: FeedbackCategory; message: string }) {
  const t = await getTranslations("feedback.errors");
  const message = input.message.trim();

  if (!message) {
    return { error: t("empty") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const tErrors = await getTranslations("errors");
    return { error: tErrors("notAuthenticated") };
  }

  const { error } = await supabase.from("feedback_submissions").insert({
    user_id: user.id,
    category: input.category,
    message,
  });

  if (error) {
    return { error: t("submitFailed") };
  }

  return { success: true as const };
}
