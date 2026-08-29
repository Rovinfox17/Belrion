import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TeamList, type TeamListItem } from "@/components/settings/team-section";

export default async function EquipoPage() {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let teams: TeamListItem[] = [];

  if (user) {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id, role, teams(name)")
      .eq("user_id", user.id);

    teams = (memberships ?? []).map((m) => ({
      id: m.team_id,
      name: (m.teams as unknown as { name: string } | null)?.name ?? t("team"),
      role: m.role,
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">{t("team")}</h1>
      <TeamList teams={teams} />
    </div>
  );
}
