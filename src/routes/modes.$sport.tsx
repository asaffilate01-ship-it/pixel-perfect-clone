import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Cpu, Infinity as InfinityIcon, Shuffle, Smartphone, UserPlus } from "lucide-react";
import { DIFFICULTIES, type DifficultyLevel } from "@/lib/fanzeno";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/modes/$sport")({
  head: ({ params }) => {
    const name = params.sport.charAt(0).toUpperCase() + params.sport.slice(1);
    const title = `${name} grid battle — choose how to play | Fanzeno`;
    const description = `Pick a difficulty and play ${name} grids: pass & play on one device, solo against the CPU, endless verified grids or online rivals.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ModesPage,
});

function ModesPage() {
  const { sport } = Route.useParams();
  const navigate = useNavigate();
  const [level, setLevel] = useState<DifficultyLevel>(2);
  const name = sport.charAt(0).toUpperCase() + sport.slice(1);
  const chosen = DIFFICULTIES.find((d) => d.level === level)!;

  const local = (mode: "pass" | "cpu") =>
    navigate({ to: "/play/$sport", params: { sport }, search: { mode, difficulty: level } });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="eyebrow">{name} grid battle</p>
      <h1 className="mt-2 text-4xl">Choose how to play</h1>

      <section className="panel mt-6 p-5">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Question difficulty
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.level}
              type="button"
              onClick={() => setLevel(d.level)}
              aria-pressed={d.level === level}
              className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                d.level === level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/60"
              }`}
            >
              <span className="block font-display text-lg tracking-wide">{d.label}</span>
              <span className="block text-[0.6rem] font-bold uppercase tracking-[0.12em] opacity-80">
                {d.multiplier}× points
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Correct answers earn 100 base points × {chosen.multiplier} on {chosen.label}. Difficulty changes the
          grid pool; against the CPU it also changes its speed and tactical strength.
        </p>
      </section>

      <div className="mt-6 grid gap-3">
        <ModeRow
          icon={<Smartphone className="size-5 text-primary" />}
          title="Pass & Play"
          sub="Two players, one device. Hand it over after every move — first to three in a row wins."
          onClick={() => void local("pass")}
        />
        <ModeRow
          icon={<Cpu className="size-5 text-primary" />}
          title="Solo vs Computer"
          sub={`Play the Fanzeno CPU at ${chosen.label} level.`}
          onClick={() => void local("cpu")}
        />
        <ModeRow
          icon={<InfinityIcon className="size-5 text-primary" />}
          title="Endless verified grids"
          sub="Fresh, never-repeated grids built only from verified facts. Sign-in required."
          onClick={() =>
            void navigate({ to: "/endless/$sport", params: { sport }, search: { difficulty: level } })
          }
        />
        <ModeRow
          icon={<Shuffle className="size-5 text-primary" />}
          title="Random online rival"
          sub="Match with a similarly rated player worldwide."
          onClick={() => void navigate({ to: "/compete" })}
        />
        <ModeRow
          icon={<UserPlus className="size-5 text-primary" />}
          title="Chosen player"
          sub="Invite a friend, enter a room code, or share a private challenge."
          onClick={() => void navigate({ to: "/compete" })}
        />
      </div>

      <Button asChild variant="ghost" className="mt-6">
        <Link to="/play/$sport" params={{ sport }}>
          Just play today&apos;s Daily 9
        </Link>
      </Button>
    </div>
  );
}

function ModeRow({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel flex items-center gap-4 p-5 text-left transition-colors hover:border-primary/60"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-xl tracking-wide">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </button>
  );
}
