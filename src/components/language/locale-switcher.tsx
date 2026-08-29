"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_OPTIONS } from "@/i18n/locales";
import { setLocale } from "@/app/actions/locale";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className={compact ? "h-8 w-auto gap-1.5 border-none bg-transparent px-2 shadow-none" : "w-44"}>
        {compact && <LanguagesIcon className="size-3.5" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALE_OPTIONS.map((option) => (
          <SelectItem key={option.code} value={option.code}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LocaleSwitcherButtons() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(code: string) {
    startTransition(async () => {
      await setLocale(code);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {LOCALE_OPTIONS.map((option) => (
        <Button
          key={option.code}
          type="button"
          variant={locale === option.code ? "default" : "outline"}
          size="sm"
          disabled={isPending}
          onClick={() => handleChange(option.code)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
