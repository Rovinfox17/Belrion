"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createVisit } from "@/app/actions/visits";

export type ClientOption = { id: string; companyName: string };

const REMINDER_OPTIONS = [
  { value: "0", label: "Sin recordatorio" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 día antes" },
];

export function NewVisitDialog({
  open,
  onOpenChange,
  clients,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  initialDate: string | null;
}) {
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [reminder, setReminder] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients.filter((c) => c.companyName.toLowerCase().includes(q)).slice(0, 20);
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setSearch("");
      setClientId("");
      setScheduledAt(initialDate ?? "");
      setReminder("30");
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Selecciona un cliente.");
      return;
    }
    startTransition(async () => {
      const result = await createVisit({
        clientId,
        scheduledAt,
        reminderMinutesBefore: reminder === "0" ? null : Number(reminder),
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Visita programada");
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva visita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Cliente</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm">
                <span>{selectedClient.companyName}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setClientId("")}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Buscar cliente…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border border-input">
                  {filteredClients.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-black/[.03]"
                        onClick={() => {
                          setClientId(c.id);
                          setSearch("");
                        }}
                      >
                        {c.companyName}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduled_at">Fecha y hora</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reminder">Recordatorio</Label>
            <Select value={reminder} onValueChange={(v) => setReminder(v ?? "30")}>
              <SelectTrigger id="reminder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Programar visita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
