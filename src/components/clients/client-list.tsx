"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SearchXIcon, UsersIcon, SlidersHorizontalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactAvatar } from "@/components/clients/contact-avatar";
import { SortableColumnHeader } from "@/components/clients/sortable-column-header";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { deleteClients } from "@/app/actions/clients";

export type CustomFieldMeta = {
  id: string;
  name: string;
  fieldType: "texto" | "numero" | "fecha" | "lista" | "booleano";
  options: string[] | null;
};

export type ClientRow = {
  id: string;
  companyName: string;
  status: "activo" | "potencial" | "inactivo";
  primaryContactName: string | null;
  nextVisitAt: string | null;
  customFieldValues: Record<string, string | null>;
};

const STATUS_CLASS: Record<ClientRow["status"], string> = {
  activo: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  potencial: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  inactivo: "bg-rose-100 text-rose-700 hover:bg-rose-100",
};

const COLUMNS_STORAGE_KEY = "belrion-client-columns";

function formatCustomValue(value: string | null, field: CustomFieldMeta, locale: string) {
  if (!value) return "—";
  switch (field.fieldType) {
    case "fecha":
      return new Date(value).toLocaleDateString(locale);
    case "booleano":
      return value === "true" ? "✓" : "—";
    default:
      return value;
  }
}

function ColumnPicker({
  customFields,
  visibleIds,
  onChange,
}: {
  customFields: CustomFieldMeta[];
  visibleIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("clients.filters");
  const [open, setOpen] = useState(false);

  if (customFields.length === 0) return null;

  function toggle(id: string) {
    onChange(visibleIds.includes(id) ? visibleIds.filter((v) => v !== id) : [...visibleIds, id]);
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontalIcon />
        {t("columns")}
      </Button>
      <HelpTooltip text={t("columnsHelp")} />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-border bg-popover p-2 shadow-md">
            <p className="mb-1.5 px-1 text-xs text-muted-foreground">{t("columnsHint")}</p>
            <ul className="flex flex-col gap-0.5">
              {customFields.map((field) => (
                <li key={field.id}>
                  <label className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={visibleIds.includes(field.id)}
                      onChange={() => toggle(field.id)}
                      className="size-4"
                    />
                    {field.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4"
    />
  );
}

function BulkDeleteBar({
  selectedIds,
  onDeleted,
  onClearSelection,
}: {
  selectedIds: string[];
  onDeleted: () => void;
  onClearSelection: () => void;
}) {
  const t = useTranslations("clients.bulkDelete");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteClients(selectedIds);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("success", { count: selectedIds.length }));
      setConfirmOpen(false);
      onDeleted();
      router.refresh();
    });
  }

  return (
    <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {t("selectedCount", { count: selectedIds.length })}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          {t("clearSelection")}
        </Button>
      </div>
      <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
        {t("trigger", { count: selectedIds.length })}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("description", { count: selectedIds.length })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending ? t("deleting") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ClientList({
  clients,
  isFiltered,
  customFields,
}: {
  clients: ClientRow[];
  isFiltered: boolean;
  customFields: CustomFieldMeta[];
}) {
  const locale = useLocale();
  const t = useTranslations("clients");
  const tFilters = useTranslations("clients.filters");
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (stored) setVisibleColumnIds(JSON.parse(stored));
    } catch {
      // localStorage inaccesible (navegación privada, etc.) — se queda sin
      // columnas extra por defecto, no es un error crítico.
    }
  }, []);

  function updateVisibleColumns(ids: string[]) {
    setVisibleColumnIds(ids);
    try {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ver comentario arriba
    }
  }

  const visibleColumns = customFields.filter((f) => visibleColumnIds.includes(f.id));

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(clients.map((c) => c.id)) : new Set());
  }

  const allSelected = clients.length > 0 && selectedIds.size === clients.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const STATUS_LABEL: Record<ClientRow["status"], string> = {
    activo: tFilters("statusActive"),
    potencial: tFilters("statusPotential"),
    inactivo: tFilters("statusInactive"),
  };

  function formatVisit(iso: string | null) {
    if (!iso) return t("list.noVisit");
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (clients.length === 0) {
    const EmptyIcon = isFiltered ? SearchXIcon : UsersIcon;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-muted-foreground">
          <EmptyIcon className="size-6" />
        </div>
        <p className="font-medium">
          {isFiltered ? t("list.emptyFiltered") : t("list.emptyNoClients")}
        </p>
        {!isFiltered && (
          <p className="text-sm text-muted-foreground">{t("list.emptyHint")}</p>
        )}
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <BulkDeleteBar
          selectedIds={Array.from(selectedIds)}
          onDeleted={() => setSelectedIds(new Set())}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {customFields.length > 0 && (
        <div className="mb-2 hidden justify-end md:flex">
          <ColumnPicker
            customFields={customFields}
            visibleIds={visibleColumnIds}
            onChange={updateVisibleColumns}
          />
        </div>
      )}

      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <HeaderCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleAll}
                  ariaLabel={t("list.selectAll")}
                />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.company")} field="alfabetico" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.contact")} field="contacto" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.status")} field="estado" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.nextVisit")} field="proxima_visita" />
              </th>
              {visibleColumns.map((field) => (
                <th key={field.id} className="px-4 py-2.5 font-medium">
                  <SortableColumnHeader label={field.name} field={`custom:${field.id}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border transition-colors duration-150 hover:bg-accent/60"
              >
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={(e) => toggleOne(c.id, e.target.checked)}
                    aria-label={c.companyName}
                    className="size-4"
                  />
                </td>
                <td className="px-4 py-2">
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.companyName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {c.primaryContactName ? (
                    <span className="flex items-center gap-2">
                      <ContactAvatar name={c.primaryContactName} size={22} />
                      {c.primaryContactName}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <Badge className={STATUS_CLASS[c.status]} variant="secondary">
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatVisit(c.nextVisitAt)}
                </td>
                {visibleColumns.map((field) => (
                  <td key={field.id} className="px-4 py-2 text-muted-foreground">
                    {formatCustomValue(c.customFieldValues[field.id] ?? null, field, locale)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {clients.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={selectedIds.has(c.id)}
              onChange={(e) => toggleOne(c.id, e.target.checked)}
              aria-label={c.companyName}
              className="mt-4 size-4 shrink-0"
            />
            <Link
              href={`/clientes/${c.id}`}
              className="block flex-1 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors duration-150 hover:bg-accent/60"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{c.companyName}</span>
                <Badge className={STATUS_CLASS[c.status]} variant="secondary">
                  {STATUS_LABEL[c.status]}
                </Badge>
              </div>
              {c.primaryContactName ? (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ContactAvatar name={c.primaryContactName} size={18} />
                  {c.primaryContactName}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t("list.noContact")}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatVisit(c.nextVisitAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
