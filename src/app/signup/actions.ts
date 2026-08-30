"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function requestAccess(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const t = await getTranslations("auth.errors");

  if (!name || !email) {
    redirect(`/signup?error=${encodeURIComponent(t("signupMissingFields"))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("access_requests").insert({
    name,
    email,
    reason: reason || null,
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(t("signupRequestFailed"))}`);
  }

  redirect("/signup?sent=true");
}
