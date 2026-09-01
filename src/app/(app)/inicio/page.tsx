import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClockIcon, CalendarDaysIcon, ClockAlertIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RouteGeneratorDialog } from "@/components/calendar/route-generator-dialog";

const STALE_DAYS = 30;
const UPCOMING_LIMIT = 3;
const STALE_LIMIT = 6;

type RawVisit = {
  id: string;
  scheduled_at: string;
  client_id: string;
  clients: { company_name: string } | null;
};

type RawClient = {
  id: string;
  company_name: string;
  created_at: string;
  visits: { scheduled_at: string; status: string }[];
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function lastVisitDate(client: RawClient): Date {
  const completed = client.visits
    .filter((v) => v.status === "completada")
    .map((v) => new Date(v.scheduled_at).getTime())
    .sort((a, b) => b - a);
  return completed.length > 0 ? new Date(completed[0]) : new Date(client.created_at);
}

export default async function InicioPage() {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");
  const tNewDialog = await getTranslations("calendar.newDialog");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [{ data: visitsData }, { data: clientsData }, { data: membershipsData }] =
    await Promise.all([
      supabase
        .from("visits")
        .select("id, scheduled_at, client_id, clients(company_name)")
        .eq("status", "pendiente")
        .gte("scheduled_at", todayStart.toISOString())
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("clients")
        .select("id, company_name, created_at, visits(scheduled_at, status)")
        .eq("status", "activo"),
      user
        ? supabase.from("team_members").select("team_id, teams(name)").eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ]);

  const teams = (membershipsData ?? []).map((m) => ({
    id: m.team_id,
    name: (m.teams as unknown as { name: string } | null)?.name ?? tNav("team"),
  }));

  const rawVisits = (visitsData ?? []) as unknown as RawVisit[];

  const todayVisits = rawVisits.filter((v) => {
    const at = new Date(v.scheduled_at);
    return at >= todayStart && at <= todayEnd;
  });

  const upcomingVisits = rawVisits
    .filter((v) => new Date(v.scheduled_at) > todayEnd)
    .slice(0, UPCOMING_LIMIT);

  const staleCutoff = now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const rawClients = (clientsData ?? []) as unknown as RawClient[];
  const staleClients = rawClients
    .map((c) => ({ id: c.id, companyName: c.company_name, lastVisit: lastVisitDate(c) }))
    .filter((c) => c.lastVisit.getTime() < staleCutoff)
    .sort((a, b) => a.lastVisit.getTime() - b.lastVisit.getTime())
    .slice(0, STALE_LIMIT);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <RouteGeneratorDialog teams={teams} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="size-4 text-primary" />
            <h2 className="font-medium">{t("todayVisits.title")}</h2>
          </div>
          {todayVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("todayVisits.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayVisits.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/clientes/${v.client_id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-accent"
                  >
                    <span className="font-medium">
                      {v.clients?.company_name ?? tNewDialog("client")}
                    </span>
                    <span className="text-muted-foreground">{formatTime(v.scheduled_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClockIcon className="size-4 text-primary" />
            <h2 className="font-medium">{t("upcomingVisits.title")}</h2>
          </div>
          {upcomingVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("upcomingVisits.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcomingVisits.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/clientes/${v.client_id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-accent"
                  >
                    <span className="font-medium">
                      {v.clients?.company_name ?? tNewDialog("client")}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(v.scheduled_at)}, {formatTime(v.scheduled_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <div>
            <div className="flex items-center gap-2">
              <ClockAlertIcon className="size-4 text-primary" />
              <h2 className="font-medium">{t("staleClients.title")}</h2>
            </div>
            <p className="text-xs text-muted-foreground">{t("staleClients.hint")}</p>
          </div>
          {staleClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("staleClients.empty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {staleClients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-150 hover:bg-accent"
                  >
                    <span className="font-medium">{c.companyName}</span>
                    <span className="text-muted-foreground">{formatDate(c.lastVisit.toISOString())}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
