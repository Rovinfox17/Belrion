"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("clients.teams");
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
      toast.success(t("shareSuccess"));
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
        toast.success(t("removeSuccess"));
        router.refresh();
      }
      setRemovingId(null);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">{t("title")}</h2>
      {sharedWith.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("onlyPersonal")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sharedWith.map((team) => (
            <li
              key={team.teamId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <span className="text-sm font-medium">{team.teamName}</span>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(team.teamId)}
                  disabled={isPending && removingId === team.teamId}
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
              <Select
                items={availableTeams.map((team) => ({ value: team.id, label: team.name }))}
                value={selectedTeamId}
                onValueChange={(v) => setSelectedTeamId(v ?? "")}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? t("adding") : t("add")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
              <PlusIcon />
              {t("share")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
