"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(`/recuperar?error=${encodeURIComponent("Introduce tu email.")}`);
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
