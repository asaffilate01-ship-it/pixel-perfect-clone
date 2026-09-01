import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Check, ChevronLeft, Eye, Gem, SkipForward, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSports } from "@/lib/fanzeno";
import { fetchClueBank, pickPrompt, SEAT_COLORS, SEAT_TEXT } from "@/lib/arcadeQuiz";
import { useEntitlements } from "@/lib/entitlements";
import { Chip, Label, PlayerCard } from "@/components/game/ArcadeSetup";

export const Route = createFileRoute("/arcade_/mastermind")({
  head: () => ({
    meta: [
      { title: "Sports Mastermind — Fanzeno Arcade" },
      {
        name: "description",
        content:
          "Three minutes on your chosen sport, then three minutes on everything. Most points wins; fewest passes breaks the tie.",
      },
      { property: "og:title", content: "Sports Mastermind — Fanzeno Arcade" },
      { property: "og:description", content: "Master your subject. Then survive everything." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MastermindPage,
});

const ROUND_SECONDS = 180;
type P = { name: string; sportId: string | null; points: number; passes: number; correct: number };

function MastermindPage() {
  const navigate = useNavigate();
  const { pro, loading: entLoading } = useEntitlements();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: bank } = useQuery({ queryKey: ["clue-bank"], queryFn: fetchClueBank });

  const [setup, setSetup] = useState(true);
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState<P[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({ name: `Player ${i + 1}`, sportId: null, points: 0, passes: 0, correct: 0 })),
  );
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [question, setQuestion] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [finished, setFinished] = useState(false);
  const nextTurnRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!sports?.length) return;
    setPlayers((x) => x.map((p, i) => (p.sportId ? p : { ...p, sportId: sports[i % sports.length]!.id })));
  }, [sports]);

  const promptFor = (seat: number, ph: 1 | 2) => setPrompt(pickPrompt(bank ?? {}, ph === 1 ? players[seat]!.sportId : null));

  const nextTurn = () => {
    setSeconds(ROUND_SECONDS);
    setQuestion(1);
    if (active + 1 < count) {
      setActive(active + 1);
      promptFor(active + 1, phase);
    } else if (phase === 1) {
      setPhase(2);
      setActive(0);
      promptFor(0, 2);
    } else setFinished(true);
  };
  nextTurnRef.current = nextTurn;

  useEffect(() => {
    if (setup || finished) return;
    const t = setInterval(() => {
      setSeconds((x) => {
        if (x > 1) return x - 1;
        nextTurnRef.current();
        return ROUND_SECONDS;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [setup, finished]);

  const mark = (kind: "answer" | "pass") => {
    setPlayers((x) =>
      x.map((p, i) =>
        i === active
          ? {
              ...p,
              points: p.points + (kind === "answer" ? 100 : 0),
              correct: p.correct + (kind === "answer" ? 1 : 0),
              passes: p.passes + (kind === "pass" ? 1 : 0),
            }
          : p,
      ),
    );
    setQuestion((q) => q + 1);
    promptFor(active, phase);
  };

  const standings = useMemo(
    () =>
      players
        .slice(0, count)
        .map((p, i) => ({ ...p, seat: i }))
        .sort((a, b) => b.points - a.points || a.passes - b.passes || b.correct - a.correct),
    [players, count],
  );

  const reset = () => {
    setSetup(true);
    setFinished(false);
    setPhase(1);
    setActive(0);
    setSeconds(ROUND_SECONDS);
    setPlayers((x) => x.map((p) => ({ ...p, points: 0, passes: 0, correct: 0 })));
  };

  if (!entLoading && !pro) {
    return (
      <Shell onBack={() => void navigate({ to: "/arcade" })}>
        <div className="panel mt-8 p-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-7 text-gold" />
          </span>
          <h2 className="mt-4 text-3xl">Sports Mastermind is a Pro game</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock it with Fanzeno Pro — one payment, lifetime. Free guests can still join a Pro host&apos;s private room.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/upgrade">Unlock Fanzeno Pro</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/arcade">Back to arcade</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (setup) {
    return (
      <Shell onBack={() => void navigate({ to: "/arcade" })}>
        <h2 className="mt-6 text-4xl leading-tight">
          Master your subject. <span className="text-gold">Then survive everything.</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Each player gets three minutes on a chosen sport, followed by three minutes of all-sports questions. Correct
          answers score 100; passes count against you in a tie.
        </p>
        <Label>Players</Label>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4].map((n) => (
            <Chip key={n} on={count === n} onClick={() => setCount(n)}>
              {n} players
            </Chip>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {players.slice(0, count).map((p, i) => (
            <PlayerCard
              key={i}
              seat={i}
              player={p}
              sports={sports ?? []}
              onName={(name) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, name } : v)))}
              onSport={(sportId) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, sportId } : v)))}
            />
          ))}
        </div>
        <p className="mt-5 flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
          <Users className="size-3.5 text-primary" /> Local pass &amp; play · private online rooms coming soon
        </p>
        <Button
          size="lg"
          className="mt-6 w-full font-bold uppercase tracking-[0.14em]"
          onClick={() => {
            setSetup(false);
            promptFor(0, 1);
          }}
        >
          Start Mastermind
        </Button>
      </Shell>
    );
  }

  if (finished) {
    const w = standings[0]!;
    return (
      <Shell onBack={reset}>
        <div className="panel mt-8 p-8 text-center">
          <Trophy className="mx-auto size-14 text-gold" />
          <p className="eyebrow mt-4">Winner</p>
          <h2 className={`text-5xl ${SEAT_TEXT[w.seat]}`}>{w.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {w.points} points · {w.passes} passes
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {standings.map((p, i) => (
            <div key={p.seat} className="panel flex items-center gap-3 px-4 py-3">
              <span className="w-6 font-display text-2xl text-muted-foreground">{i + 1}</span>
              <span className={`size-3 rounded-full ${SEAT_COLORS[p.seat]}`} />
              <span className="flex-1 text-sm font-bold">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.points} · {p.passes}P
              </span>
            </div>
          ))}
        </div>
        <Button className="mt-6 w-full" onClick={reset}>
          Play again
        </Button>
      </Shell>
    );
  }

  const p = players[active]!;
  const sportName = sports?.find((s) => s.id === p.sportId)?.name ?? "Chosen sport";
  return (
    <Shell onBack={reset}>
      <div className="mt-6 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
        <span className="text-primary">● Live room · {count - 1} watching</span>
        <span className="text-muted-foreground">Round {phase}/2</span>
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {players.slice(0, count).map((x, i) => (
          <div key={i} className={`panel p-3 text-center ${i === active ? "border-primary" : ""}`}>
            <p className={`truncate text-[0.6rem] font-black uppercase tracking-[0.12em] ${SEAT_TEXT[i]}`}>{x.name}</p>
            <p className="font-display text-3xl">{x.points}</p>
            <p className="text-[0.6rem] text-muted-foreground">{x.passes} passes</p>
          </div>
        ))}
      </div>

      <div className={`panel mt-4 p-6 text-center ${seconds <= 10 ? "border-destructive" : ""}`}>
        <p className="font-display text-7xl tabular-nums">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {p.name} · {phase === 1 ? sportName : "All sports"}
        </p>
      </div>

      <div className="panel mt-4 p-5">
        <p className={`text-[0.62rem] font-black uppercase tracking-[0.16em] ${SEAT_TEXT[active]}`}>Question {question}</p>
        <p className="mt-2 font-display text-2xl leading-tight">{prompt}</p>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Eye className="size-3.5 text-primary" /> Everyone sees the question; only the active player answers.
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => mark("pass")}>
          <SkipForward className="size-4" /> Pass
        </Button>
        <Button className="flex-[2]" onClick={() => mark("answer")}>
          <Check className="size-4" /> Correct · +100
        </Button>
      </div>
      <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={nextTurn}>
        End player&apos;s turn
      </Button>
    </Shell>
  );
}

function Shell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <p className="eyebrow">Fanzeno live</p>
          <h1 className="mt-1 text-3xl">Sports Mastermind</h1>
        </div>
        <Brain className="size-6 text-gold" />
      </div>
      {children}
    </div>
  );
}
