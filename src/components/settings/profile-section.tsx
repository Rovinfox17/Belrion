"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CameraIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function ProfileSection({
  userId,
  initialName,
  initialAvatarUrl,
}: {
  userId: string;
  initialName: string;
  initialAvatarUrl: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    setError(null);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      let nextAvatarUrl = avatarUrl;

      if (avatarFile) {
        const extension = avatarFile.name.split(".").pop() || "jpg";
        const path = `${userId}/avatar.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) {
          setError("No se pudo subir la foto.");
          return;
        }

        const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
        nextAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name, avatar_url: nextAvatarUrl },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(null);
      toast.success("Perfil actualizado");
      router.refresh();
    });
  }

  const displayedAvatar = previewUrl ?? avatarUrl;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent"
        >
          {displayedAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayedAvatar} alt="" className="size-full object-cover" />
          ) : (
            <UserIcon className="size-7 text-muted-foreground" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <CameraIcon className="size-5 text-white" />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="display_name">Nombre visible</Label>
          <Input
            id="display_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando…" : "Guardar perfil"}
      </Button>
    </form>
  );
}
