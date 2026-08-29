import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidad · Belrion",
};

export default function PrivacidadPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), "src/content/legal/politica-privacidad.md"),
    "utf-8"
  );
  return <LegalPage markdown={markdown} />;
}
