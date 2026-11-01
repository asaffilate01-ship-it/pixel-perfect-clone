/**
 * Ranked speed must be based on the timestamp of a server-side reservation,
 * never an untrusted responseMs supplied by a browser.
 */
export function authoritativeResponseMs(
  reservedAt: string | null | undefined,
  nowMs: number,
): number {
  const started = reservedAt ? Date.parse(reservedAt) : NaN;
  if (!Number.isFinite(started) || !Number.isFinite(nowMs) ||
      started > nowMs + 5_000) {
    throw new Error("Missing or invalid verified question reservation time");
  }
  return Math.max(0, Math.min(2_147_483_647, Math.round(nowMs - started)));
}

/** Return code when a concurrent timeout or turn change won the race. */
export function roomTurnWasAlreadyAdvanced(updatedRow: { id: string } | null): boolean {
  return updatedRow === null;
}
