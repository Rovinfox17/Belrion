"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitFeedback } from "@/app/actions/feedback";

type Category = "error" | "mejora" | "otro";

export function FeedbackForm() {
  const t = useTranslations("feedback");
  const [category, setCategory] = useState<Category>("error");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
    { value: "error", label: t("categoryError") },
    { value: "mejora", label: t("categoryImprovement") },
    { value: "otro", label: t("categoryOther") },
  ];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitFeedback({ category, message });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(t("success"));
      setMessage("");
      setCategory("error");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="category">{t("category")}</Label>
        <Select
          items={CATEGORY_OPTIONS}
          value={category}
          onValueChange={(value) => setCategory(value as Category)}
        >
          <SelectTrigger id="category" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
