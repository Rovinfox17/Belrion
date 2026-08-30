"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronRightIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTeamMember, createTeam, removeTeamMember } from "@/app/actions/teams";

export type TeamMember = { userId: string; email: string; role: "owner" | "member" };

export type TeamData = {
  id: string;
  name: string;
  isOwner: boolean;
  members: TeamMember[];
};

export type TeamListItem = { id: string; name: string; role: "owner" | "member" };

export function CreateTeamForm() {
  const t = useTranslations("team");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTeam(name);
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(t("created"));
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? t("creating") : t("create")}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function TeamList({ teams }: { teams: TeamListItem[] }) {
  const t = useTranslations("team");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 font-medium">{t("createTitle")}</h2>
        <CreateTeamForm />
      </div>

      <div>
        <h2 className="mb-2 font-medium">{t("yourTeams")}</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTeams")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teams.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/equipo/${team.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors duration-150 hover:bg-accent"
                >
                  <span className="text-sm">
                    <span className="font-medium">{team.name}</span>{" "}
                    <span className="text-muted-foreground">
                      · {team.role === "owner" ? t("roleOwner") : t("roleCollaborator")}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ManageTeam({ team }: { team: TeamData }) {
  const t = useTranslations("team");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addTeamMember({ teamId: team.id, email });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(t("added"));
      setEmail("");
      router.refresh();
    });
  }

  function handleRemove(userId: string) {
    setRemovingId(userId);
    startTransition(async () => {
      const result = await removeTeamMember({ teamId: team.id, userId });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t("removed"));
        router.refresh();
      }
      setRemovingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {team.members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div className="text-sm">
              <span className="font-medium">{m.email}</span>{" "}
              <span className="text-muted-foreground">
                · {m.role === "owner" ? t("roleOwner") : t("roleCollaborator")}
              </span>
            </div>
            {team.isOwner && m.role !== "owner" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRemove(m.userId)}
                disabled={isPending && removingId === m.userId}
              >
                <TrashIcon />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {team.isOwner && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <Label htmlFor={`member_email_${team.id}`}>{t("addMemberLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id={`member_email_${team.id}`}
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? t("adding") : t("add")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("mustBeRegisteredHint")}</p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
