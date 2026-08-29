"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    const t = await getTranslations("auth.errors");
    redirect(`/recuperar?error=${encodeURIComponent(t("recoverMissingEmail"))}`);
  }

  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/restablecer`,
  });

  // Respondemos siempre igual, exista o no ese email, para no revelar qué
  // correos tienen cuenta.
  redirect("/recuperar?sent=true");
}
