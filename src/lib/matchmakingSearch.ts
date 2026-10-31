/**
 * Single-flight matchmaking controller.
 *
 * A stale matchmaking RPC can resolve after a player cancels. We must suppress
 * navigation AND wait for that RPC to settle before deleting its queue ticket,
 * otherwise a late poll can recreate the ticket after cancellation.
 *
 * This utility is intentionally independent of React/Supabase so it can be
 * exercised with deterministic deferred promises in the logic test suite.
 */
export type MatchmakingPollResult = { roomId?: string | null; queued?: boolean };

export type MatchmakingSearchOptions = {
  poll: () => Promise<MatchmakingPollResult>;
  cancel: () => Promise<unknown>;
  onMatch: (roomId: string) => void;
  onError: (error: unknown) => void;
  intervalMs?: number;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearScheduled?: (handle: ReturnType<typeof setTimeout>) => void;
};

export function createMatchmakingSearch({
  poll,
  cancel,
  onMatch,
  onError,
  intervalMs = 2_500,
  schedule = setTimeout,
  clearScheduled = clearTimeout,
}: MatchmakingSearchOptions) {
  let phase: "idle" | "searching" | "stopping" | "matched" | "uncertain" = "idle";
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Promise<MatchmakingPollResult> | null = null;
  let stopping: Promise<void> | null = null;

  const clearTimer = () => {
    if (timer !== null) clearScheduled(timer);
    timer = null;
  };

  const stop = (): Promise<void> => {
    if (stopping) return stopping;
    if (phase !== "searching" && phase !== "uncertain") return Promise.resolve();
    phase = "stopping";
    generation += 1;
    clearTimer();
    const outstanding = pending;
    const cleanup = async () => {
      try {
        // Always delete the ticket *after* the last write-making poll has settled.
        if (outstanding) await outstanding.catch(() => undefined);
        await cancel();
        phase = "idle";
      } catch (error) {
        // The ticket may still exist. Keep a retryable state rather than
        // pretending cancellation succeeded and starting a second search.
        phase = "uncertain";
        throw error;
      } finally {
        stopping = null;
      }
    };
    stopping = cleanup();
    return stopping;
  };

  const tick = (run: number) => {
    if (phase !== "searching" || run !== generation || pending) return;
    const request = Promise.resolve().then(poll);
    pending = request;
    void request
      .then(
        (result) => {
          if (phase !== "searching" || run !== generation) return;
          if (result.roomId) {
            phase = "matched";
            generation += 1;
            clearTimer();
            onMatch(result.roomId);
          } else {
            timer = schedule(() => {
              timer = null;
              tick(run);
            }, Math.max(50, intervalMs));
          }
        },
        (error) => {
          if (phase !== "searching" || run !== generation) return;
          // Clean up a possibly written ticket even when the RPC fails.
          // Suppress navigation from any response that arrives during cleanup.
          void stop().then(() => onError(error), (cleanupError) => onError(cleanupError));
        },
      )
      .catch(onError)
      .finally(() => {
        if (pending === request) pending = null;
      });
  };

  return {
    start(): boolean {
      if (phase !== "idle" || stopping) return false;
      phase = "searching";
      tick(++generation);
      return true;
    },
    stop,
    isSearching: () => phase === "searching",
    needsCleanup: () => phase === "uncertain",
  };
}
