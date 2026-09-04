import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ArcadePresenceState = "online" | "background" | "reconnecting" | "offline";

type PresenceRow = {
  user_id: string;
  connection_id: string;
  status: ArcadePresenceState;
  last_seen_at: string;
};

const HEARTBEAT_MS = 12_000;
const STALE_MS = 35_000;

function connectionId() {
  return crypto.randomUUID();
}

function deviceId() {
  const key = "fanzeno-device-id";
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

async function fetchPresence(roomId: string): Promise<PresenceRow[]> {
  const { data, error } = await supabase
    .from("arcade_presence")
    .select("user_id, connection_id, status, last_seen_at")
    .eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as PresenceRow[];
}

/** Maintains this device's heartbeat and folds multiple tabs into one player status. */
export function useArcadePresence(roomId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient();
  const [connection] = useState(connectionId);
  const [now, setNow] = useState(Date.now());
  const queryKey = ["arcade-presence", roomId] as const;
  const { data = [] } = useQuery({
    queryKey,
    queryFn: () => fetchPresence(roomId!),
    enabled: !!roomId && !!userId,
    refetchInterval: HEARTBEAT_MS,
  });

  useEffect(() => {
    if (!roomId || !userId) return;
    const write = async (status: ArcadePresenceState) => {
      await supabase.from("arcade_presence").upsert(
        {
          room_id: roomId,
          user_id: userId,
          connection_id: connection,
          device_id: deviceId(),
          status,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "room_id,user_id,connection_id" },
      );
    };
    const currentStatus = (): ArcadePresenceState =>
      document.visibilityState === "hidden"
        ? "background"
        : navigator.onLine
          ? "online"
          : "reconnecting";
    const heartbeat = () => void write(currentStatus());
    const visibility = () => heartbeat();
    const offline = () => void write("reconnecting");
    const online = () => void write("online");

    heartbeat();
    const timer = window.setInterval(heartbeat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      void supabase
        .from("arcade_presence")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .eq("connection_id", connection);
    };
  }, [connection, roomId, userId]);

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

  const byUser = useMemo(() => {
    const result = new Map<string, ArcadePresenceState>();
    for (const row of data) {
      const fresh = now - new Date(row.last_seen_at).getTime() <= STALE_MS;
      const status: ArcadePresenceState = fresh ? row.status : "offline";
      const existing = result.get(row.user_id);
      if (status === "online" || !existing || existing === "offline")
        result.set(row.user_id, status);
    }
    return result;
  }, [data, now]);

  return {
    byUser,
    myStatus:
      typeof navigator === "undefined" || !navigator.onLine
        ? "reconnecting"
        : (byUser.get(userId ?? "") ?? "online"),
  };
}
