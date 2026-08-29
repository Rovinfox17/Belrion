import { NotificationsToggle } from "@/components/settings/notifications-toggle";

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
    </div>
  );
}
