import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, ChevronLeft, Dices, Gem, Radio, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip, Label } from "@/components/game/ArcadeSetup";
import { DIFFICULTIES } from "@/lib/fanzeno";
import { arcadeRoomAction } from "@/lib/arcadeRooms.functions";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/lib/entitlements";

type Search = { code?: string };

export const Route = createFileRoute("/arcade_/rooms")({
  validateSearch: (raw: Record<string, unknown>): Search =>
    typeof raw["code"] === "string" && raw["code"] ? { code: raw["code"].toUpperCase() } : {},
  head: () => ({
    meta: [
      { title: "Online arcade rooms — Fanzeno" },
      {
        name: "description",
        content:
          "Host or join a private realtime room for Quiz Ludo, Snakes & Ladders or Sports Mastermind. Server-checked answers, 2–4 players.",
      },
      { property: "og:title", content: "Online arcade rooms — Fanzeno" },
      { property: "og:description", content: "Private realtime sports quiz rooms with server-checked answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomsPage,
});

const MODES = [
  { slug: "quiz-snakes-ladders", name: "Snakes & Ladders", icon: TrendingUp, pro: false, tone: "text-primary bg-primary/12" },
  { slug: "quiz-ludo", name: "Quiz Ludo", icon: Dices, pro: true, tone: "text-gold bg-gold/12" },
  { slug: "sports-mastermind", name: "Sports Mastermind", icon: Brain, pro: true, tone: "text-gold bg-gold/12" },
] as const;

function RoomsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { pro } = useEntitlements();
  const [mode, setMode] = useState<(typeof MODES)[number]["slug"]>("quiz-snakes-ladders");
  const [players, setPlayers] = useState(4);
  const [difficulty, setDifficulty] = useState(2);
  const { code: invited } = Route.useSearch();
  const [code, setCode] = useState(invited ?? "");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const selected = MODES.find((m) => m.slug === mode)!;
  const hostLocked = selected.pro && !pro;

  const create = async () => {
    setBusy("create");
    try {
      const { room } = await arcadeRoomAction({ data: { action: "create", mode, maxPlayers: players, difficulty } });
      if (room) void navigate({ to: "/arcade/rooms/$id", params: { id: room.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create room");
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) {
      toast.error("Enter a room code like FZ-9K2P");
      return;
    }
    setBusy("join");
    try {
      const { room } = await arcadeRoomAction({ data: { action: "join", code: clean } });
      if (room) void navigate({ to: "/arcade/rooms/$id", params: { id: room.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not join room");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" asChild>
          <Link to="/arcade">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <p className="eyebrow">Realtime multiplayer</p>
          <h1 className="mt-1 text-3xl">Arcade rooms</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-destructive">
          <Radio className="size-3" /> Live
        </span>
      </div>

      {!loading && !user && (
        <div className="panel mt-6 p-5">
          <p className="text-sm text-muted-foreground">
            Rooms reserve a seat for you and keep your question history, so you need to be signed in.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in to play online</Link>
          </Button>
        </div>
      )}

      <div className="panel mt-6 p-5">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gold">Have an invite?</p>
        <h2 className="mt-1 text-2xl">Join with a room code</h2>
        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && void join()}
            maxLength={9}
            placeholder="FZ-9K2P"
            aria-label="Room code"
            className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background/60 px-4 font-display text-xl tracking-[0.2em] outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <Button className="h-12 px-6 font-bold uppercase tracking-[0.14em]" disabled={!user || busy !== null} onClick={() => void join()}>
            {busy === "join" ? "Joining…" : "Join"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Free players can join a Pro host&apos;s invited private game.</p>
      </div>

      <Label>Create a room</Label>
      <div className="space-y-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const on = m.slug === mode;
          return (
            <button
              key={m.slug}
              type="button"
              onClick={() => setMode(m.slug)}
              aria-pressed={on}
              className={`panel flex w-full items-center gap-3 p-3 text-left transition-colors ${on ? "border-primary" : "hover:border-primary/50"}`}
            >
              <span className={`grid size-11 place-items-center rounded-xl ${m.tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-xl">{m.name}</span>
                  {m.pro && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.16em] text-gold">
                      <Gem className="size-2.5" /> Pro host
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">2–4 players · own subjects · live spectator view</span>
              </span>
            </button>
          );
        })}
      </div>

      <Label>Room size</Label>
      <div className="flex flex-wrap gap-2">
        {[2, 3, 4].map((n) => (
          <Chip key={n} on={players === n} onClick={() => setPlayers(n)}>
            {n} players
          </Chip>
        ))}
      </div>
      <Label>Difficulty</Label>
      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <Chip key={d.level} on={difficulty === d.level} onClick={() => setDifficulty(d.level)}>
            {d.label}
          </Chip>
        ))}
      </div>

      <p className="mt-6 flex items-start gap-2 rounded-xl border border-border bg-surface/60 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Questions, turns and answers are controlled by the server. Reconnecting players return to their reserved seat.
      </p>

      {hostLocked ? (
        <Button asChild size="lg" className="mt-6 w-full font-bold uppercase tracking-[0.14em]" variant="outline">
          <Link to="/upgrade">
            <Gem className="size-4 text-gold" /> Unlock Pro to host {selected.name}
          </Link>
        </Button>
      ) : (
        <Button
          size="lg"
          className="mt-6 w-full font-bold uppercase tracking-[0.14em]"
          disabled={!user || busy !== null}
          onClick={() => void create()}
        >
          {busy === "create" ? "Creating…" : "Create private room"} <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
