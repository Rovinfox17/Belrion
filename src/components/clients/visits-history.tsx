import { Badge } from "@/components/ui/badge";

export type VisitWithComments = {
  id: string;
  scheduledAt: string;
  status: "pendiente" | "completada" | "cancelada";
  comments: { id: string; comment: string; createdAt: string }[];
};

const STATUS_LABEL: Record<VisitWithComments["status"], string> = {
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
};

const STATUS_CLASS: Record<VisitWithComments["status"], string> = {
  pendiente: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  completada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelada: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VisitsHistory({ visits }: { visits: VisitWithComments[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Historial de visitas</h2>
      {visits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin visitas registradas todavía. Podrás programarlas desde el calendario en el
          próximo paso.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visits.map((v) => (
            <li key={v.id} className="rounded-lg border border-black/5 bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{formatDate(v.scheduledAt)}</span>
                <Badge className={STATUS_CLASS[v.status]} variant="secondary">
                  {STATUS_LABEL[v.status]}
                </Badge>
              </div>
              {v.comments.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5 border-t border-black/5 pt-2">
                  {v.comments.map((c) => (
                    <li key={c.id} className="text-sm text-muted-foreground">
                      <span className="text-xs">{formatDate(c.createdAt)} — </span>
                      {c.comment}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
