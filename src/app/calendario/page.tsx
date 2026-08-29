import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
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
  const supabase = await createClient();

  const [{ data: visitsData }, { data: clientsData }] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, scheduled_at, status, reminder_minutes_before, client_id, clients(company_name), visit_comments(id, comment, created_at)"
      ),
    supabase.from("clients").select("id, company_name").order("company_name"),
  ]);

  const rawVisits = (visitsData ?? []) as unknown as RawVisit[];

  const visits: CalendarVisit[] = rawVisits.map((v) => ({
    id: v.id,
    clientId: v.client_id,
    companyName: v.clients?.company_name ?? "Cliente",
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
    <div className="flex min-h-screen flex-col bg-[#FAF1E4]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Calendario de visitas</h1>
        <CalendarView visits={visits} clients={clients} />
      </main>
    </div>
  );
}
