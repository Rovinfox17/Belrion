"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ClientStatus = "activo" | "potencial" | "inactivo";

export async function createClientWithContact(input: {
  companyName: string;
  contactName: string;
  status: ClientStatus;
  teamId?: string | null;
}) {
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();

  if (!companyName || !contactName) {
    return { error: "El nombre de la empresa y un contacto son obligatorios." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      company_name: companyName,
      status: input.status,
      user_id: user.id,
      team_id: input.teamId ?? null,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    return { error: "No se pudo crear el cliente." };
  }

  const { error: contactError } = await supabase
    .from("contacts")
    .insert({ client_id: client.id, name: contactName, is_primary: true });

  if (contactError) {
    return { error: "El cliente se creó, pero no se pudo guardar el contacto." };
  }

  revalidatePath("/");
  return { success: true as const, id: client.id as string };
}

export async function updateClient(input: {
  id: string;
  companyName: string;
  status: ClientStatus;
  address: string;
  notes: string;
}) {
  const companyName = input.companyName.trim();

  if (!companyName) {
    return { error: "El nombre de la empresa es obligatorio." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      company_name: companyName,
      status: input.status,
      address: input.address.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: "No se pudo guardar el cliente." };
  }

  revalidatePath("/");
  revalidatePath(`/clientes/${input.id}`);
  return { success: true as const };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    return { error: "No se pudo eliminar el cliente." };
  }

  revalidatePath("/");
  return { success: true as const };
}
