import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCompetitions, groupCompetitions, type Sport } from "@/lib/fanzeno";
import { SEAT_COLORS } from "@/lib/arcadeQuiz";
import { Avatar } from "@/components/game/AvatarPicker";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 mt-6 text-[0.62rem] font-black uppercase tracking-[0.2em] text-muted-foreground">{children}</p>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-xl border px-4 py-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] transition-colors ${
        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export type SeatPlayer = { name: string; sportId: string | null; categoryKey?: string | null | undefined };

/**
 * Per-seat subject picker: sport, then an optional competition category within that sport
 * (e.g. "Domestic leagues", "Grand Slams") so each player can be quizzed on their own patch.
 */
export function PlayerCard({
  seat,
  player,
  avatar,
  sports,
  onName,
  onSport,
  onCategory,
  children,
}: {
  seat: number;
  player: SeatPlayer;
  avatar?: string | undefined;
  sports: Sport[];
  onName: (name: string) => void;
  onSport: (id: string) => void;
  onCategory?: ((key: string | null) => void) | undefined;
  children?: React.ReactNode;
}) {
  const { data: competitions } = useQuery({ queryKey: ["competitions"], queryFn: fetchCompetitions });
  const categories = useMemo(
    () => groupCompetitions((competitions ?? []).filter((c) => c.sport_id === player.sportId)),
    [competitions, player.sportId],
  );
  return (
    <div className="panel flex gap-3 p-3">
      {avatar ? (
        <Avatar id={avatar} size={40} />
      ) : (
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-display text-xl text-background ${SEAT_COLORS[seat]}`}>
          {seat + 1}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <input
          value={player.name}
          onChange={(e) => onName(e.target.value)}
          aria-label={`Player ${seat + 1} name`}
          className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {sports.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSport(s.id);
                onCategory?.(null);
              }}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] ${
                player.sportId === s.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {onCategory && categories.length > 0 && (
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onCategory(null)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] ${
                !player.categoryKey ? "border-gold bg-gold/15 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              All categories
            </button>
            {categories.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => onCategory(g.key)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] ${
                  player.categoryKey === g.key ? "border-gold bg-gold/15 text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
