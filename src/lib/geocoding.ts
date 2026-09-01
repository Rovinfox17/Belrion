// Módulo aislado de geocodificación: hoy usa Nominatim (OpenStreetMap,
// gratuito). Si en el futuro se decide pagar por Google Maps Geocoding u
// otro proveedor, este es el único sitio de la app Next.js a tocar — el
// resto del código solo conoce `geocodeAddress()`.
//
// La política de uso de Nominatim exige una cabecera User-Agent que
// identifique la aplicación y un máximo de ~1 petición por segundo; aquí
// solo se hace una llamada puntual (al guardar la dirección de un
// cliente), el ritmo lo controla quien llame a esta función en bucle (ver
// la Edge Function geocode-pending-clients para la importación masiva).
const NOMINATIM_USER_AGENT = "Belrion CRM (soportebelrion@gmail.com)";

export type GeocodeResult = { latitude: number; longitude: number };

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
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
    console.error("geocodeAddress failed", err);
    return null;
  }
}

/** Geocodifica la dirección completa de un cliente, con un plan B si
 * Nominatim no la reconoce. En pruebas reales, direcciones perfectamente
 * válidas fallan por palabras que su parser no sabe interpretar bien
 * (p.ej. "Nave", habitual en polígonos industriales) — en vez de dejar al
 * cliente sin ubicación para siempre, se reintenta solo con
 * población+provincia, que casi siempre sí se reconoce y da al menos una
 * ubicación aproximada en vez de ninguna. */
export async function geocodeClientAddress(parts: {
  address: string | null;
  locality: string | null;
  province: string | null;
}): Promise<GeocodeResult | null> {
  const full = [parts.address, parts.locality, parts.province].filter(Boolean).join(", ");
  if (full) {
    const result = await geocodeAddress(full);
    if (result) return result;
  }

  const approximate = [parts.locality, parts.province].filter(Boolean).join(", ");
  if (approximate && approximate !== full) {
    // Respeta el límite de ~1 petición/segundo también entre el intento
    // completo y el de plan B, aunque aquí solo se llame una vez por guardado.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return geocodeAddress(approximate);
  }

  return null;
}
