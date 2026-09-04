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

type Mode = "territory" | "501" | "connections" | "draft" | "bingo";
type Search = { mode: Mode };
const MODES: Mode[] = ["territory", "501", "connections", "draft", "bingo"];

export const Route = createFileRoute("/arcade_/board")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    mode: MODES.includes(raw["mode"] as Mode) ? (raw["mode"] as Mode) : "bingo",
  }),
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
    rule: "Choose a scoring lane. Correct answers reduce 501 to exactly zero.",
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
// Include a one-point checkout so the 501 start value can always reach exactly zero.
const LANES = [1, 25, 50, 100] as const;

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

  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [mine, setMine] = useState<number[]>([]);
  const [rival, setRival] = useState<number[]>([]);
  const [remaining, setRemaining] = useState(501);
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
      if (correct) {
        const value = LANES[target] ?? 25;
        setRemaining((v) => (value > v ? v : v - value)); // bust rule: overshoot scores nothing
        if (value > remaining)
          setFeedback(`Bust — ${value} is more than you need. Pick a smaller lane.`);
      }
    }
    if (!correct) setMisses((m) => m + 1);
    if (mode !== "501" || !correct || (LANES[target] ?? 0) <= remaining) {
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
      <div className={`game-card relative overflow-hidden flex items-center gap-4 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}>
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

      <div className={`game-panel relative mt-5 flex items-center justify-between gap-4 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}>
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
          <Label>Difficulty</Label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d.level}
                on={difficulty === d.level}
                onClick={() => setDifficulty(d.level)}
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
            <div className={`game-panel relative mt-6 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}>
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="grid grid-cols-5 gap-2 relative" role="group" aria-label="Territory zones">
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
                      className={`game-tile ${
                        own
                          ? "game-tile-completed"
                          : theirs
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : target === i
                              ? "game-tile-reward"
                              : "hover:border-primary/60"
                      } ${i === 15 ? "col-start-2" : ""}`}
                    >
                      <Hexagon
                        className={`size-6 ${own ? "text-primary-foreground" : theirs ? "text-destructive-foreground" : "text-muted-foreground"}`}
                      />
                      <span className="absolute bottom-1 right-1.5 text-[0.55rem] font-bold text-inherit opacity-70">
                        {i + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === "501" && (
            <div className={`game-panel relative mt-6 p-6 text-center border-t-4 ${c.accent.replace("text-", "border-")}`}>
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="relative inline-flex flex-col items-center">
                <div
                  className="game-score-ring"
                  style={{
                    ["--progress" as string]: `${Math.max(0, Math.min(100, ((501 - remaining) / 501) * 100))}%`,
                    width: "8rem",
                    height: "8rem",
                  }}
                >
                  <div className="game-score-ring-inner" style={{ width: "6.5rem", height: "6.5rem" }}>
                    <div>
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        Remaining
                      </p>
                      <p className="font-display text-6xl text-gold">{remaining}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-4 gap-2">
                {LANES.map((x, i) => (
                  <button
                    key={x}
                    type="button"
                    disabled={target !== null}
                    onClick={() => setTarget(i)}
                    aria-pressed={target === i}
                    className={`game-tile text-xs ${
                      x > remaining
                        ? "border-border text-muted-foreground/50"
                        : target === i
                          ? "game-tile-reward"
                          : "hover:border-gold/60 hover:text-gold"
                    }`}
                  >
                    <span className="font-display text-2xl leading-none">{x}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Choose a scoring lane to receive your question. Overshooting is a bust.
              </p>
            </div>
          )}

          {mode === "connections" && (
            <div className={`game-panel relative mt-6 p-4 border-t-4 ${c.accent.replace("text-", "border-")}`}>
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="grid grid-cols-4 gap-2 relative">
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
                      className={`game-tile text-xs ${
                        done
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : on
                            ? "game-tile-completed"
                            : "hover:border-primary/60"
                      }`}
                    >
                      {done && <Check className="size-3 text-primary" />}
                      {x}
                    </button>
                  );
                })}
              </div>
              <Button
                className="mt-4 w-full font-bold uppercase tracking-[0.14em]"
                disabled={selected.length !== 4}
                onClick={checkConnection}
              >
                Check connection
              </Button>
              {solved.map((x) => (
                <p key={x} className="game-feedback game-feedback-success mt-2 w-full justify-center">
                  <Check className="size-3.5" /> {x}
                </p>
              ))}
            </div>
          )}

          {mode === "draft" && (
            <div className={`game-panel relative mt-6 p-4 space-y-2 border-t-4 ${c.accent.replace("text-", "border-")}`}>
              <div className="stadium-line pointer-events-none absolute inset-0 opacity-30" />
              <div className="relative space-y-2">
                {DRAFT.map((x, i) => {
                  const signed = squad.includes(i);
                  return (
                    <button
                      key={x.name}
                      type="button"
                      disabled={signed || target !== null}
                      onClick={() => setTarget(i)}
                      className={`panel flex w-full items-center gap-3 p-3 text-left transition-all ${signed ? "border-gold/60 bg-gold/10" : target === i ? "border-gold shadow-gold/20 shadow-lg" : "hover:border-gold/60"}`}
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
          )}

          {mode === "bingo" && (
            <div className="game-card mt-6 p-4">
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Bingo card">
                {BINGO.map((label, i) => {
                  const own = mine.includes(i);
                  const TileIcon = BINGO_ICONS[label] ?? Star;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={own || target !== null}
                      onClick={() => setTarget(i)}
                      aria-pressed={target === i}
                      className={`game-tile ${
                        own
                          ? "game-tile-completed"
                          : target === i
                            ? "game-tile-reward"
                            : "hover:border-primary/60 hover:text-foreground"
                      }`}
                    >
                      <TileIcon
                        className={`size-5 ${own ? "text-primary-foreground" : target === i ? "text-gold-foreground" : "text-muted-foreground"}`}
                      />
                      <span className="leading-none">{label}</span>
                      {own && (
                        <span className="absolute right-1 top-1">
                          <Check className="size-3 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  );
                })}
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
              difficulty={difficulty}
              bank={bank}
              accentClass={c.accent}
              onResolved={resolve}
              rewardLabel={() =>
                mode === "territory"
                  ? `Zone ${target + 1} · answer to capture`
                  : mode === "501"
                    ? `${LANES[target]} lane`
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
