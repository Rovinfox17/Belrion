"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCompleteVisit } from "@/components/calendar/use-complete-visit";

export function CompleteVisitButton({ visitId, clientId }: { visitId: string; clientId: string }) {
  const t = useTranslations("clients.visits");
  const { complete, isPending } = useCompleteVisit();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => complete(visitId, clientId)}
    >
      {t("markCompleted")}
    </Button>
  );
}
