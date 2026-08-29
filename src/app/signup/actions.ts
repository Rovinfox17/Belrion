"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Rellena todos los campos.")}`);
  }

  if (password.length < 8) {
    redirect(
      `/signup?error=${encodeURIComponent("La contraseña debe tener al menos 8 caracteres.")}`
    );
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

  redirect(
    `/login?error=${encodeURIComponent(
      "Cuenta creada. Revisa tu email para confirmarla antes de entrar."
    )}`
  );
}
