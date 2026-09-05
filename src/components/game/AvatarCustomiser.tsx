import { Glasses, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AvatarSettings } from "@/lib/avatarSettings";

export function CustomAvatar({
  settings,
  size = 160,
}: {
  settings: AvatarSettings;
  size?: number;
}) {
  const lip =
    settings.makeup === "bold" ? "#B51F5A" : settings.makeup === "natural" ? "#9B4D50" : "#70423A";
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Your customised avatar"
      className="rounded-[28%] bg-gradient-to-b from-cyan-200 to-violet-300 shadow-xl"
    >
      <path d="M28 200c4-45 30-67 72-67s68 22 72 67" fill={settings.clothesColor} />
      <path d="M78 127h44v31c-13 12-31 12-44 0z" fill={settings.skin} />
      <ellipse cx="100" cy="86" rx="48" ry="58" fill={settings.skin} />
      <ellipse cx="51" cy="90" rx="8" ry="15" fill={settings.skin} />
      <ellipse cx="149" cy="90" rx="8" ry="15" fill={settings.skin} />
      {settings.hairStyle === "short" && (
        <path
          d="M53 78c0-48 25-61 48-61 32 0 49 20 47 61-10-14-17-31-48-31-28 0-37 15-47 31z"
          fill={settings.hairColor}
        />
      )}
      {settings.hairStyle === "waves" && (
        <path
          d="M50 77c1-42 23-61 51-61 30 0 49 22 48 62-8-12-13-18-20-24-7 8-15 8-23 0-8 9-17 9-25 0-11 6-20 14-31 23z"
          fill={settings.hairColor}
        />
      )}
      {settings.hairStyle === "mohawk" && (
        <path
          d="M80 48c2-34 12-48 22-48 14 17 19 31 17 49-14-5-26-5-39-1z"
          fill={settings.hairColor}
        />
      )}
      {settings.hairStyle === "covered" && (
        <path
          d="M49 84c-2-47 19-70 52-70 36 0 55 28 50 73l-17-25c-22-15-47-15-68 0z"
          fill={settings.clothesColor}
        />
      )}
      <path
        d="M68 73q13-8 25 0M107 73q13-8 25 0"
        fill="none"
        stroke={settings.hairColor}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="81" cy="84" rx="5" ry="6" fill={settings.eyeColor} />
      <ellipse cx="119" cy="84" rx="5" ry="6" fill={settings.eyeColor} />
      <circle cx="79.5" cy="82" r="1.3" fill="white" />
      <circle cx="117.5" cy="82" r="1.3" fill="white" />
      {settings.glasses && (
        <g fill="none" stroke="#242A35" strokeWidth="3">
          <rect x="63" y="72" width="35" height="25" rx="10" />
          <rect x="102" y="72" width="35" height="25" rx="10" />
          <path d="M98 81h4M63 80l-11-4M137 80l11-4" />
        </g>
      )}
      {settings.makeup !== "none" && (
        <g opacity={settings.makeup === "bold" ? 0.8 : 0.35}>
          <ellipse cx="65" cy="101" rx="10" ry="5" fill="#E85E75" />
          <ellipse cx="135" cy="101" rx="10" ry="5" fill="#E85E75" />
        </g>
      )}
      <path
        d="M96 90q-5 14 5 16"
        fill="none"
        stroke="#7D4B38"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {settings.facialHair === "stubble" && (
        <path
          d="M70 105q30 38 60 0-3 42-30 42s-28-19-30-42z"
          fill={settings.hairColor}
          opacity=".28"
        />
      )}
      {settings.facialHair === "moustache" && (
        <path d="M78 111q12-11 22 0 10-11 22 0-11 13-22 3-11 10-22-3z" fill={settings.hairColor} />
      )}
      {settings.facialHair === "beard" && (
        <path
          d="M61 101q7 54 39 57 32-3 39-57-10 18-17 23-22 12-44 0-8-6-17-23-17z"
          fill={settings.hairColor}
          opacity=".92"
        />
      )}
      <path d="M84 119q16 10 32 0" fill="none" stroke={lip} strokeWidth="4" strokeLinecap="round" />
      <path d="M70 151l30 20 30-20 15 49H55z" fill={settings.clothesColor} opacity=".85" />
    </svg>
  );
}

const SKINS = ["#F6D0B1", "#E8B184", "#C9895D", "#A76643", "#70402F", "#40251D"];
const HAIR = ["#17120F", "#4B2C20", "#8B552B", "#C89A56", "#D9D4C5", "#7A263A"];
const EYES = ["#3B2416", "#76502F", "#35705D", "#3B70A5", "#77706A"];
const CLOTHES = ["#18A66A", "#168CC8", "#704DD7", "#DF4757", "#E7A91A", "#202633"];

export function AvatarCustomiser({
  value,
  onChange,
  onSave,
  saving = false,
}: {
  value: AvatarSettings;
  onChange: (next: AvatarSettings) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  const set = <K extends keyof AvatarSettings>(key: K, next: AvatarSettings[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <section className="game-card mt-5 overflow-hidden p-5">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-background/45 p-3">
          <CustomAvatar settings={value} />
          <p className="mt-3 flex items-center gap-1 text-[.6rem] font-black uppercase tracking-[.16em] text-primary">
            <Sparkles className="size-3" />
            Live preview
          </p>
        </div>
        <div className="space-y-4">
          <OptionRow label="Skin tone">
            {SKINS.map((x) => (
              <Swatch key={x} color={x} on={value.skin === x} pick={() => set("skin", x)} />
            ))}
          </OptionRow>
          <OptionRow label="Hair style">
            {(["short", "waves", "mohawk", "covered"] as const).map((x) => (
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
            {(["none", "stubble", "moustache", "beard"] as const).map((x) => (
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
            {saving ? "Saving…" : "Save my avatar"}
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
      className={`size-8 rounded-full border-2 shadow-inner ${on ? "scale-110 border-primary ring-2 ring-primary/25" : "border-white/40"}`}
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
      className={`rounded-full border px-3 py-1.5 text-[.62rem] font-bold capitalize ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/50"}`}
    >
      {text}
    </button>
  );
}
