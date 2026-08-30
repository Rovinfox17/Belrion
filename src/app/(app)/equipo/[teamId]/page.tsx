import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ManageTeam, type TeamData } from "@/components/settings/team-section";
import { TeamChat, type ChatMessage, type TeamMemberInfo } from "@/components/team/team-chat";

const MESSAGE_HISTORY_LIMIT = 100;

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

  const [{ data: members }, { data: messagesData }] = await Promise.all([
    supabase.rpc("get_team_members", { p_team_id: teamId }),
    supabase
      .from("team_messages")
      .select("id, user_id, content, message_type, file_url, file_name, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_HISTORY_LIMIT),
  ]);

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

  const chatMembers: TeamMemberInfo[] = (members ?? []).map((m) => ({
    userId: m.user_id,
    name: m.name,
    email: m.email,
    avatarUrl: m.avatar_url,
  }));

  const chatMessages: ChatMessage[] = (messagesData ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      userId: m.user_id,
      content: m.content,
      messageType: m.message_type,
      fileUrl: m.file_url,
      fileName: m.file_name,
      createdAt: m.created_at,
    }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/equipo"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        {t("backToTeams")}
      </Link>
      <h1 className="font-heading text-2xl font-semibold">{team.name}</h1>
      <TeamChat
        teamId={teamId}
        currentUserId={user.id}
        initialMessages={chatMessages}
        members={chatMembers}
      />
      <ManageTeam team={team} />
    </div>
  );
}
