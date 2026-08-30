"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProduct, deleteProduct } from "@/app/actions/products";

export type Product = {
  id: string;
  name: string;
  details: string | null;
};

export function ProductsSection({
  clientId,
  products,
}: {
  clientId: string;
  products: Product[];
}) {
  const t = useTranslations("clients.products");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createProduct({ clientId, name, details });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("addSuccess"));
      setAdding(false);
      setName("");
      setDetails("");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteProduct({ id, clientId });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(t("deleteSuccess"));
        router.refresh();
      }
      setDeletingId(null);
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

      {products.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      <ul className="flex flex-col gap-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              {p.details && <p className="text-sm text-muted-foreground">{p.details}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(p.id)}
              disabled={isPending && deletingId === p.id}
            >
              <TrashIcon />
            </Button>
          </li>
        ))}
      </ul>

      {adding && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-lg border border-border bg-accent p-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label>{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("details")}</Label>
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("detailsPlaceholder")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAdding(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? t("saving") : t("addSubmit")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
