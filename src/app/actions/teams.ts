"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTeam(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "El nombre del equipo es obligatorio." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ name: trimmed, owner_id: user.id })
    .select("id")
    .single();

  if (error || !team) {
    return { error: "No se pudo crear el equipo." };
  }

  const { error: memberError } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return { error: "El equipo se creó, pero no se pudo añadirte como miembro." };
  }

  revalidatePath("/ajustes");
  revalidatePath("/");
  return { success: true as const };
}

export async function addTeamMember(input: { teamId: string; email: string }) {
  const email = input.email.trim();
  if (!email) {
    return { error: "Introduce un email." };
  }

  const supabase = await createClient();
  const { data: userId, error: lookupError } = await supabase.rpc("find_user_id_by_email", {
    p_email: email,
  });

  if (lookupError) {
    return { error: "No se pudo buscar ese email." };
  }
  if (!userId) {
    return { error: "Ese email todavía no tiene una cuenta creada en Belrion." };
  }

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: input.teamId, user_id: userId, role: "member" });

  if (error) {
    if (error.code === "23505") {
      return { error: "Esa persona ya es miembro del equipo." };
    }
    return { error: "No se pudo añadir al equipo." };
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
    return { error: "No se pudo eliminar a esa persona del equipo." };
  }

  revalidatePath("/ajustes");
  return { success: true as const };
}
