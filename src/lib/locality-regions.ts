import catalunya from "@/data/localities/catalunya.json";

// Mecanismo genérico de "población -> zona administrativa superior" para
// ampliar búsquedas por texto. Cada archivo de datos aporta una lista plana
// de registros {locality, region} para una región del mundo (hoy solo
// Catalunya, vía comarques); añadir cobertura nueva (provincias de España,
// otras divisiones europeas...) es solo sumar otro archivo con esta misma
// forma a ALL_RECORDS, sin tocar la lógica de abajo.
type LocalityRecord = { locality: string; region: string };

const ALL_RECORDS: LocalityRecord[] = [...(catalunya as LocalityRecord[])];

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const LOCALITY_TO_REGION = new Map<string, string>();
const KNOWN_REGIONS = new Map<string, string>();
for (const record of ALL_RECORDS) {
  LOCALITY_TO_REGION.set(normalize(record.locality), record.region);
  KNOWN_REGIONS.set(normalize(record.region), record.region);
}

/** Si `query` coincide con una población conocida, devuelve su región. */
export function findRegion(query: string): string | null {
  return LOCALITY_TO_REGION.get(normalize(query)) ?? null;
}

/** Si `query` coincide directamente con el nombre de una región conocida. */
export function isKnownRegion(query: string): string | null {
  return KNOWN_REGIONS.get(normalize(query)) ?? null;
}

/** Todas las poblaciones conocidas que pertenecen a `region`. */
export function localitiesInRegion(region: string): string[] {
  const target = normalize(region);
  return ALL_RECORDS.filter((r) => normalize(r.region) === target).map(
    (r) => r.locality
  );
}
