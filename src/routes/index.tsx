import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Flame,
  Gem,
  Grid3x3,
  Infinity as InfinityIcon,
  Thermometer,
  Users,
  Zap,
} from "lucide-react";
import { fetchSports } from "@/lib/fanzeno";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fanzeno — Play the daily sports grid" },
      {
        name: "description",
        content:
          "Nine squares. Two criteria. One answer that proves you know your sport. Play today's football, cricket and NBA grids free.",
      },
      { property: "og:title", content: "Fanzeno — Play the daily sports grid" },
      {
        property: "og:description",
        content: "The global sports knowledge grid. Daily puzzles, ranked duels and private rooms.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { prefs, hydrated, setPrefs } = useQuizPrefs();
  const [sport, setSportLocal] = useState("football");
  useEffect(() => {
    if (hydrated) setSportLocal(prefs.sport);
  }, [hydrated, prefs.sport]);
  const setSport = (slug: string) => {
    setSportLocal(slug);
    if (slug !== prefs.sport) {
      void setPrefs({ ...prefs, sport: slug, competitionId: null, competitionName: null });
    }
  };
  const playable = new Set(["football", "cricket", "nba"]);
  const sportName = sports?.find((s) => s.slug === sport)?.name;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="panel stadium-line relative overflow-hidden p-6 sm:p-10">
        <p className="eyebrow">The global sports grid</p>
        <h1 className="mt-4 max-w-2xl text-5xl sm:text-7xl">
          Know the game.
          <br />
          <span className="text-primary">Own the grid.</span>
        </h1>
        <p className="mt-5 max-w-lg text-base text-muted-foreground">
          Nine squares. Two criteria. One answer that proves you know your sport — checked against a
          real athlete database, never a guess-anything demo.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate({ to: "/play/$sport", params: { sport } })}
            className="font-bold uppercase tracking-[0.14em]"
          >
            Play today&apos;s grid <ArrowRight className="size-4" />
          </Button>
          <Button asChild size="lg" variant="outline" className="uppercase tracking-[0.14em]">
            <Link to="/compete">Play online</Link>
          </Button>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Flame className="size-4 text-gold" /> Daily streaks
          </span>
          <span>10 sports</span>
          <span>Server-validated answers</span>
        </div>
      </section>

      <Link
        to="/clue/$sport"
        params={{ sport }}
        className="panel mt-4 flex items-center gap-4 p-5 transition-colors hover:border-primary/60"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-primary/12">
          <Thermometer className="size-5 text-primary" />
        </span>
        <span className="flex-1">
          <span className="eyebrow block">New daily mode</span>
          <span className="mt-1 block font-display text-2xl">Clue Ladder</span>
          <span className="block text-xs text-muted-foreground">
            Five clues, obscure to obvious. Hot-or-cold guesses.
          </span>
        </span>
        <ArrowRight className="size-5 text-muted-foreground" />
      </Link>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Choose your sport</h2>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {sports?.length ?? 10} available
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(sports ?? []).map((s) => {
            const selected = s.slug === sport;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSport(s.slug)}
                className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                  selected
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
                {!playable.has(s.slug) && (
                  <span className="ml-2 text-[0.6rem] text-muted-foreground">soon</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Ways to play</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeCard
            icon={<Grid3x3 className="size-5 text-primary" />}
            title="Daily 9"
            sub="One grid. One global score."
            to="/play/$sport"
            params={{ sport }}
          />
          <ModeCard
            icon={<Zap className="size-5 text-primary" />}
            title="Grid battle"
            sub="Ranked room against another fan."
            to="/compete"
          />
          <ModeCard
            icon={<Users className="size-5 text-primary" />}
            title="Challenge"
            sub="Pick a friend or share a room code."
            to="/compete"
          />
          <ModeCard
            icon={<InfinityIcon className="size-5 text-primary" />}
            title="Ranks"
            sub="Seasonal ratings and streaks."
            to="/leaderboard"
          />
        </div>
      </section>

      <Link
        to="/upgrade"
        className="panel mt-12 flex items-center gap-4 p-5 transition-colors hover:border-gold/60"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-gold/15">
          <Gem className="size-5 text-gold" />
        </span>
        <span className="flex-1">
          <span className="block font-display text-xl">Play forever without ads</span>
          <span className="block text-xs text-muted-foreground">One payment. Lifetime access.</span>
        </span>
        <span className="font-display text-2xl text-gold">£4.99</span>
      </Link>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  sub,
  to,
  params,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  to: "/play/$sport" | "/compete" | "/leaderboard";
  params?: { sport: string };
}) {
  return (
    <Link
      to={to}
      params={params as never}
      className="panel flex items-start gap-4 p-5 transition-colors hover:border-primary/60"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-primary/12">{icon}</span>
      <span>
        <span className="block font-display text-xl tracking-wide">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </Link>
  );
}
