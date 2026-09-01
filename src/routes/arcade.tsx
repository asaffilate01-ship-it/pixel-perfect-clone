import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Brain,
  Dices,
  Gamepad2,
  Gauge,
  Gem,
  Grid2x2,
  Hexagon,
  Layers,
  LayoutGrid,
  Network,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SideAdRail, TopAdBanner } from "@/components/site/AdSlots";
import { useEntitlements } from "@/lib/entitlements";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Tactical Arcade — Fanzeno" },
      {
        name: "description",
        content:
          "Quiz Ludo, Snakes & Ladders, Sports Mastermind, Connect Four, Territory, Category Tower and more — sports knowledge, tactical twist.",
      },
      { property: "og:title", content: "Tactical Arcade — Fanzeno" },
      { property: "og:description", content: "Twelve tactical sports games. Board games and Mastermind are live now." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Arcade,
});

async function fetchGameModes() {
  const { data, error } = await supabase
    .from("game_modes")
    .select("slug, name, description, min_players, max_players, sort_order, access_tier")
    .eq("enabled", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

type ModeRoute =
  | { to: "/arcade/connect-four" }
  | { to: "/compete" }
  | { to: "/arcade/mastermind" }
  | { to: "/arcade/quiz-race"; search: { game: "ludo" | "snakes" } };

type ModeMeta = { icon: React.ElementType; tone: string; status: string; route?: ModeRoute | undefined };
const meta: Record<string, ModeMeta> = {
  "tic-tac-toe": { icon: Grid2x2, tone: "text-primary bg-primary/12", status: "Arena", route: { to: "/compete" } },
  "connect-four": { icon: LayoutGrid, tone: "text-primary bg-primary/12", status: "Play now", route: { to: "/arcade/connect-four" } },
  "quiz-ludo": { icon: Dices, tone: "text-gold bg-gold/12", status: "Local + online", route: { to: "/arcade/quiz-race", search: { game: "ludo" } } },
  "quiz-snakes-ladders": { icon: TrendingUp, tone: "text-primary bg-primary/12", status: "Play now", route: { to: "/arcade/quiz-race", search: { game: "snakes" } } },
  "sports-mastermind": { icon: Brain, tone: "text-gold bg-gold/12", status: "Live room", route: { to: "/arcade/mastermind" } },
  territory: { icon: Hexagon, tone: "text-gold bg-gold/12", status: "Tactical" },
  "category-tower": { icon: Trophy, tone: "text-gold bg-gold/12", status: "1v1" },
  "sports-501": { icon: Gauge, tone: "text-gold bg-gold/12", status: "Numbers" },
  connections: { icon: Network, tone: "text-primary bg-primary/12", status: "Daily" },
  "draft-xi": { icon: Users, tone: "text-gold bg-gold/12", status: "Squad" },
  bingo: { icon: Grid2x2, tone: "text-primary bg-primary/12", status: "Solo" },
  "stat-cards": { icon: Layers, tone: "text-gold bg-gold/12", status: "Survival" },
};

function Arcade() {
  const { data, isLoading } = useQuery({ queryKey: ["game-modes"], queryFn: fetchGameModes });
  const { pro } = useEntitlements();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Fanzeno arcade</p>
          <h1 className="mt-3 text-5xl">Tactical games</h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Every move is a verified sports answer. Win by out-thinking your rival, not just out-knowing them.
          </p>
        </div>
        <Gamepad2 className="hidden size-10 text-primary sm:block" />
      </div>

      <TopAdBanner placement="arcade" />
      <SideAdRail placement="arcade" />

      {!pro && (
        <Link
          to="/upgrade"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/8 p-4 text-xs text-gold/90 hover:border-gold"
        >
          <Gem className="size-4 shrink-0 text-gold" />
          <span>
            <span className="font-black uppercase tracking-[0.14em]">Fanzeno Pro</span> unlocks Quiz Ludo,
            Sports Mastermind and every premium tactical game — one payment, lifetime. Free guests can still
            join a Pro host&apos;s private match.
          </span>
          <ArrowRight className="ml-auto size-4 shrink-0" />
        </Link>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="panel h-44 animate-pulse" aria-hidden />
          ))}
        {(data ?? []).map((mode) => {
          const m: ModeMeta = meta[mode.slug] ?? { icon: Gamepad2, tone: "text-primary bg-primary/12", status: "Soon" };
          const Icon = m.icon;
          const isPro = mode.access_tier === "pro";
          const locked = isPro && !pro;
          const route = m.route;
          const playable = !!route;
          const body = (
            <>
              <span className="flex items-start justify-between">
                <span className={`grid size-11 place-items-center rounded-xl ${m.tone}`}>
                  <Icon className="size-5" />
                </span>
                {isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.16em] text-gold">
                    <Gem className="size-3" /> Pro
                  </span>
                )}
              </span>
              <span className="mt-4 block font-display text-2xl">{mode.name}</span>
              <span className="mt-1 block flex-1 text-xs text-muted-foreground">{mode.description}</span>
              <span className="mt-4 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
                <span className={playable ? (locked ? "text-gold" : "text-primary") : "text-muted-foreground"}>
                  {!playable ? `${m.status} · coming soon` : locked ? "Unlock with Pro" : m.status}
                </span>
                <span className="text-muted-foreground">
                  {mode.min_players === mode.max_players
                    ? `${mode.min_players}p`
                    : `${mode.min_players}–${mode.max_players}p`}
                </span>
              </span>
            </>
          );
          const cls = `panel flex min-h-44 flex-col p-5 text-left transition-colors ${
            playable ? "hover:border-primary/60" : "opacity-70"
          }`;
          if (!route) {
            return (
              <div key={mode.slug} className={cls} aria-disabled>
                {body}
              </div>
            );
          }
          if (locked) {
            return (
              <Link key={mode.slug} to="/upgrade" className={`${cls} hover:border-gold/60`}>
                {body}
              </Link>
            );
          }
          return "search" in route ? (
            <Link key={mode.slug} to={route.to} search={route.search} className={cls}>
              {body}
            </Link>
          ) : (
            <Link key={mode.slug} to={route.to} className={cls}>
              {body}
            </Link>
          );
        })}
      </div>

      <Link
        to="/arcade/connect-four"
        className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline"
      >
        Jump into Connect Four <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
