"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveAccessRequest, rejectAccessRequest } from "@/app/actions/admin";

export type AccessRequestData = {
  id: string;
  name: string;
  email: string;
  reason: string | null;
  createdAt: string;
};

export function AccessRequestRow({ request }: { request: AccessRequestData }) {
  const t = useTranslations("admin.requests");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveAccessRequest(request.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("approved"));
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectAccessRequest(request.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("rejected"));
    });
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{request.name}</p>
        <p className="truncate text-sm text-muted-foreground">{request.email}</p>
        {request.reason && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{request.reason}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={handleReject}
        >
          <XIcon className="size-4" />
          {t("reject")}
        </Button>
        <Button type="button" size="sm" disabled={isPending} onClick={handleApprove}>
          <CheckIcon className="size-4" />
          {t("approve")}
        </Button>
      </div>
    </li>
  );
}
