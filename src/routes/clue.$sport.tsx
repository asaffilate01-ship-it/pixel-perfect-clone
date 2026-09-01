import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Thermometer, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/clue/$sport")({
  head: ({ params }) => {
    const name = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
    const title = `${name} Clue Ladder — Fanzeno`;
    const description = `Five clues, obscure to obvious. Name today's ${name} mystery athlete in as few reveals as you can.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ClueLadder,
});

type Puzzle = { puzzle_id: string; sport_name: string; scheduled_for: string | null; clues: string[] };

async function fetchClue(sport: string): Promise<Puzzle | null> {
  const { data, error } = await supabase.rpc("fz_clue_today", { p_sport: sport });
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

function ClueLadder() {
  const { sport } = Route.useParams();
  const { user } = useAuth();
  const [shown, setShown] = useState(1);
  const [guess, setGuess] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [misses, setMisses] = useState<string[]>([]);
  const [solved, setSolved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: puzzle, isLoading } = useQuery({
    queryKey: ["clue", sport],
    queryFn: () => fetchClue(sport),
  });

  useEffect(() => {
    setShown(1);
    setHint(null);
    setMisses([]);
    setSolved(null);
  }, [sport]);

  const score = solved ? (6 - shown) * 100 : (6 - shown) * 100;

  const persist = async (puzzleId: string, didSolve: boolean, revealed: number, allGuesses: string[]) => {
    if (!user) return;
    await supabase.from("clue_attempts").upsert(
      {
        puzzle_id: puzzleId,
        user_id: user.id,
        guesses: allGuesses,
        clues_revealed: revealed,
        solved: didSolve,
        score: didSolve ? (6 - revealed) * 100 : 0,
        completed_at: didSolve ? new Date().toISOString() : null,
      },
      { onConflict: "puzzle_id,user_id" },
    );
  };

  const submit = async () => {
    if (!puzzle || !guess.trim() || solved) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fz_clue_guess", {
        p_puzzle: puzzle.puzzle_id,
        p_guess: guess.trim(),
      });
      if (error) throw error;
      const result = data as unknown as { correct: boolean; hint?: string; answer?: string };
      const allGuesses = [...misses, guess.trim()];
      if (result.correct) {
        setSolved(result.answer ?? guess.trim());
        toast.success(`Correct after ${shown} clue${shown > 1 ? "s" : ""}.`);
        await persist(puzzle.puzzle_id, true, shown, allGuesses);
      } else {
        setMisses(allGuesses);
        setHint(result.hint ?? "COLD");
        const next = Math.min(5, shown + 1);
        setShown(next);
        await persist(puzzle.puzzle_id, false, next, allGuesses);
      }
      setGuess("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check that guess.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted-foreground">Loading clues…</div>;
  }

  if (!puzzle) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl">No clue ladder yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sport} has no published puzzle. Try football, cricket or NBA.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Daily clue ladder</p>
          <h1 className="mt-2 text-4xl">{puzzle.sport_name}</h1>
        </div>
        <div className="text-right">
          <span className="font-display text-4xl text-gold">{score}</span>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Points on offer
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-3xl">Who is the athlete?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Clues get easier — but every reveal costs you 100 points.
      </p>

      <ol className="mt-6 space-y-2">
        {puzzle.clues.map((clue, i) => {
          const open = i < shown;
          return (
            <li
              key={clue}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                open ? "border-border bg-surface/70" : "border-border/50 bg-background/40"
              }`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                  open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span className={`flex-1 text-xs font-semibold ${open ? "" : "text-muted-foreground"}`}>
                {open ? clue : "Clue locked"}
              </span>
              {!open && <Lock className="size-4 text-muted-foreground" />}
            </li>
          );
        })}
      </ol>

      {hint && !solved && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs font-semibold">
          <Thermometer className="size-4 text-gold" />
          {hint}
        </div>
      )}

      {solved ? (
        <div className="panel mt-6 p-6 text-center">
          <Trophy className="mx-auto size-7 text-gold" />
          <p className="mt-3 font-display text-3xl">{solved}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solved with {shown} clue{shown > 1 ? "s" : ""} revealed · {score} points
          </p>
          <Button asChild className="mt-5">
            <Link to="/play/$sport" params={{ sport }}>
              Play the daily grid
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type an athlete's name…"
            />
            <Button type="submit" disabled={busy || !guess.trim()}>
              Guess
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setShown((x) => Math.min(5, x + 1))}
            className="mt-3 w-full text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Reveal next clue
          </button>
        </>
      )}

      {misses.length > 0 && (
        <p className="mt-5 text-xs text-muted-foreground">
          Tried: {misses.join(", ")}
        </p>
      )}
      {!user && (
        <p className="mt-4 text-xs text-muted-foreground">
          <Link to="/auth" className="text-primary underline">
            Sign in
          </Link>{" "}
          to save your clue ladder results.
        </p>
      )}
    </div>
  );
}
