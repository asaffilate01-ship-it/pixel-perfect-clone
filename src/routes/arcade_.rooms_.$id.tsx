import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Clock, Copy, Eye, Lock, Play, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/lib/entitlements";
import { fetchCompetitions, fetchSports, groupCompetitions } from "@/lib/fanzeno";
import { SportPicker } from "@/components/game/SportPicker";
import { FairnessNote } from "@/components/game/ArcadeSetup";
import { fetchRoom, fetchRoomPlayers, modeName } from "@/lib/arcadeQuiz";
import { arcadeRoomAction, type ArcadeRoomInput } from "@/lib/arcadeRooms.functions";
import { Avatar, AvatarPicker } from "@/components/game/AvatarPicker";
import { ConnectionBanner, PresenceDot } from "@/components/game/RoomPresence";
import { useArcadePresence } from "@/hooks/useArcadePresence";

export const Route = createFileRoute("/arcade_/rooms_/$id")({
  head: () => ({
    meta: [
      { title: "Private arcade room — Fanzeno" },
      {
        name: "description",
        content:
          "Waiting room for a private Fanzeno arcade match. Pick your subject, mark ready, and the host starts.",
      },
      { property: "og:title", content: "Private arcade room — Fanzeno" },
      { property: "og:description", content: "Private realtime sports quiz room." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomLobby,
});

function RoomLobby() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const { pro } = useEntitlements();
  const { data: room } = useQuery({
    queryKey: ["arcade-room", id],
    queryFn: () => fetchRoom(id),
    enabled: !!user,
  });
  const { data: players = [] } = useQuery({
    queryKey: ["arcade-room-players", id],
    queryFn: () => fetchRoomPlayers(id),
    enabled: !!user,
  });
  const { data: sports = [] } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: competitions = [] } = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });
  const [busy, setBusy] = useState(false);
  const presence = useArcadePresence(user ? id : undefined, user?.id);

  const me = players.find((p) => p.user_id === user?.id);
  const isHost = room?.host_id === user?.id;
  const max = room?.settings?.max_players ?? 4;

  const launch = (mode: string) => {
    if (mode === "sports-mastermind")
      void navigate({ to: "/arcade/mastermind", search: { room: id }, replace: true });
    else
      void navigate({
        to: "/arcade/quiz-race",
        search: { game: mode === "quiz-ludo" ? "ludo" : "snakes", room: id },
        replace: true,
      });
  };

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["arcade-room-players", id] });
      void qc.invalidateQueries({ queryKey: ["arcade-room", id] });
    };
    const channel = supabase
      .channel(`arcade-room-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arcade_room_players", filter: `room_id=eq.${id}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "arcade_rooms", filter: `id=eq.${id}` },
        (e) => {
          refresh();
          const next = e.new as { status?: string; mode_slug?: string };
          if (next.status === "active" && next.mode_slug) launch(next.mode_slug);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    if (room?.status === "active") launch(room.mode_slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  const act = async (data: ArcadeRoomInput) => {
    setBusy(true);
    try {
      await arcadeRoomAction({ data });
      await qc.invalidateQueries({ queryKey: ["arcade-room-players", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Room update failed");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/arcade/rooms?code=${room.code}`,
      );
      toast.success(`Invite link copied · ${room.code}`);
    } catch {
      toast(`Room code: ${room.code}`);
    }
  };

  if (!loading && !user) {
    return (
      <Shell title="Private room">
        <div className="panel mt-6 p-5">
          <p className="text-sm text-muted-foreground">Sign in to take your seat in this room.</p>
          <Button asChild className="mt-4">
            <Link to="/auth" search={{ next: `/arcade/rooms/${id}` }}>
              Sign in
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const myCategories = me?.sport_id
    ? groupCompetitions(competitions.filter((c) => c.sport_id === me.sport_id))
    : [];

  return (
    <Shell title={room ? modeName(room.mode_slug) : "Private room"}>
      <ConnectionBanner status={presence.myStatus} />
      <div className="panel mt-6 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Room code
          </p>
          <p className="font-display text-4xl tracking-[0.18em]">{room?.code ?? "……"}</p>
        </div>
        <Button variant="outline" onClick={() => void copyCode()} disabled={!room}>
          <Copy className="size-4" /> Invite
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
        <span className="text-primary">● Waiting for players</span>
        <span className="text-muted-foreground">
          {players.length}/{max}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {Array.from({ length: max }, (_, seat) => {
          const p = players.find((x) => x.seat === seat);
          if (!p) {
            return (
              <div
                key={seat}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-3 opacity-70"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-surface">
                  <UserPlus className="size-4 text-muted-foreground" />
                </span>
                <div>
                  <p className="text-sm font-bold">Open seat {seat + 1}</p>
                  <p className="text-xs text-muted-foreground">Waiting for an invited player…</p>
                </div>
              </div>
            );
          }
          const ready = p.status === "ready";
          const sportName = sports.find((s) => s.id === p.sport_id)?.name ?? "All sports";
          return (
            <div
              key={seat}
              className={`panel flex items-center gap-3 p-3 ${ready ? "border-primary/60" : ""}`}
            >
              <Avatar id={p.avatar_id} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <PresenceDot status={presence.byUser.get(p.user_id)} />
                  <span className="truncate">{p.display_name}</span>
                  {p.user_id === room?.host_id && (
                    <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.16em] text-gold">
                      Host
                    </span>
                  )}
                  {p.user_id === user?.id && (
                    <span className="text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
                      you
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sportName} ·{" "}
                  {p.category_key
                    ? myCategoryLabel(competitions, p.sport_id, p.category_key)
                    : "All categories"}
                </p>
              </div>
              <span
                className={`grid size-8 place-items-center rounded-full ${ready ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
              >
                {ready ? <Check className="size-4" /> : <Clock className="size-4" />}
              </span>
            </div>
          );
        })}
      </div>

      {me && (
        <div className="panel mt-4 p-4">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Your seat
          </p>
          <AvatarPicker
            value={me.avatar_id}
            pro={pro}
            onChange={(avatarId) => void act({ action: "settings", roomId: id, avatarId })}
          />
          <p className="mt-3 text-[0.58rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Your subject
          </p>
          <div className="mt-2">
            <SportPicker
              sports={sports}
              value={sports.find((s) => s.id === me.sport_id)?.slug ?? ""}
              onChange={(slug) => {
                const picked = sports.find((s) => s.slug === slug);
                if (picked)
                  void act({
                    action: "settings",
                    roomId: id,
                    sportId: picked.id,
                    categoryKey: null,
                  });
              }}
              compact
            />
          </div>
          {myCategories.length > 0 && (
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => void act({ action: "settings", roomId: id, categoryKey: null })}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] ${
                  !me.category_key
                    ? "border-gold bg-gold/15 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                All categories
              </button>
              {myCategories.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => void act({ action: "settings", roomId: id, categoryKey: g.key })}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] ${
                    me.category_key === g.key
                      ? "border-gold bg-gold/15 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
          <FairnessNote />
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Eye className="mt-0.5 size-4 shrink-0 text-gold" />
        Players see the active question and the submitted answer, but only the active player&apos;s
        device can answer.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          variant={me?.status === "ready" ? "default" : "outline"}
          className="flex-1 font-bold uppercase tracking-[0.14em]"
          disabled={!me || busy}
          onClick={() => void act({ action: "ready", roomId: id, ready: me?.status !== "ready" })}
        >
          <Check className="size-4" /> {me?.status === "ready" ? "Ready" : "Mark me ready"}
        </Button>
        {isHost && (
          <Button
            className="flex-1 font-bold uppercase tracking-[0.14em]"
            disabled={busy || players.length < 2 || players.some((p) => p.status !== "ready")}
            onClick={() => void act({ action: "start", roomId: id })}
          >
            <Play className="size-4" /> Start match
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        className="mt-2 w-full text-muted-foreground"
        disabled={busy}
        onClick={async () => {
          await act({ action: "leave", roomId: id });
          void navigate({ to: "/arcade/rooms" });
        }}
      >
        Leave room
      </Button>
    </Shell>
  );
}

function myCategoryLabel(
  competitions: Array<{
    sport_id: string;
    category_key: string | null;
    category_label: string | null;
  }>,
  sportId: string | null,
  key: string,
) {
  return (
    competitions.find((c) => c.sport_id === sportId && c.category_key === key)?.category_label ??
    key
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" asChild>
          <Link to="/arcade/rooms">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <p className="eyebrow">Private arcade room</p>
          <h1 className="mt-1 text-3xl">{title}</h1>
        </div>
        <Lock className="size-5 text-primary" />
      </div>
      {children}
    </div>
  );
}
