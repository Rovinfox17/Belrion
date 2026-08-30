"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  id: string;
  companyName: string;
  matchedContact: string | null;
};

const RESULT_LIMIT = 8;

export async function searchClients(query: string): Promise<{ results: SearchResult[] }> {
  const q = query.trim();
  if (q.length < 2) return { results: [] };

  const supabase = await createClient();

  // Dos búsquedas en paralelo (empresa y contacto) en vez de un solo filtro
  // combinado: Postgrest no permite un "or" limpio entre una columna propia
  // y una de una tabla relacionada. Las políticas RLS de "clients" y
  // "contacts" ya limitan cada una a lo que el usuario puede ver (cartera
  // personal o compartida por equipo), igual que en el resto de la app.
  const [{ data: byCompany }, { data: byContact }] = await Promise.all([
    supabase.from("clients").select("id, company_name").ilike("company_name", `%${q}%`).limit(RESULT_LIMIT),
    supabase
      .from("contacts")
      .select("name, clients(id, company_name)")
      .ilike("name", `%${q}%`)
      .limit(RESULT_LIMIT),
  ]);

  const results = new Map<string, SearchResult>();

  for (const c of byCompany ?? []) {
    results.set(c.id, { id: c.id, companyName: c.company_name, matchedContact: null });
  }

  for (const contact of byContact ?? []) {
    const client = contact.clients as unknown as { id: string; company_name: string } | null;
    if (!client) continue;
    const existing = results.get(client.id);
    if (existing) {
      existing.matchedContact ??= contact.name;
    } else {
      results.set(client.id, {
        id: client.id,
        companyName: client.company_name,
        matchedContact: contact.name,
      });
    }
  }

  return { results: [...results.values()].slice(0, RESULT_LIMIT) };
}
