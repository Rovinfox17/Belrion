"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PhoneIcon, MailIcon, StarIcon, PencilIcon, TrashIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContact, deleteContact, updateContact } from "@/app/actions/contacts";

export type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  isPrimary: boolean;
};

function ContactForm({
  initial,
  onCancel,
  onSubmit,
  isPending,
  submitLabel,
}: {
  initial: { name: string; phone: string; email: string; role: string; isPrimary: boolean };
  onCancel?: () => void;
  onSubmit: (values: {
    name: string;
    phone: string;
    email: string;
    role: string;
    isPrimary: boolean;
  }) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const t = useTranslations("clients.contacts");
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [role, setRole] = useState(initial.role);
  const [isPrimary, setIsPrimary] = useState(initial.isPrimary);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name, phone, email, role, isPrimary });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-accent p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("role")}</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("phone")}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("email")}</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="size-4"
        />
        {t("primary")}
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ContactRow({ clientId, contact }: { clientId: string; contact: Contact }) {
  const t = useTranslations("clients.contacts");
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(values: {
    name: string;
    phone: string;
    email: string;
    role: string;
    isPrimary: boolean;
  }) {
    startTransition(async () => {
      const result = await updateContact({ id: contact.id, clientId, ...values });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("success"));
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteContact({ id: contact.id, clientId });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("deleteSuccess"));
      router.refresh();
    });
  }

  if (editing) {
    return (
      <ContactForm
        initial={{
          name: contact.name,
          phone: contact.phone ?? "",
          email: contact.email ?? "",
          role: contact.role ?? "",
          isPrimary: contact.isPrimary,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={handleUpdate}
        isPending={isPending}
        submitLabel={t("save")}
      />
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 font-medium">
          {contact.name}
          {contact.isPrimary && (
            <StarIcon className="size-3.5 fill-primary text-primary" />
          )}
          {contact.role && (
            <span className="font-normal text-muted-foreground">· {contact.role}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:underline">
              <PhoneIcon className="size-3.5" />
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:underline">
              <MailIcon className="size-3.5" />
              {contact.email}
            </a>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} disabled={isPending}>
          <PencilIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={isPending}>
          <TrashIcon />
        </Button>
      </div>
    </div>
  );
}

export function ContactsSection({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: Contact[];
}) {
  const t = useTranslations("clients.contacts");
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate(values: {
    name: string;
    phone: string;
    email: string;
    role: string;
    isPrimary: boolean;
  }) {
    startTransition(async () => {
      const result = await createContact({ clientId, ...values });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("addSuccess"));
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t("title")}</h2>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon />
            {t("add")}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {contacts.map((c) => (
          <ContactRow key={c.id} clientId={clientId} contact={c} />
        ))}
        {adding && (
          <ContactForm
            initial={{ name: "", phone: "", email: "", role: "", isPrimary: contacts.length === 0 }}
            onCancel={() => setAdding(false)}
            onSubmit={handleCreate}
            isPending={isPending}
            submitLabel={t("addSubmit")}
          />
        )}
      </div>
    </section>
  );
}
