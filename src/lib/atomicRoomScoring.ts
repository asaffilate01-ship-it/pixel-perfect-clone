/**
 * Rollout gate for a Fanzeno-only scoring RPC.
 *
 * Deliberately fails closed: only the exact literal "enabled" enables the
 * database proposal after a reviewed migration and two-account acceptance.
 * Never fall back to non-atomic scoring when an enabled RPC fails.
 */
export function atomicRoomScoringEnabled(flag: string | undefined): boolean {
  return flag === "enabled";
}

/** Only explicit, correctly shaped settled results may leave a server handler. */
export type AtomicRoomScoreResult = {
  correct: boolean;
  movement: number;
  usedClue: boolean;
  answer: string;
  duplicate: boolean;
  roomStateChanged: boolean;
};

export function parseAtomicRoomScoreResult(result: unknown): AtomicRoomScoreResult {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Invalid atomic scoring response from Fanzeno database");
  }
  const row = result as Record<string, unknown>;
  if (
    typeof row["correct"] !== "boolean" ||
    typeof row["movement"] !== "number" ||
    !Number.isInteger(row["movement"]) ||
    ![0, 5, 6].includes(row["movement"]) ||
    typeof row["usedClue"] !== "boolean" ||
    typeof row["answer"] !== "string" ||
    typeof row["duplicate"] !== "boolean" ||
    typeof row["roomStateChanged"] !== "boolean"
  ) {
    throw new Error("Invalid atomic scoring response from Fanzeno database");
  }
  return {
    correct: row["correct"],
    movement: row["movement"],
    usedClue: row["usedClue"],
    answer: row["answer"],
    duplicate: row["duplicate"],
    roomStateChanged: row["roomStateChanged"],
  };
}
