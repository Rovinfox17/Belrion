import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientList, type ClientRow } from "@/components/clients/client-list";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { Button } from "@/components/ui/button";
import { logout } from "./logout/actions";

type RawClient = {
  id: string;
  company_name: string;
  status: "activo" | "potencial" | "inactivo";
  created_at: string;
  contacts: { id: string; name: string; is_primary: boolean }[];
  products: { id: string; name: string }[];
  visits: { id: string; scheduled_at: string; status: string }[];
};

function nextVisit(c: RawClient, now: number) {
  const upcoming = c.visits
    .filter((v) => v.status === "pendiente" && new Date(v.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  return upcoming[0]?.scheduled_at ?? null;
}

function lastVisit(c: RawClient) {
  const past = c.visits
    .filter((v) => v.status === "completada")
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return past[0]?.scheduled_at ?? null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, company_name, status, created_at, contacts(id, name, is_primary), products(id, name), visits(id, scheduled_at, status)"
    );

  const clients = (data ?? []) as unknown as RawClient[];
  const now = Date.now();

  const allProducts = Array.from(
    new Set(clients.flatMap((c) => c.products.map((p) => p.name)))
  ).sort((a, b) => a.localeCompare(b));

  const q = (params.q ?? "").trim().toLowerCase();
  const status = params.status;
  const product = params.product;
  const upcomingOnly = params.upcoming === "true";
  const sort = params.sort ?? "alfabetico";

  const filtered = clients.filter((c) => {
    if (status && status !== "all" && c.status !== status) return false;
    if (product && product !== "all" && !c.products.some((p) => p.name === product)) {
      return false;
    }
    if (upcomingOnly && !nextVisit(c, now)) return false;
    if (q) {
      const matchesCompany = c.company_name.toLowerCase().includes(q);
      const matchesContact = c.contacts.some((ct) => ct.name.toLowerCase().includes(q));
      if (!matchesCompany && !matchesContact) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "fecha_alta":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "proxima_visita": {
        const av = nextVisit(a, now);
        const bv = nextVisit(b, now);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return new Date(av).getTime() - new Date(bv).getTime();
      }
      case "ultima_visita": {
        const av = lastVisit(a);
        const bv = lastVisit(b);
        if (!av && !bv) return 0;
        if (!av) return 1;
        if (!bv) return -1;
        return new Date(bv).getTime() - new Date(av).getTime();
      }
      default:
        return a.company_name.localeCompare(b.company_name);
    }
  });

  const rows: ClientRow[] = sorted.map((c) => ({
    id: c.id,
    companyName: c.company_name,
    status: c.status,
    primaryContactName: c.contacts.find((ct) => ct.is_primary)?.name ?? c.contacts[0]?.name ?? null,
    nextVisitAt: nextVisit(c, now),
  }));

  const isFiltered = Boolean(q || status || product || upcomingOnly);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF1E4]">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Belrion" width={32} height={32} className="rounded-full" />
          <span className="text-lg font-semibold text-[#BE5B2E]">Belrion</span>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold">Clientes</h1>
          <NewClientDialog />
        </div>

        <ClientFilters products={allProducts} />

        {error && (
          <p className="text-sm text-destructive">No se pudieron cargar los clientes.</p>
        )}

        <ClientList clients={rows} isFiltered={isFiltered} />
      </main>
    </div>
  );
}
