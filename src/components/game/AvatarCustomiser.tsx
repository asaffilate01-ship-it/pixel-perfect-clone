import { Glasses, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_AVATAR_SETTINGS, type AvatarSettings } from "@/lib/avatarSettings";
import { Avatar } from "@/components/game/AvatarPicker";

const SKINS = ["#F6D0B1", "#E8B184", "#C9895D", "#A76643", "#70402F", "#40251D"];
const HAIR = ["#17120F", "#4B2C20", "#8B552B", "#C89A56", "#D9D4C5", "#7A263A"];
const EYES = ["#3B2416", "#76502F", "#35705D", "#3B70A5", "#77706A"];
const CLOTHES = ["#18A66A", "#168CC8", "#704DD7", "#DF4757", "#E7A91A", "#202633"];

export function AvatarCustomiser({
  value,
  preset,
  onChange,
  onSave,
  saving = false,
}: {
  value: AvatarSettings;
  preset: string;
  onChange: (next: AvatarSettings) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  value = { ...DEFAULT_AVATAR_SETTINGS, ...value };
  const set = <K extends keyof AvatarSettings>(key: K, next: AvatarSettings[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <section className="game-card mt-5 overflow-hidden p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/30 bg-gradient-to-b from-violet-500/15 via-cyan-400/10 to-background/50 p-4 lg:sticky lg:top-20 lg:self-start">
          <div className="absolute inset-x-8 top-8 h-32 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative transition-transform duration-300 hover:scale-[1.03]">
            <Avatar id={preset} size={200} className="ring-1 ring-white/30" />
          </div>
          <p className="mt-3 flex items-center gap-1 text-[.6rem] font-black uppercase tracking-[.16em] text-primary">
            <Sparkles className="size-3" />
            Portrait quality reference
          </p>
        </div>
        <div className="space-y-4">
          <OptionRow label="Skin tone">
            {SKINS.map((x) => (
              <Swatch key={x} color={x} on={value.skin === x} pick={() => set("skin", x)} />
            ))}
          </OptionRow>
          <OptionRow label="Face shape">
            {(["oval", "round", "square"] as const).map((x) => (
              <Choice
                key={x}
                text={x}
                on={value.faceShape === x}
                pick={() => set("faceShape", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Hair style">
            {(
              [
                "short",
                "buzz",
                "waves",
                "curls",
                "afro",
                "long",
                "bun",
                "mohawk",
                "covered",
                "bald",
              ] as const
            ).map((x) => (
              <Choice
                key={x}
                text={x}
                on={value.hairStyle === x}
                pick={() => set("hairStyle", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Hair colour">
            {HAIR.map((x) => (
              <Swatch
                key={x}
                color={x}
                on={value.hairColor === x}
                pick={() => set("hairColor", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Facial hair">
            {(["none", "stubble", "moustache", "goatee", "boxed", "beard"] as const).map((x) => (
              <Choice
                key={x}
                text={x}
                on={value.facialHair === x}
                pick={() => set("facialHair", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Make-up">
            {(["none", "natural", "bold"] as const).map((x) => (
              <Choice key={x} text={x} on={value.makeup === x} pick={() => set("makeup", x)} />
            ))}
          </OptionRow>
          <OptionRow label="Eye colour">
            {EYES.map((x) => (
              <Swatch key={x} color={x} on={value.eyeColor === x} pick={() => set("eyeColor", x)} />
            ))}
          </OptionRow>
          <OptionRow label="Eyebrows">
            {(["soft", "straight", "bold"] as const).map((x) => (
              <Choice
                key={x}
                text={x}
                on={value.browStyle === x}
                pick={() => set("browStyle", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Expression">
            {(["smile", "neutral", "grin"] as const).map((x) => (
              <Choice
                key={x}
                text={x}
                on={value.mouthStyle === x}
                pick={() => set("mouthStyle", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Outfit style">
            {(["tee", "hoodie", "jersey"] as const).map((x) => (
              <Choice
                key={x}
                text={x}
                on={value.outfitStyle === x}
                pick={() => set("outfitStyle", x)}
              />
            ))}
          </OptionRow>
          <OptionRow label="Clothes">
            {CLOTHES.map((x) => (
              <Swatch
                key={x}
                color={x}
                on={value.clothesColor === x}
                pick={() => set("clothesColor", x)}
              />
            ))}
          </OptionRow>
          <button
            type="button"
            onClick={() => set("glasses", !value.glasses)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${value.glasses ? "border-primary bg-primary/10" : "border-border"}`}
          >
            <Glasses className="size-4" /> Glasses {value.glasses ? "on" : "off"}
          </button>
          <Button onClick={onSave} disabled={saving} className="w-full">
            <Save className="size-4" />
            {saving ? "Saving…" : "Save portrait style"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[.58rem] font-black uppercase tracking-[.16em] text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Swatch({ color, on, pick }: { color: string; on: boolean; pick: () => void }) {
  return (
    <button
      type="button"
      onClick={pick}
      aria-label={`Choose ${color}`}
      aria-pressed={on}
      className={`size-9 rounded-full border-2 shadow-[inset_3px_3px_5px_rgba(255,255,255,.35),inset_-3px_-3px_5px_rgba(0,0,0,.2)] transition-transform ${on ? "scale-110 border-primary ring-2 ring-primary/25" : "border-white/40 hover:scale-105"}`}
      style={{ background: color }}
    />
  );
}
function Choice({ text, on, pick }: { text: string; on: boolean; pick: () => void }) {
  return (
    <button
      type="button"
      onClick={pick}
      aria-pressed={on}
      className={`rounded-xl border px-3 py-2 text-[.62rem] font-bold capitalize transition-all ${on ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border bg-background/50 hover:-translate-y-0.5 hover:border-primary/60"}`}
    >
      {text}
    </button>
  );
}
