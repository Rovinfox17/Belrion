import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPinOffIcon, UsersIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientFilters } from "@/components/clients/client-filters";
import type { CustomFieldMeta } from "@/components/clients/client-list";
import { ClientMap, type MapClient } from "@/components/clients/client-map-loader";
import { CLIENT_SELECT_COLUMNS, filterClientsByParams, nextVisit, type RawClient } from "@/lib/client-query";

export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("clients");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
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

  const activeTeam = teams.find((tm) => tm.id === params.team) ?? null;

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

  const { data } = activeTeam
    ? await supabase
        .from("clients")
        .select(`${CLIENT_SELECT_COLUMNS}, client_teams!inner(team_id)`)
        .eq("client_teams.team_id", activeTeam.id)
    : await supabase.from("clients").select(CLIENT_SELECT_COLUMNS).eq("user_id", user?.id ?? "");

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

  const filtered = filterClientsByParams(clients, params, customFields);

  const withCoords: MapClient[] = filtered
    .filter((c): c is RawClient & { latitude: number; longitude: number } =>
      c.latitude !== null && c.longitude !== null
    )
    .map((c) => ({
      id: c.id,
      companyName: c.company_name,
      status: c.status,
      latitude: c.latitude,
      longitude: c.longitude,
      nextVisitAt: nextVisit(c, now),
    }));

  const ungeocodedCount = filtered.filter(
    (c) => c.address && c.address.trim() && (c.latitude === null || c.longitude === null)
  ).length;

  const currentQuery = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  ).toString();
  const listHref = `/${currentQuery ? `?${currentQuery}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={listHref}
            className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            {t("map.backToList")}
          </Link>
          <h1 className="font-heading text-2xl font-semibold">{t("map.title")}</h1>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="flex w-fit flex-wrap gap-1 rounded-lg bg-accent p-1">
          <Link
            href="/mapa"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              !activeTeam ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t("myClients")}
          </Link>
          {teams.map((tm) => (
            <Link
              key={tm.id}
              href={`/mapa?team=${tm.id}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTeam?.id === tm.id ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tm.name}
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

      {ungeocodedCount > 0 && (
        <p className="flex items-center gap-2 rounded-md border border-border bg-accent/40 p-2.5 text-sm text-muted-foreground">
          <MapPinOffIcon className="size-4 shrink-0" />
          {t("map.ungeocodedCount", { count: ungeocodedCount })}{" "}
          <Link href={listHref} className="text-primary hover:underline">
            {t("map.ungeocodedReview")}
          </Link>
        </p>
      )}

      {withCoords.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-muted-foreground">
            <UsersIcon className="size-6" />
          </div>
          <p className="font-medium">{t("map.emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("map.emptyHint")}</p>
        </div>
      ) : (
        <ClientMap clients={withCoords} locale={locale} />
      )}
    </div>
  );
}
