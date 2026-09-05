import { lazy, Suspense } from "react";
import { Glasses, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_AVATAR_SETTINGS, type AvatarSettings } from "@/lib/avatarSettings";

const Avatar3D = lazy(() =>
  import("@/components/game/Avatar3D").then((module) => ({ default: module.Avatar3D })),
);

export function CustomAvatar({
  settings,
  size = 160,
}: {
  settings: AvatarSettings;
  size?: number;
}) {
  const fallback = <LegacyAvatar settings={settings} size={size} />;
  return (
    <Suspense fallback={fallback}>
      <Avatar3D
        settings={{ ...DEFAULT_AVATAR_SETTINGS, ...settings }}
        size={size}
        fallback={fallback}
      />
    </Suspense>
  );
}

function LegacyAvatar({ settings, size = 160 }: { settings: AvatarSettings; size?: number }) {
  settings = { ...DEFAULT_AVATAR_SETTINGS, ...settings };
  const lip =
    settings.makeup === "bold" ? "#B51F5A" : settings.makeup === "natural" ? "#9B4D50" : "#70423A";
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Your customised avatar"
      className="overflow-visible rounded-[28%] shadow-2xl drop-shadow-xl"
    >
      <defs>
        <radialGradient id="avatarBackdrop" cx="30%" cy="20%">
          <stop stopColor="#67e8f9" />
          <stop offset=".55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#312e81" />
        </radialGradient>
        <radialGradient id="avatarSkin" cx="32%" cy="20%">
          <stop stopColor="#fff" stopOpacity=".35" />
          <stop offset=".42" stopColor={settings.skin} />
          <stop offset="1" stopColor="#35150b" stopOpacity=".3" />
        </radialGradient>
        <linearGradient id="avatarHair" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".2" />
          <stop offset=".38" stopColor={settings.hairColor} />
          <stop offset="1" stopColor="#000" stopOpacity=".42" />
        </linearGradient>
        <linearGradient id="avatarClothes" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".32" />
          <stop offset=".4" stopColor={settings.clothesColor} />
          <stop offset="1" stopColor="#050817" stopOpacity=".38" />
        </linearGradient>
        <filter id="avatarShadow">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".3" />
        </filter>
      </defs>
      <rect width="200" height="200" rx="54" fill="url(#avatarBackdrop)" />
      <circle cx="38" cy="31" r="52" fill="#fff" opacity=".1" />
      <path
        d="M28 200c4-45 30-67 72-67s68 22 72 67"
        fill="url(#avatarClothes)"
        filter="url(#avatarShadow)"
      />
      <path d="M78 127h44v31c-13 12-31 12-44 0z" fill="url(#avatarSkin)" />
      <ellipse
        cx="100"
        cy="86"
        rx={settings.faceShape === "round" ? 51 : settings.faceShape === "square" ? 49 : 48}
        ry={settings.faceShape === "round" ? 54 : 58}
        fill="url(#avatarSkin)"
        filter="url(#avatarShadow)"
      />
      <ellipse cx="51" cy="90" rx="8" ry="15" fill={settings.skin} />
      <ellipse cx="149" cy="90" rx="8" ry="15" fill={settings.skin} />
      {settings.hairStyle === "short" && (
        <path
          d="M53 78c0-48 25-61 48-61 32 0 49 20 47 61-10-14-17-31-48-31-28 0-37 15-47 31z"
          fill="url(#avatarHair)"
        />
      )}
      {settings.hairStyle === "waves" && (
        <path
          d="M50 77c1-42 23-61 51-61 30 0 49 22 48 62-8-12-13-18-20-24-7 8-15 8-23 0-8 9-17 9-25 0-11 6-20 14-31 23z"
          fill="url(#avatarHair)"
        />
      )}
      {settings.hairStyle === "mohawk" && (
        <path
          d="M80 48c2-34 12-48 22-48 14 17 19 31 17 49-14-5-26-5-39-1z"
          fill="url(#avatarHair)"
        />
      )}
      {settings.hairStyle === "covered" && (
        <path
          d="M49 84c-2-47 19-70 52-70 36 0 55 28 50 73l-17-25c-22-15-47-15-68 0z"
          fill={settings.clothesColor}
        />
      )}
      {settings.hairStyle === "buzz" && (
        <path
          d="M53 76c2-43 20-59 47-59 29 0 46 20 47 59-12-17-24-26-47-26-22 0-35 9-47 26z"
          fill="url(#avatarHair)"
          opacity=".84"
        />
      )}
      {settings.hairStyle === "curls" && (
        <g fill="url(#avatarHair)">
          {[
            [58, 62],
            [65, 39],
            [83, 25],
            [105, 22],
            [127, 29],
            [143, 47],
            [146, 69],
            [79, 49],
            [101, 43],
            [123, 51],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="18" />
          ))}
        </g>
      )}
      {settings.hairStyle === "afro" && (
        <g fill="url(#avatarHair)">
          {[
            [51, 60],
            [57, 34],
            [76, 16],
            [100, 10],
            [126, 17],
            [145, 37],
            [151, 64],
            [77, 42],
            [103, 35],
            [130, 45],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="23" />
          ))}
        </g>
      )}
      {settings.hairStyle === "long" && (
        <path
          d="M48 84C43 30 64 12 101 12c40 0 58 25 53 76l-8 66-25-8 10-83c-19-17-43-17-62 0l10 83-24 8z"
          fill="url(#avatarHair)"
        />
      )}
      {settings.hairStyle === "bun" && (
        <g fill="url(#avatarHair)">
          <circle cx="137" cy="21" r="22" />
          <path d="M52 77c1-44 21-62 49-62 31 0 47 22 48 62-14-20-27-29-48-29-22 0-36 9-49 29z" />
        </g>
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
      {settings.facialHair === "goatee" && (
        <g fill="url(#avatarHair)">
          <path d="M78 111q12-11 22 0 10-11 22 0-11 13-22 3-11 10-22-3z" />
          <path d="M88 124q12 9 24 0l-3 24q-9 8-18 0z" />
        </g>
      )}
      {settings.facialHair === "boxed" && (
        <path
          d="M64 103q6 48 36 53 30-5 36-53l-8 9q-4 33-28 35-24-2-28-35z"
          fill="url(#avatarHair)"
          opacity=".92"
        />
      )}
      {settings.facialHair === "beard" && (
        <path
          d="M61 101q7 54 39 57 32-3 39-57-10 18-17 23-22 12-44 0-8-6-17-23-17z"
          fill="url(#avatarHair)"
          opacity=".92"
        />
      )}
      {settings.mouthStyle === "smile" && (
        <path
          d="M84 119q16 10 32 0"
          fill="none"
          stroke={lip}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {settings.mouthStyle === "neutral" && (
        <path
          d="M86 122q14 3 28 0"
          fill="none"
          stroke={lip}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
      {settings.mouthStyle === "grin" && (
        <path d="M82 117q18 17 36 0-2 17-18 17t-18-17z" fill="#fff" stroke={lip} strokeWidth="2" />
      )}
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
  value = { ...DEFAULT_AVATAR_SETTINGS, ...value };
  const set = <K extends keyof AvatarSettings>(key: K, next: AvatarSettings[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <section className="game-card mt-5 overflow-hidden p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/30 bg-gradient-to-b from-violet-500/15 via-cyan-400/10 to-background/50 p-4 lg:sticky lg:top-20 lg:self-start">
          <div className="absolute inset-x-8 top-8 h-32 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative transition-transform duration-300 hover:scale-[1.03]">
            <CustomAvatar settings={value} size={200} />
          </div>
          <p className="mt-3 flex items-center gap-1 text-[.6rem] font-black uppercase tracking-[.16em] text-primary">
            <Sparkles className="size-3" />
            3D live preview
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
            {saving ? "Saving…" : "Save my 3D avatar"}
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
