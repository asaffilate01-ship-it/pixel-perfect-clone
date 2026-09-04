import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Flame,
  Gamepad2,
  Gem,
  Grid3x3,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  Sparkles,
  Thermometer,
  Users,
  Zap,
} from "lucide-react";
import { fetchSports } from "@/lib/fanzeno";
import { SportPicker } from "@/components/game/SportPicker";
import { scopeLabel, useQuizPrefs } from "@/lib/quizPrefs";
import { Button } from "@/components/ui/button";
import { SideAdRail, TopAdBanner } from "@/components/site/AdSlots";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, onboarded } = useAuth();
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
      <SideAdRail placement="home" />
      {user && onboarded === false && (
        <Link
          to="/onboarding"
          className="mb-4 flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/8 p-4 transition-colors hover:border-primary"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15">
            <Sparkles className="size-5 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl">Finish setting up your arena</span>
            <span className="block text-xs text-muted-foreground">Name, avatar, sports and difficulty — four quick steps.</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-primary" />
        </Link>
      )}
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
          <span>20 sports</span>
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

      <Link
        to="/arcade"
        className="panel mt-4 flex items-center gap-4 p-5 transition-colors hover:border-gold/60"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-gold/15">
          <Gamepad2 className="size-5 text-gold" />
        </span>
        <span className="flex-1">
          <span className="eyebrow block text-gold">Fanzeno arcade</span>
          <span className="mt-1 block font-display text-2xl">Tactical games</span>
          <span className="block text-xs text-muted-foreground">
            Connect Four, Territory, 501, Tower, Draft and more.
          </span>
        </span>
        <ArrowRight className="size-5 text-muted-foreground" />
      </Link>

      <TopAdBanner placement="home" />

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl">Choose your sport</h2>
          <Link
            to="/filters"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline"
          >
            <SlidersHorizontal className="size-3.5" />
            League filters
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[0.6rem] normal-case tracking-normal text-foreground">
              {scopeLabel(prefs, sportName)}
            </span>
          </Link>
        </div>
        <div className="mt-4">
          <SportPicker sports={sports ?? []} value={sport} onChange={setSport} playable={playable} compact />
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
            sub="Pass & play, vs CPU or online — pick a difficulty."
            to="/modes/$sport"
            params={{ sport }}
          />
          <ModeCard
            icon={<InfinityIcon className="size-5 text-primary" />}
            title="Endless"
            sub="Never-repeating grids from verified facts."
            to="/endless/$sport"
            params={{ sport }}
          />
          <ModeCard
            icon={<Users className="size-5 text-primary" />}
            title="Challenge"
            sub="Pick a friend or share a room code."
            to="/compete"
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
  to: "/play/$sport" | "/modes/$sport" | "/endless/$sport" | "/compete" | "/leaderboard";
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
