import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Dices, Gem, Lightbulb, Play, TrendingUp, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSports, DIFFICULTIES } from "@/lib/fanzeno";
import { fetchClueBank, pickPrompt, SEAT_COLORS, SEAT_TEXT } from "@/lib/arcadeQuiz";
import { Chip, Label, PlayerCard } from "@/components/game/ArcadeSetup";
import { useEntitlements } from "@/lib/entitlements";

type Game = "ludo" | "snakes";
type Search = { game: Game };

export const Route = createFileRoute("/arcade_/quiz-race")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    game: raw["game"] === "snakes" ? "snakes" : "ludo",
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

type Player = { name: string; sportId: string | null; position: number; tokens: number[] };

const LUDO_HOME = 57;
const LUDO_SAFE = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
/** Snakes & Ladders jumps: ladders go up, snakes go down. */
const JUMPS: Record<number, number> = {
  4: 14, 14: 28, 40: 59, 51: 71, 63: 84,
  17: 7, 32: 12, 48: 26, 69: 49, 88: 68, 96: 76,
};
const LADDER_FEET = new Set([4, 14, 40, 51, 63]);
const SNAKE_HEADS = new Set([17, 32, 48, 69, 88, 96]);

function QuizRacePage() {
  const { game } = Route.useSearch();
  const navigate = useNavigate();
  const { pro, loading: entLoading } = useEntitlements();
  const isPro = game === "ludo";
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: bank } = useQuery({ queryKey: ["clue-bank"], queryFn: fetchClueBank });

  const [setup, setSetup] = useState(true);
  const [count, setCount] = useState(2);
  const [difficulty, setDifficulty] = useState(2);
  const [turn, setTurn] = useState(0);
  const [clue, setClue] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [players, setPlayers] = useState<Player[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({ name: `Player ${i + 1}`, sportId: null, position: 0, tokens: [0, 0, 0, 0] })),
  );

  useEffect(() => {
    if (!sports?.length) return;
    setPlayers((x) => x.map((p, i) => (p.sportId ? p : { ...p, sportId: sports[i % sports.length]!.id })));
  }, [sports]);

  const title = game === "ludo" ? "Quiz Ludo" : "Quiz Snakes & Ladders";
  const spaces = game === "ludo" ? 52 : 100;
  const active = players[turn]!;
  const cells = useMemo(() => Array.from({ length: spaces }, (_, i) => i + 1), [spaces]);
  const winner = players.slice(0, count).find((p) =>
    game === "ludo" ? p.tokens.every((t) => t === LUDO_HOME) : p.position >= 100,
  );

  const newPrompt = (sportId: string | null) => setPrompt(pickPrompt(bank ?? {}, sportId));
  const start = () => {
    setSetup(false);
    setTurn(0);
    newPrompt(players[0]!.sportId);
  };
  const reset = () => {
    setSetup(true);
    setClue(false);
    setPlayers((x) => x.map((p) => ({ ...p, position: 0, tokens: [0, 0, 0, 0] })));
  };

  const answer = (correct: boolean) => {
    const move = correct ? (clue ? 5 : 6) : 0;
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
        // Landing on a rival's token outside a safe square sends it back to base.
        if (!LUDO_SAFE.has(landed) && landed !== LUDO_HOME)
          return { ...p, tokens: p.tokens.map((t) => (t === landed ? 0 : t)) };
        return p;
      });
    });
    setClue(false);
    // A clean first-time answer (6) earns another go, like rolling a six.
    const next = move === 6 ? turn : (turn + 1) % count;
    setTurn(next);
    newPrompt(players[next]!.sportId);
  };

  if (!entLoading && isPro && !pro) {
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

  if (setup) {
    return (
      <Shell title={title} onBack={() => void navigate({ to: "/arcade" })}>
        <p className="mt-6 text-sm text-muted-foreground">
          {game === "ludo"
            ? "Answer a clue first time to move 6 (and go again). Take a hint and a correct answer moves 5. Wrong answers don’t move. Land on a rival to send them home."
            : "Correct answers move you 6 (or 5 after a hint). Ladders lift you up the board, snakes drag you down. First to 100 wins."}
        </p>
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
          {[2, 3, 4].map((n) => (
            <Chip key={n} on={count === n} onClick={() => setCount(n)}>
              {n} players
            </Chip>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {players.slice(0, count).map((p, i) => (
            <PlayerCard
              key={i}
              seat={i}
              player={p}
              sports={sports ?? []}
              onName={(name) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, name } : v)))}
              onSport={(sportId) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, sportId } : v)))}
            />
          ))}
        </div>
        <Button size="lg" className="mt-8 w-full font-bold uppercase tracking-[0.14em]" onClick={start}>
          <Play className="size-4" /> Start {title}
        </Button>
      </Shell>
    );
  }

  if (winner) {
    const idx = players.indexOf(winner);
    return (
      <Shell title={title} onBack={reset}>
        <div className="panel mt-8 p-8 text-center">
          <Trophy className="mx-auto size-14 text-gold" />
          <p className="eyebrow mt-4">Winner</p>
          <h2 className={`text-5xl ${SEAT_TEXT[idx]}`}>{winner.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {game === "ludo" ? "All four tokens home." : "First to square 100."}
          </p>
          <Button className="mt-6" onClick={reset}>
            Play again
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={title} onBack={reset}>
      <div className="panel mt-6 flex items-center gap-3 p-4">
        <span className={`grid size-10 place-items-center rounded-xl font-display text-xl text-background ${SEAT_COLORS[turn]}`}>
          {turn + 1}
        </span>
        <div className="flex-1">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
            {active.name} · {DIFFICULTIES.find((d) => d.level === difficulty)?.label}
          </p>
          <p className="text-sm font-bold">{sports?.find((s) => s.id === active.sportId)?.name ?? "All sports"}</p>
        </div>
        <p className="font-display text-2xl">
          {game === "ludo" ? `${active.tokens.filter((t) => t === LUDO_HOME).length}/4 home` : `${active.position}/100`}
        </p>
      </div>

      <div
        className={`mt-4 grid gap-1 ${game === "ludo" ? "grid-cols-13" : "grid-cols-10"}`}
        style={{ gridTemplateColumns: `repeat(${game === "ludo" ? 13 : 10}, minmax(0, 1fr))` }}
        aria-label={`${title} board`}
      >
        {cells.map((n) => {
          const ladder = game === "snakes" && LADDER_FEET.has(n);
          const snake = game === "snakes" && SNAKE_HEADS.has(n);
          const safe = game === "ludo" && LUDO_SAFE.has(n);
          return (
            <div
              key={n}
              className={`relative aspect-square rounded-md border text-[0.55rem] font-bold ${
                ladder
                  ? "border-primary/60 bg-primary/15"
                  : snake
                    ? "border-destructive/60 bg-destructive/15"
                    : safe
                      ? "border-gold/50 bg-gold/10"
                      : "border-border bg-surface/50"
              }`}
            >
              <span className="absolute left-1 top-0.5 text-muted-foreground">{n}</span>
              <span className="absolute inset-x-0 bottom-0.5 flex flex-wrap justify-center gap-0.5 px-0.5">
                {players.slice(0, count).flatMap((p, i) =>
                  (game === "ludo" ? p.tokens : [p.position]).map((pos, t) =>
                    pos === n ? <span key={`${i}-${t}`} className={`size-2 rounded-full ${SEAT_COLORS[i]}`} /> : null,
                  ),
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="panel mt-4 p-5">
        <p className={`text-[0.62rem] font-black uppercase tracking-[0.16em] ${clue ? "text-gold" : "text-primary"}`}>
          {clue ? "Second chance · move 5" : "First attempt · move 6"}
        </p>
        <p className="mt-2 font-display text-2xl leading-tight">{prompt}</p>
        {clue && (
          <p className="mt-2 flex items-center gap-2 text-xs text-gold">
            <Lightbulb className="size-3.5" /> Hint: think of a player active in the last two decades.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Say your answer out loud — the table decides. Pass the device after each turn.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!clue && (
            <Button variant="outline" onClick={() => setClue(true)}>
              <Lightbulb className="size-4" /> Get clue
            </Button>
          )}
          <Button variant="destructive" onClick={() => answer(false)}>
            <X className="size-4" /> Wrong
          </Button>
          <Button className="flex-1" onClick={() => answer(true)}>
            <Check className="size-4" /> Correct · +{clue ? 5 : 6}
          </Button>
        </div>
      </div>
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
