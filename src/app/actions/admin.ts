"use server";

import { getTranslations } from "next-intl/server";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function rejectAccessRequest(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const t = await getTranslations("errors");
    return { error: t("notAuthenticated") };
  }

  const { error } = await supabase
    .from("access_requests")
    .update({ status: "rechazada", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", id);

  if (error) {
    const t = await getTranslations("admin.errors");
    return { error: t("rejectFailed") };
  }

  return { success: true as const };
}

export async function approveAccessRequest(id: string) {
  const supabase = await createClient();
  const t = await getTranslations("admin.errors");

  const { data, error } = await supabase.functions.invoke("approve-access-request", {
    body: { requestId: id },
  });

  if (error) {
    // Las respuestas de error de la función (401/403/404/409/500) llegan como
    // FunctionsHttpError, no en `data` — hay que leer el cuerpo JSON a mano
    // desde error.context, si no siempre se ve el mensaje genérico.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      return { error: body?.error ?? t("approveFailed") };
    }
    return { error: t("approveFailed") };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return { success: true as const };
}
