import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { fetchLeaderboard, fetchSports } from "@/lib/fanzeno";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Ranks — Fanzeno global leaderboard" },
      {
        name: "description",
        content:
          "Season ratings, streaks and best grid scores across football, cricket, NBA and more on Fanzeno.",
      },
      { property: "og:title", content: "Ranks — Fanzeno global leaderboard" },
      {
        property: "og:description",
        content: "Season ratings, streaks and best grid scores across every Fanzeno sport.",
      },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const [sportId, setSportId] = useState<string | undefined>(undefined);
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: rows, isLoading } = useQuery({
    queryKey: ["leaderboard", sportId ?? "all"],
    queryFn: () => fetchLeaderboard(sportId),
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="eyebrow">Season one</p>
      <h1 className="mt-3 text-5xl">Global ranks</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <Pill active={!sportId} onClick={() => setSportId(undefined)}>
          All sports
        </Pill>
        {(sports ?? []).map((s) => (
          <Pill key={s.id} active={sportId === s.id} onClick={() => setSportId(s.id)}>
            {s.name}
          </Pill>
        ))}
      </div>

      <div className="panel mt-6 divide-y divide-border/70">
        {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading ranks…</p>}
        {!isLoading && !rows?.length && (
          <div className="p-8 text-center">
            <Trophy className="mx-auto size-8 text-gold" />
            <p className="mt-3 font-display text-2xl">No ranked scores yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Play a signed-in daily grid to put the first name on the board.
            </p>
          </div>
        )}
        {(rows ?? []).map((row, i) => (
          <div key={`${row.userId}-${row.sport}`} className="flex items-center gap-4 px-5 py-4">
            <span
              className={`font-display text-2xl ${i < 3 ? "text-gold" : "text-muted-foreground"}`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{row.name}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {row.sport} · {row.played} played · best {row.bestScore}/9 · streak {row.streak}
              </p>
            </div>
            <span className="font-display text-2xl text-primary">{row.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] transition-colors ${
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
