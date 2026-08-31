"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertCustomFieldValues } from "@/app/actions/custom-fields";

export type CustomFieldWithValue = {
  id: string;
  name: string;
  fieldType: "texto" | "numero" | "fecha" | "lista" | "booleano";
  options: string[] | null;
  value: string | null;
};

export function CustomFieldsSection({
  clientId,
  fields,
}: {
  clientId: string;
  fields: CustomFieldWithValue[];
}) {
  const t = useTranslations("clients.customFields");
  const [values, setValues] = useState<Record<string, string | null>>(
    Object.fromEntries(fields.map((f) => [f.id, f.value]))
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setValue(fieldId: string, value: string | null) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertCustomFieldValues(
        clientId,
        fields.map((f) => ({ fieldId: f.id, value: values[f.id] || null }))
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("success"));
      router.refresh();
    });
  }

  if (fields.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("empty")}{" "}
          <Link href="/ajustes" className="text-primary hover:underline">
            {t("emptyLink")}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">{t("title")}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <Label htmlFor={`custom_field_${field.id}`}>{field.name}</Label>
              {field.fieldType === "texto" && (
                <Input
                  id={`custom_field_${field.id}`}
                  value={values[field.id] ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                />
              )}
              {field.fieldType === "numero" && (
                <Input
                  id={`custom_field_${field.id}`}
                  type="number"
                  value={values[field.id] ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                />
              )}
              {field.fieldType === "fecha" && (
                <Input
                  id={`custom_field_${field.id}`}
                  type="date"
                  value={values[field.id] ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                />
              )}
              {field.fieldType === "lista" && (
                <Select
                  items={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                  value={values[field.id] ?? ""}
                  onValueChange={(v) => setValue(field.id, v)}
                >
                  <SelectTrigger id={`custom_field_${field.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.fieldType === "booleano" && (
                <label className="flex h-8 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values[field.id] === "true"}
                    onChange={(e) => setValue(field.id, e.target.checked ? "true" : "false")}
                    className="size-4"
                  />
                </label>
              )}
            </div>
          ))}
        </div>
        <Button type="submit" className="w-fit" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </form>
    </section>
  );
}
