"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createClientWithContact } from "@/app/actions/clients";

type Status = "activo" | "potencial" | "inactivo";
export type TeamOption = { id: string; name: string };

export function NewClientDialog({
  teams = [],
  defaultTeamId = null,
}: {
  teams?: TeamOption[];
  defaultTeamId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [status, setStatus] = useState<Status>("potencial");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    defaultTeamId ? [defaultTeamId] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelectedTeamIds(defaultTeamId ? [defaultTeamId] : []);
    }
  }

  function toggleTeam(teamId: string, checked: boolean) {
    setSelectedTeamIds((prev) =>
      checked ? [...prev, teamId] : prev.filter((id) => id !== teamId)
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createClientWithContact({
        companyName,
        contactName,
        status,
        teamIds: selectedTeamIds,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Cliente creado");
      handleOpenChange(false);
      setCompanyName("");
      setContactName("");
      setStatus("potencial");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button>Nuevo cliente</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="company_name">Nombre de la empresa</Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact_name">Persona de contacto</Label>
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="potencial">Potencial</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {teams.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Compartir también con</Label>
              <div className="flex flex-col gap-1.5">
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selectedTeamIds.includes(t.id)}
                      onChange={(e) => toggleTeam(t.id, e.target.checked)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Siempre queda en tu cartera personal, además de con lo que marques aquí.
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
