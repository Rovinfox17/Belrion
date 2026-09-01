"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setRevisitCycle } from "@/app/actions/notification-preferences";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CYCLE_OPTIONS = [1, 2, 3, 6] as const;

export function RevisitCycleSelect({ initialMonths }: { initialMonths: number }) {
  const t = useTranslations("settings.revisitCycle");
  const [months, setMonths] = useState(String(initialMonths));
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const previous = months;
    setMonths(value);
    startTransition(async () => {
      const result = await setRevisitCycle(Number(value) as 1 | 2 | 3 | 6);
      if (result?.error) {
        setMonths(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{t("label")}</span>
        <HelpTooltip text={t("help")} />
      </div>
      <Select
        items={CYCLE_OPTIONS.map((m) => ({ value: String(m), label: t("months", { count: m }) }))}
        value={months}
        onValueChange={(v) => handleChange(v ?? months)}
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CYCLE_OPTIONS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {t("months", { count: m })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
