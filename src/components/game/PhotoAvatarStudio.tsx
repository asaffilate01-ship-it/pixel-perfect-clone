import { useRef, useState } from "react";
import { Camera, ImagePlus, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AvatarSettings } from "@/lib/avatarSettings";

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PhotoAvatarStudio({
  pro,
  userId,
  settings,
}: {
  pro: boolean;
  userId: string;
  settings: AvatarSettings;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [sending, setSending] = useState(false);

  const choose = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED.has(file.type) || file.size > 8 * 1024 * 1024) {
      toast.error("Use a JPG, PNG or WebP image up to 8 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const requestPortrait = async () => {
    if (!pro) return toast.error("Photo portraits are included with Pro.");
    if (!photo) return toast.error("Take or choose a clear front-facing photo first.");
    setSending(true);
    const extension =
      photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const sourcePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await supabase.storage.from("avatar-sources").upload(sourcePath, photo, {
      contentType: photo.type,
      upsert: false,
    });
    if (uploaded.error) {
      setSending(false);
      return toast.error(uploaded.error.message);
    }
    const rpc = supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const queued = await rpc("request_avatar_render", {
      p_source_path: sourcePath,
      p_settings: settings,
    });
    if (queued.error || typeof queued.data !== "string") {
      await supabase.storage.from("avatar-sources").remove([sourcePath]);
      setSending(false);
      return toast.error(queued.error.message);
    }
    const rendered = await supabase.functions.invoke("render-avatar", {
      body: { jobId: queued.data },
    });
    setSending(false);
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(undefined);
    if (rendered.error)
      return toast.error("Portrait rendering failed. Your source photo was deleted.");
    toast.success("Premium portrait created. Refreshing your profile…");
    window.location.reload();
  };

  return (
    <section className="game-card mt-5 overflow-hidden p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20">
          <Sparkles className="size-5 text-primary" />
        </span>
        <div>
          <p className="font-display text-2xl">Photo portrait studio</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Take a selfie or choose a photo, then your selected hair, facial hair, glasses, make-up
            and sportswear are applied by the secure portrait renderer.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="relative grid aspect-square place-items-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-primary/35 bg-primary/5"
        >
          {preview ? (
            <img src={preview} alt="Selected portrait source" className="size-full object-cover" />
          ) : (
            <span className="text-center text-xs font-bold text-muted-foreground">
              <ImagePlus className="mx-auto mb-2 size-6 text-primary" /> Choose photo
            </span>
          )}
        </button>
        <div className="flex flex-col justify-center gap-3">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="sr-only"
            onChange={(event) => choose(event.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => input.current?.click()}>
            <Camera className="size-4" /> Take or choose photo
          </Button>
          <Button onClick={() => void requestPortrait()} disabled={!photo || sending || !pro}>
            {pro ? <Sparkles className="size-4" /> : <LockKeyhole className="size-4" />}
            {sending ? "Creating portrait…" : pro ? "Create premium portrait" : "Pro portrait"}
          </Button>
          <p className="text-[.62rem] leading-relaxed text-muted-foreground">
            Identity-preserving portrait only. Maximum 8 MB and five renders per day. Source photos
            stay private and must be deleted by the renderer after every attempt.
          </p>
        </div>
      </div>
    </section>
  );
}
