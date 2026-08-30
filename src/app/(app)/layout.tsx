import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };

  return (
    <AppShell
      userName={metadata.full_name || user?.email || ""}
      userAvatarUrl={metadata.avatar_url ?? null}
      isAdmin={Boolean(isAdmin)}
    >
      {children}
    </AppShell>
  );
}
