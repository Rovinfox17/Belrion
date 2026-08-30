import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SearchXIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/clients/contact-avatar";
import { SortableColumnHeader } from "@/components/clients/sortable-column-header";

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
  inactivo: "bg-rose-100 text-rose-700 hover:bg-rose-100",
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
    const EmptyIcon = isFiltered ? SearchXIcon : UsersIcon;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-accent text-muted-foreground">
          <EmptyIcon className="size-6" />
        </div>
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
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.company")} field="alfabetico" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.contact")} field="contacto" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.status")} field="estado" />
              </th>
              <th className="px-4 py-2.5 font-medium">
                <SortableColumnHeader label={t("list.nextVisit")} field="proxima_visita" />
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border transition-colors duration-150 hover:bg-accent/60"
              >
                <td className="px-4 py-2">
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.companyName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {c.primaryContactName ? (
                    <span className="flex items-center gap-2">
                      <ContactAvatar name={c.primaryContactName} size={22} />
                      {c.primaryContactName}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <Badge className={STATUS_CLASS[c.status]} variant="secondary">
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
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
              className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors duration-150 hover:bg-accent/60"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{c.companyName}</span>
                <Badge className={STATUS_CLASS[c.status]} variant="secondary">
                  {STATUS_LABEL[c.status]}
                </Badge>
              </div>
              {c.primaryContactName ? (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ContactAvatar name={c.primaryContactName} size={18} />
                  {c.primaryContactName}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t("list.noContact")}</p>
              )}
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
