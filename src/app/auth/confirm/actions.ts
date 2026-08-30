"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function confirmAuthLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "");
  const next = String(formData.get("next") ?? "/");
  const t = await getTranslations("auth.errors");

  if (!tokenHash || !VALID_TYPES.includes(type as EmailOtpType)) {
    redirect(`/login?error=${encodeURIComponent(t("invalidOrExpiredLink"))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(t("invalidOrExpiredLink"))}`);
  }

  redirect(next);
}
