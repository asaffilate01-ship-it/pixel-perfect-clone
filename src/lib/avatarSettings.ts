export type AvatarSettings = {
  skin: string;
  hairStyle:
    "short" | "waves" | "mohawk" | "covered" | "buzz" | "curls" | "afro" | "long" | "bun" | "bald";
  hairColor: string;
  facialHair: "none" | "stubble" | "moustache" | "goatee" | "boxed" | "beard";
  eyeColor: string;
  glasses: boolean;
  glassesStyle: "round" | "square" | "sport";
  makeup: "none" | "natural" | "bold";
  clothesColor: string;
  faceShape: "oval" | "round" | "square";
  browStyle: "soft" | "straight" | "bold";
  noseStyle: "small" | "classic" | "wide";
  mouthStyle: "smile" | "neutral" | "grin";
  outfitStyle: "tee" | "hoodie" | "jersey";
  accessory: "none" | "stud" | "hoop";
};

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  skin: "#B97850",
  hairStyle: "short",
  hairColor: "#24170F",
  facialHair: "none",
  eyeColor: "#3B2416",
  glasses: false,
  glassesStyle: "round",
  makeup: "none",
  clothesColor: "#18A66A",
  faceShape: "oval",
  browStyle: "soft",
  noseStyle: "classic",
  mouthStyle: "smile",
  outfitStyle: "jersey",
  accessory: "none",
};

export function parseAvatarSettings(value: unknown): AvatarSettings {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR_SETTINGS;
  return { ...DEFAULT_AVATAR_SETTINGS, ...(value as Partial<AvatarSettings>) };
}
