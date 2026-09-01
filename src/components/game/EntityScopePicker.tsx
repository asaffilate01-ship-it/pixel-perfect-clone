import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Globe, Search, Shield, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { entityLabels, fetchScopeEntities } from "@/lib/fanzeno";
import type { ScopePick } from "@/lib/quizPrefs";

type Props = {
  sportId: string;
  sportSlug: string;
  sportName: string;
  kind: "team" | "person";
  value: ScopePick;
  onChange: (next: ScopePick) => void;
};

/** Searchable drill-down into verified team-like or person-like entities for the chosen sport. */
export function EntityScopePicker({ sportId, sportSlug, sportName, kind, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = entityLabels(sportSlug)[kind];
  const { data, isLoading } = useQuery({
    queryKey: ["scope-entities", sportId, kind],
    queryFn: () => fetchScopeEntities(sportId, kind),
    enabled: open,
  });
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [data, query]);
  const Icon = kind === "team" ? Shield : User;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3 text-left transition-colors hover:border-primary/50"
      >
        <span className={`grid size-10 place-items-center rounded-xl ${kind === "team" ? "bg-primary/15" : "bg-gold/15"}`}>
          <Icon className={`size-5 ${kind === "team" ? "text-primary" : "text-gold"}`} />
        </span>
        <span className="flex-1">
          <span className="block text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
          <span className="block text-sm font-bold">{value?.name ?? `All ${label.toLowerCase()}s`}</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <p className="eyebrow">{sportName} filter</p>
            <DialogTitle className="font-display text-3xl">{label}</DialogTitle>
            <DialogDescription>Only verified entries from the Fanzeno database are listed.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-surface"
            >
              <Globe className="size-4 text-primary" /> All {label.toLowerCase()}s
            </button>
            {isLoading && <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>}
            {shown.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  onChange({ id: e.id, name: e.name });
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface ${
                  value?.id === e.id ? "bg-primary/10 font-bold" : ""
                }`}
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="flex-1">{e.name}</span>
                <span className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  {e.kind}
                  {e.countryCode ? ` · ${e.countryCode}` : ""}
                </span>
              </button>
            ))}
            {!isLoading && data && shown.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No verified {label.toLowerCase()} matches “{query}” yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
