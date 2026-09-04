import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Globe, Layers, Trophy } from "lucide-react";
import { fetchCompetitions, groupCompetitions, type Sport } from "@/lib/fanzeno";
import { SPORT_CATEGORIES, SportIcon, sportCategory } from "@/lib/sportCatalog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  sports: Sport[];
  sport: string;
  competitionId: string | null;
  /** Slugs with live puzzles today; the rest show a "Soon" tag. */
  playable?: Set<string> | undefined;
  onSportChange: (slug: string) => void;
  onCompetitionChange: (id: string | null, name: string | null) => void;
};

const ALL = "__all__";

/**
 * Step-by-step scope selection: Sport → Competition group (NFL / CFL / NCAA…)
 * → Competition / level. Each step only appears once the previous one is chosen,
 * so the page never shows the whole catalogue at once.
 */
export function SportCascadePicker({
  sports,
  sport,
  competitionId,
  playable,
  onSportChange,
  onCompetitionChange,
}: Props) {
  const { data: competitions } = useQuery({ queryKey: ["competitions"], queryFn: fetchCompetitions });

  const sportRow = sports.find((s) => s.slug === sport);
  const list = useMemo(
    () => (competitions ?? []).filter((c) => c.sport_id === sportRow?.id),
    [competitions, sportRow?.id],
  );
  const groups = useMemo(() => groupCompetitions(list), [list]);
  const selected = list.find((c) => c.id === competitionId) ?? null;
  const groupKey = selected ? (selected.category_key ?? selected.competition_type) : ALL;
  const group = groups.find((g) => g.key === groupKey);

  const bySportCategory = useMemo(
    () =>
      SPORT_CATEGORIES.map((c) => ({
        ...c,
        items: sports.filter((s) => sportCategory(s.slug) === c.key),
      })).filter((c) => c.items.length > 0),
    [sports],
  );

  const pickGroup = (key: string) => {
    if (key === ALL) return onCompetitionChange(null, null);
    const g = groups.find((x) => x.key === key);
    const first = g?.items[0];
    // Selecting a group scopes to its first competition until a specific one is picked.
    if (first) onCompetitionChange(first.id, g && g.items.length > 1 ? g.label : first.name);
  };

  return (
    <div className="game-panel p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-3">
        {/* Step 1 — sport */}
        <Step n={1} label="Sport" icon={<Globe className="size-3.5" />} active>
          <Select value={sport} onValueChange={onSportChange}>
            <SelectTrigger className="h-12 w-full rounded-xl border-border bg-surface/70" aria-label="Choose a sport">
              <SelectValue placeholder="Choose a sport" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {bySportCategory.map((c) => (
                <SelectGroup key={c.key}>
                  <SelectLabel className="eyebrow text-[0.6rem]">{c.label}</SelectLabel>
                  {c.items.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      <span className="flex items-center gap-2">
                        <SportIcon slug={s.slug} className="size-4 text-primary" />
                        <span>{s.name}</span>
                        {playable && !playable.has(s.slug) && (
                          <span className="rounded-full border border-border px-1.5 text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground">
                            Soon
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Step>

        {/* Step 2 — competition group (NFL / CFL / NCAA, Domestic leagues, Grand Slams…) */}
        <Step n={2} label="Category" icon={<Layers className="size-3.5" />} active={!!sportRow}>
          <Select value={groupKey} onValueChange={pickGroup} disabled={!sportRow || groups.length === 0}>
            <SelectTrigger className="h-12 w-full rounded-xl border-border bg-surface/70" aria-label="Choose a category">
              <SelectValue placeholder={groups.length ? "Choose a category" : "No categories yet"} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL}>All {sportRow?.name ?? "of this sport"}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.key} value={g.key}>
                  <span className="flex items-center gap-2">
                    {g.label}
                    <span className="text-[0.65rem] text-muted-foreground">{g.items.length}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Step>

        {/* Step 3 — specific competition / level */}
        <Step n={3} label="Competition" icon={<Trophy className="size-3.5" />} active={!!group}>
          <Select
            value={selected?.id ?? ""}
            onValueChange={(id) => {
              const c = list.find((x) => x.id === id);
              if (c) onCompetitionChange(c.id, c.name);
            }}
            disabled={!group}
          >
            <SelectTrigger className="h-12 w-full rounded-xl border-border bg-surface/70" aria-label="Choose a competition">
              <SelectValue placeholder={group ? "Choose a competition" : "Pick a category first"} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {(group?.items ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex flex-col">
                    <span>{c.name}</span>
                    {(c.region || c.level_key) && (
                      <span className="text-[0.65rem] text-muted-foreground">
                        {[c.region, c.level_key].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Step>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3.5 text-primary" />
        <span className="font-semibold text-foreground">{sportRow?.name ?? "Sport"}</span>
        {group && (
          <>
            <ChevronRight className="size-3" />
            <span>{group.label}</span>
          </>
        )}
        {selected && (
          <>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{selected.name}</span>
          </>
        )}
        {!selected && sportRow && <span>· every competition</span>}
      </div>
    </div>
  );
}

function Step({
  n,
  label,
  icon,
  active,
  children,
}: {
  n: number;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "" : "opacity-50"}>
      <div className="mb-1.5 flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        <span
          className={`grid size-5 place-items-center rounded-full text-[0.6rem] ${
            active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
          }`}
        >
          {n}
        </span>
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
