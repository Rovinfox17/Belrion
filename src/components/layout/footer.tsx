"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  const links = [
    { href: "/aviso-legal", label: t("legal") },
    { href: "/cookies", label: t("cookies") },
    { href: "/privacidad", label: t("privacy") },
  ];

  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span>{t("copyright", { year: new Date().getFullYear() })}</span>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
          {link.label}
        </Link>
      ))}
    </footer>
  );
}
