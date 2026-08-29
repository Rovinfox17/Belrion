"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
      toast.success("Producto añadido");
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
        toast.success("Producto eliminado");
        router.refresh();
      }
      setDeletingId(null);
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Productos contratados</h2>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon />
            Añadir producto
          </Button>
        )}
      </div>

      {products.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">Sin productos contratados todavía.</p>
      )}

      <ul className="flex flex-col gap-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-black/5 bg-card p-3"
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
          className="flex flex-col gap-3 rounded-lg border border-black/10 bg-black/[.02] p-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label>Nombre del producto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Detalles</Label>
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Condiciones, fecha de contratación…"
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
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Guardando…" : "Añadir"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
