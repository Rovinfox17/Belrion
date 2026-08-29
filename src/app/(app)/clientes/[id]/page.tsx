import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { AddressMapLink } from "@/components/clients/address-map-link";
import { ContactsSection, type Contact } from "@/components/clients/contacts-section";
import { ProductsSection, type Product } from "@/components/clients/products-section";
import { VisitsHistory, type VisitWithComments } from "@/components/clients/visits-history";

type Status = "activo" | "potencial" | "inactivo";

const STATUS_LABEL: Record<Status, string> = {
  activo: "Activo",
  potencial: "Potencial",
  inactivo: "Inactivo",
};

const STATUS_CLASS: Record<Status, string> = {
  activo: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  potencial: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  inactivo: "bg-zinc-100 text-zinc-600 hover:bg-zinc-100",
};

type RawClientDetail = {
  id: string;
  company_name: string;
  status: Status;
  address: string | null;
  notes: string | null;
  contacts: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: string | null;
    is_primary: boolean;
  }[];
  products: { id: string; name: string; details: string | null }[];
  visits: {
    id: string;
    scheduled_at: string;
    status: "pendiente" | "completada" | "cancelada";
    visit_comments: { id: string; comment: string; created_at: string }[];
  }[];
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("clients")
    .select(
      "id, company_name, status, address, notes, contacts(id, name, phone, email, role, is_primary), products(id, name, details), visits(id, scheduled_at, status, visit_comments(id, comment, created_at))"
    )
    .eq("id", id)
    .single();

  const client = data as unknown as RawClientDetail | null;

  if (!client) notFound();

  const contacts: Contact[] = (client.contacts ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      role: c.role,
      isPrimary: c.is_primary,
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const products: Product[] = (client.products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    details: p.details,
  }));

  const visits: VisitWithComments[] = (client.visits ?? [])
    .map((v) => ({
      id: v.id,
      scheduledAt: v.scheduled_at,
      status: v.status,
      comments: (v.visit_comments ?? [])
        .map((c) => ({ id: c.id, comment: c.comment, createdAt: c.created_at }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver a clientes
      </Link>

      <div className="flex flex-col gap-3 rounded-lg border border-black/5 bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold text-primary">
              {client.company_name}
            </h1>
            <Badge className={STATUS_CLASS[client.status]} variant="secondary">
              {STATUS_LABEL[client.status]}
            </Badge>
          </div>
          {client.address && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{client.address}</p>
              <AddressMapLink address={client.address} />
            </div>
          )}
          {client.notes && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {client.notes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <EditClientDialog
            client={{
              id: client.id,
              companyName: client.company_name,
              status: client.status,
              address: client.address,
              notes: client.notes,
            }}
          />
          <DeleteClientButton clientId={client.id} companyName={client.company_name} />
        </div>
      </div>

      <ContactsSection clientId={client.id} contacts={contacts} />
      <ProductsSection clientId={client.id} products={products} />
      <VisitsHistory visits={visits} />
    </div>
  );
}
