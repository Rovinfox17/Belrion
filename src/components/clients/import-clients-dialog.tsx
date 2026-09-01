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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  importClientsBatch,
  type ImportClientRow,
  type ImportRowResult,
} from "@/app/actions/import-clients";
import type { CustomFieldMeta } from "@/components/clients/client-list";

type Step = "upload" | "mapping" | "preview" | "importing";

type FieldKey =
  | "companyName"
  | "contactName"
  | "phone"
  | "email"
  | "address"
  | "locality"
  | "region"
  | "province"
  | "products"
  | "notes"
  | "status"
  | "ignore";

// El mapeo de cada columna puede apuntar a uno de los campos fijos o, si el
// usuario tiene campos personalizados, a uno de ellos (codificado como
// "custom:<id>" para poder representarlo con un simple string en el <Select>).
type ColumnTarget = FieldKey | `custom:${string}`;

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
  locality: ["poblacion", "ciudad", "localidad", "municipio", "town", "city", "poblacio", "municipi"],
  region: ["comarca", "region", "county"],
  province: ["provincia", "province"],
  products: ["producto", "productos", "product", "products", "producte", "productes", "productoscontratados"],
  notes: ["notas", "observaciones", "notes", "comments", "comentarios", "nota", "observacions"],
  status: ["estado", "status", "estat"],
};

const STATUS_SYNONYMS: Record<"activo" | "potencial" | "inactivo", string[]> = {
  activo: ["activo", "active", "actiu"],
  potencial: ["potencial", "potential", "prospecto", "prospect", "prospecte"],
  inactivo: ["inactivo", "inactive", "inactiu"],
};

const BOOLEAN_SYNONYMS: Record<"true" | "false", string[]> = {
  true: ["si", "yes", "true", "1", "verdadero"],
  false: ["no", "false", "0", "falso"],
};

function guessField(header: string, customFields: CustomFieldMeta[]): ColumnTarget {
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
  for (const field of customFields) {
    const fieldNorm = normalize(field.name);
    if (fieldNorm && (norm === fieldNorm || norm.includes(fieldNorm) || fieldNorm.includes(norm))) {
      return `custom:${field.id}`;
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

/** Excel cuenta los días como número de serie desde el 30/12/1899 (con el
 * conocido "bug" del año bisiesto 1900 ya integrado en ese punto de
 * partida) — así llega la celda cuando Excel la formatea como fecha nativa
 * en vez de como texto. */
function parseExcelSerialDate(serial: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000);
}

/** Interpreta el texto de una celda como fecha sin la ambigüedad de
 * `new Date(texto)`: ese constructor asume formato americano MM/DD/AAAA
 * para cadenas con barras, así que "10/01/2027" (10 de enero para
 * cualquier hispanohablante) se leía como 1 de octubre, y solo fallaba de
 * forma visible cuando el día no podía ser un mes válido (>12) — el resto
 * de fechas se guardaban con el día y el mes intercambiados en silencio. */
function parseDateValue(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial > 0 && serial < 100000) {
      const date = parseExcelSerialDate(serial);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(Date.UTC(year, month, day));
    const valid =
      date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day;
    return valid ? date : null;
  }

  // Cualquier otro formato (ISO "AAAA-MM-DD", cadenas ya inequívocas...).
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Convierte y valida el valor de una celda para un campo personalizado
 * según su tipo. Si no es válido, devuelve un aviso en vez de un valor. */
function resolveCustomValue(
  raw: string,
  field: CustomFieldMeta
): { value: string } | { warning: "invalidNumber" | "invalidDate" | "noMatch" | "invalidBoolean" } | null {
  if (!raw) return null;

  switch (field.fieldType) {
    case "numero": {
      const num = Number(raw.replace(",", "."));
      if (!Number.isFinite(num)) return { warning: "invalidNumber" };
      return { value: String(num) };
    }
    case "fecha": {
      const date = parseDateValue(raw);
      if (!date) return { warning: "invalidDate" };
      return { value: date.toISOString().slice(0, 10) };
    }
    case "lista": {
      const norm = normalize(raw);
      const match = (field.options ?? []).find((o) => normalize(o) === norm);
      if (!match) return { warning: "noMatch" };
      return { value: match };
    }
    case "booleano": {
      const norm = normalize(raw);
      if (BOOLEAN_SYNONYMS.true.includes(norm)) return { value: "true" };
      if (BOOLEAN_SYNONYMS.false.includes(norm)) return { value: "false" };
      return { warning: "invalidBoolean" };
    }
    default:
      return { value: raw };
  }
}

export function ImportClientsDialog({ customFields }: { customFields: CustomFieldMeta[] }) {
  const t = useTranslations("clients.import");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [parseError, setParseError] = useState<string | null>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ColumnTarget>>({});

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

      const initialMapping: Record<number, ColumnTarget> = {};
      fileHeaders.forEach((header, index) => {
        initialMapping[index] = guessField(header, customFields);
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

  function setColumnField(columnIndex: number, field: ColumnTarget) {
    setMapping((prev) => ({ ...prev, [columnIndex]: field }));
  }

  function fieldColumnIndex(field: ColumnTarget): number | null {
    const entry = Object.entries(mapping).find(([, f]) => f === field);
    return entry ? Number(entry[0]) : null;
  }

  const companyColumnIndex = fieldColumnIndex("companyName");
  const addressColumnIndex = fieldColumnIndex("address");

  const mappedCustomFields = customFields.filter(
    (f) => fieldColumnIndex(`custom:${f.id}`) !== null
  );

  function buildRow(
    rowIndex: number,
    cells: unknown[]
  ): { row: ImportClientRow | null; warnings: { field: string; reason: string }[] } {
    function value(field: ColumnTarget): string {
      const colIndex = fieldColumnIndex(field);
      return colIndex === null ? "" : cellToString(cells[colIndex]);
    }

    const companyName = value("companyName");
    if (!companyName) return { row: null, warnings: [] };

    const productsRaw = value("products");

    const customFieldValues: { fieldId: string; value: string }[] = [];
    const warnings: { field: string; reason: string }[] = [];
    for (const field of mappedCustomFields) {
      const raw = value(`custom:${field.id}`);
      const resolved = resolveCustomValue(raw, field);
      if (!resolved) continue;
      if ("value" in resolved) {
        customFieldValues.push({ fieldId: field.id, value: resolved.value });
      } else {
        warnings.push({
          field: field.name,
          reason: t(`importing.warning${capitalize(resolved.warning)}`, { value: raw }),
        });
      }
    }

    return {
      row: {
        rowIndex,
        companyName,
        contactName: value("contactName") || null,
        phone: value("phone") || null,
        email: value("email") || null,
        address: value("address") || null,
        locality: value("locality") || null,
        region: value("region") || null,
        province: value("province") || null,
        notes: value("notes") || null,
        products: productsRaw
          ? productsRaw.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)
          : [],
        status: normalizeStatusValue(value("status")),
        customFieldValues,
      },
      warnings,
    };
  }

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const allRows = dataRows.map((cells, i) => {
    const { row, warnings } = buildRow(i + 2, cells);
    return { rowIndex: i + 2, row, warnings };
  });
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

    const warningsByRow = new Map(allRows.map((r) => [r.rowIndex, r.warnings]));

    const validRows = allRows
      .map((r) => r.row)
      .filter((r): r is ImportClientRow => r !== null);

    const allResults: ImportRowResult[] = [...missingCompany];
    setResults(allResults);
    setProgressDone(missingCompany.length);

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const { results: batchResults } = await importClientsBatch(batch);
      const withWarnings = batchResults.map((r) => ({
        ...r,
        warnings: warningsByRow.get(r.rowIndex) ?? [],
      }));
      allResults.push(...withWarnings);
      setResults([...allResults]);
      setProgressDone((prev) => prev + batch.length);
    }

    router.refresh();
  }

  const totalRows = allRows.length;
  const successCount = results.filter((r) => r.success).length;
  const failedResults = results.filter((r) => !r.success);
  const warnedResults = results.filter((r) => r.success && r.warnings && r.warnings.length > 0);
  const isImporting = step === "importing" && progressDone < totalRows;

  const FIELD_OPTIONS: { value: ColumnTarget; label: string }[] = [
    { value: "ignore", label: t("mapping.ignore") },
    { value: "companyName", label: `${t("mapping.fieldCompanyName")} (${t("mapping.required")})` },
    { value: "contactName", label: t("mapping.fieldContactName") },
    { value: "phone", label: t("mapping.fieldPhone") },
    { value: "email", label: t("mapping.fieldEmail") },
    { value: "address", label: t("mapping.fieldAddress") },
    { value: "locality", label: t("mapping.fieldLocality") },
    { value: "region", label: t("mapping.fieldRegion") },
    { value: "province", label: t("mapping.fieldProvince") },
    { value: "products", label: t("mapping.fieldProducts") },
    { value: "notes", label: t("mapping.fieldNotes") },
    { value: "status", label: t("mapping.fieldStatus") },
    ...customFields.map((f) => ({ value: `custom:${f.id}` as ColumnTarget, label: f.name })),
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
                    onValueChange={(v) => setColumnField(index, (v ?? "ignore") as ColumnTarget)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.filter((o) => !o.value.startsWith("custom:")).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      {customFields.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>{t("mapping.customFieldsGroup")}</SelectLabel>
                          {customFields.map((f) => (
                            <SelectItem key={f.id} value={`custom:${f.id}`}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
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
            {addressColumnIndex !== null && (
              <p className="rounded-md border border-border bg-accent/40 p-2.5 text-sm text-muted-foreground">
                {t("mapping.addressHelp")}
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
                    {mappedCustomFields.map((f) => (
                      <th key={f.id} className="px-3 py-2 font-medium">
                        {f.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(({ rowIndex, row }) => (
                    <tr key={rowIndex} className="border-t border-border">
                      <td className="px-3 py-2">{row?.companyName ?? "—"}</td>
                      <td className="px-3 py-2">{row?.contactName ?? "—"}</td>
                      <td className="px-3 py-2">{row?.status ?? "—"}</td>
                      <td className="px-3 py-2">{row?.products.join(", ") || "—"}</td>
                      {mappedCustomFields.map((f) => (
                        <td key={f.id} className="px-3 py-2">
                          {row?.customFieldValues.find((v) => v.fieldId === f.id)?.value ?? "—"}
                        </td>
                      ))}
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
                {warnedResults.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-amber-700">
                      {t("importing.summaryWarnings", { count: warnedResults.length })}
                    </p>
                    <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2 text-xs text-muted-foreground">
                      {warnedResults.map((r) =>
                        (r.warnings ?? []).map((w, i) => (
                          <li key={`${r.rowIndex}-${i}`}>
                            {t("importing.warningRow", {
                              row: r.rowIndex,
                              company: r.companyName || "—",
                              field: w.field,
                              reason: w.reason,
                            })}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
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
                {allRows.some((r) => r.row?.address) && (
                  <p className="text-xs text-muted-foreground">{t("importing.geocodingNote")}</p>
                )}
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
