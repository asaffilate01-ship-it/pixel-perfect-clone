import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock,
  Gamepad2,
  Gem,
  Lock,
  Play,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SideAdRail, TopAdBanner } from "@/components/site/AdSlots";
import { useEntitlements } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { GAME_ART, GAME_FILTERS, TONE_GRADIENT, TONE_TEXT, type GameArt } from "@/lib/gameCatalog";
import statCards from "@/assets/games/stat-cards.jpg";

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
        content: "Play sports trivia, tactical boards, quiz races and puzzle challenges.",
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
  | { to: "/arcade/higher-lower" }
  | { to: "/arcade/crossword" }
  | { to: "/compete" }
  | { to: "/arcade/mastermind" }
  | { to: "/arcade/rooms" }
  | { to: "/arcade/quiz-race"; search: { game: "ludo" | "snakes" } }
  | {
      to: "/arcade/board";
      search: {
        mode: "territory" | "501" | "connections" | "draft" | "bingo" | "tower" | "cards";
      };
    };

const ROUTES: Record<string, ModeRoute> = {
  "higher-lower": { to: "/arcade/higher-lower" },
  "crossword-quiz": { to: "/arcade/crossword" },
  "tic-tac-toe": { to: "/compete" },
  "connect-four": { to: "/arcade/connect-four" },
  "quiz-ludo": { to: "/arcade/quiz-race", search: { game: "ludo" } },
  "quiz-snakes-ladders": { to: "/arcade/quiz-race", search: { game: "snakes" } },
  "sports-mastermind": { to: "/arcade/mastermind" },
  territory: { to: "/arcade/board", search: { mode: "territory" } },
  "sports-501": { to: "/arcade/board", search: { mode: "501" } },
  connections: { to: "/arcade/board", search: { mode: "connections" } },
  "draft-xi": { to: "/arcade/board", search: { mode: "draft" } },
  bingo: { to: "/arcade/board", search: { mode: "bingo" } },
  "category-tower": { to: "/arcade/board", search: { mode: "tower" } },
  "stat-cards": { to: "/arcade/board", search: { mode: "cards" } },
};

const FALLBACK_ART: GameArt = {
  art: statCards,
  icon: Gamepad2,
  tone: "secondary",
  kind: "solo",
  kindLabel: "Soon",
  time: "—",
};

function Arcade() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["game-modes"],
    queryFn: fetchGameModes,
  });
  const { pro } = useEntitlements();
  const [filter, setFilter] = useState<(typeof GAME_FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const modes = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      const art = GAME_ART[m.slug] ?? FALLBACK_ART;
      const isPro = m.access_tier === "pro";
      const passes =
        filter === "all" ||
        (filter === "new" && !!art.isNew) ||
        (filter === "free" && !isPro) ||
        (filter === "pro" && isPro) ||
        filter === art.kind;
      return (
        passes &&
        (!needle ||
          m.name.toLowerCase().includes(needle) ||
          (m.description ?? "").toLowerCase().includes(needle))
      );
    });
  }, [data, filter, q]);

  const liveCount = (data ?? []).filter((m) => ROUTES[m.slug]).length;
  const filtersActive = filter !== "all" || q.trim().length > 0;
  const catalogueFailed = isError && !data;
  const clearFilters = () => {
    setFilter("all");
    setQ("");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Fanzeno arcade</p>
          <h1 className="mt-3 text-5xl">Pick a game</h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            {liveCount > 0 ? `Explore ${liveCount} arcade modes` : "Explore the arcade"}, from
            verified questions to casual practice puzzles.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/arcade/rules">
            <BookOpen className="size-4" /> <span className="hidden sm:inline">How to play</span>
            <span className="sm:hidden">Rules</span>
          </Link>
        </Button>
      </div>

      <TopAdBanner placement="arcade" />
      <SideAdRail placement="arcade" />

      {/* Filter bar */}
      <div className="sticky top-16 z-20 -mx-4 mt-6 border-y border-border bg-background/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            role="group"
            aria-label="Filter arcade games"
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            {GAME_FILTERS.map((f) => {
              const on = f.key === filter;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.key)}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                    on
                      ? f.key === "pro"
                        ? "border-gold bg-gold text-gold-foreground"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.key === "new" && <Sparkles className="mr-1 inline size-3" />}
                  {f.key === "pro" && <Gem className="mr-1 inline size-3" />}
                  {f.label}
                </button>
              );
            })}
          </div>
          <label className="relative block w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search games"
              aria-label="Search games"
              className="h-11 w-full rounded-xl border border-border bg-surface/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary"
            />
          </label>
        </div>
      </div>

      {!pro && (
        <Link
          to="/upgrade"
          className="mt-5 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/8 p-4 text-xs text-gold/90 hover:border-gold"
        >
          <Gem className="size-4 shrink-0 text-gold" />
          <span>
            <span className="font-black uppercase tracking-[0.14em]">Fanzeno Pro</span> includes
            premium arcade modes for existing members. New lifetime purchases are coming soon.
          </span>
          <ArrowRight className="ml-auto size-4 shrink-0" />
        </Link>
      )}

      {!catalogueFailed && !isLoading && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-xs font-semibold text-muted-foreground">
            Showing {modes.length} of {data?.length ?? 0} games
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-primary hover:bg-primary/10"
            >
              <X className="size-4" aria-hidden /> Clear filters
            </button>
          )}
        </div>
      )}

      {catalogueFailed && (
        <div role="alert" className="panel mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
            <div>
              <p className="font-semibold">Couldn&apos;t load the arcade catalogue</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again. Your game progress hasn&apos;t been changed.</p>
            </div>
          </div>
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className="size-4" aria-hidden /> Try again
          </Button>
        </div>
      )}
      {isError && data && (
        <p role="status" className="mt-3 text-xs text-gold">Unable to refresh right now. Showing the last loaded games.</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && !data &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="panel h-72 motion-safe:animate-pulse" aria-hidden />
          ))}
        {modes.map((mode) => {
          const art = GAME_ART[mode.slug] ?? FALLBACK_ART;
          const isPro = mode.access_tier === "pro";
          const locked = isPro && !pro;
          const route = ROUTES[mode.slug];
          const playable = !!route;
          const players =
            mode.min_players === mode.max_players
              ? `${mode.min_players} player${mode.min_players === 1 ? "" : "s"}`
              : `${mode.min_players}–${mode.max_players} players`;
          const GameIcon = art.icon;

          const body = (
            <>
              <span className="relative block aspect-[3/2] overflow-hidden bg-gradient-to-br bg-surface-strong">
                <span className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENT[art.tone]}`} />
                <img
                  src={art.art}
                  alt=""
                  width={768}
                  height={512}
                  loading="lazy"
                  className={`absolute inset-0 size-full object-cover opacity-45 mix-blend-overlay motion-safe:transition-transform motion-safe:duration-500 ${
                    playable ? "motion-safe:group-hover:scale-105" : "saturate-50"
                  }`}
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <GameIcon className={`size-20 ${TONE_TEXT[art.tone]}`} />
                </span>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent" />
                <span className="absolute left-3 top-3 flex gap-1.5">
                  {art.isNew && (
                    <Badge tone="primary">
                      <Sparkles className="size-3" /> New
                    </Badge>
                  )}
                  {isPro && (
                    <Badge tone="gold">
                      <Gem className="size-3" /> Pro
                    </Badge>
                  )}
                  {!playable && <Badge tone="muted">Coming soon</Badge>}
                </span>
                {locked && (
                  <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-background/70 text-gold backdrop-blur">
                    <Lock className="size-4" />
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col p-4 pt-2">
                <span className="font-display text-2xl leading-none tracking-wide">
                  {mode.name}
                </span>
                <span className="mt-1.5 line-clamp-2 flex-1 text-xs text-muted-foreground">
                  {mode.description}
                </span>
                <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" /> {players}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> {art.time}
                  </span>
                  <span>{art.kindLabel}</span>
                </span>
                <span
                  className={`mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-[0.16em] transition-colors ${
                    !playable
                      ? "bg-surface-strong text-muted-foreground"
                      : locked
                        ? "bg-gold text-gold-foreground group-hover:brightness-110"
                        : "bg-primary text-primary-foreground group-hover:brightness-110"
                  }`}
                >
                  {!playable ? (
                    "Coming later"
                  ) : locked ? (
                    <>
                      <Gem className="size-3.5" /> Pro members only
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 fill-current" /> Play now
                    </>
                  )}
                </span>
              </span>
            </>
          );

          const cls = `game-card group relative flex flex-col overflow-hidden p-0 text-left transition-all ${
            playable
              ? "motion-safe:hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-black/40 motion-safe:active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary"
              : "opacity-75"
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
        {!isLoading && !catalogueFailed && modes.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center sm:p-10">
            <p className="font-display text-2xl text-foreground">
              {filtersActive ? "No matching games" : "No games are available right now"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {filtersActive ? "Try another category or clear your search." : "The arcade catalogue is empty. Please check back later."}
            </p>
            {filtersActive && (
              <Button type="button" variant="outline" className="mt-4" onClick={clearFilters}>
                Show all games
              </Button>
            )}
          </div>
        )}
      </div>

      <Link
        to="/arcade/rooms"
        className="mt-8 flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/8 p-5 transition-colors hover:border-primary"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15">
          <Radio className="size-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl">Play friends online</span>
          <span className="block text-xs text-muted-foreground">
            Host a private room for Quiz Ludo, Snakes &amp; Ladders or Mastermind, or hit random
            matchmaking. Friends join by code on their own devices.
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary" />
      </Link>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "primary" | "gold" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "gold"
      ? "border-gold/50 bg-gold/90 text-gold-foreground"
      : tone === "primary"
        ? "border-primary/50 bg-primary/90 text-primary-foreground"
        : "border-border bg-background/80 text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.16em] backdrop-blur ${cls}`}
    >
      {children}
    </span>
  );
}
