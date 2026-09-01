// Belrion — geocodifica en segundo plano las direcciones de clientes que
// todavía no tienen latitud/longitud (altas manuales sin geocodificar aún,
// e importaciones masivas por Excel, que nunca geocodifican de forma
// síncrona para no bloquear la UI ni saturar Nominatim).
// Se ejecuta periódicamente vía pg_cron (ver
// supabase/migrations/0016_schedule_geocoding.sql), cada minuto, un lote
// pequeño por ejecución — así se respeta el límite de ~1 petición/segundo
// de Nominatim sin necesidad de que nadie deje una pestaña abierta.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase
// automáticamente.
//
// Mismo endpoint/cabecera/parseo que src/lib/geocoding.ts (Next.js) — no
// se puede compartir el archivo entre los dos runtimes (Deno vs Node), así
// que si el día de mañana se cambia de proveedor de geocodificación, hay
// que tocar los dos sitios, que son mínimos.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NOMINATIM_USER_AGENT = "Belrion CRM (soportebelrion@gmail.com)";
const BATCH_SIZE = 5;
const DELAY_MS = 1100;

type ClientRow = {
  id: string;
  address: string | null;
  locality: string | null;
  province: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeQuery(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "es");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT, "Accept-Language": "es" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    const first = data[0];
    if (!first) return null;

    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch (err) {
    console.error("geocode failed", err);
    return null;
  }
}

// Plan B si Nominatim no reconoce la dirección completa: en pruebas reales,
// direcciones válidas fallan por palabras que su parser no interpreta bien
// (p.ej. "Nave", habitual en polígonos industriales) — se reintenta solo
// con población+provincia, que casi siempre sí se reconoce, para al menos
// dar una ubicación aproximada en vez de ninguna. Mismo criterio que
// geocodeClientAddress() en src/lib/geocoding.ts (Next.js).
async function geocode(client: ClientRow): Promise<{ latitude: number; longitude: number } | null> {
  const full = [client.address, client.locality, client.province].filter(Boolean).join(", ");
  if (full) {
    const result = await geocodeQuery(full);
    if (result) return result;
  }

  const approximate = [client.locality, client.province].filter(Boolean).join(", ");
  if (approximate && approximate !== full) {
    // Respeta el límite de ~1 petición/segundo también entre el intento
    // completo y el de plan B del mismo cliente, no solo entre clientes.
    await sleep(DELAY_MS);
    return geocodeQuery(approximate);
  }

  return null;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("clients")
    .select("id, address, locality, province")
    .not("address", "is", null)
    .neq("address", "")
    .is("latitude", null)
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const clients = (data ?? []) as ClientRow[];
  let geocoded = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const result = await geocode(client);

    if (result) {
      await supabase
        .from("clients")
        .update({ latitude: result.latitude, longitude: result.longitude })
        .eq("id", client.id);
      geocoded++;
    }

    if (i < clients.length - 1) await sleep(DELAY_MS);
  }

  return new Response(JSON.stringify({ checked: clients.length, geocoded }), {
    headers: { "Content-Type": "application/json" },
  });
});
