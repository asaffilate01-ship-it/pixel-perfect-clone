import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  summarizeArcadePresence,
  type ArcadePresenceState,
  type ArcadePresenceSignal,
} from "@/lib/arcadePresenceState";

export type { ArcadePresenceState } from "@/lib/arcadePresenceState";

type PresenceRow = ArcadePresenceSignal & { connection_id: string };

const HEARTBEAT_MS = 12_000;
const STALE_MS = 35_000;

function connectionId() {
  return crypto.randomUUID();
}

function deviceId(fallback: string) {
  try {
    const key = "fanzeno-device-id";
    const saved = window.localStorage.getItem(key);
    if (saved) return saved;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    // Browsers can disable local storage. Presence must still work for this
    // session; the connection ID remains unique without persistent storage.
    return fallback;
  }
}

async function fetchPresence(roomId: string): Promise<PresenceRow[]> {
  const { data, error } = await supabase
    .from("arcade_presence")
    .select("user_id, connection_id, status, last_seen_at")
    .eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as PresenceRow[];
}

/** Maintains a connection heartbeat and combines multiple tabs per player. */
export function useArcadePresence(roomId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  const [connection] = useState(connectionId);
  const [now, setNow] = useState(Date.now());
  const [writeFailed, setWriteFailed] = useState(true);
  const queryKey = ["arcade-presence", roomId] as const;
  const { data = [], isError } = useQuery({
    queryKey,
    queryFn: () => fetchPresence(roomId!),
    enabled: !!roomId && !!userId,
    refetchInterval: HEARTBEAT_MS,
  });

  useEffect(() => {
    if (!roomId || !userId) return;
    let stopped = false;
    let inFlight: Promise<void> | null = null;
    let dirty = false;
    const localDeviceId = deviceId(connection);
    setWriteFailed(true);

    const currentStatus = (): ArcadePresenceState =>
      !navigator.onLine
        ? "offline"
        : document.visibilityState === "hidden"
          ? "background"
          : "online";

    const write = async () => {
      try {
        const { error } = await supabase.from("arcade_presence").upsert(
          {
            room_id: roomId,
            user_id: userId,
            connection_id: connection,
            device_id: localDeviceId,
            status: currentStatus(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "room_id,user_id,connection_id" },
        );
        if (error) throw error;
        if (!stopped) {
          setWriteFailed(false);
          void qc.invalidateQueries({ queryKey: ["arcade-presence", roomId] });
        }
      } catch {
        if (!stopped) setWriteFailed(true);
      } finally {
        inFlight = null;
        if (dirty && !stopped) {
          dirty = false;
          heartbeat();
        }
      }
    };

    const heartbeat = () => {
      if (stopped) return;
      if (inFlight) {
        dirty = true;
        return;
      }
      inFlight = write();
    };
    const visibility = () => heartbeat();
    const offline = () => {
      setWriteFailed(true);
      heartbeat();
    };
    const online = () => heartbeat();

    heartbeat();
    const timer = window.setInterval(heartbeat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      stopped = true;
      dirty = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      const outstanding = inFlight;
      // Never delete an old connection before its in-flight upsert completes;
      // otherwise a delayed write can resurrect a ghost online player.
      void (async () => {
        try {
          if (outstanding) await outstanding;
          await supabase
            .from("arcade_presence")
            .delete()
            .eq("room_id", roomId)
            .eq("user_id", userId)
            .eq("connection_id", connection);
        } catch {
          // Missing cleanup will age out at STALE_MS; do not throw on unmount.
        }
      })();
    };
  }, [connection, roomId, userId, qc]);

  useEffect(() => {
    if (!roomId || !userId) return;
    const channel = supabase
      .channel(`arcade-presence-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arcade_presence", filter: `room_id=eq.${roomId}` },
        () => void qc.invalidateQueries({ queryKey: ["arcade-presence", roomId] }),
      )
      .subscribe();
    const clock = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      window.clearInterval(clock);
      void supabase.removeChannel(channel);
    };
  }, [qc, roomId, userId]);

  const byUser = useMemo(
    () => summarizeArcadePresence(data, now, STALE_MS),
    [data, now],
  );

  const browserOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const browserHidden = typeof document !== "undefined" && document.visibilityState === "hidden";
  const myStatus: ArcadePresenceState =
    !roomId || !userId || browserOffline
      ? "offline"
      : writeFailed || isError
        ? "reconnecting"
        : browserHidden
          ? "background"
          : (byUser.get(userId) ?? "reconnecting");

  return { byUser, myStatus };
}
