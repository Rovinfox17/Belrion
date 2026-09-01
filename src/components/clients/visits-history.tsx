import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { CompleteVisitButton } from "@/components/clients/complete-visit-button";
import { haversineDistanceMeters, formatDistance } from "@/lib/geo-distance";

export type VisitWithComments = {
  id: string;
  scheduledAt: string;
  status: "pendiente" | "completada" | "cancelada";
  checkinLatitude: number | null;
  checkinLongitude: number | null;
  comments: { id: string; comment: string; createdAt: string }[];
};

const STATUS_CLASS: Record<VisitWithComments["status"], string> = {
  pendiente: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  completada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelada: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
};

// A partir de aquí el check-in se considera "lejos" del cliente — mismo
// umbral informativo que use-complete-visit.ts.
const FAR_THRESHOLD_METERS = 500;

export async function VisitsHistory({
  clientId,
  clientLatitude,
  clientLongitude,
  visits,
}: {
  clientId: string;
  clientLatitude: number | null;
  clientLongitude: number | null;
  visits: VisitWithComments[];
}) {
  const locale = await getLocale();
  const t = await getTranslations("clients.visits");

  const STATUS_LABEL: Record<VisitWithComments["status"], string> = {
    pendiente: t("statusPending"),
    completada: t("statusCompleted"),
    cancelada: t("statusCancelled"),
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function checkinMessage(v: VisitWithComments): string | null {
    if (v.checkinLatitude === null || v.checkinLongitude === null) return null;
    if (clientLatitude === null || clientLongitude === null) return t("checkinRecorded");
    const meters = haversineDistanceMeters(
      v.checkinLatitude,
      v.checkinLongitude,
      clientLatitude,
      clientLongitude
    );
    const distance = formatDistance(meters);
    return meters > FAR_THRESHOLD_METERS ? t("checkinFar", { distance }) : t("checkinNear", { distance });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">{t("title")}</h2>
      {visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visits.map((v) => {
            const checkin = checkinMessage(v);
            return (
              <li key={v.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{formatDate(v.scheduledAt)}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_CLASS[v.status]} variant="secondary">
                      {STATUS_LABEL[v.status]}
                    </Badge>
                    {v.status === "pendiente" && (
                      <CompleteVisitButton visitId={v.id} clientId={clientId} />
                    )}
                  </div>
                </div>
                {checkin && <p className="mt-1 text-xs text-muted-foreground">📍 {checkin}</p>}
                {v.comments.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                    {v.comments.map((c) => (
                      <li key={c.id} className="text-sm text-muted-foreground">
                        <span className="text-xs">{formatDate(c.createdAt)} — </span>
                        {c.comment}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
