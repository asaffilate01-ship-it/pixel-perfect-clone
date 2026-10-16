/** Shared room-state rules. Persist `complete` (the Supabase constraint value). */
export const ROOM_COMPLETE_STATUS = "complete" as const;

/** `finished` is read for backward compatibility with older client snapshots. */
export function isArcadeRoomComplete(status: string | null | undefined): boolean {
  return status === ROOM_COMPLETE_STATUS || status === "finished";
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
