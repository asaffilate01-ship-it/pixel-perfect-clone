/**
 * The lobby avatar roster is an entitlement, not client-side decoration.
 * Only these IDs may be stored on an online room player's profile.
 *
 * Keep in sync with src/components/game/AvatarPicker.tsx.
 */
export const FREE_ROOM_AVATARS = [
  "captain", "playmaker", "striker", "champion",
  "ace", "racer", "legend", "challenger",
] as const;

export const PRO_ROOM_AVATARS = [
  "veteran", "maverick", "rookie", "allstar",
] as const;

const LEGACY_ROOM_AVATARS: Readonly<Record<string, string>> = {
  batter: "playmaker",
  fighter: "challenger",
  hoops: "playmaker",
  rocket: "maverick",
  lion: "veteran",
  eagle: "allstar",
};

const FREE = new Set<string>(FREE_ROOM_AVATARS);
const PRO = new Set<string>(PRO_ROOM_AVATARS);

/** Resolve retired IDs to the canonical active avatar, or reject unknown values. */
export function canonicalRoomAvatarId(input: string): string | null {
  const id = LEGACY_ROOM_AVATARS[input] ?? input;
  return FREE.has(id) || PRO.has(id) ? id : null;
}

export function roomAvatarNeedsPro(canonicalId: string): boolean {
  return PRO.has(canonicalId);
}

/** Use only after a server-verified entitlement check. */
export function authorizeRoomAvatar(id: string, verifiedPro: boolean): string {
  const canonical = canonicalRoomAvatarId(id);
  if (!canonical) throw new Error("Unknown Fanzeno room avatar");
  if (roomAvatarNeedsPro(canonical) && !verifiedPro) {
    throw new Error("Fanzeno Pro is required for this avatar");
  }
  return canonical;
}
