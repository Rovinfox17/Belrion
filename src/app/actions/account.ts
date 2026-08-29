"use server";

import { createClient } from "@/lib/supabase/server";

export async function exportMyData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id);

  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: contacts }, { data: products }, { data: visits }] = await Promise.all([
    clientIds.length
      ? supabase.from("contacts").select("*").in("client_id", clientIds)
      : Promise.resolve({ data: [] as never[] }),
    clientIds.length
      ? supabase.from("products").select("*").in("client_id", clientIds)
      : Promise.resolve({ data: [] as never[] }),
    clientIds.length
      ? supabase.from("visits").select("*").in("client_id", clientIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const visitIds = (visits ?? []).map((v) => v.id);
  const { data: visitComments } = visitIds.length
    ? await supabase.from("visit_comments").select("*").in("visit_id", visitIds)
    : { data: [] as never[] };

  return {
    success: true as const,
    data: {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      clients: clients ?? [],
      contacts: contacts ?? [],
      products: products ?? [],
      visits: visits ?? [],
      visit_comments: visitComments ?? [],
    },
  };
}
