"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocoding";

type ClientStatus = "activo" | "potencial" | "inactivo";

export async function createClientWithContact(input: {
  companyName: string;
  contactName: string;
  status: ClientStatus;
  locality: string;
  region: string;
  province: string;
  teamIds?: string[];
}) {
  const companyName = input.companyName.trim();
  const contactName = input.contactName.trim();
  const locality = input.locality.trim();
  const region = input.region.trim();
  const province = input.province.trim();
  const t = await getTranslations("clients.newDialog.errors");
  const tErrors = await getTranslations("errors");

  if (!companyName || !contactName || !locality || !region || !province) {
    return { error: t("fieldsRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: tErrors("notAuthenticated") };
  }

  // Se genera el id aquí en vez de pedirlo de vuelta con .select() porque un
  // INSERT ... RETURNING bajo RLS también exige que la fila nueva pase la
  // política de SELECT, y la de "clients" se apoya en una función que
  // vuelve a consultar la propia tabla — para una fila creada en la misma
  // sentencia, Postgres no la da por visible todavía y el insert se rechaza
  // aunque el usuario sea el dueño legítimo.
  const clientId = randomUUID();
  const { error: clientError } = await supabase.from("clients").insert({
    id: clientId,
    company_name: companyName,
    status: input.status,
    locality,
    region,
    province,
    user_id: user.id,
  });

  if (clientError) {
    console.error("createClientWithContact failed", { userId: user.id, clientError });
    return { error: t("createFailed") };
  }

  const { error: contactError } = await supabase
    .from("contacts")
    .insert({ client_id: clientId, name: contactName, is_primary: true });

  if (contactError) {
    return { error: t("contactSaveFailed") };
  }

  const teamIds = input.teamIds ?? [];
  if (teamIds.length > 0) {
    const { error: teamsError } = await supabase
      .from("client_teams")
      .insert(teamIds.map((teamId) => ({ client_id: clientId, team_id: teamId })));

    if (teamsError) {
      return { error: t("teamShareFailed") };
    }
  }

  revalidatePath("/");
  return { success: true as const, id: clientId };
}

export async function updateClient(input: {
  id: string;
  companyName: string;
  status: ClientStatus;
  address: string;
  locality: string;
  region: string;
  province: string;
  notes: string;
}) {
  const companyName = input.companyName.trim();
  const t = await getTranslations("clients.editDialog.errors");

  if (!companyName) {
    return { error: t("nameRequired") };
  }

  const address = input.address.trim() || null;
  const locality = input.locality.trim() || null;
  const region = input.region.trim() || null;
  const province = input.province.trim() || null;

  // Geocodifica con Nominatim al guardar (una sola llamada, aceptable de
  // forma síncrona) — a diferencia de la importación masiva, que nunca
  // geocodifica en el momento (ver geocode-pending-clients). Sin dirección
  // no hay nada que geocodificar, y las coordenadas de una dirección
  // anterior se limpian para no dejar un punto obsoleto en el mapa.
  const geocodeQuery = [address, locality, province].filter(Boolean).join(", ");
  const geocoded = geocodeQuery ? await geocodeAddress(geocodeQuery) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      company_name: companyName,
      status: input.status,
      address,
      locality,
      region,
      province,
      notes: input.notes.trim() || null,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: t("saveFailed") };
  }

  revalidatePath("/");
  revalidatePath("/mapa");
  revalidatePath(`/clientes/${input.id}`);
  return { success: true as const };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    const t = await getTranslations("clients.deleteDialog.errors");
    return { error: t("deleteFailed") };
  }

  revalidatePath("/");
  revalidatePath("/mapa");
  return { success: true as const };
}

export async function deleteClients(ids: string[]) {
  if (ids.length === 0) {
    return { success: true as const, count: 0 };
  }

  const supabase = await createClient();
  // La RLS de "clients" ya limita el delete a los clientes a los que el
  // usuario tiene acceso, así que un .in() con ids ajenos simplemente no los
  // afecta en vez de fallar. Contactos, productos, visitas y valores de
  // campos personalizados se borran solos por el "on delete cascade" de sus
  // claves foráneas, igual que en el borrado individual.
  const { error } = await supabase.from("clients").delete().in("id", ids);

  if (error) {
    const t = await getTranslations("clients.bulkDelete.errors");
    return { error: t("deleteFailed") };
  }

  revalidatePath("/");
  revalidatePath("/mapa");
  return { success: true as const, count: ids.length };
}
