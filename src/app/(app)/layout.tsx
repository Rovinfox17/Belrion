import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };

  return (
    <AppShell
      userName={metadata.full_name || user?.email || ""}
      userAvatarUrl={metadata.avatar_url ?? null}
    >
      {children}
    </AppShell>
  );
}
