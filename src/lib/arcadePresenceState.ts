/** Pure, order-independent aggregation of realtime presence across tabs/devices. */
export type ArcadePresenceState = "online" | "background" | "reconnecting" | "offline";
export type ArcadePresenceSignal = {
  user_id: string;
  status: ArcadePresenceState;
  last_seen_at: string;
};

const PRIORITY: Record<ArcadePresenceState, number> = {
  offline: 0,
  reconnecting: 1,
  background: 2,
  online: 3,
};

/**
 * A stale, malformed or implausibly future-dated heartbeat is offline.
 * A single online connection must beat another tab being in the background.
 */
export function summarizeArcadePresence(
  rows: readonly ArcadePresenceSignal[],
  nowMs: number,
  staleMs = 35_000,
): Map<string, ArcadePresenceState> {
  const byUser = new Map<string, ArcadePresenceState>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const seenAt = Date.parse(row.last_seen_at);
    const fresh =
      Number.isFinite(nowMs) &&
      Number.isFinite(seenAt) &&
      Number.isFinite(staleMs) &&
      staleMs > 0 &&
      seenAt <= nowMs + 5_000 &&
      nowMs - seenAt <= staleMs;
    const status: ArcadePresenceState =
      fresh && Object.hasOwn(PRIORITY, row.status) ? row.status : "offline";
    const current = byUser.get(row.user_id);
    if (!current || PRIORITY[status] > PRIORITY[current]) {
      byUser.set(row.user_id, status);
    }
  }
  return byUser;
}
