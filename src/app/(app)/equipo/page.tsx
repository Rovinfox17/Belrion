import { createClient } from "@/lib/supabase/server";
import { TeamSection, type TeamData } from "@/components/settings/team-section";

export default async function EquipoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let team: TeamData = null;

  if (user) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role, teams(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership) {
      const { data: members } = await supabase.rpc("get_team_members", {
        p_team_id: membership.team_id,
      });

      team = {
        id: membership.team_id,
        name: (membership.teams as unknown as { name: string } | null)?.name ?? "Equipo",
        isOwner: membership.role === "owner",
        members: (members ?? []).map((m) => ({
          userId: m.user_id,
          email: m.email,
          role: m.role,
        })),
      };
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">Equipo</h1>

      <section className="flex flex-col gap-3 rounded-lg border border-black/5 bg-card p-4">
        <TeamSection team={team} />
      </section>
    </div>
  );
}
