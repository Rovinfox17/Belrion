"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function createTeam(name: string) {
  const trimmed = name.trim();
  const t = await getTranslations("team.errors");
  if (!trimmed) {
    return { error: t("nameRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t("notAuthenticated") };
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: trimmed, owner_id: user.id })
    .select("id")
    .single();

  if (error || !team) {
    return { error: t("createFailed") };
  }

  const { error: memberError } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return { error: t("addAsMemberFailed") };
  }

  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: true as const };
}

export async function addTeamMember(input: { teamId: string; email: string }) {
  const email = input.email.trim();
  const t = await getTranslations("team.errors");
  if (!email) {
    return { error: t("emailRequired") };
  }

  const supabase = await createClient();
  const { data: userId, error: lookupError } = await supabase.rpc("find_user_id_by_email", {
    p_email: email,
  });

  if (lookupError) {
    return { error: t("emailLookupFailed") };
  }
  if (!userId) {
    return { error: t("emailNotRegistered") };
  }

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: input.teamId, user_id: userId, role: "member" });

  if (error) {
    if (error.code === "23505") {
      return { error: t("alreadyMember") };
    }
    return { error: t("addFailed") };
  }

  revalidatePath("/ajustes");
  return { success: true as const };
}

export async function removeTeamMember(input: { teamId: string; userId: string }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId);

  if (error) {
    const t = await getTranslations("team.errors");
    return { error: t("removeFailed") };
  }

  revalidatePath("/ajustes");
  return { success: true as const };
}
