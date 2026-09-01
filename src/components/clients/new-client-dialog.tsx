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
  const t = useTranslations("clients.newDialog");
  const tFilters = useTranslations("clients.filters");
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [status, setStatus] = useState<Status>("potencial");
  const [locality, setLocality] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
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
        locality,
        region,
        province,
        teamIds: selectedTeamIds,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(t("success"));
      handleOpenChange(false);
      setCompanyName("");
      setContactName("");
      setStatus("potencial");
      setLocality("");
      setRegion("");
      setProvince("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button>{t("trigger")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="company_name">{t("companyName")}</Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact_name">{t("contactName")}</Label>
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">{t("status")}</Label>
            <Select
              items={[
                { value: "potencial", label: tFilters("statusPotential") },
                { value: "activo", label: tFilters("statusActive") },
                { value: "inactivo", label: tFilters("statusInactive") },
              ]}
              value={status}
              onValueChange={(v) => setStatus(v as Status)}
            >
              <SelectTrigger id="status">
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
            <Label htmlFor="new_locality">{t("locality")}</Label>
            <Input
              id="new_locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder={t("localityPlaceholder")}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new_region">{t("region")}</Label>
            <Input
              id="new_region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={t("regionPlaceholder")}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new_province">{t("province")}</Label>
            <Input
              id="new_province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder={t("provincePlaceholder")}
              required
            />
          </div>
          {teams.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>{t("shareWith")}</Label>
              <div className="flex flex-col gap-1.5">
                {teams.map((team) => (
                  <label key={team.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={(e) => toggleTeam(team.id, e.target.checked)}
                    />
                    {team.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("shareHint")}</p>
            </div>
          )}
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
