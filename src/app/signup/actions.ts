"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const t = await getTranslations("auth.errors");

  if (!name || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent(t("signupMissingFields"))}`);
  }

  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent(t("signupPasswordTooShort"))}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/");
  }

  redirect(`/login?error=${encodeURIComponent(t("signupAccountCreated"))}`);
}
