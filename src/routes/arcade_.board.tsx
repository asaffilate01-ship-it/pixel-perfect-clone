import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Check,
  ChevronLeft,
  Flame,
  Flag,
  Gauge,
  Gem,
  Grid2x2,
  Hexagon,
  Medal,
  Network,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, Label } from "@/components/game/ArcadeSetup";
import { QuestionCard, type QuestionOutcome } from "@/components/game/QuestionCard";
import { fetchClueBank } from "@/lib/arcadeQuiz";
import { DIFFICULTIES, fetchSports } from "@/lib/fanzeno";
import { useQuizPrefs } from "@/lib/quizPrefs";
import { useEntitlements } from "@/lib/entitlements";
import { SideAdRail } from "@/components/site/AdSlots";
import { Dartboard, type DartboardHighlight } from "@/components/arcade/Dartboard";

type Mode = "territory" | "501" | "connections" | "draft" | "bingo";
type Search = { mode: Mode };
const MODES: Mode[] = ["territory", "501", "connections", "draft", "bingo"];

export const Route = createFileRoute("/arcade_/board")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    // The default search parser JSON-parses each value, so ?mode=501 arrives as the
    // number 501 rather than the string "501" — coerce back to a string before checking.
    const raw_mode = String(raw["mode"] ?? "");
    return { mode: (MODES as string[]).includes(raw_mode) ? (raw_mode as Mode) : "bingo" };
  },
  head: ({ match }) => {
    const c = CONFIG[match.search.mode];
    return {
      meta: [
        { title: `${c.title} — Fanzeno arcade` },
        {
          name: "description",
          content: `${c.rule} Every answer is a verified sports fact checked by the server.`,
        },
        { property: "og:title", content: `${c.title} — Fanzeno arcade` },
        { property: "og:description", content: c.rule },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: BoardPage,
});

const CONFIG: Record<
  Mode,
  {
    title: string;
    slug: string;
    icon: React.ElementType;
    tone: string;
    accent: string;
    rule: string;
    pro: boolean;
  }
> = {
  territory: {
    title: "Territory",
    slug: "territory",
    icon: Hexagon,
    tone: "text-gold bg-gold/12",
    accent: "text-gold",
    rule: "Select a zone, then answer correctly to capture it. First to ten zones wins.",
    pro: true,
  },
  "501": {
    title: "Sports 501",
    slug: "sports-501",
    icon: Gauge,
    tone: "text-gold bg-gold/12",
    accent: "text-gold",
    rule: "Three questions per visit. Choose the difficulty, score up to 180, and finish exactly on a double.",
    pro: true,
  },
  connections: {
    title: "Connections",
    slug: "connections",
    icon: Network,
    tone: "text-primary bg-primary/12",
    accent: "text-primary",
    rule: "Select four sporting names that share one exact connection.",
    pro: false,
  },
  draft: {
    title: "Draft Five",
    slug: "draft-xi",
    icon: Users,
    tone: "text-gold bg-gold/12",
    accent: "text-gold",
    rule: "Answer correctly to sign the highlighted athlete. Build the full five.",
    pro: true,
  },
  bingo: {
    title: "Sports Bingo",
    slug: "bingo",
    icon: Grid2x2,
    tone: "text-primary bg-primary/12",
    accent: "text-primary",
    rule: "Select a square and answer correctly. Complete a line of four.",
    pro: false,
  },
};

const CONNECTION_GROUPS = [
  { label: "Won the men's FIFA World Cup", items: ["Messi", "Mbappé", "Iniesta", "Ronaldo"] },
  { label: "Formula 1 world champions", items: ["Hamilton", "Vettel", "Alonso", "Verstappen"] },
  { label: "Wimbledon singles champions", items: ["Federer", "Nadal", "Djokovic", "Murray"] },
  { label: "Cricket World Cup winners", items: ["Stokes", "Ponting", "Dhoni", "Akram"] },
];
const BINGO = [
  "World champion",
  "Olympic medallist",
  "Premier League",
  "Grand Slam",
  "Test captain",
  "European champion",
  "100+ caps",
  "Major winner",
  "T20 champion",
  "Formula 1 winner",
  "NBA champion",
  "Rugby World Cup",
  "Ballon d'Or",
  "Ashes winner",
  "Super Bowl",
  "Ryder Cup",
];
const BINGO_ICONS: Record<string, React.ElementType> = {
  "World champion": Trophy,
  "Olympic medallist": Medal,
  "Premier League": Flag,
  "Grand Slam": Sparkles,
  "Test captain": Shield,
  "European champion": Star,
  "100+ caps": BarChart3,
  "Major winner": Trophy,
  "T20 champion": Zap,
  "Formula 1 winner": Gauge,
  "NBA champion": Target,
  "Rugby World Cup": Award,
  "Ballon d'Or": Award,
  "Ashes winner": Flame,
  "Super Bowl": Trophy,
  "Ryder Cup": Users,
};

const DRAFT = [
  { name: "Gianluigi Buffon", role: "GK", rating: 92 },
  { name: "Paolo Maldini", role: "DEF", rating: 94 },
  { name: "Zinedine Zidane", role: "MID", rating: 95 },
  { name: "Marta", role: "FWD", rating: 94 },
  { name: "Ronaldo Nazário", role: "FWD", rating: 96 },
];
const DART_SCORES = [25, 40, 50, 60] as const;
const DART_BEDS: DartboardHighlight[] = [
  { segment: 25, ring: "outer" },
  { segment: 20, ring: "double" },
  { segment: 50, ring: "bull" },
  { segment: 20, ring: "treble" },
];

function hasLine(cells: number[]) {
  const s = new Set(cells);
  const lines: number[][] = [];
  for (let r = 0; r < 4; r++) lines.push([0, 1, 2, 3].map((c) => r * 4 + c));
  for (let c = 0; c < 4; c++) lines.push([0, 1, 2, 3].map((r) => r * 4 + c));
  lines.push([0, 5, 10, 15], [3, 6, 9, 12]);
  return lines.some((l) => l.every((i) => s.has(i)));
}
function seeded(word: string, salt: number) {
  let h = salt * 7919;
  for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return h;
}

function BoardPage() {
  const { mode } = Route.useSearch();
  const c = CONFIG[mode];
  const Icon = c.icon;
  const { pro } = useEntitlements();
  const { prefs } = useQuizPrefs();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: bank } = useQuery({
    queryKey: ["clue-bank"],
    queryFn: fetchClueBank,
    staleTime: 5 * 60_000,
  });
  const sportId = sports?.find((s) => s.slug === prefs.sport)?.id ?? sports?.[0]?.id ?? null;
  const [difficulty, setDifficulty] = useState(2);
  const [lastBed, setLastBed] = useState<DartboardHighlight | null>(null);

  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [mine, setMine] = useState<number[]>([]);
  const [rival, setRival] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(501);
  const [visitStart, setVisitStart] = useState(501);
  const [visitQuestion, setVisitQuestion] = useState(0);
  const [visitScore, setVisitScore] = useState(0);
  const [checkout, setCheckout] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [squad, setSquad] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);

  useEffect(() => {
    setRound(0);
    setTarget(null);
    setMine([]);
    setRival([]);
    setRemaining(501);
    setVisitStart(501);
    setVisitQuestion(0);
    setVisitScore(0);
    setCheckout(false);
    setFeedback(null);
    setSelected([]);
    setSolved([]);
    setSquad([]);
    setMisses(0);
  }, [mode]);

  const finished =
    mode === "territory"
      ? mine.length >= 10 || rival.length >= 10
      : mode === "501"
        ? remaining === 0
        : mode === "bingo"
          ? hasLine(mine)
          : mode === "draft"
            ? squad.length === DRAFT.length
            : solved.length === 4;
  const won = mode === "territory" ? mine.length >= 10 : finished;
  const progress =
    mode === "501"
      ? `${remaining}`
      : mode === "connections"
        ? `${solved.length}/4 groups`
        : mode === "draft"
          ? `${squad.length}/5 signed`
          : mode === "territory"
            ? `${mine.length}–${rival.length}`
            : `${mine.length}/16`;

  const resolve = (o: QuestionOutcome) => {
    if (target === null) return;
    const correct = o.correct;
    if (mode === "territory") (correct ? setMine : setRival)((v) => [...v, target]);
    if (mode === "bingo" && correct) setMine((v) => [...v, target]);
    if (mode === "draft" && correct) setSquad((v) => [...v, target]);
    if (mode === "501") {
      const value = checkout ? remaining : (DART_SCORES[target] ?? 25);
      const projected = remaining - (correct ? value : 0);
      const bust = correct && (projected < 0 || projected === 1 || (projected === 0 && !checkout));
      const lastQuestion = visitQuestion === 2;

      if (correct && checkout) {
        setRemaining(0);
        setVisitScore((score) => score + value);
        setFeedback(`Checkout! Double ${value / 2} — game won.`);
      } else if (bust) {
        setRemaining(visitStart);
        setVisitScore(0);
        setVisitQuestion(0);
        setFeedback(
          `Bust — the visit returns to ${visitStart}. You must leave zero and finish on a double.`,
        );
      } else {
        const nextRemaining = correct ? projected : remaining;
        const nextVisitScore = visitScore + (correct ? value : 0);
        setRemaining(nextRemaining);
        if (lastQuestion) {
          setFeedback(`Visit complete · ${nextVisitScore} scored · ${nextRemaining} remaining.`);
          setVisitStart(nextRemaining);
          setVisitScore(0);
          setVisitQuestion(0);
        } else {
          setVisitScore(nextVisitScore);
          setVisitQuestion((question) => question + 1);
          setFeedback(
            correct ? `Correct · ${value} scored.` : "Miss · no score for this question.",
          );
        }
      }
      setCheckout(false);
    }
    if (!correct) setMisses((m) => m + 1);
    if (mode !== "501") {
      setFeedback(
        correct
          ? `Correct${o.answer ? ` · ${o.answer}` : ""}`
          : `Not this time${o.answer ? ` · ${o.answer}` : ""}`,
      );
    }
    setTarget(null);
    setRound((r) => r + 1);
  };

  const checkConnection = () => {
    if (selected.length !== 4) return;
    const group = CONNECTION_GROUPS.find((g) => g.items.every((x) => selected.includes(x)));
    if (group && !solved.includes(group.label)) {
      setSolved((v) => [...v, group.label]);
      setFeedback(`Connected: ${group.label}`);
    } else {
      setMisses((m) => m + 1);
      setFeedback("Those four do not form a complete group.");
    }
    setSelected([]);
  };
  const allConnections = useMemo(
    () => CONNECTION_GROUPS.flatMap((g) => g.items).sort((a, b) => seeded(a, 3) - seeded(b, 3)),
    [],
  );
  const solvedItems = new Set(
    solved.flatMap((l) => CONNECTION_GROUPS.find((g) => g.label === l)?.items ?? []),
  );

  const reset = () => {
    setRound(0);
    setTarget(null);
    setMine([]);
    setRival([]);
    setRemaining(501);
    setVisitStart(501);
    setVisitQuestion(0);
    setVisitScore(0);
    setCheckout(false);
    setFeedback(null);
    setSelected([]);
    setSolved([]);
    setSquad([]);
    setMisses(0);
  };

  if (c.pro && !pro) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="game-card p-8 text-center">
          <span className={`mx-auto grid size-16 place-items-center rounded-2xl ${c.tone}`}>
            <Icon className="size-8" />
          </span>
          <p className="eyebrow mt-4">Fanzeno Pro</p>
          <h1 className="mt-1 text-4xl">{c.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{c.rule}</p>
          <div className="game-progress mt-6">
            <div className="game-progress-fill w-3/4" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            This is a Fanzeno Pro table. Free players can still join a Pro host's private room.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg" className="font-bold uppercase tracking-[0.14em]">
              <Link to="/upgrade">
                <Gem className="size-4" /> Unlock Fanzeno Pro
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/arcade">Back to arcade</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <SideAdRail placement="arcade" />
      <div
        className={`game-card relative overflow-hidden flex items-center gap-4 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}
      >
        <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
        <Button variant="ghost" size="icon" aria-label="Back" asChild>
          <Link to="/arcade">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1 relative">
          <p className="eyebrow">Fanzeno arcade</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">{c.title}</h1>
        </div>
        <span className={`grid size-12 place-items-center rounded-xl ${c.tone}`}>
          <Icon className="size-6" />
        </span>
      </div>

      <div
        className={`game-panel relative mt-5 flex items-center justify-between gap-4 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}
      >
        <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
            Progress
          </p>
          <p className={`font-display text-4xl leading-none ${c.accent}`}>{progress}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-muted-foreground">{c.rule}</p>
          <div className="game-progress mt-3">
            <div
              className="game-progress-fill"
              style={{
                width: `${mode === "501" ? Math.max(0, Math.min(100, ((501 - remaining) / 501) * 100)) : mode === "connections" ? (solved.length / 4) * 100 : mode === "draft" ? (squad.length / DRAFT.length) * 100 : mode === "territory" ? Math.min(100, (mine.length / 10) * 100) : Math.min(100, (mine.length / 16) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {mode !== "connections" && (
        <>
          <Label>{mode === "501" ? "Next question difficulty" : "Difficulty"}</Label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.level}
                on={difficulty === d.level}
                onClick={() => target === null && setDifficulty(d.level)}
              >
                {d.label}
              </Chip>
            ))}
          </div>
        </>
      )}

      {finished ? (
        <div
          className={`game-card mt-6 p-6 text-center ${won ? "border-primary/60" : "border-destructive/60"}`}
        >
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-gold/10">
            <Trophy className="size-8 text-gold" />
          </span>
          <p className="eyebrow mt-4">{won ? "Victory" : "Defeat"}</p>
          <p className="mt-2 font-display text-4xl">
            {mode === "territory"
              ? won
                ? "Territory captured"
                : "The rival holds the ground"
              : mode === "501"
                ? "Checkout!"
                : mode === "bingo"
                  ? "Bingo!"
                  : mode === "draft"
                    ? "Full five signed"
                    : "All four connected"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {round} question{round === 1 ? "" : "s"} · {misses} miss{misses === 1 ? "" : "es"}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={reset} className="font-bold uppercase tracking-[0.14em]">
              <RotateCcw className="size-4" /> Play again
            </Button>
            <Button asChild variant="outline">
              <Link to="/arcade">Arcade</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {mode === "territory" && (
            <div
              className={`game-panel relative mt-6 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}
            >
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="board-stage relative">
              <div
                className="board-tilt board-rim board-felt grid grid-cols-5 gap-2 p-3"
                role="group"
                aria-label="Territory zones"
              >
                {Array.from({ length: 19 }, (_, i) => {
                  const own = mine.includes(i),
                    theirs = rival.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={own || theirs || target !== null}
                      onClick={() => setTarget(i)}
                      aria-label={`Zone ${i + 1}${own ? ", yours" : theirs ? ", rival" : ""}`}
                      className={`game-tile !bg-transparent !border-white/10 ${
                        target === i && !own && !theirs ? "game-tile-reward" : "hover:border-primary/60"
                      } ${i === 15 ? "col-start-2" : ""}`}
                    >
                      {(own || theirs) ? (
                        <span
                          className={`game-token size-8 ${own ? "game-token-gold" : "game-token-rival"}`}
                        />
                      ) : (
                        <Hexagon className="size-6 text-cream/70" />
                      )}
                      <span className="absolute bottom-1 right-1.5 text-[0.55rem] font-bold text-inherit opacity-70">
                        {i + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          )}

          {mode === "501" && (
            <div
              className={`game-panel relative mt-6 p-6 text-center border-t-4 ${c.accent.replace("text-", "border-")}`}
            >
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="board-stage relative mx-auto flex max-w-xs flex-col items-center">
                <div className="board-tilt board-rim board-wood aspect-square w-full p-4 sm:max-w-[20rem]">
                  <Dartboard
                    size={320}
                    className="mx-auto h-full w-full"
                    highlight={target === null ? DART_BEDS : []}
                    lastHit={lastBed}
                    onPick={
                      target !== null
                        ? undefined
                        : (bed) => {
                            const index = DART_BEDS.findIndex(
                              (b) => b.segment === bed.segment && b.ring === bed.ring,
                            );
                            if (index === -1) return;
                            setLastBed(bed);
                            setDifficulty(index + 1);
                          }
                    }
                  />
                </div>
                <div className="scoreboard-slate -mt-6 w-11/12 rounded-xl px-4 py-3">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] opacity-70">
                    Remaining
                  </p>
                  <p className="font-mono text-5xl font-black tabular-nums">{remaining}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {DIFFICULTIES.map((level, index) => (
                  <Chip
                    key={level.level}
                    on={difficulty === level.level}
                    onClick={() => {
                      setLastBed(DART_BEDS[index] ?? null);
                      setDifficulty(level.level);
                    }}
                  >
                    {DART_SCORES[index]} · {level.label}
                  </Chip>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-background/50 p-3 text-center">
                <div>
                  <strong className="block text-lg text-foreground">{visitQuestion + 1}/3</strong>
                  <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                    Question
                  </span>
                </div>
                <div>
                  <strong className="block text-lg text-gold">{visitScore}</strong>
                  <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                    Visit score
                  </span>
                </div>
                <div>
                  <strong className="block text-lg text-foreground">180</strong>
                  <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                    Visit max
                  </span>
                </div>
              </div>
              {remaining <= 40 && remaining % 2 === 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    disabled={target !== null}
                    onClick={() => {
                      setCheckout(false);
                      setTarget(difficulty - 1);
                    }}
                  >
                    Score {DART_SCORES[difficulty - 1]}
                  </Button>
                  <Button
                    disabled={target !== null}
                    onClick={() => {
                      setCheckout(true);
                      setTarget(difficulty - 1);
                    }}
                    className="bg-gold text-background hover:bg-gold/90"
                  >
                    Checkout · Double {remaining / 2}
                  </Button>
                </div>
              ) : (
                <Button
                  className="mt-4 w-full font-bold uppercase tracking-[0.14em]"
                  disabled={target !== null}
                  onClick={() => {
                    setCheckout(false);
                    setTarget(difficulty - 1);
                  }}
                >
                  Start {DIFFICULTIES[difficulty - 1]?.label} question ·{" "}
                  {DART_SCORES[difficulty - 1]} points
                </Button>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                A visit is three questions. A bust restores the score at the start of the visit.
                Exact zero must be checked out on a double.
              </p>
            </div>
          )}

          {mode === "connections" && (
            <div
              className={`game-panel relative mt-6 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}
            >
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="board-stage relative">
              <div className="board-tilt board-rim board-felt grid grid-cols-4 gap-2 p-3">
                {allConnections.map((x) => {
                  const done = solvedItems.has(x),
                    on = selected.includes(x);
                  return (
                    <button
                      key={x}
                      type="button"
                      disabled={done}
                      aria-pressed={on}
                      onClick={() =>
                        setSelected((v) =>
                          v.includes(x) ? v.filter((y) => y !== x) : v.length < 4 ? [...v, x] : v,
                        )
                      }
                      className={`phys-card game-tile text-xs ${
                        done
                          ? "phys-card-solved border-primary/40 bg-primary/10 text-primary"
                          : on
                            ? "game-tile-completed"
                            : ""
                      }`}
                    >
                      {done && <Check className="size-3 text-primary" />}
                      {x}
                    </button>
                  );
                })}
              </div>
              </div>
              <Button
                className="mt-4 w-full font-bold uppercase tracking-[0.14em]"
                disabled={selected.length !== 4}
                onClick={checkConnection}
              >
                Check connection
              </Button>
              {solved.map((x) => (
                <p
                  key={x}
                  className="game-feedback game-feedback-success mt-2 w-full justify-center"
                >
                  <Check className="size-3.5" /> {x}
                </p>
              ))}
            </div>
          )}

          {mode === "draft" && (
            <div
              className={`game-panel relative mt-6 p-4 space-y-2 border-t-4 ${c.accent.replace("text-", "border-")}`}
            >
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="board-stage relative">
              <div className="board-tilt board-rim board-wood relative space-y-2 p-3">
                {DRAFT.map((x, i) => {
                  const signed = squad.includes(i);
                  return (
                    <button
                      key={x.name}
                      type="button"
                      disabled={signed || target !== null}
                      onClick={() => setTarget(i)}
                      className={`card-holder flex w-full items-center gap-3 p-3 text-left transition-all ${signed ? "card-slide-in border-gold/60 bg-gold/10" : target === i ? "border-gold shadow-gold/20 shadow-lg" : "hover:border-gold/60"}`}
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/12">
                        <span className="font-display text-xl text-gold">{x.rating}</span>
                      </span>
                      <span className="flex-1">
                        <span className="block font-display text-xl">{x.name}</span>
                        <span className="block text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {x.role}
                        </span>
                      </span>
                      {signed && (
                        <span className="game-feedback game-feedback-success">
                          <Check className="size-4" /> Signed
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          )}

          {mode === "bingo" && (
            <div
              className={`game-panel relative mt-6 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}
            >
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="relative mb-3 flex items-center justify-between">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Your card
                </p>
                <span className="game-feedback game-feedback-info">
                  {mine.length}/{BINGO.length} marked
                </span>
              </div>
              <div className="board-stage relative">
                <div className="board-tilt board-rim board-felt p-4 sm:p-6">
                  <div className="bingo-stock rounded-xl p-3" role="group" aria-label="Bingo card">
                    <div className="mb-2 grid grid-cols-4 gap-2">
                      {["F", "A", "N", "Z"].map((ch) => (
                        <span
                          key={ch}
                          className="rounded-md bg-destructive py-1 text-center font-display text-2xl leading-none text-destructive-foreground"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {BINGO.map((label, i) => {
                        const own = mine.includes(i);
                        const TileIcon = BINGO_ICONS[label] ?? Star;
                        const tone = [
                          "text-chart-1",
                          "text-chart-2",
                          "text-chart-3",
                          "text-chart-4",
                          "text-chart-5",
                        ][i % 5];
                        return (
                          <button
                            key={label}
                            type="button"
                            disabled={own || target !== null}
                            onClick={() => setTarget(i)}
                            aria-pressed={target === i}
                            className={`bingo-cell flex aspect-square flex-col items-center justify-center gap-1.5 px-1 text-center text-[0.6rem] font-bold uppercase leading-tight tracking-wide transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-default ${
                              target === i ? "ring-2 ring-gold" : ""
                            } ${tone}`}
                          >
                            <TileIcon className="size-5 text-current" />
                            <span className="leading-none">{label}</span>
                            {own && <span className="daub-mark" aria-hidden />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {feedback && (
            <p className="mt-4 text-center text-xs font-semibold text-muted-foreground">
              {feedback}
            </p>
          )}

          {target !== null && mode !== "connections" && (
            <QuestionCard
              turnKey={`${mode}-${round}-${target}`}
              sportId={sportId}
              categoryKey={null}
              difficulty={mode === "501" ? target + 1 : difficulty}
              bank={bank}
              accentClass={c.accent}
              onResolved={resolve}
              rewardLabel={() =>
                mode === "territory"
                  ? `Zone ${target + 1} · answer to capture`
                  : mode === "501"
                    ? checkout
                      ? `Checkout · Double ${remaining / 2}`
                      : `${DIFFICULTIES[target]?.label ?? "Question"} · ${DART_SCORES[target] ?? 25} points`
                    : mode === "draft"
                      ? `Sign ${DRAFT[target]?.name ?? "the athlete"}`
                      : `Square · ${BINGO[target]}`
              }
            />
          )}
        </>
      )}
    </div>
  );
}
