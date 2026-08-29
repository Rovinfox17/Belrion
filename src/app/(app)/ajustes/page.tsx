import { NotificationsToggle } from "@/components/settings/notifications-toggle";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";

export default function AjustesPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">Ajustes</h1>

      <section className="flex flex-col gap-3 rounded-lg border border-black/5 bg-card p-4">
        <div>
          <h2 className="font-medium">Notificaciones de visitas</h2>
          <p className="text-sm text-muted-foreground">
            Recibe un aviso en este dispositivo con la antelación que definas al programar
            cada visita, aunque tengas la app cerrada.
          </p>
        </div>
        <NotificationsToggle />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-black/5 bg-card p-4">
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
    </div>
  );
}
