"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

export function ChangePasswordSection() {
  const t = useTranslations("settings.password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < MIN_LENGTH) {
      setError(t("tooShort", { min: MIN_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("mismatch"));
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(t("success"));
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new_password">{t("new")}</Label>
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={MIN_LENGTH}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm_password">{t("confirm")}</Label>
        <Input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={MIN_LENGTH}
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700" role="status">
          {success}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? t("saving") : t("submit")}
      </Button>
    </form>
  );
}
