"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_WORD = "ELIMINAR";

export function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canDelete = confirmText === CONFIRM_WORD;

  function handleDelete() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });

      if (error) {
        toast.error("No se pudo eliminar la cuenta. Inténtalo de nuevo.");
        return;
      }

      await supabase.auth.signOut();
      router.push(
        `/login?message=${encodeURIComponent("Tu cuenta y datos han sido eliminados.")}`
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Esto elimina permanentemente tu cuenta, tus clientes, contactos, productos, visitas
        y comentarios. Si eres propietario de algún equipo compartido, ese equipo también se
        eliminará para el resto de miembros. Esta acción no se puede deshacer.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_delete">
          Escribe <span className="font-semibold">{CONFIRM_WORD}</span> para confirmar
        </Label>
        <Input
          id="confirm_delete"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          className="max-w-xs"
        />
      </div>
      <Button
        variant="destructive"
        disabled={!canDelete || isPending}
        onClick={handleDelete}
        className="w-fit"
      >
        <Trash2Icon />
        {isPending ? "Eliminando…" : "Eliminar mi cuenta"}
      </Button>
    </div>
  );
}
