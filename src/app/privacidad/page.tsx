import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("titlePrivacy") };
}

export default async function PrivacidadPage() {
  const locale = await getLocale();
  const markdown = fs.readFileSync(
    path.join(process.cwd(), `src/content/legal/${locale}/politica-privacidad.md`),
    "utf-8"
  );
  return <LegalPage markdown={markdown} />;
}
