import type { CustomFieldMeta } from "@/components/clients/client-list";

// Columnas y lógica de filtrado compartidas entre el listado de clientes
// (page.tsx) y el mapa (mapa/page.tsx), para que "los mismos filtros" sea
// literal y no dos implementaciones que se puedan desincronizar.
export const CLIENT_SELECT_COLUMNS =
  "id, company_name, status, created_at, locality, region, province, address, latitude, longitude, contacts(id, name, is_primary), products(id, name), visits(id, scheduled_at, status), custom_field_values(field_id, value)";

export type RawClient = {
  id: string;
  company_name: string;
  status: "activo" | "potencial" | "inactivo";
  created_at: string;
  locality: string | null;
  region: string | null;
  province: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contacts: { id: string; name: string; is_primary: boolean }[];
  products: { id: string; name: string }[];
  visits: { id: string; scheduled_at: string; status: string }[];
  custom_field_values: { field_id: string; value: string | null }[];
};

export function nextVisit(c: RawClient, now: number) {
  const upcoming = c.visits
    .filter((v) => v.status === "pendiente" && new Date(v.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  return upcoming[0]?.scheduled_at ?? null;
}

export function filterClientsByParams(
  clients: RawClient[],
  params: { [key: string]: string | undefined },
  customFields: CustomFieldMeta[]
): RawClient[] {
  const q = (params.q ?? "").trim().toLowerCase();
  const status = params.status;
  const product = params.product;
  const locality = params.locality;
  const region = params.region;
  const province = params.province;
  const upcomingOnly = params.upcoming === "true";
  const now = Date.now();

  function customValue(c: RawClient, fieldId: string) {
    return c.custom_field_values.find((v) => v.field_id === fieldId)?.value ?? null;
  }

  const activeCustomFilters = customFields
    .map((f) => ({ field: f, raw: params[`custom_${f.id}`] }))
    .filter((f): f is { field: CustomFieldMeta; raw: string } => Boolean(f.raw));

  return clients.filter((c) => {
    if (status && status !== "all" && c.status !== status) return false;
    if (product && product !== "all" && !c.products.some((p) => p.name === product)) {
      return false;
    }
    if (locality && locality !== "all" && c.locality !== locality) return false;
    if (region && region !== "all" && c.region !== region) return false;
    if (province && province !== "all" && c.province !== province) return false;
    if (upcomingOnly && !nextVisit(c, now)) return false;
    if (q) {
      const matchesCompany = c.company_name.toLowerCase().includes(q);
      const matchesContact = c.contacts.some((ct) => ct.name.toLowerCase().includes(q));
      if (!matchesCompany && !matchesContact) return false;
    }
    for (const { field, raw } of activeCustomFilters) {
      const value = customValue(c, field.id);
      const op = params[`custom_${field.id}_op`] ?? "eq";
      if (field.fieldType === "texto") {
        if (!value || !value.toLowerCase().includes(raw.toLowerCase())) return false;
      } else if (field.fieldType === "numero") {
        const num = value !== null ? parseFloat(value) : null;
        const target = parseFloat(raw);
        if (num === null || Number.isNaN(num)) return false;
        if (op === "gt" && !(num > target)) return false;
        if (op === "lt" && !(num < target)) return false;
        if (op === "eq" && num !== target) return false;
      } else if (field.fieldType === "fecha") {
        const time = value ? new Date(value).getTime() : null;
        const target = new Date(raw).getTime();
        if (time === null || Number.isNaN(time)) return false;
        if (op === "gt" && !(time > target)) return false;
        if (op === "lt" && !(time < target)) return false;
        if (op === "eq" && time !== target) return false;
      } else if (field.fieldType === "lista") {
        if (value !== raw) return false;
      } else if (field.fieldType === "booleano") {
        if ((value === "true") !== (raw === "true")) return false;
      }
    }
    return true;
  });
}
