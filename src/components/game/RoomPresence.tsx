import { Cloud, CloudOff, LoaderCircle, Smartphone } from "lucide-react";
import type { ArcadePresenceState } from "@/hooks/useArcadePresence";

const presentation: Record<ArcadePresenceState, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-primary shadow-[0_0_10px_hsl(var(--primary)/.7)]" },
  background: { label: "In background", className: "bg-gold" },
  reconnecting: { label: "Reconnecting", className: "animate-pulse bg-chart-4" },
  offline: { label: "Offline", className: "bg-muted-foreground" },
};

export function PresenceDot({ status = "offline" }: { status?: ArcadePresenceState | undefined }) {
  const item = presentation[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.58rem] font-bold text-muted-foreground">
      <span className={`size-2 rounded-full ${item.className}`} />
      <span className="sr-only">{item.label}</span>
    </span>
  );
}

export function ConnectionBanner({ status }: { status: ArcadePresenceState }) {
  if (status === "online") return null;
  const offline = status === "offline";
  const background = status === "background";
  const Icon = offline ? CloudOff : background ? Smartphone : LoaderCircle;
  return (
    <div
      className="sticky top-2 z-40 mt-3 flex items-center gap-2 rounded-2xl border border-gold/35 bg-background/95 px-3 py-2 text-xs font-bold shadow-lg backdrop-blur"
      role="status"
    >
      <Icon className={`size-4 text-gold ${status === "reconnecting" ? "animate-spin" : ""}`} />
      {background
        ? "Game kept safe while this app is in the background"
        : "Connection lost — restoring your live game…"}
      {!offline && !background && <Cloud className="ml-auto size-4 text-muted-foreground" />}
    </div>
  );
}
