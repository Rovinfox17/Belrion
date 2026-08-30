"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UploadIcon, Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importClientsBatch, type ImportClientRow, type ImportRowResult } from "@/app/actions/import-clients";

type Step = "upload" | "mapping" | "preview" | "importing";

type FieldKey =
  | "companyName"
  | "contactName"
  | "phone"
  | "email"
  | "address"
  | "products"
  | "notes"
  | "status"
  | "ignore";

const BATCH_SIZE = 20;
const PREVIEW_ROWS = 10;

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const FIELD_SYNONYMS: Record<Exclude<FieldKey, "ignore">, string[]> = {
  companyName: [
    "empresa", "nombreempresa", "nombredelaempresa", "company", "companyname",
    "razonsocial", "nomempresa", "nomdelempresa",
  ],
  contactName: [
    "contacto", "nombrecontacto", "personadecontacto", "contact", "contactname",
    "contacte", "persona", "personadecontacte",
  ],
  phone: ["telefono", "tel", "phone", "numerodetelefono", "telefon", "movil", "mobil", "celular"],
  email: ["email", "correo", "correoelectronico", "mail"],
  address: ["direccion", "domicilio", "address", "adreca"],
  products: ["producto", "productos", "product", "products", "producte", "productes", "productoscontratados"],
  notes: ["notas", "observaciones", "notes", "comments", "comentarios", "nota", "observacions"],
  status: ["estado", "status", "estat"],
};

const STATUS_SYNONYMS: Record<"activo" | "potencial" | "inactivo", string[]> = {
  activo: ["activo", "active", "actiu"],
  potencial: ["potencial", "potential", "prospecto", "prospect", "prospecte"],
  inactivo: ["inactivo", "inactive", "inactiu"],
};

function guessField(header: string): FieldKey {
  const norm = normalize(header);
  if (!norm) return "ignore";
  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS) as [
    Exclude<FieldKey, "ignore">,
    string[],
  ][]) {
    if (synonyms.some((s) => norm === s || norm.includes(s) || s.includes(norm))) {
      return field;
    }
  }
  return "ignore";
}

function normalizeStatusValue(raw: string): "activo" | "potencial" | "inactivo" {
  const norm = normalize(raw);
  for (const [status, synonyms] of Object.entries(STATUS_SYNONYMS) as [
    "activo" | "potencial" | "inactivo",
    string[],
  ][]) {
    if (synonyms.some((s) => norm === s)) return status;
  }
  return "potencial";
}

function cellToString(cell: unknown): string {
  return String(cell ?? "").trim();
}

export function ImportClientsDialog() {
  const t = useTranslations("clients.import");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [parseError, setParseError] = useState<string | null>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});

  const [progressDone, setProgressDone] = useState(0);
  const [results, setResults] = useState<ImportRowResult[]>([]);

  function reset() {
    setStep("upload");
    setParseError(null);
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setProgressDone(0);
    setResults([]);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParseError(null);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

      const fileHeaders = (raw[0] ?? []).map((h) => cellToString(h));
      const rows = raw
        .slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => cellToString(cell) !== ""));

      if (fileHeaders.length === 0 || rows.length === 0) {
        setParseError(t("upload.emptyFile"));
        return;
      }

      const initialMapping: Record<number, FieldKey> = {};
      fileHeaders.forEach((header, index) => {
        initialMapping[index] = guessField(header);
      });

      setHeaders(fileHeaders);
      setDataRows(rows);
      setMapping(initialMapping);
      setStep("mapping");
    } catch (err) {
      console.error("import file parse failed", err);
      setParseError(t("upload.parseError"));
    }
  }

  function setColumnField(columnIndex: number, field: FieldKey) {
    setMapping((prev) => ({ ...prev, [columnIndex]: field }));
  }

  function fieldColumnIndex(field: FieldKey): number | null {
    const entry = Object.entries(mapping).find(([, f]) => f === field);
    return entry ? Number(entry[0]) : null;
  }

  const companyColumnIndex = fieldColumnIndex("companyName");

  function buildRow(rowIndex: number, cells: unknown[]): ImportClientRow | null {
    function value(field: FieldKey): string {
      const colIndex = fieldColumnIndex(field);
      return colIndex === null ? "" : cellToString(cells[colIndex]);
    }

    const companyName = value("companyName");
    if (!companyName) return null;

    const productsRaw = value("products");

    return {
      rowIndex,
      companyName,
      contactName: value("contactName") || null,
      phone: value("phone") || null,
      email: value("email") || null,
      address: value("address") || null,
      notes: value("notes") || null,
      products: productsRaw
        ? productsRaw.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)
        : [],
      status: normalizeStatusValue(value("status")),
    };
  }

  const allRows = dataRows.map((cells, i) => ({ rowIndex: i + 2, row: buildRow(i + 2, cells) }));
  const previewRows = allRows.slice(0, PREVIEW_ROWS);

  async function handleImport() {
    setStep("importing");
    setProgressDone(0);
    setResults([]);

    const missingCompany = allRows
      .filter((r) => r.row === null)
      .map((r) => ({
        rowIndex: r.rowIndex,
        companyName: "",
        success: false as const,
        error: t("importing.missingCompanyName"),
      }));

    const validRows = allRows
      .map((r) => r.row)
      .filter((r): r is ImportClientRow => r !== null);

    const allResults: ImportRowResult[] = [...missingCompany];
    setResults(allResults);
    setProgressDone(missingCompany.length);

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const { results: batchResults } = await importClientsBatch(batch);
      allResults.push(...batchResults);
      setResults([...allResults]);
      setProgressDone((prev) => prev + batch.length);
    }

    router.refresh();
  }

  const totalRows = allRows.length;
  const successCount = results.filter((r) => r.success).length;
  const failedResults = results.filter((r) => !r.success);
  const isImporting = step === "importing" && progressDone < totalRows;

  const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
    { value: "ignore", label: t("mapping.ignore") },
    { value: "companyName", label: `${t("mapping.fieldCompanyName")} (${t("mapping.required")})` },
    { value: "contactName", label: t("mapping.fieldContactName") },
    { value: "phone", label: t("mapping.fieldPhone") },
    { value: "email", label: t("mapping.fieldEmail") },
    { value: "address", label: t("mapping.fieldAddress") },
    { value: "products", label: t("mapping.fieldProducts") },
    { value: "notes", label: t("mapping.fieldNotes") },
    { value: "status", label: t("mapping.fieldStatus") },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <UploadIcon />
            {t("trigger")}
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t("upload.instructions")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-fit">
              <UploadIcon />
              {t("upload.selectFile")}
            </Button>
            {parseError && (
              <p className="text-sm text-destructive" role="alert">
                {parseError}
              </p>
            )}
          </div>
        )}

        {step === "mapping" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">{t("mapping.title")}</p>
              <p className="text-sm text-muted-foreground">{t("mapping.instructions")}</p>
            </div>
            <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-1/3 truncate text-sm font-medium" title={header}>
                    {header || `#${index + 1}`}
                  </span>
                  <Select
                    items={FIELD_OPTIONS}
                    value={mapping[index] ?? "ignore"}
                    onValueChange={(v) => setColumnField(index, (v ?? "ignore") as FieldKey)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {companyColumnIndex === null && (
              <p className="text-sm text-destructive" role="alert">
                {t("mapping.companyNameMissing")}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep("upload")}>
                {t("mapping.back")}
              </Button>
              <Button
                type="button"
                disabled={companyColumnIndex === null}
                onClick={() => setStep("preview")}
              >
                {t("mapping.next")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-medium">{t("preview.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("preview.rowsShown", { shown: previewRows.length, total: totalRows })}
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-accent">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("mapping.fieldCompanyName")}</th>
                    <th className="px-3 py-2 font-medium">{t("mapping.fieldContactName")}</th>
                    <th className="px-3 py-2 font-medium">{t("mapping.fieldStatus")}</th>
                    <th className="px-3 py-2 font-medium">{t("mapping.fieldProducts")}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(({ rowIndex, row }) => (
                    <tr key={rowIndex} className="border-t border-border">
                      <td className="px-3 py-2">{row?.companyName ?? "—"}</td>
                      <td className="px-3 py-2">{row?.contactName ?? "—"}</td>
                      <td className="px-3 py-2">{row?.status ?? "—"}</td>
                      <td className="px-3 py-2">{row?.products.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep("mapping")}>
                {t("preview.back")}
              </Button>
              <Button type="button" onClick={handleImport}>
                {t("preview.import", { count: totalRows })}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col gap-4">
            {isImporting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {t("importing.progress", { done: progressDone, total: totalRows })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="font-medium">{t("importing.summaryTitle")}</p>
                <p className="text-sm">{t("importing.summarySuccess", { count: successCount })}</p>
                {failedResults.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-destructive">
                      {t("importing.summaryFailed", { count: failedResults.length })}
                    </p>
                    <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2 text-xs text-muted-foreground">
                      {failedResults.map((r) => (
                        <li key={r.rowIndex}>
                          {t("importing.failedRow", {
                            row: r.rowIndex,
                            company: r.companyName || "—",
                            error: r.error ?? "",
                          })}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t("importing.duplicatesNote")}</p>
                <DialogFooter>
                  <Button type="button" onClick={() => handleOpenChange(false)}>
                    {t("importing.close")}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
