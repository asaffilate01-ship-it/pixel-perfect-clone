import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Gamepad2,
  Gauge,
  Grid2x2,
  Hexagon,
  Layers,
  LayoutGrid,
  Network,
  Podium,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SideAdRail, TopAdBanner } from "@/components/site/AdSlots";

export const Route = createFileRoute("/arcade/")({
  head: () => ({
    meta: [
      { title: "Tactical Arcade — Fanzeno" },
      {
        name: "description",
        content:
          "Connect Four, Territory, Category Tower, Sports 501, Connections, Draft XI, Bingo and Stat Cards — sports knowledge, tactical twist.",
      },
      { property: "og:title", content: "Tactical Arcade — Fanzeno" },
      { property: "og:description", content: "Nine tactical sports games. Connect Four is live now." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Arcade,
});

async function fetchGameModes() {
  const { data, error } = await supabase
    .from("game_modes")
    .select("slug, name, description, min_players, max_players, sort_order")
    .eq("enabled", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

const meta: Record<string, { icon: React.ElementType; tone: string; status: string; route?: string }> = {
  "tic-tac-toe": { icon: Grid2x2, tone: "text-primary bg-primary/12", status: "Arena", route: "/compete" },
  "connect-four": { icon: LayoutGrid, tone: "text-primary bg-primary/12", status: "Play now", route: "/arcade/connect-four" },
  territory: { icon: Hexagon, tone: "text-accent bg-accent/12", status: "Tactical" },
  "category-tower": { icon: Podium, tone: "text-gold bg-gold/12", status: "1v1" },
  "sports-501": { icon: Gauge, tone: "text-gold bg-gold/12", status: "Numbers" },
  connections: { icon: Network, tone: "text-primary bg-primary/12", status: "Daily" },
  "draft-xi": { icon: Users, tone: "text-accent bg-accent/12", status: "Squad" },
  bingo: { icon: Grid2x2, tone: "text-primary bg-primary/12", status: "Solo" },
  "stat-cards": { icon: Layers, tone: "text-gold bg-gold/12", status: "Survival" },
};

function Arcade() {
  const { data, isLoading } = useQuery({ queryKey: ["game-modes"], queryFn: fetchGameModes });

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

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="panel h-44 animate-pulse" aria-hidden />
          ))}
        {(data ?? []).map((mode) => {
          const m = meta[mode.slug] ?? { icon: Gamepad2, tone: "text-primary bg-primary/12", status: "Soon" };
          const Icon = m.icon;
          const playable = !!m.route;
          const body = (
            <>
              <span className={`grid size-11 place-items-center rounded-xl ${m.tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="mt-4 block font-display text-2xl">{mode.name}</span>
              <span className="mt-1 block flex-1 text-xs text-muted-foreground">{mode.description}</span>
              <span className="mt-4 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
                <span className={playable ? "text-primary" : "text-muted-foreground"}>
                  {playable ? m.status : `${m.status} · coming soon`}
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
          return playable ? (
            <Link key={mode.slug} to={m.route!} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={mode.slug} className={cls} aria-disabled>
              {body}
            </div>
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
