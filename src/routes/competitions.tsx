import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, CalendarDays, ScrollText, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/competitions")({
  head: () => ({
    meta: [
      { title: "Monthly skill competitions — Fanzeno" },
      {
        name: "description",
        content: "Open and Pro monthly divisions with server-verified scores, integrity review and recognition prizes. Free entry always available.",
      },
      { property: "og:title", content: "Monthly skill competitions — Fanzeno" },
      { property: "og:description", content: "Server-verified monthly leaderboards with free entry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompetitionsPage,
});

async function fetchCompetitions() {
  const { data, error } = await supabase
    .from("monthly_competitions")
    .select("id, slug, name, division, starts_at, ends_at, prize_type, prize_description, official_rules_url, minimum_age, free_entry_available, status, scoring_rules")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchScores(competitionId: string) {
  const { data, error } = await supabase
    .from("monthly_competition_scores")
    .select("user_id, verified_points, verified_wins, verified_games, integrity_status, profiles:profiles!inner(display_name)")
    .eq("competition_id", competitionId)
    .order("verified_points", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function CompetitionsPage() {
  const { user } = useAuth();
  const { data: comps, isLoading } = useQuery({ queryKey: ["monthly-competitions"], queryFn: fetchCompetitions });
  const live = comps?.find((c) => c.status === "open") ?? comps?.[0];
  const { data: scores } = useQuery({
    queryKey: ["monthly-scores", live?.id],
    queryFn: () => fetchScores(live!.id),
    enabled: !!live,
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <p className="eyebrow">Competitive play</p>
      <h1 className="mt-3 text-5xl">Monthly skill competition</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Points come only from server-validated online games. Every leader stays under integrity review until eligibility
        and anti-cheat checks pass — nobody can write their own score.
      </p>

      {isLoading && <div className="panel mt-6 h-40 animate-pulse" aria-hidden />}

      {live && (
        <section className="panel stadium-line mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] ${live.division === "pro" ? "border-gold/40 bg-gold/10 text-gold" : "border-primary/40 bg-primary/10 text-primary"}`}>
                <Trophy className="size-3" /> {live.division} division · {live.status}
              </span>
              <h2 className="mt-3 text-3xl">{live.name}</h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" /> {fmt(live.starts_at)} – {fmt(live.ends_at)}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="flex items-center justify-end gap-1.5">
                <Award className="size-3.5 text-gold" /> {live.prize_type} prize
              </p>
              <p className="mt-1 max-w-56">{live.prize_description}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <p className="flex items-start gap-2 rounded-xl border border-border bg-surface/60 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /> Scores are calculated server-side from verified game events.
            </p>
            <p className="flex items-start gap-2 rounded-xl border border-border bg-surface/60 p-3">
              <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" /> {live.free_entry_available ? "Free entry route available" : "Entry restricted"} · {live.minimum_age}+ only.
            </p>
            <a
              href={live.official_rules_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 rounded-xl border border-border bg-surface/60 p-3 hover:border-primary/60"
            >
              <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" /> Read the official rules
            </a>
          </div>

          <div className="mt-6">
            <h3 className="text-xl">Verified standings</h3>
            {(scores ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No verified scores yet this month. Play online rooms and ranked grids to enter — your total appears once review clears.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-border/70">
                {(scores ?? []).map((row, i) => (
                  <li key={row.user_id} className={`flex items-center gap-3 py-2.5 ${row.user_id === user?.id ? "text-primary" : ""}`}>
                    <span className="w-6 font-display text-xl text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold">{(row.profiles as { display_name: string | null } | null)?.display_name ?? "Player"}</span>
                    {row.integrity_status !== "verified" && (
                      <span className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{row.integrity_status}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{row.verified_wins}W · {row.verified_games}G</span>
                    <span className="font-display text-xl">{row.verified_points}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="font-bold uppercase tracking-[0.14em]">
              <Link to="/arcade/rooms">Play an online room</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/leaderboard">Season ranks</Link>
            </Button>
          </div>
        </section>
      )}

      {comps && comps.length > 1 && (
        <section className="mt-8">
          <h2 className="text-2xl">Past and upcoming</h2>
          <div className="mt-3 space-y-2">
            {comps.filter((c) => c.id !== live?.id).map((c) => (
              <div key={c.id} className="panel flex items-center gap-3 p-4">
                <span className="flex-1">
                  <span className="block font-display text-xl">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {fmt(c.starts_at)} – {fmt(c.ends_at)} · {c.division} · {c.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Prizes are recognition-only for now. Cash or merchandise prizes require published rules, an eligible-country list and a
        genuine free entry route, and are never gated behind the Pro purchase.
      </p>
    </div>
  );
}
