import Link from "next/link";

const LINKS = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/cookies", label: "Cookies" },
  { href: "/privacidad", label: "Privacidad" },
];

export function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} Belrion</span>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
          {link.label}
        </Link>
      ))}
    </footer>
  );
}
