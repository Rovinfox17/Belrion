import { AppHeader } from "@/components/layout/app-header";
import { NotificationsToggle } from "@/components/settings/notifications-toggle";

export default function AjustesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAF1E4]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Ajustes</h1>

        <section className="flex flex-col gap-3 rounded-lg border border-black/5 bg-white p-4">
          <div>
            <h2 className="font-medium">Notificaciones de visitas</h2>
            <p className="text-sm text-muted-foreground">
              Recibe un aviso en este dispositivo con la antelación que definas al programar
              cada visita, aunque tengas la app cerrada.
            </p>
          </div>
          <NotificationsToggle />
        </section>
      </main>
    </div>
  );
}
