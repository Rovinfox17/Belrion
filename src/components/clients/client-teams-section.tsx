"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addClientToTeam, removeClientFromTeam } from "@/app/actions/client-teams";

export type ClientTeam = { teamId: string; teamName: string };
export type TeamOption = { id: string; name: string };

export function ClientTeamsSection({
  clientId,
  isOwner,
  sharedWith,
  availableTeams,
}: {
  clientId: string;
  isOwner: boolean;
  sharedWith: ClientTeam[];
  availableTeams: TeamOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(availableTeams[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!selectedTeamId) return;
    startTransition(async () => {
      const result = await addClientToTeam({ clientId, teamId: selectedTeamId });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Cliente compartido con el equipo");
      setAdding(false);
      router.refresh();
    });
  }

  function handleRemove(teamId: string) {
    setRemovingId(teamId);
    startTransition(async () => {
      const result = await removeClientFromTeam({ clientId, teamId });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Cliente quitado del equipo");
        router.refresh();
      }
      setRemovingId(null);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Equipos</h2>
      {sharedWith.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Este cliente solo está en tu cartera personal.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sharedWith.map((t) => (
            <li
              key={t.teamId}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/5 bg-card p-3"
            >
              <span className="text-sm font-medium">{t.teamName}</span>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(t.teamId)}
                  disabled={isPending && removingId === t.teamId}
                >
                  <TrashIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && availableTeams.length > 0 && (
        <>
          {adding ? (
            <form onSubmit={handleAdd} className="flex gap-2">
              <Select value={selectedTeamId} onValueChange={(v) => setSelectedTeamId(v ?? "")}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Añadiendo…" : "Añadir"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
              <PlusIcon />
              Compartir con un equipo
            </Button>
          )}
        </>
      )}
    </section>
  );
}
