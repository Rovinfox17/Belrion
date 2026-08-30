"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function setChatNotificationsPreference(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const t = await getTranslations("errors");
    return { error: t("notAuthenticated") };
  }

  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert({ user_id: user.id, chat_notifications: enabled }, { onConflict: "user_id" });

  if (error) {
    const t = await getTranslations("settings.notifications.errors");
    return { error: t("preferenceSaveFailed") };
  }

  revalidatePath("/ajustes");
  return { success: true as const };
}
