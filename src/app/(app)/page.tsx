import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientList, type ClientRow, type CustomFieldMeta } from "@/components/clients/client-list";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { AddExistingClientsDialog } from "@/components/clients/add-existing-clients-dialog";
import { ImportClientsDialog } from "@/components/clients/import-clients-dialog";
import { Button } from "@/components/ui/button";
import {
  CLIENT_SELECT_COLUMNS,
  filterClientsByParams,
  nextVisit,
  type RawClient,
} from "@/lib/client-query";

function compareCustomValues(
  a: string | null | undefined,
  b: string | null | undefined,
  fieldType: CustomFieldMeta["fieldType"],
  sign: number
) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  switch (fieldType) {
    case "numero":
      return sign * (parseFloat(a) - parseFloat(b));
    case "fecha":
      return sign * (new Date(a).getTime() - new Date(b).getTime());
    case "booleano":
      return sign * (Number(a === "true") - Number(b === "true"));
    default:
      return sign * a.localeCompare(b);
  }
}

function lastVisit(c: RawClient) {
  const past = c.visits
    .filter((v) => v.status === "completada")
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return past[0]?.scheduled_at ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("clients");
  const tNav = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teams: { id: string; name: string }[] = [];
  if (user) {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, teams(name)")
      .eq("user_id", user.id);

    teams = (memberships ?? []).map((m) => ({
      id: m.team_id,
      name: (m.teams as unknown as { name: string } | null)?.name ?? tNav("team"),
    }));
  }

  const activeTeam = teams.find((t) => t.id === params.team) ?? null;

  const { data: customFieldDefinitions } = await supabase
    .from("custom_field_definitions")
    .select("id, name, field_type, options")
    .order("sort_order", { ascending: true });

  const customFields: CustomFieldMeta[] = (customFieldDefinitions ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    fieldType: f.field_type,
    options: f.options,
  }));
  const customFieldById = new Map(customFields.map((f) => [f.id, f]));

  const { data, error } = activeTeam
    ? await supabase
        .from("clients")
        .select(`${CLIENT_SELECT_COLUMNS}, client_teams!inner(team_id)`)
        .eq("client_teams.team_id", activeTeam.id)
    : await supabase.from("clients").select(CLIENT_SELECT_COLUMNS).eq("user_id", user?.id ?? "");

  let availableToShare: { id: string; companyName: string }[] = [];
  if (activeTeam && user) {
    const [{ data: personalClients }, { data: alreadyShared }] = await Promise.all([
      supabase.from("clients").select("id, company_name").eq("user_id", user.id),
      supabase.from("client_teams").select("client_id").eq("team_id", activeTeam.id),
    ]);

    const sharedIds = new Set((alreadyShared ?? []).map((r) => r.client_id));
    availableToShare = (personalClients ?? [])
      .filter((c) => !sharedIds.has(c.id))
      .map((c) => ({ id: c.id, companyName: c.company_name }));
  }

  const clients = (data ?? []) as unknown as RawClient[];
  const now = Date.now();

  const allProducts = Array.from(
    new Set(clients.flatMap((c) => c.products.map((p) => p.name)))
  ).sort((a, b) => a.localeCompare(b));

  const allLocalities = Array.from(
    new Set(clients.map((c) => c.locality).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));
  const allRegions = Array.from(
    new Set(clients.map((c) => c.region).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));
  const allProvinces = Array.from(
    new Set(clients.map((c) => c.province).filter((v): v is string => Boolean(v)))
  ).sort((a, b) => a.localeCompare(b));

  const q = (params.q ?? "").trim().toLowerCase();
  const status = params.status;
  const product = params.product;
  const locality = params.locality;
  const region = params.region;
  const province = params.province;
  const upcomingOnly = params.upcoming === "true";
  const sort = params.sort ?? "alfabetico";
  const requestedDir = params.dir === "asc" || params.dir === "desc" ? params.dir : null;
  // Fecha de alta y última visita muestran lo más reciente primero por
  // defecto; el resto, orden ascendente — igual que antes de poder elegir
  // la dirección a mano desde las cabeceras de columna.
  const direction = requestedDir ?? (sort === "fecha_alta" || sort === "ultima_visita" ? "desc" : "asc");
  const sign = direction === "asc" ? 1 : -1;
  const STATUS_RANK: Record<RawClient["status"], number> = { activo: 0, potencial: 1, inactivo: 2 };

  function customValue(c: RawClient, fieldId: string) {
    return c.custom_field_values.find((v) => v.field_id === fieldId)?.value ?? null;
  }

  const activeCustomFilters = customFields
    .map((f) => ({ field: f, raw: params[`custom_${f.id}`] }))
    .filter((f): f is { field: CustomFieldMeta; raw: string } => Boolean(f.raw));

  const filtered = filterClientsByParams(clients, params, customFields);

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "fecha_alta":
        return sign * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "proxima_visita": {
        const av = nextVisit(a, now);
        const bv = nextVisit(b, now);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return sign * (new Date(av).getTime() - new Date(bv).getTime());
      }
      case "ultima_visita": {
        const av = lastVisit(a);
        const bv = lastVisit(b);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return sign * (new Date(av).getTime() - new Date(bv).getTime());
      }
      case "contacto": {
        const an = a.contacts.find((c) => c.is_primary)?.name ?? a.contacts[0]?.name ?? "";
        const bn = b.contacts.find((c) => c.is_primary)?.name ?? b.contacts[0]?.name ?? "";
        return sign * an.localeCompare(bn);
      }
      case "estado":
        return sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
      case "poblacion":
        return sign * (a.locality ?? "").localeCompare(b.locality ?? "");
      case "comarca":
        return sign * (a.region ?? "").localeCompare(b.region ?? "");
      case "provincia":
        return sign * (a.province ?? "").localeCompare(b.province ?? "");
      default:
        if (sort.startsWith("custom:")) {
          const field = customFieldById.get(sort.slice("custom:".length));
          if (field) {
            return compareCustomValues(
              customValue(a, field.id),
              customValue(b, field.id),
              field.fieldType,
              sign
            );
          }
        }
        return sign * a.company_name.localeCompare(b.company_name);
    }
  });

  const rows: ClientRow[] = sorted.map((c) => ({
    id: c.id,
    companyName: c.company_name,
    status: c.status,
    primaryContactName: c.contacts.find((ct) => ct.is_primary)?.name ?? c.contacts[0]?.name ?? null,
    nextVisitAt: nextVisit(c, now),
    locality: c.locality,
    region: c.region,
    province: c.province,
    customFieldValues: Object.fromEntries(c.custom_field_values.map((v) => [v.field_id, v.value])),
  }));

  const isFiltered = Boolean(
    q || status || product || locality || region || province || upcomingOnly || activeCustomFilters.length > 0
  );

  const currentQuery = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  ).toString();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/mapa${currentQuery ? `?${currentQuery}` : ""}`} />}>
            <MapIcon />
            {t("map.trigger")}
          </Button>
          {activeTeam && (
            <AddExistingClientsDialog
              teamId={activeTeam.id}
              teamName={activeTeam.name}
              clients={availableToShare}
            />
          )}
          <ImportClientsDialog customFields={customFields} />
          <NewClientDialog teams={teams} defaultTeamId={activeTeam?.id ?? null} />
        </div>
      </div>

      {teams.length > 0 && (
        <div className="flex w-fit flex-wrap gap-1 rounded-lg bg-accent p-1">
          <Link
            href="/"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              !activeTeam ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t("myClients")}
          </Link>
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/?team=${t.id}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTeam?.id === t.id ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      <ClientFilters
        products={allProducts}
        localities={allLocalities}
        regions={allRegions}
        provinces={allProvinces}
        customFields={customFields}
      />

      {error && (
        <p className="text-sm text-destructive">{t("list.loadError")}</p>
      )}

      <ClientList clients={rows} isFiltered={isFiltered} customFields={customFields} />
    </div>
  );
}
