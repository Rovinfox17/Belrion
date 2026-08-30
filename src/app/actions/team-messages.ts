"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type MessageType = "texto" | "imagen" | "documento" | "video";

export async function sendTeamMessage(input: {
  teamId: string;
  content: string | null;
  messageType: MessageType;
  fileUrl: string | null;
  fileName: string | null;
}) {
  const t = await getTranslations("team.chat.errors");
  const content = input.content?.trim() || null;

  if (!content && !input.fileUrl) {
    return { error: t("empty") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const tErrors = await getTranslations("errors");
    return { error: tErrors("notAuthenticated") };
  }

  const { data: message, error } = await supabase
    .from("team_messages")
    .insert({
      team_id: input.teamId,
      user_id: user.id,
      content,
      message_type: input.messageType,
      file_url: input.fileUrl,
      file_name: input.fileName,
    })
    .select("id")
    .single();

  if (error || !message) {
    return { error: t("sendFailed") };
  }

  // Best-effort: si la notificación push falla, el mensaje ya se envió y no
  // debe bloquear al usuario. Se espera la llamada (en vez de fire-and-forget)
  // porque el entorno serverless puede cortar la ejecución en cuanto la
  // Server Action devuelve su resultado.
  try {
    await supabase.functions.invoke("send-team-message-notification", {
      body: { teamId: input.teamId, messageId: message.id },
    });
  } catch (err) {
    console.error("send-team-message-notification failed", err);
  }

  return { success: true as const };
}
