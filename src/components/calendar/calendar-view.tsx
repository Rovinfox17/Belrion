"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import caLocale from "@fullcalendar/core/locales/ca";
import type { EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { NewVisitDialog, type ClientOption, type TeamOption } from "./new-visit-dialog";
import { VisitDetailDialog, type CalendarVisit } from "./visit-detail-dialog";

const STATUS_COLOR: Record<CalendarVisit["status"], string> = {
  pendiente: "#f59e0b",
  completada: "#10b981",
  cancelada: "#a1a1aa",
};

function nowAsDatetimeLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:00`;
}

export function CalendarView({
  visits,
  clients,
  teams = [],
}: {
  visits: CalendarVisit[];
  clients: ClientOption[];
  teams?: TeamOption[];
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) ?? null;

  const events = visits.map((v) => ({
    id: v.id,
    title: v.companyName,
    start: v.scheduledAt,
    backgroundColor: STATUS_COLOR[v.status],
    borderColor: STATUS_COLOR[v.status],
  }));

  function handleDateClick(info: DateClickArg) {
    const local = info.dateStr.includes("T") ? info.dateStr.slice(0, 16) : `${info.dateStr}T09:00`;
    setNewVisitDate(local);
    setNewVisitOpen(true);
  }

  function handleEventClick(info: EventClickArg) {
    setSelectedVisitId(info.event.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setNewVisitDate(nowAsDatetimeLocal());
            setNewVisitOpen(true);
          }}
        >
          <PlusIcon />
          {t("newVisit")}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-2 shadow-sm sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          locale={locale === "ca" ? caLocale : locale === "en" ? undefined : esLocale}
          height="auto"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
        />
      </div>

      <NewVisitDialog
        open={newVisitOpen}
        onOpenChange={setNewVisitOpen}
        clients={clients}
        teams={teams}
        initialDate={newVisitDate}
      />

      {selectedVisit && (
        <VisitDetailDialog
          visit={selectedVisit}
          onOpenChange={(open) => {
            if (!open) setSelectedVisitId(null);
          }}
        />
      )}
    </div>
  );
}
