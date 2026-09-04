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
  Radio,
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
      {
        property: "og:description",
        content: "Twelve tactical sports games. Board games and Mastermind are live now.",
      },
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
  | { to: "/arcade/rooms" }
  | { to: "/arcade/quiz-race"; search: { game: "ludo" | "snakes" } }
  | {
      to: "/arcade/board";
      search: { mode: "territory" | "501" | "connections" | "draft" | "bingo" };
    };

type ModeMeta = {
  icon: React.ElementType;
  tone: string;
  surface: string;
  status: string;
  route?: ModeRoute | undefined;
};
const meta: Record<string, ModeMeta> = {
  "tic-tac-toe": {
    icon: Grid2x2,
    tone: "text-cyan-200 bg-cyan-400/15",
    surface: "from-cyan-500/20 to-blue-700/10",
    status: "Friend + CPU",
    route: { to: "/compete" },
  },
  "connect-four": {
    icon: LayoutGrid,
    tone: "text-violet-100 bg-violet-400/20",
    surface: "from-violet-500/25 to-blue-700/10",
    status: "Quiz + CPU",
    route: { to: "/arcade/connect-four" },
  },
  "quiz-ludo": {
    icon: Dices,
    tone: "text-amber-100 bg-amber-400/20",
    surface: "from-amber-500/20 to-orange-700/10",
    status: "Same phone + online",
    route: { to: "/arcade/quiz-race", search: { game: "ludo" } },
  },
  "quiz-snakes-ladders": {
    icon: TrendingUp,
    tone: "text-emerald-100 bg-emerald-400/20",
    surface: "from-emerald-500/20 to-teal-700/10",
    status: "Same phone + online",
    route: { to: "/arcade/quiz-race", search: { game: "snakes" } },
  },
  "sports-mastermind": {
    icon: Brain,
    tone: "text-fuchsia-100 bg-fuchsia-400/20",
    surface: "from-fuchsia-500/20 to-purple-800/10",
    status: "Same phone + online",
    route: { to: "/arcade/mastermind" },
  },
  territory: {
    icon: Hexagon,
    tone: "text-orange-100 bg-orange-400/20",
    surface: "from-orange-500/20 to-red-800/10",
    status: "Tactical solo",
    route: { to: "/arcade/board", search: { mode: "territory" } },
  },
  "category-tower": {
    icon: Trophy,
    tone: "text-yellow-100 bg-yellow-400/20",
    surface: "from-yellow-500/20 to-amber-800/10",
    status: "1v1",
  },
  "sports-501": {
    icon: Gauge,
    tone: "text-rose-100 bg-rose-400/20",
    surface: "from-rose-500/20 to-red-800/10",
    status: "Quiz checkout",
    route: { to: "/arcade/board", search: { mode: "501" } },
  },
  connections: {
    icon: Network,
    tone: "text-sky-100 bg-sky-400/20",
    surface: "from-sky-500/20 to-indigo-800/10",
    status: "Logic puzzle",
    route: { to: "/arcade/board", search: { mode: "connections" } },
  },
  "draft-xi": {
    icon: Users,
    tone: "text-lime-100 bg-lime-400/20",
    surface: "from-lime-500/20 to-emerald-800/10",
    status: "Build a squad",
    route: { to: "/arcade/board", search: { mode: "draft" } },
  },
  bingo: {
    icon: Grid2x2,
    tone: "text-pink-100 bg-pink-400/20",
    surface: "from-pink-500/20 to-violet-800/10",
    status: "Complete a line",
    route: { to: "/arcade/board", search: { mode: "bingo" } },
  },
  "stat-cards": {
    icon: Layers,
    tone: "text-blue-100 bg-blue-400/20",
    surface: "from-blue-500/20 to-cyan-800/10",
    status: "Survival",
  },
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
            Every move is a verified sports answer. Win by out-thinking your rival, not just
            out-knowing them.
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
            <span className="font-black uppercase tracking-[0.14em]">Fanzeno Pro</span> unlocks Quiz
            Ludo, Sports Mastermind and every premium tactical game — one payment, lifetime. Free
            guests can still join a Pro host&apos;s private match.
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
          const m: ModeMeta = meta[mode.slug] ?? {
            icon: Gamepad2,
            tone: "text-primary bg-primary/12",
            surface: "from-primary/15 to-transparent",
            status: "Soon",
          };
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
              <span className="mt-1 block flex-1 text-xs text-muted-foreground">
                {mode.description}
              </span>
              <span className="mt-4 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
                <span
                  className={
                    playable ? (locked ? "text-gold" : "text-primary") : "text-muted-foreground"
                  }
                >
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
          const cls = `game-launch-card panel relative flex min-h-48 flex-col overflow-hidden bg-gradient-to-br ${m.surface} p-5 text-left transition-all ${
            playable
              ? "hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-black/30 active:scale-[0.98]"
              : "opacity-70"
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
            <Link key={mode.slug} to={route.to} search={route.search as never} className={cls}>
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
        to="/arcade/rooms"
        className="mt-8 flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/8 p-5 transition-colors hover:border-primary"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15">
          <Radio className="size-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl">Online arcade rooms</span>
          <span className="block text-xs text-muted-foreground">
            Host a private room for Quiz Ludo, Snakes &amp; Ladders or Mastermind. Friends join by
            code on their own devices; the server picks fair questions and checks every answer.
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary" />
      </Link>

      <Link
        to="/arcade/connect-four"
        className="mt-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline"
      >
        Jump into Connect Four <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
