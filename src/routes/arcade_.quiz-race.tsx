import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Dices,
  Gem,
  Play,
  Radio,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
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
import { Chip, FairnessNote, Label, PlayerCard } from "@/components/game/ArcadeSetup";
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
  const { data: room } = useQuery({
    queryKey: ["arcade-room", roomId],
    queryFn: () => fetchRoom(roomId!),
    enabled: online,
  });
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
  const [rolling, setRolling] = useState(false);
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
    setPlayers((x) =>
      x.map((p, i) => (p.sportId ? p : { ...p, sportId: sports[i % sports.length]!.id })),
    );
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arcade_room_players",
          filter: `room_id=eq.${roomId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "arcade_rooms", filter: `id=eq.${roomId}` },
        refresh,
      )
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

  useEffect(() => {
    setRolling(true);
    const t = setTimeout(() => setRolling(false), 600);
    return () => clearTimeout(t);
  }, [online ? undefined : turnKey, online ? room?.round_no : undefined, online ? room?.active_seat : undefined]);

  const list = online ? onlinePlayers : players;
  const n = online ? list.length : count;
  const activeIdx = online ? Math.max(0, seatOrder.indexOf(room?.active_seat ?? 0)) : turn;
  const active = list[activeIdx];
  const onlineDifficulty = online ? (room?.difficulty ?? 2) : difficulty;
  const myTurn = online ? active?.userId === user?.id : true;
  const onlineTurnKey = online
    ? `${room?.active_seat}-${room?.round_no}-${roomPlayers?.map((p) => p.position).join(",")}`
    : turnKey;

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
    : players
        .slice(0, count)
        .find((p) =>
          game === "ludo" ? p.tokens.every((t) => t === LUDO_HOME) : p.position >= 100,
        );

  const start = () => {
    if (players.slice(0, count).some((player) => !player.sportId)) return;
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
        if (!LUDO_SAFE.has(landed) && landed !== LUDO_HOME)
          return { ...p, tokens: p.tokens.map((t) => (t === landed ? 0 : t)) };
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
        <div className="game-card mt-8 p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-8 text-gold" />
          </span>
          <p className="eyebrow mt-4">Fanzeno Pro</p>
          <h2 className="mt-1 text-3xl">Quiz Ludo is a Pro game</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock it with Fanzeno Pro — one payment, lifetime. Snakes &amp; Ladders is free to play
            right now.
          </p>
          <div className="game-progress mx-auto mt-5 max-w-xs">
            <div className="game-progress-fill w-3/4" />
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
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
            <span className="font-black uppercase tracking-[0.14em] text-primary">Play online</span>{" "}
            — host a private room and friends join on their own devices with server-checked answers.
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
              onSport={(sportId) =>
                setPlayers((x) => x.map((v, j) => (j === i ? { ...v, sportId } : v)))
              }
              onCategory={(categoryKey) =>
                setPlayers((x) => x.map((v, j) => (j === i ? { ...v, categoryKey } : v)))
              }
            >
              <AvatarPicker
                value={p.avatar}
                pro={pro}
                label={`${p.name} avatar`}
                onChange={(avatar) =>
                  setPlayers((x) => x.map((v, j) => (j === i ? { ...v, avatar } : v)))
                }
              />
            </PlayerCard>
          ))}
          <FairnessNote />
        </div>
        <Button
          size="lg"
          className="mt-8 w-full font-bold uppercase tracking-[0.14em]"
          onClick={start}
          disabled={!sports?.length || players.slice(0, count).some((player) => !player.sportId)}
        >
          <Play className="size-4" /> Start {title}
        </Button>
      </Shell>
    );
  }

  if (winner) {
    const idx = list.indexOf(winner);
    return (
      <Shell title={title} onBack={reset}>
        <div className="game-card mt-8 p-8 text-center">
          <Trophy className="mx-auto size-14 text-gold" />
          <p className="eyebrow mt-4">Winner</p>
          <div className="mt-3 flex justify-center">
            <Avatar id={winner.avatar} size={64} />
          </div>
          <h2 className={`mt-3 text-5xl ${SEAT_TEXT[idx % 4]}`}>{winner.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {game === "ludo"
              ? online
                ? "First token home."
                : "All four tokens home."
              : "First to square 100."}
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
        <p className="mt-8 animate-pulse text-center text-sm text-muted-foreground">
          Joining the room…
        </p>
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
      <div className={`game-card flex items-center gap-3 p-4 ${online ? "mt-3" : "mt-6"}`}>
        <Avatar id={active.avatar} size={48} />
        <div className="flex-1">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {active.name}
            {online && myTurn ? " · your turn" : ""} ·{" "}
            {DIFFICULTIES.find((d) => d.level === onlineDifficulty)?.label}
          </p>
          <p className="text-sm font-bold">
            {sports?.find((s) => s.id === active.sportId)?.name ?? "All sports"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl">
            {game === "ludo"
              ? online
                ? `${active.position}/${LUDO_HOME}`
                : `${active.tokens.filter((t) => t === LUDO_HOME).length}/4 home`
              : `${active.position}/100`}
          </p>
          <div className="game-progress mt-1 w-20">
            <div
              className="game-progress-fill"
              style={{
                width: `${game === "ludo" ? (online ? (active.position / LUDO_HOME) * 100 : (active.tokens.filter((t) => t === LUDO_HOME).length / 4) * 100) : (active.position / 100) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {online && (
        <div
          className="mt-3 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {list.map((p, i) => (
            <div
              key={i}
              className={`game-card p-2 text-center ${i === activeIdx ? "border-primary" : ""}`}
            >
              <div className="flex justify-center">
                <Avatar id={p.avatar} size={28} />
              </div>
              <span className="min-w-0">
                <span
                  className={`block truncate text-[0.58rem] font-black uppercase tracking-[0.12em] ${SEAT_TEXT[i % 4]}`}
                >
                  {p.name}
                </span>
                <span className="block text-xs text-muted-foreground">{p.position}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="game-panel mt-4 flex flex-col gap-4 p-3 sm:flex-row sm:items-start">
        <div className="mx-auto w-full max-w-md sm:max-w-none sm:flex-1">
          {game === "ludo" ? (
            <LudoBoard players={list.slice(0, n)} online={online} />
          ) : (
            <SnakesBoard cells={cells} players={list.slice(0, n)} />
          )}
        </div>
        <div className="flex shrink-0 flex-row items-center gap-3 sm:w-28 sm:flex-col sm:justify-center">
          <Dice value={active.tokens?.[0] ? ((active.tokens[0] - 1) % 6) + 1 : 6} rolling={rolling} />
          <p className="text-center text-[0.6rem] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {myTurn || !online ? "Your roll" : "Waiting…"}
          </p>
        </div>
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

/* ---------------- Ludo board geometry (52-cell cross track) ---------------- */
const LUDO_PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];
const LUDO_HOME_RUNS: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // red
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // green
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // yellow
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // blue
];
const LUDO_START_OFFSET = [0, 13, 26, 39];
const LUDO_CENTER: [number, number] = [7, 7];
const LUDO_YARD_PADS: [number, number][][] = [
  [[1.3, 1.3], [1.3, 4.7], [4.7, 1.3], [4.7, 4.7]], // red
  [[1.3, 10.3], [1.3, 13.7], [4.7, 10.3], [4.7, 13.7]], // green
  [[10.3, 10.3], [10.3, 13.7], [13.7, 10.3], [13.7, 13.7]], // yellow
  [[10.3, 1.3], [10.3, 4.7], [13.7, 1.3], [13.7, 4.7]], // blue
];
const LUDO_COLORS = [
  "var(--ludo-red)",
  "var(--ludo-green)",
  "var(--ludo-yellow)",
  "var(--ludo-blue)",
] as const;

function ludoPct([r, c]: [number, number]) {
  return { left: `${((c + 0.5) / 15) * 100}%`, top: `${((r + 0.5) / 15) * 100}%` };
}

/** Resolve a token's board cell for a given seat, given its raw 0..LUDO_HOME value. */
function ludoTokenCell(seat: number, value: number, tokenIdx: number): [number, number] | null {
  if (value <= 0) {
    const pad = LUDO_YARD_PADS[seat % 4]![tokenIdx % 4]!;
    return pad;
  }
  if (value >= LUDO_HOME) return LUDO_CENTER;
  if (value > 51) return LUDO_HOME_RUNS[seat % 4]![value - 52]!;
  const idx = (LUDO_START_OFFSET[seat % 4]! + (value - 1)) % 52;
  return LUDO_PATH[idx]!;
}

function LudoPawn({
  seat,
  cell,
  tokenIdx,
}: {
  seat: number;
  cell: [number, number];
  tokenIdx: number;
}) {
  const isYard = cell[0] > 15 || cell[1] > 15; // never true; kept for clarity
  void isYard;
  const pct = ludoPct(cell);
  return (
    <span
      className="pawn-3d absolute z-10 size-[6.4%] -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
      style={{ ...pct, "--pawn-color": LUDO_COLORS[seat % 4] } as React.CSSProperties}
      title={`Player ${seat + 1} token ${tokenIdx + 1}`}
    />
  );
}

function LudoBoard({
  players,
  online,
}: {
  players: { tokens: number[]; position: number }[];
  online: boolean;
}) {
  return (
    <div className="board-stage">
      <div className="board-tilt board-rim board-wood aspect-square w-full rounded-2xl p-2 sm:p-3">
        <div className="board-felt relative aspect-square w-full overflow-hidden rounded-xl">
          {/* Home quadrants */}
          {(["red", "green", "yellow", "blue"] as const).map((_, seat) => {
            const corner = [
              { top: "0%", left: "0%" },
              { top: "0%", left: "60%" },
              { top: "60%", left: "60%" },
              { top: "60%", left: "0%" },
            ][seat]!;
            return (
              <div
                key={seat}
                className="absolute h-[40%] w-[40%] rounded-lg border-4 border-white/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]"
                style={{ ...corner, background: LUDO_COLORS[seat] }}
              >
                <div className="absolute inset-[12%] rounded-md bg-white/90 shadow-inner">
                  {LUDO_YARD_PADS[seat]!.map((_, i) => (
                    <span
                      key={i}
                      className="disc-3d absolute size-[22%] -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: i % 2 === 0 ? "30%" : "70%",
                        top: i < 2 ? "30%" : "70%",
                        "--disc-light": LUDO_COLORS[seat],
                        "--disc-dark": LUDO_COLORS[seat],
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Cross track cells */}
          {LUDO_PATH.map((cell, i) => {
            const pct = ludoPct(cell);
            const safe = LUDO_SAFE.has(i + 1);
            return (
              <span
                key={`t-${i}`}
                className="absolute size-[6.4%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-black/10 bg-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                style={pct}
              >
                {safe && (
                  <svg viewBox="0 0 24 24" className="absolute inset-0 text-gold/70">
                    <path
                      fill="currentColor"
                      d="M12 1l2.9 6.9L22 9l-5.5 4.8L18 21l-6-3.6L6 21l1.5-7.2L2 9l7.1-1.1z"
                    />
                  </svg>
                )}
              </span>
            );
          })}
          {/* Coloured starting arrows */}
          {LUDO_START_OFFSET.map((offset, seat) => {
            const pct = ludoPct(LUDO_PATH[offset]!);
            return (
              <span
                key={`arrow-${seat}`}
                className="absolute size-[6.4%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] opacity-80"
                style={{ ...pct, background: LUDO_COLORS[seat] }}
              />
            );
          })}
          {/* Coloured home-run lanes */}
          {LUDO_HOME_RUNS.map((run, seat) =>
            run.map((cell, i) => {
              const pct = ludoPct(cell);
              return (
                <span
                  key={`hr-${seat}-${i}`}
                  className="absolute size-[6.4%] -translate-x-1/2 -translate-y-1/2 border border-black/10"
                  style={{ ...pct, background: LUDO_COLORS[seat] }}
                />
              );
            }),
          )}
          {/* Centre home triangle */}
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute left-[40%] top-[40%] size-[20%]"
          >
            <polygon points="50,50 0,0 100,0" fill={LUDO_COLORS[1]} opacity={0.9} />
            <polygon points="50,50 100,0 100,100" fill={LUDO_COLORS[2]} opacity={0.9} />
            <polygon points="50,50 100,100 0,100" fill={LUDO_COLORS[3]} opacity={0.9} />
            <polygon points="50,50 0,100 0,0" fill={LUDO_COLORS[0]} opacity={0.9} />
          </svg>

          {/* Tokens */}
          {players.map((p, seat) =>
            (online ? [p.position] : p.tokens).map((v, tokenIdx) => (
              <LudoPawn
                key={`${seat}-${tokenIdx}`}
                seat={seat}
                tokenIdx={tokenIdx}
                cell={ludoTokenCell(seat, v, tokenIdx)!}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Snakes & Ladders board geometry (10x10 boustrophedon) ---------------- */
function slSquarePct(square: number) {
  const rowFromBottom = Math.floor((square - 1) / 10);
  const colInRow = rowFromBottom % 2 === 0 ? (square - 1) % 10 : 9 - ((square - 1) % 10);
  const visualRow = 9 - rowFromBottom;
  return { x: (colInRow + 0.5) * 10, y: (visualRow + 0.5) * 10 };
}

function SnakesBoard({
  cells,
  players,
}: {
  cells: number[];
  players: { position: number }[];
}) {
  const ladderEntries = Object.entries(LADDERS).map(([from, to]) => ({
    from: Number(from),
    to,
  }));
  const snakeEntries = Object.entries(SNAKES).map(([from, to]) => ({ from: Number(from), to }));
  return (
    <div className="board-stage">
      <div className="board-tilt board-rim board-wood aspect-square w-full rounded-2xl p-2 sm:p-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[oklch(0.94_0.02_85)]">
          <div className="grid size-full grid-cols-10 grid-rows-10">
            {cells.map((c, i) => {
              const row = Math.floor(i / 10);
              const col = i % 10;
              const pastel = (row + col) % 2 === 0;
              return (
                <div
                  key={c}
                  className={`relative flex items-start justify-start border border-black/10 p-0.5 text-[0.5rem] font-bold sm:text-[0.6rem] ${
                    pastel
                      ? "bg-[oklch(0.9_0.05_85)] text-[oklch(0.4_0.05_85)]"
                      : "bg-[oklch(0.82_0.06_50)] text-[oklch(0.3_0.05_50)]"
                  }`}
                >
                  {c}
                </div>
              );
            })}
          </div>
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 size-full"
            preserveAspectRatio="none"
          >
            {ladderEntries.map(({ from, to }) => {
              const a = slSquarePct(from);
              const b = slSquarePct(to);
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const nx = (-dy / len) * 2.2;
              const ny = (dx / len) * 2.2;
              const rungs = Array.from({ length: 6 }, (_, i) => (i + 1) / 7);
              return (
                <g key={`ladder-${from}`}>
                  <line
                    x1={a.x + nx}
                    y1={a.y + ny}
                    x2={b.x + nx}
                    y2={b.y + ny}
                    stroke="oklch(0.7 0.16 85)"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                  <line
                    x1={a.x - nx}
                    y1={a.y - ny}
                    x2={b.x - nx}
                    y2={b.y - ny}
                    stroke="oklch(0.7 0.16 85)"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                  {rungs.map((t, i) => (
                    <line
                      key={i}
                      x1={a.x + nx + dx * t}
                      y1={a.y + ny + dy * t}
                      x2={a.x - nx + dx * t}
                      y2={a.y - ny + dy * t}
                      stroke="oklch(0.55 0.14 80)"
                      strokeWidth={0.9}
                    />
                  ))}
                </g>
              );
            })}
            {snakeEntries.map(({ from, to }) => {
              const a = slSquarePct(from);
              const b = slSquarePct(to);
              const mx = (a.x + b.x) / 2 + (a.y > b.y ? 8 : -8);
              const my = (a.y + b.y) / 2 + (a.x > b.x ? -8 : 8);
              return (
                <g key={`snake-${from}`}>
                  <path
                    d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                    fill="none"
                    stroke="oklch(0.5 0.15 150)"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                  <circle cx={a.x} cy={a.y} r={2.4} fill="oklch(0.42 0.17 145)" />
                  <circle cx={a.x - 0.6} cy={a.y - 0.6} r={0.5} fill="white" />
                  <circle cx={b.x} cy={b.y} r={1.4} fill="oklch(0.55 0.15 150)" />
                </g>
              );
            })}
          </svg>
          {players.map((p, seat) => {
            if (p.position <= 0) return null;
            const { x, y } = slSquarePct(Math.min(100, p.position));
            const jitter = (seat % 4) * 2.5 - 3.75;
            return (
              <span
                key={seat}
                className="pawn-3d absolute z-10 size-[6%] -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
                style={
                  {
                    left: `${x + jitter}%`,
                    top: `${y}%`,
                    "--pawn-color": LUDO_COLORS[seat % 4],
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dice ---------------- */
const DICE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [25, 75], [75, 25], [75, 75]],
  5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
  6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
};

function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div className={`dice-3d relative size-10 shrink-0 ${rolling ? "dice-rolling" : ""}`}>
      {DICE_PIPS[value]?.map(([x, y], i) => (
        <span
          key={i}
          className="absolute size-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </div>
  );
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
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
