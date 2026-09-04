import { useState } from "react";
import { Gem, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import captainImg from "@/assets/avatars/captain.jpg.asset.json";
import playmakerImg from "@/assets/avatars/playmaker.jpg.asset.json";
import strikerImg from "@/assets/avatars/striker.jpg.asset.json";
import championImg from "@/assets/avatars/champion.jpg.asset.json";
import aceImg from "@/assets/avatars/ace.jpg.asset.json";
import racerImg from "@/assets/avatars/racer.jpg.asset.json";
import legendImg from "@/assets/avatars/legend.jpg.asset.json";
import challengerImg from "@/assets/avatars/challenger.jpg.asset.json";
import veteranImg from "@/assets/avatars/veteran.jpg.asset.json";
import maverickImg from "@/assets/avatars/maverick.jpg.asset.json";
import rookieImg from "@/assets/avatars/rookie.jpg.asset.json";
import allstarImg from "@/assets/avatars/allstar.jpg.asset.json";

/** Avatar collection v2 — mirrors the `avatar_presets` atlas (12 characters, four Pro). */
export const AVATARS = [
  { id: "captain", label: "Captain", img: captainImg.url, color: "#1E9E63", pro: false },
  { id: "playmaker", label: "Playmaker", img: playmakerImg.url, color: "#1FA9D6", pro: false },
  { id: "striker", label: "Striker", img: strikerImg.url, color: "#F0533F", pro: false },
  { id: "champion", label: "Champion", img: championImg.url, color: "#F0B400", pro: false },
  { id: "ace", label: "Ace", img: aceImg.url, color: "#1E9E63", pro: false },
  { id: "racer", label: "Racer", img: racerImg.url, color: "#2B5FE0", pro: false },
  { id: "legend", label: "Legend", img: legendImg.url, color: "#7C4DD1", pro: false },
  { id: "challenger", label: "Challenger", img: challengerImg.url, color: "#F0533F", pro: false },
  { id: "veteran", label: "Veteran", img: veteranImg.url, color: "#E9A83D", pro: true },
  { id: "maverick", label: "Maverick", img: maverickImg.url, color: "#7C4DD1", pro: true },
  { id: "rookie", label: "Rookie", img: rookieImg.url, color: "#1E9E63", pro: true },
  { id: "allstar", label: "All-Star", img: allstarImg.url, color: "#1FA9D6", pro: true },
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
      className={`relative block shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: a.color,
        boxShadow: `0 6px 18px -8px ${a.color}`,
      }}
    >
      <img
        src={a.img}
        alt={`${a.label} avatar`}
        loading="lazy"
        className="size-full object-cover"
      />
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
                  <Avatar id={a.id} size={56} />
                  <span className="text-[0.58rem] font-black uppercase tracking-[0.12em]">{a.label}</span>
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
              Veteran, Maverick, Rookie and All-Star unlock with Fanzeno Pro.
            </p>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
