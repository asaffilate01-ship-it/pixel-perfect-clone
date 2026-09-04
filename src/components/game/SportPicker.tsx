import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Sport } from "@/lib/fanzeno";
import { SPORT_CATEGORIES, SportIcon, sportCategory, type SportCategoryKey } from "@/lib/sportCatalog";

type Props = {
  sports: Sport[];
  value: string;
  onChange: (slug: string) => void;
  /** Slugs that have content today — others get a "soon" tag. */
  playable?: Set<string> | undefined;
  compact?: boolean;
};

/**
 * Category tabs + search + icon tiles. One consistent way to pick a sport
 * everywhere (home, filters, game setup).
 */
export function SportPicker({ sports, value, onChange, playable, compact = false }: Props) {
  const [tab, setTab] = useState<SportCategoryKey | "all">("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of sports) c[sportCategory(s.slug)] = (c[sportCategory(s.slug)] ?? 0) + 1;
    return c;
  }, [sports]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sports.filter(
      (s) =>
        (tab === "all" || sportCategory(s.slug) === tab) &&
        (!needle || s.name.toLowerCase().includes(needle) || s.slug.includes(needle)),
    );
  }, [sports, tab, q]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1.5">
          <Tab on={tab === "all"} onClick={() => setTab("all")}>
            All <span className="opacity-60">{sports.length}</span>
          </Tab>
          {SPORT_CATEGORIES.filter((c) => counts[c.key]).map((c) => (
            <Tab key={c.key} on={tab === c.key} onClick={() => setTab(c.key)}>
              {c.label} <span className="opacity-60">{counts[c.key]}</span>
            </Tab>
          ))}
        </div>
        <label className="relative block w-full sm:w-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a sport"
            aria-label="Find a sport"
            className="h-10 w-full rounded-xl border border-border bg-surface/60 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      <div
        className={`mt-3 grid gap-2 ${
          compact ? "grid-cols-3 sm:grid-cols-5 lg:grid-cols-7" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"
        }`}
        role="radiogroup"
        aria-label="Sport"
      >
        {shown.map((s) => {
          const on = s.slug === value;
          const soon = playable ? !playable.has(s.slug) : false;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(s.slug)}
              style={{ ["--sport" as string]: s.accent }}
              className={`sport-tile group relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all ${
                on
                  ? "border-[var(--sport)] bg-[color-mix(in_oklab,var(--sport)_16%,transparent)] shadow-[0_0_0_1px_var(--sport)]"
                  : "border-border bg-surface/50 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--sport)_60%,transparent)]"
              }`}
            >
              <span
                className={`grid size-11 place-items-center rounded-xl transition-colors ${
                  on ? "bg-[var(--sport)] text-background" : "bg-surface-strong text-[var(--sport)]"
                }`}
              >
                <SportIcon slug={s.slug} className="size-6" />
              </span>
              <span className="text-[0.68rem] font-extrabold uppercase leading-tight tracking-[0.08em]">
                {s.name}
              </span>
              {soon && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-surface-strong px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  Soon
                </span>
              )}
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No sport matches “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.12em] transition-colors ${
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
