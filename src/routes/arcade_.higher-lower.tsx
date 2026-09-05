import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, Heart, RotateCcw, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SideAdRail, TopAdBanner } from "@/components/site/AdSlots";
import { DIFFICULTIES } from "@/lib/fanzeno";
import { Chip, Label } from "@/components/game/ArcadeSetup";

export const Route = createFileRoute("/arcade_/higher-lower")({
  head: () => ({
    meta: [
      { title: "Higher or Lower — Fanzeno Arcade" },
      {
        name: "description",
        content: "Compare like-for-like sports records and build the longest Fanzeno streak.",
      },
    ],
  }),
  component: HigherLowerPage,
});

type Card = { name: string; value: number; display: string; metric: string; sport: string };

const CARDS: Card[] = [
  {
    name: "Sachin Tendulkar",
    value: 15921,
    display: "15,921",
    metric: "Test runs",
    sport: "Cricket",
  },
  { name: "Ricky Ponting", value: 13378, display: "13,378", metric: "Test runs", sport: "Cricket" },
  {
    name: "Jacques Kallis",
    value: 13289,
    display: "13,289",
    metric: "Test runs",
    sport: "Cricket",
  },
  { name: "Rahul Dravid", value: 13288, display: "13,288", metric: "Test runs", sport: "Cricket" },
  { name: "Alastair Cook", value: 12472, display: "12,472", metric: "Test runs", sport: "Cricket" },
  {
    name: "Wayne Gretzky",
    value: 2857,
    display: "2,857",
    metric: "NHL career points",
    sport: "Ice hockey",
  },
  {
    name: "Jaromír Jágr",
    value: 1921,
    display: "1,921",
    metric: "NHL career points",
    sport: "Ice hockey",
  },
  {
    name: "Mark Messier",
    value: 1887,
    display: "1,887",
    metric: "NHL career points",
    sport: "Ice hockey",
  },
  {
    name: "Gordie Howe",
    value: 1850,
    display: "1,850",
    metric: "NHL career points",
    sport: "Ice hockey",
  },
  { name: "Jack Nicklaus", value: 18, display: "18", metric: "Men's major titles", sport: "Golf" },
  { name: "Tiger Woods", value: 15, display: "15", metric: "Men's major titles", sport: "Golf" },
  { name: "Ben Hogan", value: 9, display: "9", metric: "Men's major titles", sport: "Golf" },
  { name: "Gary Player", value: 9, display: "9", metric: "Men's major titles", sport: "Golf" },
  { name: "Tom Watson", value: 8, display: "8", metric: "Men's major titles", sport: "Golf" },
  {
    name: "Roger Federer",
    value: 103,
    display: "103",
    metric: "ATP singles titles",
    sport: "Tennis",
  },
  { name: "Rafael Nadal", value: 92, display: "92", metric: "ATP singles titles", sport: "Tennis" },
  { name: "Andre Agassi", value: 60, display: "60", metric: "ATP singles titles", sport: "Tennis" },
  { name: "Boris Becker", value: 49, display: "49", metric: "ATP singles titles", sport: "Tennis" },
  {
    name: "Michael Schumacher",
    value: 91,
    display: "91",
    metric: "Formula 1 race wins",
    sport: "Formula 1",
  },
  {
    name: "Sebastian Vettel",
    value: 53,
    display: "53",
    metric: "Formula 1 race wins",
    sport: "Formula 1",
  },
  {
    name: "Alain Prost",
    value: 51,
    display: "51",
    metric: "Formula 1 race wins",
    sport: "Formula 1",
  },
  {
    name: "Ayrton Senna",
    value: 41,
    display: "41",
    metric: "Formula 1 race wins",
    sport: "Formula 1",
  },
];

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeRun(level: number, seed: number) {
  const grouped = CARDS.reduce<Record<string, Card[]>>((result, card) => {
    (result[card.metric] ??= []).push(card);
    return result;
  }, {});
  const pools = Object.values(grouped);
  const pairs = pools.flatMap((pool) => {
    const list = pool ?? [];
    return list.flatMap((a, index) =>
      list.slice(index + 1).map((b) => ({
        a,
        b,
        gap: Math.abs(a.value - b.value) / Math.max(a.value, b.value),
      })),
    );
  });
  const ordered = pairs.sort((a, b) => (level <= 2 ? b.gap - a.gap : a.gap - b.gap));
  const band =
    level === 1
      ? ordered.slice(0, 14)
      : level === 2
        ? ordered.slice(5, 22)
        : level === 3
          ? ordered.slice(10, 28)
          : ordered.slice(0, 18);
  return shuffled(seed % 2 === 0 ? band : [...band].reverse()).slice(0, 15);
}

function HigherLowerPage() {
  const [difficulty, setDifficulty] = useState(2);
  const [runSeed, setRunSeed] = useState(0);
  const run = useMemo(() => makeRun(difficulty, runSeed), [difficulty, runSeed]);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const pair = run[round];
  const finished = lives === 0 || round >= run.length;

  const choose = (higher: boolean) => {
    if (!pair || revealed) return;
    const correct = higher ? pair.b.value >= pair.a.value : pair.b.value <= pair.a.value;
    const nextStreak = correct ? streak + 1 : 0;
    setRevealed(true);
    setLastCorrect(correct);
    setStreak(nextStreak);
    setBest((value) => Math.max(value, nextStreak));
    if (correct) setScore((value) => value + difficulty * 100 + nextStreak * 10);
    else setLives((value) => Math.max(0, value - 1));
  };

  const next = () => {
    setRound((value) => value + 1);
    setRevealed(false);
    setLastCorrect(null);
  };

  const reset = () => {
    setRound(0);
    setLives(3);
    setScore(0);
    setStreak(0);
    setBest(0);
    setRevealed(false);
    setLastCorrect(null);
    setRunSeed((value) => value + 1);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <SideAdRail placement="arcade" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" asChild>
          <Link to="/arcade">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <p className="eyebrow">Fanzeno arcade</p>
          <h1 className="mt-1 text-4xl">Higher or Lower</h1>
        </div>
        <ArrowUp className="size-7 text-primary" />
        <ArrowDown className="size-7 text-gold" />
      </div>
      <TopAdBanner placement="arcade-higher-lower" />

      {!finished && pair ? (
        <>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <Label>Difficulty</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <Chip
                    key={d.level}
                    on={difficulty === d.level}
                    onClick={() => {
                      if (round === 0) setDifficulty(d.level);
                    }}
                  >
                    {d.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl text-primary">{score}</p>
              <p className="text-[0.6rem] font-black uppercase tracking-wider text-muted-foreground">
                Score
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatCard card={pair.a} revealed />
            <StatCard card={pair.b} revealed={revealed} />
          </div>
          {!revealed ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button size="lg" onClick={() => choose(true)}>
                <ArrowUp className="size-5" /> Higher
              </Button>
              <Button size="lg" variant="secondary" onClick={() => choose(false)}>
                <ArrowDown className="size-5" /> Lower
              </Button>
            </div>
          ) : (
            <div
              className={`game-card mt-4 p-4 text-center ${lastCorrect ? "border-primary/60" : "border-destructive/60"}`}
            >
              <p className="font-display text-3xl">{lastCorrect ? "Correct!" : "Not this time"}</p>
              <Button className="mt-3 w-full" onClick={next}>
                Next comparison
              </Button>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface/60 px-4 py-3">
            <span className="flex gap-1">
              {[0, 1, 2].map((life) => (
                <Heart
                  key={life}
                  className={`size-5 ${life < lives ? "fill-destructive text-destructive" : "text-muted"}`}
                />
              ))}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              Round {round + 1}/{run.length} · Streak {streak}
            </span>
          </div>
        </>
      ) : (
        <div className="game-card mt-8 p-8 text-center">
          <Trophy className="mx-auto size-14 text-gold" />
          <p className="eyebrow mt-4">Run complete</p>
          <h2 className="mt-2 text-5xl">{score}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Best streak {best} · {Math.min(round, run.length)} comparisons
          </p>
          <Button className="mt-6 w-full" onClick={reset}>
            <RotateCcw className="size-4" /> Play again
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ card, revealed }: { card: Card; revealed: boolean }) {
  return (
    <div className="game-card relative min-h-56 overflow-hidden border-t-4 border-primary p-6 text-center">
      <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
      <p className="relative text-[0.62rem] font-black uppercase tracking-[0.18em] text-primary">
        {card.sport}
      </p>
      <h2 className="relative mt-4 font-display text-3xl">{card.name}</h2>
      <p className="relative mt-2 text-xs text-muted-foreground">{card.metric}</p>
      <div className="relative mt-5 min-h-14">
        {revealed ? (
          <p className="font-display text-5xl text-gold">{card.display}</p>
        ) : (
          <p className="font-display text-5xl text-muted-foreground">?</p>
        )}
      </div>
      {!revealed && (
        <p className="relative mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Zap className="size-3 text-gold" /> Higher or lower?
        </p>
      )}
    </div>
  );
}
