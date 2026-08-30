import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "@/components/settings/profile-section";
import { LocaleSwitcherButtons } from "@/components/language/locale-switcher";
import { NotificationsToggle } from "@/components/settings/notifications-toggle";
import { ChatNotificationsToggle } from "@/components/settings/chat-notifications-toggle";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const t = await getTranslations("settings");
  const tFooter = await getTranslations("footer");

  let chatNotificationsEnabled = true;
  if (user) {
    const { data: preference } = await supabase
      .from("user_notification_preferences")
      .select("chat_notifications")
      .eq("user_id", user.id)
      .maybeSingle();
    if (preference) chatNotificationsEnabled = preference.chat_notifications;
  }

  const legalLinks = [
    { href: "/aviso-legal", label: tFooter("legal") },
    { href: "/privacidad", label: tFooter("privacy") },
    { href: "/cookies", label: tFooter("cookies") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>

      {user && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="font-medium">{t("profile.title")}</h2>
          <ProfileSection
            userId={user.id}
            initialName={metadata.full_name ?? ""}
            initialAvatarUrl={metadata.avatar_url ?? null}
          />
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="font-medium">{t("language.title")}</h2>
        <LocaleSwitcherButtons />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="font-medium">{t("notifications.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("notifications.description")}</p>
        </div>
        <NotificationsToggle />
        <ChatNotificationsToggle initialEnabled={chatNotificationsEnabled} />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="font-medium">{t("password.title")}</h2>
        <ChangePasswordSection />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="font-medium">{t("data.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("data.description")}</p>
        </div>
        <ExportDataButton />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-4 shadow-sm">
        <h2 className="font-medium text-destructive">{t("deleteAccount.title")}</h2>
        <DeleteAccountSection />
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="font-medium">{t("legal.title")}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-primary hover:underline">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
