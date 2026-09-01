import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Check,
  Eye,
  Flag,
  Hand,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AthleteAutocomplete } from "@/components/game/AthleteAutocomplete";
import {
  criterionIcon,
  emptyBoard,
  fetchDailyGrid,
  fetchMyGame,
  fetchReveal,
  submitGuess,
  type CellState,
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

export const Route = createFileRoute("/play/$sport")({
  head: ({ params }) => {
    const name = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
    const title = `${name} daily grid — Fanzeno`;
    const description = `Fill all nine squares of today's ${name} knowledge grid. Every answer is checked against the Fanzeno athlete database.`;
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
  const { user } = useAuth();
  const { prefs, hydrated } = useQuizPrefs();
  const [board, setBoard] = useState<CellState[]>(emptyBoard);
  const [active, setActive] = useState<number | null>(null);
  const [guess, setGuess] = useState("");
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, string[]> | null>(null);

  // Only apply the competition scope when it belongs to the sport being played.
  const competitionId = prefs.sport === sport ? prefs.competitionId : null;
  const gridQuery = useQuery({
    queryKey: ["daily-grid", sport, competitionId],
    queryFn: () => fetchDailyGrid(sport, { competitionId }),
    enabled: hydrated,
  });
  const grid = gridQuery.data;

  useEffect(() => {
    setBoard(emptyBoard());
    setRevealed(null);
  }, [sport]);

  // Restore a signed-in player's progress on this grid.
  useEffect(() => {
    if (!grid || !user) return;
    let cancelled = false;
    void fetchMyGame(grid.id, user.id).then((game) => {
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
    });
    return () => {
      cancelled = true;
    };
  }, [grid, user]);

  const filled = board.filter((c) => c.status !== "empty").length;
  const correct = board.filter((c) => c.status === "correct").length;
  const finished = filled === 9;

  const send = async () => {
    if (!grid || active === null || !guess.trim()) return;
    setPending(true);
    try {
      const result = await submitGuess({
        gridId: grid.id,
        cell: active,
        guess: guess.trim(),
        signedIn: !!user,
      });
      setBoard((prev) => {
        const next = [...prev];
        next[active] = {
          guess: guess.trim(),
          athlete: result.athlete_name ?? undefined,
          status: result.accepted ? "correct" : "wrong",
        };
        return next;
      });
      if (result.accepted) toast.success(`${result.athlete_name} fits that square.`);
      else toast.error("Not a match for those two criteria.");
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

  if (gridQuery.isLoading || !hydrated) {
    return <PageShell>Loading today&apos;s grid…</PageShell>;
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
          <p className="eyebrow">{grid.scheduled_for ?? "Daily"} · difficulty {grid.difficulty}</p>
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
        <div className="text-right">
          <span className="font-display text-4xl text-primary">{correct}</span>
          <span className="font-display text-2xl text-muted-foreground">/9</span>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {9 - filled} guesses left
          </p>
        </div>
      </div>

      {!user && (
        <div className="panel mt-5 flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="text-muted-foreground">
            Playing as a guest — sign in to save streaks and rank up.
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/auth">Sign in</Link>
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
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={cell.status !== "empty"}
                    onClick={() => {
                      setActive(index);
                      setGuess("");
                    }}
                    className={`aspect-square rounded-xl border p-2 text-center text-[0.7rem] font-semibold transition-all ${
                      cell.status === "correct"
                        ? "border-primary/70 bg-primary/18 text-foreground"
                        : cell.status === "wrong"
                          ? "border-destructive/60 bg-destructive/12 text-muted-foreground line-through"
                          : "border-border bg-background/60 hover:border-primary/70 hover:bg-primary/8"
                    }`}
                  >
                    {cell.status === "empty" ? (
                      <span className="text-lg text-muted-foreground">+</span>
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-1">
                        {cell.status === "correct" ? (
                          <Check className="size-4 text-primary" />
                        ) : (
                          <X className="size-4 text-destructive" />
                        )}
                        <span className="line-clamp-3 break-words">
                          {cell.athlete ?? cell.guess}
                        </span>
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
        <Button
          variant="outline"
          onClick={() => {
            setBoard(emptyBoard());
            setRevealed(null);
          }}
        >
          <RotateCcw className="size-4" /> Reset board
        </Button>
        {finished && (
          <Button variant="secondary" onClick={() => void reveal()}>
            <Eye className="size-4" /> Show answers
          </Button>
        )}
        <Button asChild variant="ghost" className="ml-auto">
          <Link to="/leaderboard">See ranks</Link>
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
              {active !== null &&
                `${grid.rows[Math.floor(active / 3)]} × ${grid.cols[active % 3]}`}
            </DialogTitle>
            <DialogDescription>
              Name an athlete who satisfies both criteria. Suggestions come from the verified athlete
              index — typos, accents and nicknames are fine.
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

const glyphs = {
  trophy: Trophy,
  flag: Flag,
  people: Users,
  stats: BarChart3,
  hand: Hand,
  shield: Shield,
} as const;

function CriterionGlyph({ label }: { label: string }) {
  const Icon = glyphs[criterionIcon(label)];
  return <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-16">{children}</div>;
}
