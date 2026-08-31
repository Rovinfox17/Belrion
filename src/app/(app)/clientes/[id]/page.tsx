import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { AddressMapLink } from "@/components/clients/address-map-link";
import { ContactsSection, type Contact } from "@/components/clients/contacts-section";
import { ProductsSection, type Product } from "@/components/clients/products-section";
import { VisitsHistory, type VisitWithComments } from "@/components/clients/visits-history";
import { ClientTeamsSection } from "@/components/clients/client-teams-section";
import {
  CustomFieldsSection,
  type CustomFieldWithValue,
} from "@/components/clients/custom-fields-section";

type Status = "activo" | "potencial" | "inactivo";

const STATUS_CLASS: Record<Status, string> = {
  activo: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  potencial: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  inactivo: "bg-rose-100 text-rose-700 hover:bg-rose-100",
};

type RawClientDetail = {
  id: string;
  user_id: string;
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
  const t = await getTranslations("clients");
  const tFilters = await getTranslations("clients.filters");
  const tNav = await getTranslations("nav");
  const STATUS_LABEL: Record<Status, string> = {
    activo: tFilters("statusActive"),
    potencial: tFilters("statusPotential"),
    inactivo: tFilters("statusInactive"),
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("clients")
    .select(
      "id, user_id, company_name, status, address, notes, contacts(id, name, phone, email, role, is_primary), products(id, name, details), visits(id, scheduled_at, status, visit_comments(id, comment, created_at))"
    )
    .eq("id", id)
    .single();

  const client = data as unknown as RawClientDetail | null;

  if (!client) notFound();

  const isOwner = client.user_id === user?.id;

  const { data: clientTeamsData } = await supabase
    .from("client_teams")
    .select("team_id, teams(name)")
    .eq("client_id", id);

  const sharedWith = (clientTeamsData ?? []).map((ct) => ({
    teamId: ct.team_id,
    teamName: (ct.teams as unknown as { name: string } | null)?.name ?? tNav("team"),
  }));

  let availableTeams: { id: string; name: string }[] = [];
  if (user) {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, teams(name)")
      .eq("user_id", user.id);

    const sharedTeamIds = new Set(sharedWith.map((t) => t.teamId));
    availableTeams = (memberships ?? [])
      .map((m) => ({
        id: m.team_id,
        name: (m.teams as unknown as { name: string } | null)?.name ?? tNav("team"),
      }))
      .filter((t) => !sharedTeamIds.has(t.id));
  }

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

  const [{ data: fieldDefinitions }, { data: fieldValues }] = await Promise.all([
    supabase
      .from("custom_field_definitions")
      .select("id, name, field_type, options")
      .order("sort_order", { ascending: true }),
    supabase.from("custom_field_values").select("field_id, value").eq("client_id", id),
  ]);

  const valueByField = new Map((fieldValues ?? []).map((v) => [v.field_id, v.value]));
  const customFields: CustomFieldWithValue[] = (fieldDefinitions ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    fieldType: f.field_type,
    options: f.options,
    value: valueByField.get(f.id) ?? null,
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
        {t("detail.back")}
      </Link>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
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
      <ClientTeamsSection
        clientId={client.id}
        isOwner={isOwner}
        sharedWith={sharedWith}
        availableTeams={availableTeams}
      />
      <CustomFieldsSection clientId={client.id} fields={customFields} />
      <VisitsHistory visits={visits} />
    </div>
  );
}
