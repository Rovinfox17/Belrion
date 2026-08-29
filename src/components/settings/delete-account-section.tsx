"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccountSection() {
  const t = useTranslations("settings.deleteAccount");
  const confirmWord = t("confirmWord");
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canDelete = confirmText === confirmWord;

  function handleDelete() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });

      if (error) {
        console.error("delete-account failed", error);
        toast.error(t("error", { message: error.message }));
        return;
      }

      await supabase.auth.signOut();
      router.push(`/login?message=${encodeURIComponent(t("loginMessage"))}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_delete">
          {t.rich("confirmLabel", {
            word: () => <span className="font-semibold">{confirmWord}</span>,
          })}
        </Label>
        <Input
          id="confirm_delete"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={confirmWord}
          autoComplete="off"
          className="max-w-xs"
        />
      </div>
      <Button
        variant="destructive"
        disabled={!canDelete || isPending}
        onClick={handleDelete}
        className="w-fit"
      >
        <Trash2Icon />
        {isPending ? t("deleting") : t("submit")}
      </Button>
    </div>
  );
}
