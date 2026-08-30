"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { createVisit } from "@/app/actions/visits";

export type ClientOption = { id: string; companyName: string };
export type TeamOption = { id: string; name: string };

export function NewVisitDialog({
  open,
  onOpenChange,
  clients,
  teams = [],
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  teams?: TeamOption[];
  initialDate: string | null;
}) {
  const t = useTranslations("calendar.newDialog");
  const REMINDER_OPTIONS = [
    { value: "0", label: t("reminderNone") },
    { value: "15", label: t("reminder15") },
    { value: "30", label: t("reminder30") },
    { value: "60", label: t("reminder60") },
    { value: "1440", label: t("reminder1440") },
  ];
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [reminder, setReminder] = useState("30");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients.filter((c) => c.companyName.toLowerCase().includes(q)).slice(0, 20);
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setSearch("");
      setClientId("");
      setScheduledAt(initialDate ?? "");
      setReminder("30");
      setSelectedTeamIds([]);
      setError(null);
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
    if (!clientId) {
      setError(t("selectClientError"));
      return;
    }
    startTransition(async () => {
      const result = await createVisit({
        clientId,
        scheduledAt,
        reminderMinutesBefore: reminder === "0" ? null : Number(reminder),
        teamIds: selectedTeamIds,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success(t("success"));
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("client")}</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm">
                <span>{selectedClient.companyName}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setClientId("")}
                >
                  {t("change")}
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder={t("clientSearch")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border border-input">
                  {filteredClients.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">{t("noResults")}</p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setClientId(c.id);
                          setSearch("");
                        }}
                      >
                        {c.companyName}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduled_at">{t("date")}</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reminder">{t("reminder")}</Label>
            <Select items={REMINDER_OPTIONS} value={reminder} onValueChange={(v) => setReminder(v ?? "30")}>
              <SelectTrigger id="reminder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isPending ? t("saving") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
