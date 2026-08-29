import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ManageTeam, type TeamData } from "@/components/settings/team-section";

export default async function EquipoDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const t = await getTranslations("team");
  const tNav = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: membership } = await supabase
    .from("team_members")
    .select("role, teams(name)")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  const { data: members } = await supabase.rpc("get_team_members", { p_team_id: teamId });

  const team: TeamData = {
    id: teamId,
    name: (membership.teams as unknown as { name: string } | null)?.name ?? tNav("team"),
    isOwner: membership.role === "owner",
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      email: m.email,
      role: m.role,
    })),
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/equipo"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        {t("backToTeams")}
      </Link>
      <h1 className="font-heading text-2xl font-semibold">{team.name}</h1>
      <ManageTeam team={team} />
    </div>
  );
}
