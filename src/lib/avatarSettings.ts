export type AvatarSettings = {
  skin: string;
  hairStyle: "short" | "waves" | "mohawk" | "covered";
  hairColor: string;
  facialHair: "none" | "stubble" | "moustache" | "beard";
  eyeColor: string;
  glasses: boolean;
  makeup: "none" | "natural" | "bold";
  clothesColor: string;
};

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  skin: "#B97850",
  hairStyle: "short",
  hairColor: "#24170F",
  facialHair: "none",
  eyeColor: "#3B2416",
  glasses: false,
  makeup: "none",
  clothesColor: "#18A66A",
};

export function parseAvatarSettings(value: unknown): AvatarSettings {
  if (!value || typeof value !== "object") return DEFAULT_AVATAR_SETTINGS;
  return { ...DEFAULT_AVATAR_SETTINGS, ...(value as Partial<AvatarSettings>) };
}
