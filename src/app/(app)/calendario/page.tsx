import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { ClientOption } from "@/components/calendar/new-visit-dialog";
import type { CalendarVisit } from "@/components/calendar/visit-detail-dialog";

type RawVisit = {
  id: string;
  scheduled_at: string;
  status: "pendiente" | "completada" | "cancelada";
  reminder_minutes_before: number | null;
  client_id: string;
  clients: { company_name: string } | null;
  visit_comments: { id: string; comment: string; created_at: string }[];
};

export default async function CalendarioPage() {
  const t = await getTranslations("calendar");
  const tNewDialog = await getTranslations("calendar.newDialog");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: visitsData }, { data: clientsData }, { data: membershipsData }] =
    await Promise.all([
      supabase
        .from("visits")
        .select(
          "id, scheduled_at, status, reminder_minutes_before, client_id, clients(company_name), visit_comments(id, comment, created_at)"
        ),
      supabase.from("clients").select("id, company_name").order("company_name"),
      user
        ? supabase.from("team_members").select("team_id, teams(name)").eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ]);

  const tNav = await getTranslations("nav");
  const teams = (membershipsData ?? []).map((m) => ({
    id: m.team_id,
    name: (m.teams as unknown as { name: string } | null)?.name ?? tNav("team"),
  }));

  const rawVisits = (visitsData ?? []) as unknown as RawVisit[];

  const visits: CalendarVisit[] = rawVisits.map((v) => ({
    id: v.id,
    clientId: v.client_id,
    companyName: v.clients?.company_name ?? tNewDialog("client"),
    scheduledAt: v.scheduled_at,
    status: v.status,
    reminderMinutesBefore: v.reminder_minutes_before,
    comments: (v.visit_comments ?? [])
      .map((c) => ({ id: c.id, comment: c.comment, createdAt: c.created_at }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  }));

  const clients: ClientOption[] = (clientsData ?? []).map((c) => ({
    id: c.id,
    companyName: c.company_name,
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
      <CalendarView visits={visits} clients={clients} teams={teams} />
    </div>
  );
}
