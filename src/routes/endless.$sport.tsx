import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Infinity as InfinityIcon, ShieldCheck } from "lucide-react";
import { difficultyMeta, fetchSports, generateEndlessGrid } from "@/lib/fanzeno";
import { useQuizPrefs } from "@/lib/quizPrefs";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type EndlessSearch = { difficulty?: number };

export const Route = createFileRoute("/endless/$sport")({
  validateSearch: (raw: Record<string, unknown>): EndlessSearch => {
    const d = Number(raw["difficulty"]);
    return d >= 1 && d <= 4 ? { difficulty: d } : {};
  },
  head: ({ params }) => {
    const name = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
    const title = `Endless ${name} grids — Fanzeno`;
    const description = `Never-repeating ${name} knowledge grids generated from verified facts only. Pick a difficulty and keep going.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: EndlessPage,
});

function EndlessPage() {
  const { sport } = Route.useParams();
  const { difficulty = 2 } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { prefs, hydrated } = useQuizPrefs();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const meta = difficultyMeta(difficulty);
  const sportRow = sports?.find((s) => s.slug === sport);

  useEffect(() => {
    if (loading || !hydrated || !user || !sportRow || started.current) return;
    started.current = true;
    const competitionId = prefs.sport === sport ? prefs.competitionId : null;
    generateEndlessGrid({ sportId: sportRow.id, competitionId, difficulty })
      .then((id) =>
        navigate({
          to: "/play/$sport",
          params: { sport },
          search: { mode: "endless", grid: id, difficulty },
          replace: true,
        }),
      )
      .catch((e: unknown) => {
        started.current = false;
        setError(e instanceof Error ? e.message : "Could not generate a grid.");
      });
  }, [loading, hydrated, user, sportRow, prefs, sport, difficulty, navigate]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12">
        <InfinityIcon className="size-7 text-primary" />
      </span>
      <p className="eyebrow mt-6">Endless verified grids · {meta.label}</p>
      <h1 className="mt-2 text-4xl">{sportRow?.name ?? sport}</h1>
      <p className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" /> Verified answers only · no repeated grid
      </p>

      {!loading && !user && (
        <div className="panel mt-8 p-5">
          <p className="text-sm text-muted-foreground">
            Endless mode tracks which grids you&apos;ve already seen, so it needs an account.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in to play</Link>
          </Button>
        </div>
      )}

      {user && !error && (
        <p className="mt-8 animate-pulse text-sm text-muted-foreground">Building a fresh grid…</p>
      )}

      {error && (
        <div className="panel mt-8 p-5">
          <p className="text-sm text-destructive">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Try a lower difficulty or switch the competition scope to all {sportRow?.name ?? sport}.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                setError(null);
                started.current = false;
                void navigate({ to: "/endless/$sport", params: { sport }, search: { difficulty: 1 }, replace: true });
              }}
            >
              Try Easy
            </Button>
            <Button asChild variant="outline">
              <Link to="/filters">Change scope</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
