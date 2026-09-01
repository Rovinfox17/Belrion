"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUpIcon, ArrowDownIcon, MapPinnedIcon, XIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateRoute, confirmRoute, type RouteCandidate } from "@/app/actions/route-generator";

type TeamOption = { id: string; name: string };

type Stop = RouteCandidate & { time: string };

type Step = "form" | "review";

const START_HOUR = 9;
const STOP_MINUTES = 45;

function initialTime(index: number): string {
  const totalMinutes = START_HOUR * 60 + index * STOP_MINUTES;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RouteGeneratorDialog({ teams = [] }: { teams?: TeamOption[] }) {
  const t = useTranslations("calendar.routeGenerator");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [area, setArea] = useState("");
  const [teamId, setTeamId] = useState("personal");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isConfirming, startConfirm] = useTransition();

  const [stops, setStops] = useState<Stop[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [expandedTo, setExpandedTo] = useState<string | null>(null);
  const [searchedArea, setSearchedArea] = useState("");
  const [date, setDate] = useState(todayLocal());

  function reset() {
    setStep("form");
    setArea("");
    setTeamId("personal");
    setError(null);
    setStops([]);
    setTotalFound(0);
    setExpandedTo(null);
    setSearchedArea("");
    setDate(todayLocal());
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startSearch(async () => {
      const result = await generateRoute({
        area,
        teamId: teamId === "personal" ? null : teamId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const candidates = result.candidates ?? [];
      setStops(candidates.map((c, index) => ({ ...c, time: initialTime(index) })));
      setTotalFound(result.totalFound ?? candidates.length);
      setExpandedTo(result.expandedTo ?? null);
      setSearchedArea(area);
      setStep("review");
    });
  }

  function removeStop(clientId: string) {
    setStops((prev) => prev.filter((s) => s.clientId !== clientId));
  }

  function moveStop(index: number, direction: "up" | "down") {
    setStops((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateTime(clientId: string, time: string) {
    setStops((prev) => prev.map((s) => (s.clientId === clientId ? { ...s, time } : s)));
  }

  function handleConfirm() {
    setError(null);
    startConfirm(async () => {
      const result = await confirmRoute({
        date,
        stops: stops.map((s) => ({ clientId: s.clientId, time: s.time })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(t("success", { count: result.count ?? stops.length }));
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <MapPinnedIcon />
            {t("trigger")}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="route_area" className="flex items-center gap-1.5">
                {t("areaLabel")}
                <HelpTooltip text={t("areaHelp")} />
              </Label>
              <Input
                id="route_area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder={t("areaPlaceholder")}
                required
              />
            </div>

            {teams.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="route_portfolio">{t("portfolioLabel")}</Label>
                <Select
                  items={[
                    { value: "personal", label: t("portfolioPersonal") },
                    ...teams.map((team) => ({ value: team.id, label: team.name })),
                  ]}
                  value={teamId}
                  onValueChange={(v) => setTeamId(v ?? "personal")}
                >
                  <SelectTrigger id="route_portfolio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">{t("portfolioPersonal")}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSearching}>
                {isSearching ? t("searching") : t("search")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-4">
            {expandedTo && (
              <p className="rounded-md border border-border bg-accent/40 p-2.5 text-sm text-muted-foreground">
                {t("expandedNotice", { area: searchedArea, region: expandedTo })}
              </p>
            )}

            {stops.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-accent/40 p-6 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                  <SearchXIcon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{t("emptyTitle")}</p>
                  <p className="max-w-md text-sm text-muted-foreground">{t("emptyText")}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setStep("form")}>
                  {t("back")}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("foundCount", { count: totalFound })}
                </p>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="route_date">{t("dateLabel")}</Label>
                  <Input
                    id="route_date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-fit"
                  />
                </div>

                <ul className="flex flex-col gap-2">
                  {stops.map((stop, index) => (
                    <li
                      key={stop.clientId}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{stop.companyName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {stop.address}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stop.daysSinceLastVisit === null
                            ? t("neverVisited")
                            : t("daysSince", { count: stop.daysSinceLastVisit })}
                        </span>
                      </div>
                      <Input
                        type="time"
                        value={stop.time}
                        onChange={(e) => updateTime(stop.clientId, e.target.value)}
                        className="w-28 shrink-0"
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          onClick={() => moveStop(index, "up")}
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === stops.length - 1}
                          onClick={() => moveStop(index, "down")}
                        >
                          <ArrowDownIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeStop(stop.clientId)}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <DialogFooter className="justify-between sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep("form")}>
                    {t("back")}
                  </Button>
                  <Button type="button" onClick={handleConfirm} disabled={isConfirming}>
                    {isConfirming ? t("confirming") : t("confirm")}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
