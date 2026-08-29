"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UsersIcon,
  CalendarDaysIcon,
  Building2Icon,
  SettingsIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react";
import { logout } from "@/app/logout/actions";
import { Footer } from "@/components/layout/footer";

const NAV_ITEMS = [
  { href: "/", label: "Clientes", icon: UsersIcon },
  { href: "/calendario", label: "Calendario", icon: CalendarDaysIcon },
  { href: "/equipo", label: "Equipo", icon: Building2Icon },
  { href: "/ajustes", label: "Ajustes", icon: SettingsIcon },
];

function UserAvatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground"
      style={{ width: size, height: size }}
    >
      <UserIcon style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
}

export function AppShell({
  children,
  userName,
  userAvatarUrl,
}: {
  children: React.ReactNode;
  userName: string;
  userAvatarUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Image src="/logo.png" alt="Belrion" width={32} height={32} className="rounded-full" />
          <span className="font-heading text-lg font-semibold text-primary">Belrion</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link
            href="/ajustes"
            className="mb-1 flex items-center gap-2 rounded-md px-1 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <UserAvatar name={userName} avatarUrl={userAvatarUrl} size={28} />
            <span className="truncate">{userName}</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOutIcon className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Belrion" width={28} height={28} className="rounded-full" />
            <span className="font-heading text-base font-semibold text-primary">Belrion</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/ajustes" aria-label="Perfil">
              <UserAvatar name={userName} avatarUrl={userAvatarUrl} size={28} />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOutIcon className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <div className="pb-20 md:pb-0">
          <Footer />
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
