"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldMeta } from "@/components/clients/client-list";
import { HelpTooltip } from "@/components/ui/help-tooltip";

export function ClientFilters({
  products,
  localities,
  regions,
  provinces,
  customFields,
}: {
  products: string[];
  localities: string[];
  regions: string[];
  provinces: string[];
  customFields: CustomFieldMeta[];
}) {
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

  // Empresa, Contacto, Estado y Próxima visita ya se ordenan haciendo clic
  // en su cabecera de columna; aquí solo quedan los criterios que no tienen
  // una columna propia en la tabla.
  const SORT_OPTIONS = [
    { value: "fecha_alta", label: t("sortCreatedAt") },
    { value: "ultima_visita", label: t("sortLastVisit") },
  ];
  const currentSort = searchParams.get("sort") ?? "";
  const dropdownSortValue = SORT_OPTIONS.some((o) => o.value === currentSort) ? currentSort : "";

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

  function updateSort(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    // La dirección se resetea al valor por defecto del criterio elegido; si
    // se quedara la de una columna anterior podría invertir el resultado.
    params.delete("dir");
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

  // Campos que se muestran como fila de filtro activa: parte de los que ya
  // tienen un valor en la URL, más los que el usuario acaba de añadir con
  // "+ Añadir filtro" (todavía sin valor, por eso no viven en la URL hasta
  // que se rellenan).
  const [shownFieldIds, setShownFieldIds] = useState<string[]>(() =>
    customFields.filter((f) => searchParams.has(`custom_${f.id}`)).map((f) => f.id)
  );

  function addCustomFilter(fieldId: string) {
    setShownFieldIds((prev) => (prev.includes(fieldId) ? prev : [...prev, fieldId]));
  }

  function removeCustomFilter(fieldId: string) {
    setShownFieldIds((prev) => prev.filter((id) => id !== fieldId));
    updateParam(`custom_${fieldId}`, null);
    updateParam(`custom_${fieldId}_op`, null);
  }

  const shownFields = customFields.filter((f) => shownFieldIds.includes(f.id));
  const addableFields = customFields.filter((f) => !shownFieldIds.includes(f.id));

  return (
    <div className="flex flex-col gap-3">
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
        {localities.length > 0 && (
          <Select
            items={[{ value: "all", label: t("localityAll") }, ...localities.map((l) => ({ value: l, label: l }))]}
            value={searchParams.get("locality") ?? "all"}
            onValueChange={(v) => updateParam("locality", v)}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder={t("localityPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("localityAll")}</SelectItem>
              {localities.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {regions.length > 0 && (
          <Select
            items={[{ value: "all", label: t("regionAll") }, ...regions.map((r) => ({ value: r, label: r }))]}
            value={searchParams.get("region") ?? "all"}
            onValueChange={(v) => updateParam("region", v)}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder={t("regionPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("regionAll")}</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {provinces.length > 0 && (
          <Select
            items={[{ value: "all", label: t("provinceAll") }, ...provinces.map((p) => ({ value: p, label: p }))]}
            value={searchParams.get("province") ?? "all"}
            onValueChange={(v) => updateParam("province", v)}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder={t("provincePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("provinceAll")}</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select items={SORT_OPTIONS} value={dropdownSortValue} onValueChange={updateSort}>
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
        {addableFields.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Select items={addableFields.map((f) => ({ value: f.id, label: f.name }))} value="" onValueChange={(v) => v && addCustomFilter(v)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder={t("addFilter")} />
              </SelectTrigger>
              <SelectContent>
                {addableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <HelpTooltip text={t("addFilterHelp")} />
          </div>
        )}
      </div>

      {shownFields.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {shownFields.map((field) => (
            <CustomFieldFilter
              key={field.id}
              field={field}
              value={searchParams.get(`custom_${field.id}`) ?? ""}
              op={searchParams.get(`custom_${field.id}_op`) ?? "eq"}
              onChange={(value) => updateParam(`custom_${field.id}`, value)}
              onOpChange={(op) => updateParam(`custom_${field.id}_op`, op)}
              onRemove={() => removeCustomFilter(field.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CustomFieldFilter({
  field,
  value,
  op,
  onChange,
  onOpChange,
  onRemove,
}: {
  field: CustomFieldMeta;
  value: string;
  op: string;
  onChange: (value: string | null) => void;
  onOpChange: (op: string | null) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("clients.filters");
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const OP_OPTIONS = [
    { value: "eq", label: t("filterEquals") },
    { value: "gt", label: t("filterGreaterThan") },
    { value: "lt", label: t("filterLessThan") },
  ];

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5">
      <span className="text-xs font-medium text-muted-foreground">{field.name}</span>

      {field.fieldType === "texto" && (
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onChange(localValue)}
          placeholder={t("filterContains")}
          className="h-7 w-36"
        />
      )}

      {(field.fieldType === "numero" || field.fieldType === "fecha") && (
        <>
          <Select items={OP_OPTIONS} value={op} onValueChange={(v) => onOpChange(v)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type={field.fieldType === "numero" ? "number" : "date"}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => onChange(localValue)}
            className="h-7 w-36"
          />
        </>
      )}

      {field.fieldType === "lista" && (
        <Select
          items={(field.options ?? []).map((o) => ({ value: o, label: o }))}
          value={value}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder={t("filterAll")} />
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
        <Select
          items={[
            { value: "true", label: t("filterYes") },
            { value: "false", label: t("filterNo") },
          ]}
          value={value}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger size="sm" className="w-24">
            <SelectValue placeholder={t("filterAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{t("filterYes")}</SelectItem>
            <SelectItem value="false">{t("filterNo")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("removeFilter")}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </div>
  );
}
