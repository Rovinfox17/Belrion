"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClientFilters({ products }: { products: string[] }) {
  const t = useTranslations("clients.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  const STATUS_OPTIONS = [
    { value: "all", label: t("statusAll") },
    { value: "activo", label: t("statusActive") },
    { value: "potencial", label: t("statusPotential") },
    { value: "inactivo", label: t("statusInactive") },
  ];

  const SORT_OPTIONS = [
    { value: "alfabetico", label: t("sortAlphabetical") },
    { value: "fecha_alta", label: t("sortCreatedAt") },
    { value: "proxima_visita", label: t("sortNextVisit") },
    { value: "ultima_visita", label: t("sortLastVisit") },
  ];

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const handle = setTimeout(() => updateParam("q", q), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const upcomingActive = searchParams.get("upcoming") === "true";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        placeholder={t("searchPlaceholder")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select
        items={STATUS_OPTIONS}
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder={t("statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {products.length > 0 && (
        <Select
          items={[{ value: "all", label: t("productAll") }, ...products.map((p) => ({ value: p, label: p }))]}
          value={searchParams.get("product") ?? "all"}
          onValueChange={(v) => updateParam("product", v)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder={t("productPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("productAll")}</SelectItem>
            {products.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        items={SORT_OPTIONS}
        value={searchParams.get("sort") ?? "alfabetico"}
        onValueChange={(v) => updateParam("sort", v)}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder={t("sortPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant={upcomingActive ? "default" : "outline"}
        size="sm"
        onClick={() => updateParam("upcoming", upcomingActive ? null : "true")}
      >
        {t("upcomingOnly")}
      </Button>
    </div>
  );
}
