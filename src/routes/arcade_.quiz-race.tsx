import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Dices, Gem, Play, Radio, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSports, DIFFICULTIES } from "@/lib/fanzeno";
import {
  fetchClueBank,
  fetchRoom,
  fetchRoomPlayers,
  JUMPS,
  LADDERS,
  LUDO_HOME,
  LUDO_SAFE,
  SEAT_COLORS,
  SEAT_TEXT,
  SNAKES,
} from "@/lib/arcadeQuiz";
import { Chip, Label, PlayerCard } from "@/components/game/ArcadeSetup";
import { Avatar, AvatarPicker, AVATARS } from "@/components/game/AvatarPicker";
import { QuestionCard, type QuestionOutcome } from "@/components/game/QuestionCard";
import { useEntitlements } from "@/lib/entitlements";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Game = "ludo" | "snakes";
type Search = { game: Game; room?: string };

export const Route = createFileRoute("/arcade_/quiz-race")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    game: raw["game"] === "snakes" ? "snakes" : "ludo",
    ...(typeof raw["room"] === "string" && raw["room"] ? { room: raw["room"] } : {}),
  }),
  head: ({ match }) => {
    const snakes = match.search.game === "snakes";
    const title = snakes ? "Quiz Snakes & Ladders — Fanzeno Arcade" : "Quiz Ludo — Fanzeno Arcade";
    const description = snakes
      ? "Answer sports clues to climb a 100-space board. Ladders lift you, snakes drop you, wrong answers stand still."
      : "Answer a clue first time to move 6, take a hint to move 5. Race four tokens home on the Quiz Ludo board.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: QuizRacePage,
});

type Player = {
  name: string;
  avatar: string;
  sportId: string | null;
  categoryKey: string | null;
  position: number;
  tokens: number[];
  userId?: string;
};

function QuizRacePage() {
  const { game, room: roomId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { pro, loading: entLoading } = useEntitlements();
  const isPro = game === "ludo";
  const online = !!roomId;
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: bank } = useQuery({ queryKey: ["clue-bank"], queryFn: fetchClueBank });
  const { data: room } = useQuery({ queryKey: ["arcade-room", roomId], queryFn: () => fetchRoom(roomId!), enabled: online });
  const { data: roomPlayers } = useQuery({
    queryKey: ["arcade-room-players", roomId],
    queryFn: () => fetchRoomPlayers(roomId!),
    enabled: online,
  });

  const [setup, setSetup] = useState(true);
  const [count, setCount] = useState(2);
  const [difficulty, setDifficulty] = useState(2);
  const [turn, setTurn] = useState(0);
  const [turnKey, setTurnKey] = useState(0);
  const [players, setPlayers] = useState<Player[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      name: `Player ${i + 1}`,
      avatar: AVATARS[i]!.id,
      sportId: null,
      categoryKey: null,
      position: 0,
      tokens: [0, 0, 0, 0],
    })),
  );

  useEffect(() => {
    if (online || !sports?.length) return;
    setPlayers((x) => x.map((p, i) => (p.sportId ? p : { ...p, sportId: sports[i % sports.length]!.id })));
  }, [sports, online]);

  // Online: the room is the source of truth for seats, positions and whose turn it is.
  useEffect(() => {
    if (!online) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["arcade-room-players", roomId] });
      void qc.invalidateQueries({ queryKey: ["arcade-room", roomId] });
    };
    const channel = supabase
      .channel(`arcade-play-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arcade_room_players", filter: `room_id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "arcade_rooms", filter: `id=eq.${roomId}` }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [online, roomId, qc]);

  const onlinePlayers: Player[] = useMemo(
    () =>
      (roomPlayers ?? []).map((p) => ({
        name: p.display_name,
        avatar: p.avatar_id,
        sportId: p.sport_id,
        categoryKey: p.category_key,
        position: p.position,
        tokens: [p.position, 0, 0, 0],
        userId: p.user_id,
      })),
    [roomPlayers],
  );
  const seatOrder = useMemo(() => (roomPlayers ?? []).map((p) => p.seat), [roomPlayers]);

  const list = online ? onlinePlayers : players;
  const n = online ? list.length : count;
  const activeIdx = online ? Math.max(0, seatOrder.indexOf(room?.active_seat ?? 0)) : turn;
  const active = list[activeIdx];
  const onlineDifficulty = online ? room?.difficulty ?? 2 : difficulty;
  const myTurn = online ? active?.userId === user?.id : true;
  const onlineTurnKey = online ? `${room?.active_seat}-${room?.round_no}-${roomPlayers?.map((p) => p.position).join(",")}` : turnKey;

  const title = game === "ludo" ? "Quiz Ludo" : "Quiz Snakes & Ladders";
  const spaces = game === "ludo" ? 52 : 100;
  const cells = useMemo(() => {
    const base = Array.from({ length: spaces }, (_, i) => i + 1);
    if (game !== "snakes") return base;
    // Boustrophedon layout: 100 top-left, 1 bottom-left.
    const ordered: number[] = [];
    for (let row = 9; row >= 0; row--) {
      const line = Array.from({ length: 10 }, (_, i) => row * 10 + i + 1);
      ordered.push(...(row % 2 === 0 ? line : line.reverse()));
    }
    return ordered;
  }, [spaces, game]);

  const winner = online
    ? room?.status === "finished"
      ? list.find((p) => (game === "ludo" ? p.position >= LUDO_HOME : p.position >= 100))
      : undefined
    : players.slice(0, count).find((p) => (game === "ludo" ? p.tokens.every((t) => t === LUDO_HOME) : p.position >= 100));

  const start = () => {
    setSetup(false);
    setTurn(0);
    setTurnKey((k) => k + 1);
  };
  const reset = () => {
    if (online) return void navigate({ to: "/arcade/rooms" });
    setSetup(true);
    setPlayers((x) => x.map((p) => ({ ...p, position: 0, tokens: [0, 0, 0, 0] })));
  };

  const resolveLocal = ({ correct, usedClue }: QuestionOutcome) => {
    const move = correct ? (usedClue ? 5 : 6) : 0;
    setPlayers((current) => {
      if (game !== "ludo") {
        return current.map((p, i) => {
          if (i !== turn) return p;
          const raw = Math.min(100, p.position + move);
          return { ...p, position: JUMPS[raw] ?? raw };
        });
      }
      const mine = current[turn]!;
      const tokenIndex =
        move === 6 && mine.tokens.some((t) => t === 0)
          ? mine.tokens.findIndex((t) => t === 0)
          : mine.tokens.findIndex((t) => t > 0 && t < LUDO_HOME && t + move <= LUDO_HOME);
      if (move === 0 || tokenIndex < 0) return current;
      const tokens = [...mine.tokens];
      tokens[tokenIndex] = tokens[tokenIndex] === 0 ? 1 : tokens[tokenIndex]! + move;
      const landed = tokens[tokenIndex]!;
      return current.map((p, i) => {
        if (i === turn) return { ...p, tokens, position: Math.max(...tokens) };
        if (!LUDO_SAFE.has(landed) && landed !== LUDO_HOME) return { ...p, tokens: p.tokens.map((t) => (t === landed ? 0 : t)) };
        return p;
      });
    });
    // A clean first-time answer (6) earns another go, like rolling a six.
    setTurn(move === 6 ? turn : (turn + 1) % count);
    setTurnKey((k) => k + 1);
  };

  if (!online && !entLoading && isPro && !pro) {
    return (
      <Shell title={title} onBack={() => void navigate({ to: "/arcade" })}>
        <div className="panel mt-8 p-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-7 text-gold" />
          </span>
          <h2 className="mt-4 text-3xl">Quiz Ludo is a Pro game</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock it with Fanzeno Pro — one payment, lifetime. Snakes &amp; Ladders is free to play right now.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/upgrade">Unlock Fanzeno Pro</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/arcade/quiz-race" search={{ game: "snakes" }}>
                Play Snakes &amp; Ladders
              </Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!online && setup) {
    return (
      <Shell title={title} onBack={() => void navigate({ to: "/arcade" })}>
        <p className="mt-6 text-sm text-muted-foreground">
          {game === "ludo"
            ? "Answer a clue first time to move 6 (and go again). Take a hint and a correct answer moves 5. Wrong answers don’t move. Land on a rival to send them home."
            : "Correct answers move you 6 (or 5 after a hint). Ladders lift you up the board, snakes drag you down. First to 100 wins."}
        </p>
        <Link
          to="/arcade/rooms"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/8 p-3 text-xs hover:border-primary"
        >
          <Radio className="size-4 shrink-0 text-primary" />
          <span>
            <span className="font-black uppercase tracking-[0.14em] text-primary">Play online</span> — host a private room
            and friends join on their own devices with server-checked answers.
          </span>
        </Link>
        <Label>Game difficulty</Label>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Chip key={d.level} on={difficulty === d.level} onClick={() => setDifficulty(d.level)}>
              {d.label}
            </Chip>
          ))}
        </div>
        <Label>Players</Label>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4].map((c) => (
            <Chip key={c} on={count === c} onClick={() => setCount(c)}>
              {c} players
            </Chip>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {players.slice(0, count).map((p, i) => (
            <PlayerCard
              key={i}
              seat={i}
              player={p}
              avatar={p.avatar}
              sports={sports ?? []}
              onName={(name) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, name } : v)))}
              onSport={(sportId) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, sportId } : v)))}
              onCategory={(categoryKey) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, categoryKey } : v)))}
            >
              <AvatarPicker
                value={p.avatar}
                pro={pro}
                label={`${p.name} avatar`}
                onChange={(avatar) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, avatar } : v)))}
              />
            </PlayerCard>
          ))}
        </div>
        <Button size="lg" className="mt-8 w-full font-bold uppercase tracking-[0.14em]" onClick={start}>
          <Play className="size-4" /> Start {title}
        </Button>
      </Shell>
    );
  }

  if (winner) {
    const idx = list.indexOf(winner);
    return (
      <Shell title={title} onBack={reset}>
        <div className="panel mt-8 p-8 text-center">
          <Trophy className="mx-auto size-14 text-gold" />
          <p className="eyebrow mt-4">Winner</p>
          <div className="mt-3 flex justify-center">
            <Avatar id={winner.avatar} size={64} />
          </div>
          <h2 className={`mt-3 text-5xl ${SEAT_TEXT[idx % 4]}`}>{winner.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {game === "ludo" ? (online ? "First token home." : "All four tokens home.") : "First to square 100."}
          </p>
          <Button className="mt-6" onClick={reset}>
            {online ? "Back to rooms" : "Play again"}
          </Button>
        </div>
      </Shell>
    );
  }

  if (!active) {
    return (
      <Shell title={title} onBack={reset}>
        <p className="mt-8 animate-pulse text-center text-sm text-muted-foreground">Joining the room…</p>
      </Shell>
    );
  }

  return (
    <Shell title={title} onBack={reset}>
      {online && (
        <div className="mt-6 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
          <span className="text-primary">● Live room {room?.code}</span>
          <span className="text-muted-foreground">Round {room?.round_no ?? 1}</span>
        </div>
      )}
      <div className={`panel flex items-center gap-3 p-4 ${online ? "mt-3" : "mt-6"}`}>
        <Avatar id={active.avatar} />
        <div className="flex-1">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {active.name}
            {online && myTurn ? " · your turn" : ""} · {DIFFICULTIES.find((d) => d.level === onlineDifficulty)?.label}
          </p>
          <p className="text-sm font-bold">{sports?.find((s) => s.id === active.sportId)?.name ?? "All sports"}</p>
        </div>
        <p className="font-display text-2xl">
          {game === "ludo"
            ? online
              ? `${active.position}/${LUDO_HOME}`
              : `${active.tokens.filter((t) => t === LUDO_HOME).length}/4 home`
            : `${active.position}/100`}
        </p>
      </div>

      {online && (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {list.map((p, i) => (
            <div key={i} className={`panel flex items-center gap-2 p-2 ${i === activeIdx ? "border-primary" : ""}`}>
              <Avatar id={p.avatar} size={28} />
              <span className="min-w-0">
                <span className={`block truncate text-[0.58rem] font-black uppercase tracking-[0.12em] ${SEAT_TEXT[i % 4]}`}>{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.position}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        className="mt-4 grid gap-1 overflow-hidden rounded-2xl"
        style={{ gridTemplateColumns: `repeat(${game === "ludo" ? 13 : 10}, minmax(0, 1fr))` }}
        aria-label={`${title} board`}
      >
        {cells.map((c) => {
          const ladder = game === "snakes" && LADDERS[c];
          const snake = game === "snakes" && SNAKES[c];
          const safe = game === "ludo" && LUDO_SAFE.has(c);
          const band = game === "snakes" ? ["bg-surface/60", "bg-primary/8", "bg-gold/8", "bg-chart-3/10"][Math.floor((c - 1) / 10) % 4] : "bg-surface/50";
          return (
            <div
              key={c}
              className={`relative aspect-square rounded-md border text-[0.55rem] font-bold ${
                ladder
                  ? "border-primary/60 bg-primary/15"
                  : snake
                    ? "border-destructive/60 bg-destructive/15"
                    : safe
                      ? "border-gold/50 bg-gold/10"
                      : `border-border ${band}`
              }`}
            >
              <span className="absolute left-1 top-0.5 text-muted-foreground">{c}</span>
              {ladder ? (
                <span className="absolute bottom-0.5 right-1 flex items-center text-[0.5rem] text-primary">
                  <TrendingUp className="size-2.5" />+{ladder - c}
                </span>
              ) : snake ? (
                <span className="absolute bottom-0.5 right-1 flex items-center text-[0.5rem] text-destructive">
                  <TrendingDown className="size-2.5" />−{c - snake}
                </span>
              ) : null}
              <span className="absolute inset-x-0 bottom-0.5 flex flex-wrap justify-center gap-0.5 px-0.5">
                {list.slice(0, n).flatMap((p, i) =>
                  (game === "ludo" && !online ? p.tokens : [p.position]).map((pos, t) =>
                    pos === c ? <span key={`${i}-${t}`} className={`size-2 rounded-full ${SEAT_COLORS[i % 4]}`} /> : null,
                  ),
                )}
              </span>
            </div>
          );
        })}
      </div>

      <QuestionCard
        turnKey={onlineTurnKey}
        sportId={active.sportId}
        categoryKey={active.categoryKey}
        difficulty={onlineDifficulty}
        roomId={roomId ?? null}
        canAnswer={myTurn}
        bank={bank}
        accentClass={SEAT_TEXT[activeIdx % 4]!}
        onResolved={(o) => {
          if (!online) resolveLocal(o);
        }}
      />
    </Shell>
  );
}

function Shell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  const Icon = title.includes("Ludo") ? Dices : TrendingUp;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <p className="eyebrow">Fanzeno arcade</p>
          <h1 className="mt-1 text-3xl">{title}</h1>
        </div>
        <Icon className="size-6 text-gold" />
      </div>
      {children}
    </div>
  );
}
