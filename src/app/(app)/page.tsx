import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientList, type ClientRow } from "@/components/clients/client-list";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { AddExistingClientsDialog } from "@/components/clients/add-existing-clients-dialog";

type RawClient = {
  id: string;
  company_name: string;
  status: "activo" | "potencial" | "inactivo";
  created_at: string;
  contacts: { id: string; name: string; is_primary: boolean }[];
  products: { id: string; name: string }[];
  visits: { id: string; scheduled_at: string; status: string }[];
};

function nextVisit(c: RawClient, now: number) {
  const upcoming = c.visits
    .filter((v) => v.status === "pendiente" && new Date(v.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  return upcoming[0]?.scheduled_at ?? null;
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

  const selectColumns =
    "id, company_name, status, created_at, contacts(id, name, is_primary), products(id, name), visits(id, scheduled_at, status)";

  const { data, error } = activeTeam
    ? await supabase
        .from("clients")
        .select(`${selectColumns}, client_teams!inner(team_id)`)
        .eq("client_teams.team_id", activeTeam.id)
    : await supabase.from("clients").select(selectColumns).eq("user_id", user?.id ?? "");

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

  const q = (params.q ?? "").trim().toLowerCase();
  const status = params.status;
  const product = params.product;
  const upcomingOnly = params.upcoming === "true";
  const sort = params.sort ?? "alfabetico";

  const filtered = clients.filter((c) => {
    if (status && status !== "all" && c.status !== status) return false;
    if (product && product !== "all" && !c.products.some((p) => p.name === product)) {
      return false;
    }
    if (upcomingOnly && !nextVisit(c, now)) return false;
    if (q) {
      const matchesCompany = c.company_name.toLowerCase().includes(q);
      const matchesContact = c.contacts.some((ct) => ct.name.toLowerCase().includes(q));
      if (!matchesCompany && !matchesContact) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "fecha_alta":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "proxima_visita": {
        const av = nextVisit(a, now);
        const bv = nextVisit(b, now);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return new Date(av).getTime() - new Date(bv).getTime();
      }
      case "ultima_visita": {
        const av = lastVisit(a);
        const bv = lastVisit(b);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return new Date(bv).getTime() - new Date(av).getTime();
      }
      default:
        return a.company_name.localeCompare(b.company_name);
    }
  });

  const rows: ClientRow[] = sorted.map((c) => ({
    id: c.id,
    companyName: c.company_name,
    status: c.status,
    primaryContactName: c.contacts.find((ct) => ct.is_primary)?.name ?? c.contacts[0]?.name ?? null,
    nextVisitAt: nextVisit(c, now),
  }));

  const isFiltered = Boolean(q || status || product || upcomingOnly);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          {activeTeam && (
            <AddExistingClientsDialog
              teamId={activeTeam.id}
              teamName={activeTeam.name}
              clients={availableToShare}
            />
          )}
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

      <ClientFilters products={allProducts} />

      {error && (
        <p className="text-sm text-destructive">{t("list.loadError")}</p>
      )}

      <ClientList clients={rows} isFiltered={isFiltered} />
    </div>
  );
}
