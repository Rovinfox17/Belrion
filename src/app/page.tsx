import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logout } from "./logout/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-[#FAF1E4] px-4 text-center">
      <h1 className="text-2xl font-semibold text-[#BE5B2E]">Belrion</h1>
      <p className="text-muted-foreground">
        Sesión iniciada como <span className="font-medium">{user?.email}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        El listado de clientes se construirá en el próximo paso.
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}
