import { useState } from "react";
import { Gem, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Avatar collection v2 — mirrors the `avatar_presets` atlas (12 characters, four Pro). */
export const AVATARS = [
  { id: "captain", face: "🧢", color: "#45E6A0", pro: false },
  { id: "playmaker", face: "🎯", color: "#49C6E5", pro: false },
  { id: "striker", face: "⚽", color: "#FF6B5C", pro: false },
  { id: "champion", face: "🏆", color: "#FFD84A", pro: false },
  { id: "ace", face: "🎾", color: "#45E6A0", pro: false },
  { id: "racer", face: "🏎️", color: "#4D8DFF", pro: false },
  { id: "legend", face: "👑", color: "#9A7BFF", pro: false },
  { id: "challenger", face: "🥊", color: "#FF6B5C", pro: false },
  { id: "veteran", face: "🦁", color: "#E9A83D", pro: true },
  { id: "maverick", face: "🚀", color: "#9A7BFF", pro: true },
  { id: "rookie", face: "⭐", color: "#45E6A0", pro: true },
  { id: "allstar", face: "🦅", color: "#49C6E5", pro: true },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

/** Retired v1 ids still stored on some profiles map onto their closest v2 character. */
const LEGACY: Record<string, AvatarId> = { batter: "playmaker", fighter: "challenger", hoops: "playmaker", rocket: "maverick", lion: "veteran", eagle: "allstar" };

export function avatarFor(id: string | null | undefined) {
  const key = id && LEGACY[id] ? LEGACY[id] : id;
  return AVATARS.find((a) => a.id === key) ?? AVATARS[0];
}

export function Avatar({ id, size = 44, className = "" }: { id: string | null | undefined; size?: number; className?: string }) {
  const a = avatarFor(id);
  return (
    <span
      aria-label={`${a.id} avatar`}
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: `linear-gradient(160deg, ${a.color} 0%, ${a.color}AA 100%)`,
        boxShadow: `0 6px 18px -8px ${a.color}`,
      }}
    >
      <span
        className="pointer-events-none absolute -top-1/4 left-0 right-0 h-1/2 rounded-full bg-background/20"
        aria-hidden
      />
      <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>{a.face}</span>
    </span>
  );
}

export function AvatarPicker({
  value,
  onChange,
  label = "Player avatar",
  pro = false,
}: {
  value: string;
  onChange: (id: AvatarId) => void;
  label?: string;
  pro?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border bg-surface/60 p-2 text-left transition-colors hover:border-primary/60"
      >
        <Avatar id={value} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.58rem] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
          <span className="block text-xs font-bold">Tap to personalise</span>
        </span>
        <Palette className="size-4 text-primary" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <p className="eyebrow">Player identity</p>
            <DialogTitle className="font-display text-3xl font-normal">Choose your avatar</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((a) => {
              const locked = a.pro && !pro;
              const on = a.id === value;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={on}
                  onClick={() => {
                    onChange(a.id);
                    setOpen(false);
                  }}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-colors ${
                    on ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  } ${locked ? "opacity-45" : ""}`}
                >
                  <Avatar id={a.id} size={48} />
                  <span className="text-[0.58rem] font-black uppercase tracking-[0.12em]">{a.id}</span>
                  {a.pro && (
                    <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[0.5rem] font-black uppercase text-gold">
                      <Gem className="size-2.5" /> Pro
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!pro && (
            <p className="text-xs text-muted-foreground">
              Rocket, Lion, Eagle and Legend unlock with Fanzeno Pro.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
