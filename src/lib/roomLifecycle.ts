/** Shared room-state rules. Persist `complete` (the Supabase constraint value). */
export const ROOM_COMPLETE_STATUS = "complete" as const;

/** `finished` is read for backward compatibility with older client snapshots. */
export function isArcadeRoomComplete(status: string | null | undefined): boolean {
  return status === ROOM_COMPLETE_STATUS || status === "finished";
}

/** The first turn belongs to the first *occupied* seat, not always seat zero. */
export function firstOccupiedSeat(seats: readonly number[]): number {
  if (
    seats.length < 2 || seats.length > 4 ||
    new Set(seats).size !== seats.length ||
    seats.some((seat) => !Number.isInteger(seat) || seat < 0 || seat > 3)
  ) {
    throw new Error("Invalid occupied room seats");
  }
  return Math.min(...seats);
}

/** Advance a 2–4 player Mastermind room in seat order without skipping seats. */
export function nextMastermindTurn(
  seats: readonly number[],
  activeSeat: number,
  roundNo: number,
  maxRounds = 2,
): { seat: number; round: number; complete: boolean } {
  const ordered = [...new Set(seats)].sort((a, b) => a - b);
  if (ordered.length < 2 || ordered.length > 4 ||
      ordered.some((seat) => !Number.isInteger(seat) || seat < 0 || seat > 3) ||
      !Number.isInteger(roundNo) || roundNo < 1 ||
      !Number.isInteger(maxRounds) || maxRounds < 1 ||
      !ordered.includes(activeSeat)) {
    throw new Error("Invalid active room seats or round");
  }
  const index = ordered.indexOf(activeSeat);
  const wraps = index === ordered.length - 1;
  const round = roundNo + (wraps ? 1 : 0);
  return {
    seat: wraps ? ordered[0]! : ordered[index + 1]!,
    round,
    complete: round > maxRounds,
  };
}


/**
 * Verify a ranked room question against server-controlled room/player settings.
 * Client-provided difficulty and sport/category are never authorization.
 * Mastermind's second round is deliberately all-sports (unfiltered).
 */
export function assertRoomQuestionScope(
  room: { modeSlug: string; roundNo: number; difficulty: number },
  player: { sportId: string | null; categoryKey: string | null },
  requested: { sportId: string; categoryKey: string | null; difficulty: number },
): void {
  assertRoomAnswerDifficulty(room.difficulty, requested.difficulty);
  if (!Number.isInteger(room.roundNo) || room.roundNo < 1) {
    throw new Error("Invalid room round");
  }
  if (room.modeSlug === "sports-mastermind" && room.roundNo >= 2) {
    if (requested.categoryKey !== null) {
      throw new Error("All-sports rounds cannot be filtered by category");
    }
    return;
  }
  if (!player.sportId || requested.sportId !== player.sportId) {
    throw new Error("Question sport does not match your room selection");
  }
  if (requested.categoryKey !== player.categoryKey) {
    throw new Error("Question category does not match your room selection");
  }
}

/** Prevent a modified client from reporting a higher ranked difficulty. */
export function assertRoomAnswerDifficulty(roomDifficulty: number, submittedDifficulty: number): void {
  if (
    !Number.isInteger(roomDifficulty) ||
    roomDifficulty < 1 ||
    roomDifficulty > 4 ||
    submittedDifficulty !== roomDifficulty
  ) {
    throw new Error("Question difficulty does not match the room");
  }
}

/**
 * Safe spectator projection. Never return answer rules, answers, source metadata
 * or submissions through the active-question endpoint.
 */
export function publicRoomQuestion(row: {
  id: string;
  prompt_i18n: Record<string, string> | null;
  issued_at: string;
}): { id: string; prompt: string; issuedAt: string } {
  return {
    id: row.id,
    prompt: typeof row.prompt_i18n?.["en"] === "string" ? row.prompt_i18n["en"] : "",
    issuedAt: row.issued_at,
  };
}
