"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UsersRoundIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addClientsToTeam } from "@/app/actions/client-teams";

export type PersonalClientOption = { id: string; companyName: string };

export function AddExistingClientsDialog({
  teamId,
  teamName,
  clients,
}: {
  teamId: string;
  teamName: string;
  clients: PersonalClientOption[];
}) {
  const t = useTranslations("clients.addExisting");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addClientsToTeam({ teamId, clientIds: selected });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("success", { count: selected.length, team: teamName }));
      setOpen(false);
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">{t("trigger")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { team: teamName })}</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-md border border-input p-2">
              {clients.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selected.includes(c.id)}
                    onChange={(e) => toggle(c.id, e.target.checked)}
                  />
                  {c.companyName}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending || selected.length === 0}>
                <UsersRoundIcon />
                {isPending ? t("adding") : t("submit", { count: selected.length })}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
