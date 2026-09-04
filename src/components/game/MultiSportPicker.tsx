import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { Sport } from "@/lib/fanzeno";

/** Searchable tick-box sport selection for mixed-sport matches and onboarding (v0.16). */
export function MultiSportPicker({
  sports,
  value,
  onChange,
  max = 6,
}: {
  sports: Sport[];
  value: string[];
  onChange: (slugs: string[]) => void;
  max?: number;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return sports.filter((s) => s.enabled && (!n || s.name.toLowerCase().includes(n)));
  }, [sports, q]);
  const toggle = (slug: string) => {
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug));
    else if (value.length < max) onChange([...value, slug]);
  };
  return (
    <div>
      <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 focus-within:border-primary">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search sports"
          aria-label="Search sports"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {value.length}/{max}
        </span>
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Sports">
        {shown.map((s) => {
          const on = value.includes(s.slug);
          const full = !on && value.length >= max;
          return (
            <button
              key={s.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={full}
              onClick={() => toggle(s.slug)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                on ? "border-primary bg-primary/12" : "border-border bg-surface/60 hover:border-primary/50"
              } ${full ? "opacity-50" : ""}`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-md border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                {on && <Check className="size-3.5" />}
              </span>
              <span className="flex-1 font-semibold">{s.name}</span>
              <span className="size-2 rounded-full" style={{ background: s.accent }} aria-hidden />
            </button>
          );
        })}
        {shown.length === 0 && <p className="text-sm text-muted-foreground">No sport matches that search.</p>}
      </div>
    </div>
  );
}
