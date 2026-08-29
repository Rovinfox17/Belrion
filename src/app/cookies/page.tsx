import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de Cookies · Belrion",
};

export default function CookiesPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), "src/content/legal/politica-cookies.md"),
    "utf-8"
  );
  return <LegalPage markdown={markdown} />;
}
