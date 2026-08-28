import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, company_name, status")
    .eq("id", id)
    .single();

  if (!client) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 bg-[#FAF1E4] p-4 sm:p-6">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Volver a clientes
      </Link>
      <h1 className="text-2xl font-semibold text-[#BE5B2E]">{client.company_name}</h1>
      <p className="text-muted-foreground">
        La ficha completa (contactos, productos, dirección, historial de visitas) se
        construirá en el próximo paso.
      </p>
      <Button
        variant="outline"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/">Volver</Link>}
      />
    </div>
  );
}
