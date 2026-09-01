import type { Sport } from "@/lib/fanzeno";
import { SEAT_COLORS } from "@/lib/arcadeQuiz";

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

export function PlayerCard({
  seat,
  player,
  sports,
  onName,
  onSport,
}: {
  seat: number;
  player: { name: string; sportId: string | null };
  sports: Sport[];
  onName: (name: string) => void;
  onSport: (id: string) => void;
}) {
  return (
    <div className="panel flex gap-3 p-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-display text-xl text-background ${SEAT_COLORS[seat]}`}>
        {seat + 1}
      </span>
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
              onClick={() => onSport(s.id)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] ${
                player.sportId === s.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
