import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notification = {
  id: string;
  kind: "turn" | "room" | "daily" | "streak" | "tournament" | "achievement" | "system";
  title: string;
  body: string;
  route: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPrefs = {
  match_turns: boolean;
  room_invites: boolean;
  daily_challenge: boolean;
  streak_risk: boolean;
  tournaments: boolean;
  product_news: boolean;
  sound: boolean;
  quiet_hours: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  match_turns: true,
  room_invites: true,
  daily_challenge: true,
  streak_risk: true,
  tournaments: true,
  product_news: false,
  sound: true,
  quiet_hours: true,
  quiet_start: "22:00",
  quiet_end: "08:00",
  timezone: "Europe/London",
};

/** Realtime in-app inbox for the signed-in player (rows are written server-side by triggers). */
export function useNotifications(limit = 40) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_notifications")
      .select("id, kind, title, body, route, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel(`inbox:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
      await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase.from("user_notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user]);

  const unread = items.filter((n) => !n.read_at).length;
  return { items, unread, loading, markRead, markAllRead, reload: load };
}

export function useNotificationPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const { user_id: _u, updated_at: _t, ...rest } = data as NotificationPrefs & { user_id: string; updated_at: string };
          setPrefs({ ...DEFAULT_PREFS, ...rest, quiet_start: rest.quiet_start.slice(0, 5), quiet_end: rest.quiet_end.slice(0, 5) });
        }
        setLoaded(true);
      });
  }, [user]);

  const update = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      if (!user) return;
      await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    },
    [prefs, user],
  );

  return { prefs, update, loaded };
}
