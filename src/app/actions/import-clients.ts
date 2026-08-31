"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type ClientStatus = "activo" | "potencial" | "inactivo";

export type ImportClientRow = {
  rowIndex: number;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  products: string[];
  status: ClientStatus;
  customFieldValues: { fieldId: string; value: string }[];
};

export type ImportRowResult = {
  rowIndex: number;
  companyName: string;
  success: boolean;
  error?: string;
  warnings?: { field: string; reason: string }[];
};

export async function importClientsBatch(
  rows: ImportClientRow[]
): Promise<{ results: ImportRowResult[] }> {
  const t = await getTranslations("clients.import.errors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const tErrors = await getTranslations("errors");
    return {
      results: rows.map((row) => ({
        rowIndex: row.rowIndex,
        companyName: row.companyName,
        success: false,
        error: tErrors("notAuthenticated"),
      })),
    };
  }

  // Secuencial, y el id se genera aquí en vez de pedirlo de vuelta con
  // .select(): un INSERT ... RETURNING bajo RLS también exige que la fila
  // nueva pase la política de SELECT, y la de "clients" se apoya en una
  // función que vuelve a consultar la propia tabla — para una fila creada
  // en la misma sentencia, Postgres no la da por visible todavía y el
  // insert se rechaza aunque el usuario sea el dueño legítimo.
  const results: ImportRowResult[] = [];
  for (const row of rows) {
    const clientId = randomUUID();
    const { error: clientError } = await supabase.from("clients").insert({
      id: clientId,
      company_name: row.companyName,
      status: row.status,
      address: row.address || null,
      notes: row.notes || null,
      user_id: user.id,
    });

    if (clientError) {
      console.error("import row failed", row.rowIndex, clientError);
      results.push({
        rowIndex: row.rowIndex,
        companyName: row.companyName,
        success: false,
        error: t("createFailed"),
      });
      continue;
    }

    if (row.contactName) {
      const { error: contactError } = await supabase.from("contacts").insert({
        client_id: clientId,
        name: row.contactName,
        phone: row.phone || null,
        email: row.email || null,
        is_primary: true,
      });
      if (contactError) console.error("import row contact failed", row.rowIndex, contactError);
    }

    if (row.products.length > 0) {
      const { error: productsError } = await supabase
        .from("products")
        .insert(row.products.map((name) => ({ client_id: clientId, name })));
      if (productsError) console.error("import row products failed", row.rowIndex, productsError);
    }

    if (row.customFieldValues.length > 0) {
      const { error: customFieldsError } = await supabase.from("custom_field_values").insert(
        row.customFieldValues.map((v) => ({
          client_id: clientId,
          field_id: v.fieldId,
          value: v.value,
        }))
      );
      if (customFieldsError) {
        console.error("import row custom fields failed", row.rowIndex, customFieldsError);
      }
    }

    results.push({ rowIndex: row.rowIndex, companyName: row.companyName, success: true });
  }

  revalidatePath("/");
  return { results };
}
