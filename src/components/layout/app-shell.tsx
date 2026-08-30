"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HomeIcon,
  UsersIcon,
  CalendarDaysIcon,
  Building2Icon,
  SettingsIcon,
  LogOutIcon,
  UserIcon,
  SearchIcon,
  MessageSquareIcon,
  ShieldIcon,
} from "lucide-react";
import { logout } from "@/app/logout/actions";
import { Footer } from "@/components/layout/footer";
import { GlobalSearchDialog } from "@/components/search/global-search-dialog";

const BASE_NAV_ITEMS = [
  { href: "/inicio", key: "dashboard" as const, icon: HomeIcon },
  { href: "/", key: "clients" as const, icon: UsersIcon },
  { href: "/calendario", key: "calendar" as const, icon: CalendarDaysIcon },
  { href: "/equipo", key: "team" as const, icon: Building2Icon },
  { href: "/feedback", key: "feedback" as const, icon: MessageSquareIcon },
  { href: "/ajustes", key: "settings" as const, icon: SettingsIcon },
];

const ADMIN_NAV_ITEM = { href: "/admin", key: "admin" as const, icon: ShieldIcon };

function UserAvatar({
  avatarUrl,
  size,
}: {
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
  isAdmin,
}: {
  children: React.ReactNode;
  userName: string;
  userAvatarUrl: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tSearch = useTranslations("search");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const navItems = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <Image src="/logo.png" alt="Belrion" width={32} height={32} className="rounded-full" />
          <span className="font-heading text-lg font-semibold text-sidebar-primary">
            Belrion
          </span>
        </div>
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <SearchIcon className="size-3.5" />
            <span className="flex-1 text-left">{tSearch("trigger")}</span>
            <kbd className="rounded border border-sidebar-border px-1.5 py-0.5 font-sans text-xs">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/ajustes"
            className="mb-1 flex items-center gap-2 rounded-md px-1 py-1.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <UserAvatar avatarUrl={userAvatarUrl} size={28} />
            <span className="truncate">{userName}</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOutIcon className="size-4" />
              {t("logout")}
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
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={tSearch("trigger")}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <SearchIcon className="size-4" />
            </button>
            <Link href="/ajustes" aria-label={t("profile")}>
              <UserAvatar avatarUrl={userAvatarUrl} size={28} />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label={t("logout")}
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
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active ? "text-sidebar-primary" : "text-sidebar-foreground"
                }`}
              >
                <Icon className="size-5" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
