"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { updateClient } from "@/app/actions/clients";

type Status = "activo" | "potencial" | "inactivo";

export function EditClientDialog({
  client,
}: {
  client: {
    id: string;
    companyName: string;
    status: Status;
    address: string | null;
    notes: string | null;
  };
}) {
  const t = useTranslations("clients.editDialog");
  const tFilters = useTranslations("clients.filters");
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState(client.companyName);
  const [status, setStatus] = useState<Status>(client.status);
  const [address, setAddress] = useState(client.address ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setCompanyName(client.companyName);
      setStatus(client.status);
      setAddress(client.address ?? "");
      setNotes(client.notes ?? "");
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateClient({
        id: client.id,
        companyName,
        status,
        address,
        notes,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(t("success"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline">{t("trigger")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit_company_name">{t("companyName")}</Label>
            <Input
              id="edit_company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit_status">{t("status")}</Label>
            <Select
              items={[
                { value: "potencial", label: tFilters("statusPotential") },
                { value: "activo", label: tFilters("statusActive") },
                { value: "inactivo", label: tFilters("statusInactive") },
              ]}
              value={status}
              onValueChange={(v) => setStatus(v as Status)}
            >
              <SelectTrigger id="edit_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="potencial">{tFilters("statusPotential")}</SelectItem>
                <SelectItem value="activo">{tFilters("statusActive")}</SelectItem>
                <SelectItem value="inactivo">{tFilters("statusInactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit_address">{t("address")}</Label>
            <Input
              id="edit_address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("addressPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit_notes">{t("notes")}</Label>
            <textarea
              id="edit_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder={t("notesPlaceholder")}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
