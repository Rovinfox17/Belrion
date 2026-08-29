"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { deleteVisit, setVisitStatus, updateVisit } from "@/app/actions/visits";
import { addVisitComment } from "@/app/actions/visit-comments";

export type CalendarVisit = {
  id: string;
  clientId: string;
  companyName: string;
  scheduledAt: string;
  status: "pendiente" | "completada" | "cancelada";
  reminderMinutesBefore: number | null;
  comments: { id: string; comment: string; createdAt: string }[];
};

const STATUS_LABEL: Record<CalendarVisit["status"], string> = {
  pendiente: "Pendiente",
  completada: "Completada",
  cancelada: "Cancelada",
};

const STATUS_CLASS: Record<CalendarVisit["status"], string> = {
  pendiente: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  completada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  cancelada: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
};

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VisitDetailDialog({
  visit,
  onOpenChange,
}: {
  visit: CalendarVisit;
  onOpenChange: (open: boolean) => void;
}) {
  const [reprogramming, setReprogramming] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toDatetimeLocal(visit.scheduledAt));
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStatus(status: CalendarVisit["status"]) {
    startTransition(async () => {
      const result = await setVisitStatus({ id: visit.id, clientId: visit.clientId, status });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Visita actualizada");
      router.refresh();
    });
  }

  function handleReprogram(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateVisit({
        id: visit.id,
        clientId: visit.clientId,
        scheduledAt,
        status: visit.status,
        reminderMinutesBefore: visit.reminderMinutesBefore,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Visita reprogramada");
      setReprogramming(false);
      router.refresh();
    });
  }

  function handleAddComment(event: FormEvent) {
    event.preventDefault();
    const value = comment.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await addVisitComment({
        visitId: visit.id,
        clientId: visit.clientId,
        comment: value,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setComment("");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteVisit({ id: visit.id, clientId: visit.clientId });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Visita eliminada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{visit.companyName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/clientes/${visit.clientId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver ficha del cliente →
            </Link>
            <Badge className={STATUS_CLASS[visit.status]} variant="secondary">
              {STATUS_LABEL[visit.status]}
            </Badge>
          </div>

          {reprogramming ? (
            <form onSubmit={handleReprogram} className="flex flex-col gap-2">
              <Label htmlFor="reprogram_at">Nueva fecha y hora</Label>
              <Input
                id="reprogram_at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReprogramming(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">{formatDate(visit.scheduledAt)}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {visit.status !== "completada" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatus("completada")}
                disabled={isPending}
              >
                Marcar completada
              </Button>
            )}
            {visit.status !== "cancelada" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatus("cancelada")}
                disabled={isPending}
              >
                Cancelar visita
              </Button>
            )}
            {!reprogramming && (
              <Button size="sm" variant="outline" onClick={() => setReprogramming(true)}>
                Reprogramar
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
              Eliminar
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Comentarios de seguimiento</Label>
            {visit.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin comentarios todavía.</p>
            ) : (
              <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                {visit.comments.map((c) => (
                  <li key={c.id} className="rounded-md bg-accent p-2 text-sm">
                    <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                    {c.comment}
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Añadir comentario…"
              />
              <Button type="submit" size="sm" disabled={isPending}>
                Añadir
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
