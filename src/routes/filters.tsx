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
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  countriesForSport,
  fetchCompetitions,
  fetchSports,
  groupCompetitions,
} from "@/lib/fanzeno";
import { ERAS, QUESTION_FOCUS, useQuizPrefs, type EraId, type QuizPrefs } from "@/lib/quizPrefs";
import { EntityScopePicker } from "@/components/game/EntityScopePicker";
import { SportPicker } from "@/components/game/SportPicker";
import { SportIcon } from "@/lib/sportCatalog";
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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setCountry("all");
    setSearch("");
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

  const filteredGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            (c.short_name ?? "").toLowerCase().includes(needle) ||
            (c.region ?? "").toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, search]);

  const summary = [
    sport?.name ?? "Any sport",
    draft.competitionName ?? "All competitions",
    draft.team?.name,
    draft.person?.name,
    ERAS.find((e) => e.id === draft.era)?.label,
  ].filter(Boolean);

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

      {/* Current selection, always visible */}
      <div className="sticky top-16 z-20 mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-background/85 p-3 backdrop-blur">
        <span className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Playing
        </span>
        {sport && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold">
            <SportIcon slug={sport.slug} className="size-3.5 text-primary" />
            {sport.name}
          </span>
        )}
        {summary.slice(1).map((s) => (
          <span key={s} className="rounded-full bg-surface-strong px-2.5 py-1 text-xs font-semibold">
            {s}
          </span>
        ))}
        <Button
          size="sm"
          className="ml-auto font-bold uppercase tracking-[0.14em]"
          disabled={saving}
          onClick={() => void save()}
        >
          Save
        </Button>
      </div>

      <SectionLabel>1 · Sport</SectionLabel>
      <SportPicker
        sports={sports ?? []}
        value={draft.sport}
        onChange={(slug) =>
          setDraft({ ...draft, sport: slug, competitionId: null, competitionName: null, team: null, person: null })
        }
      />

      {countries.length > 1 && (
        <>
          <SectionLabel>2 · Country or region</SectionLabel>
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

      <SectionLabel>3 · League or competition</SectionLabel>
      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${sport?.name ?? ""} leagues, cups and tours`}
          aria-label="Search competitions"
          className="h-11 w-full rounded-xl border border-border bg-surface/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </label>
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
        {filteredGroups.map((g, i) => {
          const expanded = search.trim() ? true : isOpen(g.key, i);
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
                  <span className="block text-sm font-bold">{humanise(g.label)}</span>
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

      {sport && (
        <>
          <SectionLabel>4 · Team or person (optional)</SectionLabel>
          <div className="space-y-2">
            <EntityScopePicker
              sportId={sport.id}
              sportSlug={sport.slug}
              sportName={sport.name}
              kind="team"
              value={draft.team ?? null}
              onChange={(team) => setDraft({ ...draft, team })}
            />
            <EntityScopePicker
              sportId={sport.id}
              sportSlug={sport.slug}
              sportName={sport.name}
              kind="person"
              value={draft.person ?? null}
              onChange={(person) => setDraft({ ...draft, person })}
            />
          </div>
        </>
      )}

      <SectionLabel>5 · Question focus</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {QUESTION_FOCUS.map((f) => {
          const on = (draft.focus ?? "Mixed") === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setDraft({ ...draft, focus: f })}
              className={`rounded-xl border px-4 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      <SectionLabel>6 · Era</SectionLabel>
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

const humanise = (k: string) =>
  /[a-z]-[a-z]/.test(k) ? k.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : k;

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
