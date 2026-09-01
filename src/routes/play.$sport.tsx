import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Cpu,
  Eye,
  Infinity as InfinityIcon,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  X,
} from "lucide-react";
import { AthleteAutocomplete } from "@/components/game/AthleteAutocomplete";
import { CriterionGlyph } from "@/components/game/CriterionGlyph";
import {
  BASE_POINTS,
  checkGuess,
  difficultyMeta,
  emptyBoard,
  fetchDailyGrid,
  fetchGridById,
  fetchMyGame,
  fetchReveal,
  generateEndlessGrid,
  hasLine,
  submitGuess,
  tacticalPick,
  type CellState,
  type Owner,
  type PlayMode,
} from "@/lib/fanzeno";
import { scopeLabel, useQuizPrefs } from "@/lib/quizPrefs";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type PlaySearch = {
  mode?: PlayMode;
  grid?: string;
  difficulty?: number;
};

const MODES: PlayMode[] = ["daily", "endless", "pass", "cpu"];

export const Route = createFileRoute("/play/$sport")({
  validateSearch: (raw: Record<string, unknown>): PlaySearch => {
    const out: PlaySearch = {};
    if (MODES.includes(raw["mode"] as PlayMode)) out.mode = raw["mode"] as PlayMode;
    if (typeof raw["grid"] === "string" && raw["grid"]) out.grid = raw["grid"];
    const d = Number(raw["difficulty"]);
    if (d >= 1 && d <= 4) out.difficulty = d;
    return out;
  },
  head: ({ params }) => {
    const name = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
    const title = `${name} grid — Fanzeno`;
    const description = `Fill all nine squares of the ${name} knowledge grid. Play the daily puzzle, endless verified grids, or battle a friend or the CPU.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PlayPage,
});

function PlayPage() {
  const { sport } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const mode: PlayMode = search.mode ?? "daily";
  const battle = mode === "pass" || mode === "cpu";
  const persisted = mode === "daily" || mode === "endless";
  const { user } = useAuth();
  const { prefs, hydrated } = useQuizPrefs();

  const [board, setBoard] = useState<CellState[]>(emptyBoard);
  const [owners, setOwners] = useState<(Owner | undefined)[]>(() => Array(9).fill(undefined));
  const [turn, setTurn] = useState<Owner>("p1");
  const [winner, setWinner] = useState<Owner | "draw" | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [guess, setGuess] = useState("");
  const [pending, setPending] = useState(false);
  const [points, setPoints] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, string[]> | null>(null);
  const answerBank = useRef<Record<number, string[]> | null>(null);

  const competitionId = prefs.sport === sport ? prefs.competitionId : null;
  const gridQuery = useQuery({
    queryKey: ["grid", sport, search.grid ?? "daily", competitionId],
    queryFn: async () => {
      if (search.grid) {
        const g = await fetchGridById(search.grid);
        return g ? { ...g, scopeFallback: false } : null;
      }
      return fetchDailyGrid(sport, { competitionId });
    },
    enabled: hydrated,
  });
  const grid = gridQuery.data;
  const difficulty = difficultyMeta(search.difficulty ?? grid?.difficulty ?? 2);

  const resetLocal = () => {
    setBoard(emptyBoard());
    setOwners(Array(9).fill(undefined));
    setTurn("p1");
    setWinner(null);
    setRevealed(null);
    setPoints(0);
    answerBank.current = null;
  };

  useEffect(() => {
    resetLocal();
  }, [sport, search.grid, mode]);

  // Restore a signed-in player's progress (daily / endless only).
  useEffect(() => {
    if (!grid || !user || !persisted) return;
    let cancelled = false;
    void fetchMyGame(grid.id, user.id, mode === "endless" ? "endless" : "daily").then((game) => {
      if (cancelled || !game) return;
      const next = emptyBoard();
      for (const move of game.moves) {
        next[move.cell_index] = {
          guess: move.guess,
          athlete: move.accepted ? move.guess : undefined,
          status: move.accepted ? "correct" : "wrong",
        };
      }
      setBoard(next);
      setPoints(game.points ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, [grid, user, persisted, mode]);

  const filled = board.filter((c) => c.status !== "empty").length;
  const correct = board.filter((c) => c.status === "correct").length;
  const finished = battle ? winner !== null : filled === 9;
  const p1Count = owners.filter((o) => o === "p1").length;
  const p2Count = owners.filter((o) => o === "p2").length;

  const settle = (nextOwners: (Owner | undefined)[], mover: Owner) => {
    if (hasLine(nextOwners, mover)) {
      setWinner(mover);
      return true;
    }
    if (nextOwners.every(Boolean)) {
      setWinner("draw");
      return true;
    }
    return false;
  };

  /** CPU claims a square using a real verified answer from the key. */
  const cpuMove = async (currentBoard: CellState[], currentOwners: (Owner | undefined)[]) => {
    if (!grid) return;
    if (!answerBank.current) {
      try {
        answerBank.current = await fetchReveal(grid.id);
      } catch {
        answerBank.current = {};
      }
    }
    const pick =
      difficulty.level >= 3
        ? tacticalPick(currentOwners, "p2")
        : (() => {
            const free = currentOwners.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
            return free.length ? free[Math.floor(Math.random() * free.length)]! : null;
          })();
    if (pick === null) return;
    const name = answerBank.current?.[pick]?.[0] ?? "CPU verified answer";
    await new Promise((r) => setTimeout(r, difficulty.level >= 3 ? 500 : 900));
    const nextBoard = [...currentBoard];
    nextBoard[pick] = { guess: name, athlete: name, status: "correct" };
    const nextOwners = [...currentOwners];
    nextOwners[pick] = "p2";
    setBoard(nextBoard);
    setOwners(nextOwners);
    if (!settle(nextOwners, "p2")) setTurn("p1");
  };

  const send = async () => {
    if (!grid || active === null || !guess.trim()) return;
    setPending(true);
    try {
      const result = battle
        ? await checkGuess({ gridId: grid.id, cell: active, guess: guess.trim() })
        : await submitGuess({
            gridId: grid.id,
            cell: active,
            guess: guess.trim(),
            signedIn: !!user,
            mode: mode === "endless" ? "endless" : "daily",
          });

      const nextBoard = [...board];
      nextBoard[active] = {
        guess: guess.trim(),
        athlete: result.athlete_name ?? undefined,
        status: result.accepted ? "correct" : "wrong",
      };
      setBoard(nextBoard);

      if (battle) {
        const mover = turn;
        const nextOwners = [...owners];
        if (result.accepted) {
          nextOwners[mover === "p1" ? active : active] = mover;
          setOwners(nextOwners);
          toast.success(`${result.athlete_name} — square claimed.`);
        } else {
          toast.error("Wrong answer — the square stays open.");
          // A wrong guess frees the cell again for either player.
          nextBoard[active] = { status: "empty" };
          setBoard(nextBoard);
        }
        setActive(null);
        setGuess("");
        if (result.accepted && settle(nextOwners, mover)) return;
        const nextTurn: Owner = mover === "p1" ? "p2" : "p1";
        setTurn(nextTurn);
        if (mode === "cpu" && nextTurn === "p2") void cpuMove(nextBoard, nextOwners);
        return;
      }

      if (result.accepted) {
        const gained = result.move_points ?? BASE_POINTS * difficulty.multiplier;
        setPoints((p) => (result.points !== undefined ? result.points : p + gained));
        toast.success(`${result.athlete_name} fits — +${gained} pts`);
      } else toast.error("Not a match for those two criteria.");
      setActive(null);
      setGuess("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check that answer.");
    } finally {
      setPending(false);
    }
  };

  const reveal = async () => {
    if (!grid) return;
    try {
      setRevealed(await fetchReveal(grid.id));
    } catch {
      toast.error("Finish the grid to see the answers.");
    }
  };

  const nextEndless = async () => {
    if (!grid || !user) return;
    setGenerating(true);
    try {
      const id = await generateEndlessGrid({
        sportId: grid.sport.id,
        competitionId,
        difficulty: difficulty.level,
      });
      void navigate({
        to: "/play/$sport",
        params: { sport },
        search: { mode: "endless", grid: id, difficulty: difficulty.level },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a grid.");
    } finally {
      setGenerating(false);
    }
  };

  const modeLabel = useMemo(() => {
    if (mode === "endless") return `Endless · ${difficulty.label}`;
    if (mode === "pass") return `Pass & Play · ${turn === "p1" ? "Player 1" : "Player 2"}`;
    if (mode === "cpu") return `vs CPU · ${difficulty.label}`;
    return grid?.scheduled_for ?? "Daily 9";
  }, [mode, difficulty, turn, grid]);

  if (gridQuery.isLoading || !hydrated) {
    return <PageShell>Loading grid…</PageShell>;
  }

  if (!grid) {
    return (
      <PageShell>
        <h1 className="text-3xl">No grid published yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sport} doesn&apos;t have a live puzzle right now. Try football, cricket or NBA.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back home</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            {mode === "endless" && <InfinityIcon className="size-3" />}
            {mode === "cpu" && <Cpu className="size-3" />}
            {mode === "pass" && <Smartphone className="size-3" />}
            {modeLabel} · {difficulty.multiplier}× points
          </p>
          <h1 className="mt-2 text-4xl">{grid.sport.name} grid</h1>
          <Link
            to="/filters"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="size-3" />
            {competitionId ? scopeLabel(prefs, grid.sport.name) : `All ${grid.sport.name}`}
            {grid.scopeFallback && (
              <span className="normal-case tracking-normal text-gold">· no dedicated grid yet</span>
            )}
          </Link>
        </div>
        {battle ? (
          <div className="flex items-end gap-4 text-right">
            <Score label={mode === "cpu" ? "You" : "Player 1"} value={p1Count} on={turn === "p1" && !winner} />
            <Score label={mode === "cpu" ? "CPU" : "Player 2"} value={p2Count} on={turn === "p2" && !winner} tone="gold" />
          </div>
        ) : (
          <div className="text-right">
            <span className="font-display text-4xl text-primary">{correct}</span>
            <span className="font-display text-2xl text-muted-foreground">/9</span>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {points > 0 ? `${points.toLocaleString()} pts · ` : ""}
              {9 - filled} guesses left
            </p>
          </div>
        )}
      </div>

      {!user && !battle && (
        <div className="panel mt-5 flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="text-muted-foreground">
            Playing as a guest — sign in to save streaks, points and ranks.
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      {battle && winner && (
        <div className="panel stadium-line mt-5 flex flex-wrap items-center gap-3 p-4">
          <p className="font-display text-2xl">
            {winner === "draw"
              ? "Board full — it's a draw"
              : winner === "p1"
                ? mode === "cpu" ? "You beat the CPU!" : "Player 1 takes the line!"
                : mode === "cpu" ? "The CPU got three in a row." : "Player 2 takes the line!"}
          </p>
          <Button className="ml-auto" onClick={resetLocal}>
            <RotateCcw className="size-4" /> Rematch
          </Button>
        </div>
      )}

      <div className="panel mt-6 overflow-hidden p-3 sm:p-5">
        <div className="grid grid-cols-[minmax(72px,1fr)_repeat(3,1fr)] gap-2">
          <div />
          {grid.cols.map((label) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-lg bg-surface-strong/70 px-2 py-3 text-center text-[0.66rem] font-bold uppercase leading-tight tracking-[0.08em]"
            >
              <CriterionGlyph label={label} />
              {label}
            </div>
          ))}

          {grid.rows.map((rowLabel, r) => (
            <div key={rowLabel} className="contents">
              <div className="flex items-center gap-2 rounded-lg bg-surface-strong/70 px-2 py-3 text-[0.66rem] font-bold uppercase leading-tight tracking-[0.08em]">
                <CriterionGlyph label={rowLabel} />
                <span>{rowLabel}</span>
              </div>
              {[0, 1, 2].map((c) => {
                const index = r * 3 + c;
                const cell = board[index]!;
                const owner = owners[index];
                const locked =
                  cell.status !== "empty" || (battle && (winner !== null || (mode === "cpu" && turn === "p2")));
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setActive(index);
                      setGuess("");
                    }}
                    className={`aspect-square rounded-xl border p-2 text-center text-[0.7rem] font-semibold transition-all ${
                      cell.status === "correct"
                        ? owner === "p2"
                          ? "border-gold/70 bg-gold/15 text-foreground"
                          : "border-primary/70 bg-primary/18 text-foreground"
                        : cell.status === "wrong"
                          ? "border-destructive/60 bg-destructive/12 text-muted-foreground line-through"
                          : "border-border bg-background/60 hover:border-primary/70 hover:bg-primary/8 disabled:opacity-60"
                    }`}
                  >
                    {cell.status === "empty" ? (
                      <span className="text-lg text-muted-foreground">+</span>
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-1">
                        {cell.status === "correct" ? (
                          <Check className={`size-4 ${owner === "p2" ? "text-gold" : "text-primary"}`} />
                        ) : (
                          <X className="size-4 text-destructive" />
                        )}
                        <span className="line-clamp-3 break-words">{cell.athlete ?? cell.guess}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="outline" onClick={resetLocal}>
          <RotateCcw className="size-4" /> {battle ? "Restart" : "Reset board"}
        </Button>
        {mode === "endless" && (
          <Button onClick={() => void nextEndless()} disabled={generating || !user}>
            <InfinityIcon className="size-4" /> {generating ? "Generating…" : "Generate another grid"}
          </Button>
        )}
        {finished && (
          <Button variant="secondary" onClick={() => void reveal()}>
            <Eye className="size-4" /> Show answers
          </Button>
        )}
        <Button asChild variant="ghost" className="ml-auto">
          <Link to="/modes/$sport" params={{ sport }}>Change mode</Link>
        </Button>
      </div>

      {revealed && (
        <div className="panel mt-6 p-5">
          <h2 className="text-xl">Valid answers</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="rounded-lg border border-border/70 bg-background/50 p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Square {i + 1}
                </p>
                <p className="mt-1 text-xs">{(revealed[i] ?? []).join(", ") || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {active !== null && `${grid.rows[Math.floor(active / 3)]} × ${grid.cols[active % 3]}`}
            </DialogTitle>
            <DialogDescription>
              {battle
                ? `${turn === "p1" ? (mode === "cpu" ? "Your" : "Player 1's") : "Player 2's"} turn. A correct answer claims the square; a wrong one passes the turn.`
                : "Name an athlete who satisfies both criteria. Suggestions come from the verified athlete index — typos, accents and nicknames are fine."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-start gap-2"
          >
            <div className="flex-1">
              <AthleteAutocomplete
                value={guess}
                onChange={setGuess}
                onSelect={() => void 0}
                sportId={grid.sport.id}
                placeholder="e.g. Lionel Messi"
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending || !guess.trim()}>
              {pending ? "Checking…" : "Submit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Score({ label, value, on, tone = "primary" }: { label: string; value: number; on: boolean; tone?: "primary" | "gold" }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${on ? (tone === "gold" ? "border-gold/70" : "border-primary/70") : "border-border/60"}`}>
      <span className={`font-display text-3xl ${tone === "gold" ? "text-gold" : "text-primary"}`}>{value}</span>
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-16">{children}</div>;
}
