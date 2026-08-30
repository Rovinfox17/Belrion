"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { PaperclipIcon, SendIcon, FileIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { sendTeamMessage } from "@/app/actions/team-messages";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type ChatMessageType = "texto" | "imagen" | "documento" | "video";

export type ChatMessage = {
  id: string;
  userId: string;
  content: string | null;
  messageType: ChatMessageType;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

export type TeamMemberInfo = {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

type TeamMessageRow = {
  id: string;
  user_id: string;
  content: string | null;
  message_type: ChatMessageType;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

function inferMessageType(file: File): "imagen" | "video" | "documento" {
  if (file.type.startsWith("image/")) return "imagen";
  if (file.type.startsWith("video/")) return "video";
  return "documento";
}

export function TeamChat({
  teamId,
  currentUserId,
  initialMessages,
  members,
}: {
  teamId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  members: TeamMemberInfo[];
}) {
  const t = useTranslations("team.chat");
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel(`team_messages:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const row = payload.new as TeamMessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                userId: row.user_id,
                content: row.content,
                messageType: row.message_type,
                fileUrl: row.file_url,
                fileName: row.file_name,
                createdAt: row.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const missing = messages.filter(
      (m) => m.fileUrl && !(m.fileUrl in signedUrls)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (m) => {
          const { data } = await supabase.storage
            .from("team-files")
            .createSignedUrl(m.fileUrl as string, 3600);
          return [m.fileUrl as string, data?.signedUrl ?? ""] as const;
        })
      );
      if (cancelled) return;
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of entries) {
          if (url) next[path] = url;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function memberFor(userId: string) {
    return members.find((m) => m.userId === userId);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || sending) return;
    setSending(true);
    const result = await sendTeamMessage({
      teamId,
      content: value,
      messageType: "texto",
      fileUrl: null,
      fileName: null,
    });
    setSending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setContent("");
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("fileTooLarge"));
      return;
    }

    setUploading(true);
    const path = `${teamId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("team-files").upload(path, file);

    if (uploadError) {
      console.error("team-files upload failed", uploadError);
      setUploading(false);
      toast.error(t("errors.uploadFailed"));
      return;
    }

    const result = await sendTeamMessage({
      teamId,
      content: null,
      messageType: inferMessageType(file),
      fileUrl: path,
      fileName: file.name,
    });
    setUploading(false);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">{t("title")}</h2>

      <div
        ref={listRef}
        className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-card p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          messages.map((m) => {
            const sender = memberFor(m.userId);
            const isMine = m.userId === currentUserId;
            const senderLabel = sender?.name || sender?.email || "?";
            const signedUrl = m.fileUrl ? signedUrls[m.fileUrl] : null;

            return (
              <div
                key={m.id}
                className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-muted-foreground">
                  {senderLabel} · {formatTime(m.createdAt)}
                </span>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isMine ? "bg-primary text-primary-foreground" : "bg-accent"
                  }`}
                >
                  {m.messageType === "imagen" &&
                    (signedUrl ? (
                      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signedUrl}
                          alt={m.fileName ?? ""}
                          className="max-h-48 rounded-md object-cover"
                        />
                      </a>
                    ) : (
                      <div className="h-24 w-24 animate-pulse rounded-md bg-muted-foreground/20" />
                    ))}
                  {m.messageType === "video" &&
                    (signedUrl ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video controls className="max-h-48 rounded-md" src={signedUrl} />
                    ) : (
                      <div className="h-24 w-40 animate-pulse rounded-md bg-muted-foreground/20" />
                    ))}
                  {m.messageType === "documento" && (
                    <a
                      href={signedUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t("download")}: ${m.fileName ?? ""}`}
                      className="flex items-center gap-2 underline underline-offset-2"
                    >
                      <FileIcon className="size-4 shrink-0" />
                      <span className="truncate">{m.fileName}</span>
                      <DownloadIcon className="size-3.5 shrink-0" />
                    </a>
                  )}
                  {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("retentionNotice")}</p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label={t("attach")}
        >
          <PaperclipIcon />
        </Button>
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("placeholder")}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !content.trim()} aria-label={t("send")}>
          <SendIcon />
        </Button>
      </form>
      {uploading && <p className="text-xs text-muted-foreground">{t("uploading")}</p>}
    </section>
  );
}
