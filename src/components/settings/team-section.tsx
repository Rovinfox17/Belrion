"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrashIcon } from "lucide-react";
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
} | null;

function CreateTeamForm() {
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
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Todavía no perteneces a ningún equipo. Crea uno para compartir una cartera de
        clientes con tus compañeros — la que ya tienes seguirá siendo solo tuya.
      </p>
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

function ManageTeam({ team }: { team: NonNullable<TeamData> }) {
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
      toast.success("Miembro añadido");
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
        toast.success("Miembro eliminado");
        router.refresh();
      }
      setRemovingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Cartera compartida con el equipo <span className="font-medium">{team.name}</span>.
      </p>

      <ul className="flex flex-col gap-2">
        {team.members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-3 rounded-lg border border-black/5 bg-card p-3"
          >
            <div className="text-sm">
              <span className="font-medium">{m.email}</span>{" "}
              <span className="text-muted-foreground">
                · {m.role === "owner" ? "Propietario" : "Miembro"}
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
          <Label htmlFor="member_email">Añadir miembro por email</Label>
          <div className="flex gap-2">
            <Input
              id="member_email"
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

export function TeamSection({ team }: { team: TeamData }) {
  return team ? <ManageTeam team={team} /> : <CreateTeamForm />;
}
