"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      toast.success("Equipo creado");
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre del equipo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear equipo"}
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
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 font-medium">Crear un equipo</h2>
        <CreateTeamForm />
      </div>

      <div>
        <h2 className="mb-2 font-medium">Tus equipos</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no perteneces a ningún equipo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teams.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/equipo/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent"
                >
                  <span className="text-sm">
                    <span className="font-medium">{t.name}</span>{" "}
                    <span className="text-muted-foreground">
                      · {t.role === "owner" ? "Propietario" : "Colaborador"}
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
      toast.success("Colaborador añadido");
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
        toast.success("Colaborador eliminado");
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
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="text-sm">
              <span className="font-medium">{m.email}</span>{" "}
              <span className="text-muted-foreground">
                · {m.role === "owner" ? "Propietario" : "Colaborador"}
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
          <Label htmlFor={`member_email_${team.id}`}>Añadir miembro por email</Label>
          <div className="flex gap-2">
            <Input
              id={`member_email_${team.id}`}
              type="email"
              placeholder="companero@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Añadiendo…" : "Añadir"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Debe haberse registrado antes en Belrion con ese email.
          </p>
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
