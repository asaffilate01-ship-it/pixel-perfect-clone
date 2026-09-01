import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Fanzeno" },
      {
        name: "description",
        content: "Your Fanzeno ratings, streaks and per-sport form across every grid you've played.",
      },
      { property: "og:title", content: "Your profile — Fanzeno" },
      { property: "og:description", content: "Your Fanzeno ratings, streaks and per-sport form." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

async function fetchMyStats(userId: string) {
  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("rating, played, best_score, streak, sports!inner(name)")
    .eq("user_id", userId)
    .order("rating", { ascending: false });
  const { data: clues } = await supabase
    .from("clue_attempts")
    .select("solved, score")
    .eq("user_id", userId);
  return { ratings: ratings ?? [], clues: clues ?? [] };
}

function ProfilePage() {
  const { user, displayName } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-stats", user?.id],
    queryFn: () => fetchMyStats(user!.id),
    enabled: !!user,
  });

  const ratings = data?.ratings ?? [];
  const played = ratings.reduce((sum, r) => sum + r.played, 0);
  const bestStreak = ratings.reduce((max, r) => Math.max(max, r.streak), 0);
  const cluePoints = (data?.clues ?? []).reduce((sum, c) => sum + c.score, 0);
  const initials = (displayName ?? "Fan").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="eyebrow">Your profile</p>
      <div className="mt-6 flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary font-display text-2xl text-primary-foreground">
          {initials}
        </span>
        <div>
          <h1 className="text-3xl">{displayName ?? "Fanzeno player"}</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="panel mt-7 grid grid-cols-3 divide-x divide-border/70">
        <Stat value={String(played)} label="Grids played" />
        <Stat value={String(bestStreak)} label="Best streak" />
        <Stat value={String(cluePoints)} label="Clue points" />
      </div>

      <h2 className="mt-9 text-2xl">Sport ratings</h2>
      <div className="panel mt-4 divide-y divide-border/70">
        {ratings.length === 0 && (
          <div className="p-8 text-center">
            <Flame className="mx-auto size-7 text-gold" />
            <p className="mt-3 text-sm text-muted-foreground">
              No rated games yet — finish a daily grid to start a rating.
            </p>
          </div>
        )}
        {ratings.map((r) => (
          <div
            key={(r.sports as unknown as { name: string }).name}
            className="flex items-center gap-3 px-5 py-4"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary/12">
              <Trophy className="size-4 text-primary" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {(r.sports as unknown as { name: string }).name}
              </p>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {r.played} played · best {r.best_score}/9 · streak {r.streak}
              </p>
            </div>
            <span className="font-display text-2xl text-primary">{r.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="font-display text-3xl">{value}</p>
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
