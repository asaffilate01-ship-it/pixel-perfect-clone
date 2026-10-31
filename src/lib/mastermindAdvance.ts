/**
 * One authoritative advancement request at a time per timed room turn.
 * A completed request is never repeated while a stale room snapshot lingers.
 * Temporary failures back off, while a manual retry can override that delay.
 */
export function createTurnAdvanceGate(retryMs = 8_000) {
  let key: string | null = null;
  let pending = false;
  let completed = false;
  let retryAt = 0;

  return {
    claim(turnKey: string, nowMs: number, force = false): boolean {
      if (!turnKey || !Number.isFinite(nowMs)) return false;
      if (turnKey !== key) {
        key = turnKey;
        pending = false;
        completed = false;
        retryAt = 0;
      }
      if (pending || completed || (!force && nowMs < retryAt)) return false;
      pending = true;
      return true;
    },
    finish(turnKey: string, success: boolean, nowMs: number): void {
      if (turnKey !== key || !pending) return;
      pending = false;
      completed = success;
      retryAt = success ? Number.POSITIVE_INFINITY : nowMs + Math.max(1_000, retryMs);
    },
  };
}

/** Keep the previous Mastermind export stable while sharing the same gate with Quiz Race. */
export const createMastermindAdvanceGate = createTurnAdvanceGate;

/** Use ceil so an active turn isn't called expired up to 999ms early. */
export function remainingTurnSeconds(endsAt: string | null, nowMs: number): number | null {
  const end = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isFinite(end) || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.ceil((end - nowMs) / 1_000));
}

export const remainingMastermindSeconds = remainingTurnSeconds;

/** Only the active player or room host can recover an active room's turn. */
export function canAdvanceMastermindTurn(
  userId: string | null | undefined,
  hostId: string | null | undefined,
  activeUserId: string | null | undefined,
  roomStatus: string | null | undefined,
): boolean {
  return roomStatus === "active" && !!userId &&
    (userId === hostId || userId === activeUserId);
}
