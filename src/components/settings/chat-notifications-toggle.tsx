"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setChatNotificationsPreference } from "@/app/actions/notification-preferences";

export function ChatNotificationsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const t = useTranslations("settings.notifications");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      const result = await setChatNotificationsPreference(checked);
      if (result?.error) {
        setEnabled(!checked);
        toast.error(result.error);
      }
    });
  }

  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => handleChange(e.target.checked)}
        disabled={isPending}
        className="mt-0.5 size-4"
      />
      <span className="flex flex-col">
        <span>{t("chatNotifications")}</span>
        <span className="text-xs text-muted-foreground">{t("chatNotificationsHint")}</span>
      </span>
    </label>
  );
}
