import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

export type ClientRow = {
  id: string;
  companyName: string;
  status: "activo" | "potencial" | "inactivo";
  primaryContactName: string | null;
  nextVisitAt: string | null;
};

const STATUS_CLASS: Record<ClientRow["status"], string> = {
  activo: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  potencial: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  inactivo: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
};

export async function ClientList({
  clients,
  isFiltered,
}: {
  clients: ClientRow[];
  isFiltered: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations("clients");
  const tFilters = await getTranslations("clients.filters");

  const STATUS_LABEL: Record<ClientRow["status"], string> = {
    activo: tFilters("statusActive"),
    potencial: tFilters("statusPotential"),
    inactivo: tFilters("statusInactive"),
  };

  function formatVisit(iso: string | null) {
    if (!iso) return t("list.noVisit");
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
        <p className="font-medium">
          {isFiltered ? t("list.emptyFiltered") : t("list.emptyNoClients")}
        </p>
        {!isFiltered && (
          <p className="text-sm text-muted-foreground">{t("list.emptyHint")}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("list.company")}</th>
              <th className="px-4 py-3 font-medium">{t("list.contact")}</th>
              <th className="px-4 py-3 font-medium">{t("list.status")}</th>
              <th className="px-4 py-3 font-medium">{t("list.nextVisit")}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-accent">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.companyName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.primaryContactName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_CLASS[c.status]} variant="secondary">
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatVisit(c.nextVisitAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {clients.map((c) => (
          <li key={c.id}>
            <Link
              href={`/clientes/${c.id}`}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{c.companyName}</span>
                <Badge className={STATUS_CLASS[c.status]} variant="secondary">
                  {STATUS_LABEL[c.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.primaryContactName ?? t("list.noContact")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatVisit(c.nextVisitAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
