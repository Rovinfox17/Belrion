import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Aviso Legal · Belrion",
};

export default function AvisoLegalPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), "src/content/legal/aviso-legal.md"),
    "utf-8"
  );
  return <LegalPage markdown={markdown} />;
}
