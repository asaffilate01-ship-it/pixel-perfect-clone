import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Search, UserRound } from "lucide-react";
import { searchAthletes, type AthleteOption } from "@/lib/fanzeno";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (athlete: AthleteOption) => void;
  sportId?: string | null | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
};

/**
 * Typo-tolerant athlete picker backed by the verified athlete index.
 * Typing still works as a free-text guess; picking a suggestion fills the exact name.
 */
export function AthleteAutocomplete({ value, onChange, onSelect, sportId, placeholder, disabled }: Props) {
  const [debounced, setDebounced] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 140);
    return () => clearTimeout(t);
  }, [value]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["athlete-search", sportId ?? "all", debounced.trim().toLowerCase()],
    queryFn: () => searchAthletes(debounced, sportId),
    enabled: debounced.trim().length >= 2,
    staleTime: 60_000,
  });

  useEffect(() => setHighlight(0), [results]);

  const show = open && value.trim().length >= 2 && results.length > 0;

  const pick = (a: AthleteOption) => {
    onChange(a.name);
    setOpen(false);
    onSelect(a);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={value}
          disabled={disabled}
          role="combobox"
          aria-expanded={show}
          aria-controls="athlete-suggestions"
          aria-autocomplete="list"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          className="pl-9"
          placeholder={placeholder ?? "Start typing an athlete…"}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!show) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && results[highlight]) {
              e.preventDefault();
              pick(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {show && (
        <ul
          id="athlete-suggestions"
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        >
          {results.map((a, i) => (
            <li
              key={a.id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(a);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2.5 text-sm last:border-b-0 ${
                i === highlight ? "bg-primary/12" : ""
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{a.name}</span>
                  {a.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
                </span>
                <span className="block truncate text-[0.68rem] text-muted-foreground">
                  {[a.countryCode, ...a.aliases.slice(0, 3)].filter(Boolean).join(" · ")}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}
      {isFetching && value.trim().length >= 2 && !show && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
          …
        </span>
      )}
    </div>
  );
}
