import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "@/components/settings/profile-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { NotificationsToggle } from "@/components/settings/notifications-toggle";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";

const LEGAL_LINKS = [
  { href: "/aviso-legal", label: "Aviso Legal" },
  { href: "/privacidad", label: "Política de Privacidad" },
  { href: "/cookies", label: "Política de Cookies" },
];

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">Ajustes</h1>

      {user && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h2 className="font-medium">Perfil</h2>
          <ProfileSection
            userId={user.id}
            initialName={metadata.full_name ?? ""}
            initialAvatarUrl={metadata.avatar_url ?? null}
          />
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">Apariencia</h2>
        <AppearanceSection />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="font-medium">Notificaciones de visitas</h2>
          <p className="text-sm text-muted-foreground">
            Recibe un aviso en este dispositivo con la antelación que definas al programar
            cada visita, aunque tengas la app cerrada.
          </p>
        </div>
        <NotificationsToggle />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">Cambiar contraseña</h2>
        <ChangePasswordSection />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="font-medium">Tus datos</h2>
          <p className="text-sm text-muted-foreground">
            Descarga una copia de todos los clientes, contactos, productos, visitas y
            comentarios que has creado, en un archivo JSON.
          </p>
        </div>
        <ExportDataButton />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-card p-4">
        <h2 className="font-medium text-destructive">Eliminar cuenta</h2>
        <DeleteAccountSection />
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium">Legal</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-primary hover:underline">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
