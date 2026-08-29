"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const t = await getTranslations("errors");
    return { error: t("notAuthenticated") };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    const t = await getTranslations("settings.notifications.errors");
    return { error: t("subscriptionSaveFailed") };
  }

  return { success: true as const };
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    const t = await getTranslations("settings.notifications.errors");
    return { error: t("subscriptionDeleteFailed") };
  }

  return { success: true as const };
}
