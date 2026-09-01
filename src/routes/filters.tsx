import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleCheck,
  Clock,
  Globe,
  Layers,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  countriesForSport,
  fetchCompetitions,
  fetchSports,
  groupCompetitions,
} from "@/lib/fanzeno";
import { ERAS, useQuizPrefs, type EraId, type QuizPrefs } from "@/lib/quizPrefs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/filters")({
  head: () => ({
    meta: [
      { title: "Quiz filters — pick your league and era | Fanzeno" },
      {
        name: "description",
        content:
          "Scope every Fanzeno quiz to a single league, cup, tour or era — EPL, Champions League, IPL, Six Nations, NBA, majors and more.",
      },
      { property: "og:title", content: "Quiz filters — pick your league and era | Fanzeno" },
      {
        property: "og:description",
        content: "Whole sport or one competition. One filter drives grids, Clue Ladder and Arena rooms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Filters,
});

function Filters() {
  const navigate = useNavigate();
  const { prefs, hydrated, setPrefs } = useQuizPrefs();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: competitions } = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });

  const [draft, setDraft] = useState<QuizPrefs>(prefs);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (hydrated) setDraft(prefs);
  }, [hydrated, prefs]);

  const sport = sports?.find((s) => s.slug === draft.sport);
  const list = useMemo(
    () => (competitions ?? []).filter((c) => c.sport_id === sport?.id),
    [competitions, sport?.id],
  );
  const countries = useMemo(() => countriesForSport(list), [list]);
  const [country, setCountry] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setCountry("all");
    setOpen({});
  }, [sport?.id]);
  const groups = useMemo(() => groupCompetitions(list, country), [list, country]);
  const selectedGroup = groups.find((g) => g.items.some((c) => c.id === draft.competitionId))?.key;
  const isOpen = (key: string, index: number) => open[key] ?? (key === selectedGroup || (index === 0 && !selectedGroup));

  const save = async () => {
    setSaving(true);
    try {
      await setPrefs(draft);
      toast.success("Quiz preferences saved.");
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => void navigate({ to: "/" })}>
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <p className="eyebrow">Personalise every quiz</p>
          <h1 className="mt-1 text-4xl">Choose your coverage</h1>
        </div>
      </div>

      <SectionLabel>Sport</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {(sports ?? []).map((s) => {
          const on = s.slug === draft.sport;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                setDraft({ ...draft, sport: s.slug, competitionId: null, competitionName: null })
              }
              className={`rounded-xl border px-4 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {countries.length > 1 && (
        <>
          <SectionLabel>Country or region</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {["all", ...countries].map((c) => {
              const on = country === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCountry(c)}
                  className={`rounded-full border px-3.5 py-2 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] transition-colors ${
                    on
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c === "all" ? "All regions" : c}
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionLabel>Competition or league</SectionLabel>
      <div className="space-y-2">
        <ScopeRow
          on={draft.competitionId === null}
          onClick={() => setDraft({ ...draft, competitionId: null, competitionName: null })}
          badge={
            <span className="grid size-10 place-items-center rounded-xl bg-primary/15">
              <Globe className="size-5 text-primary" />
            </span>
          }
          title={`All ${sport?.name ?? "sports"}`}
          sub="Mix competitions, nations and eras"
        />
        {groups.map((g, i) => {
          const expanded = isOpen(g.key, i);
          const selectedHere = g.items.some((c) => c.id === draft.competitionId);
          return (
            <div key={g.key} className="overflow-hidden rounded-2xl border border-border bg-surface/40">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen({ ...open, [g.key]: !expanded })}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-surface-strong">
                  {/leagues?|championship|tour/.test(g.key) ? (
                    <Layers className="size-4 text-primary" />
                  ) : /historic|era/.test(g.key) ? (
                    <Clock className="size-4 text-gold" />
                  ) : (
                    <Trophy className="size-4 text-gold" />
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{g.label}</span>
                  <span className="block text-[0.7rem] text-muted-foreground">
                    {g.items.length} {g.items.length === 1 ? "option" : "options"}
                    {selectedHere && " · selected"}
                  </span>
                </span>
                {expanded ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>
              {expanded && (
                <div className="space-y-2 border-t border-border p-2">
                  {g.items.map((c) => (
                    <ScopeRow
                      key={c.id}
                      on={draft.competitionId === c.id}
                      onClick={() =>
                        setDraft({ ...draft, competitionId: c.id, competitionName: c.name })
                      }
                      badge={
                        <span className="grid size-10 place-items-center rounded-xl bg-surface-strong text-[0.6rem] font-black tracking-wide">
                          {c.short_name}
                        </span>
                      }
                      title={c.name}
                      sub={[c.region, c.level_key].filter(Boolean).join(" · ") || c.competition_type}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {sport && list.length === 0 && (
          <p className="text-xs text-muted-foreground">No competition scopes for this sport yet.</p>
        )}
      </div>

      <SectionLabel>Era</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {ERAS.map((e) => {
          const on = draft.era === e.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setDraft({ ...draft, era: e.id as EraId })}
              className={`rounded-xl border px-4 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {e.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl border border-gold/40 bg-gold/8 p-4 text-xs leading-relaxed text-gold/90">
        <Sparkles className="size-4 shrink-0 text-gold" />
        <p>
          This choice applies to grids, Clue Ladder, Arena rooms and your recommended feed. You can
          change it before any game. When a competition has no dedicated puzzle yet, you get the
          whole-sport puzzle instead.
        </p>
      </div>

      <Button
        size="lg"
        className="mt-6 w-full font-bold uppercase tracking-[0.14em]"
        disabled={saving}
        onClick={() => void save()}
      >
        Save quiz preferences
      </Button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 mt-8 text-[0.62rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}

function ScopeRow({
  on,
  onClick,
  badge,
  title,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  badge: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
        on ? "border-primary bg-primary/12" : "border-border bg-surface/60 hover:border-primary/50"
      }`}
    >
      {badge}
      <span className="flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-[0.7rem] text-muted-foreground">{sub}</span>
      </span>
      {on && <CircleCheck className="size-5 text-primary" />}
    </button>
  );
}
