"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/logout/actions";

const NAV_ITEMS = [
  { href: "/", label: "Clientes" },
  { href: "/calendario", label: "Calendario" },
  { href: "/ajustes", label: "Ajustes" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Belrion" width={32} height={32} className="rounded-full" />
          <span className="text-lg font-semibold text-[#BE5B2E]">Belrion</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-[#BE5B2E]/10 text-[#BE5B2E]"
                  : "text-muted-foreground hover:bg-black/[.03]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
