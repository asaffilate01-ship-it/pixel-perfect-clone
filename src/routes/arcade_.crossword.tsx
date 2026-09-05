import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, Lightbulb, Puzzle, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SideAdRail, TopAdBanner } from "@/components/site/AdSlots";

export const Route = createFileRoute("/arcade_/crossword")({
  head: () => ({
    meta: [
      { title: "Sports Crossword — Fanzeno Arcade" },
      { name: "description", content: "Solve a colourful sports crossword from verified clues." },
    ],
  }),
  component: CrosswordPage,
});

type Entry = { answer: string; clue: string; row: number; col: number; vertical?: boolean };

const ENTRIES: Entry[] = [
  { answer: "SKI", clue: "Equipment used to glide across snow", row: 2, col: 4, vertical: true },
  { answer: "WICKET", clue: "A dismissal target in cricket", row: 3, col: 1 },
  { answer: "TENNIS", clue: "Sport played at Wimbledon", row: 3, col: 6, vertical: true },
  { answer: "ARENA", clue: "A venue for indoor sporting contests", row: 5, col: 3 },
  { answer: "PIT", clue: "Where a racing car stops for service", row: 7, col: 5 },
];

const SIZE = 9;

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function CrosswordPage() {
  const cells = useMemo(() => {
    const result = new Map<string, { letter: string; entries: number[] }>();
    ENTRIES.forEach((entry, entryIndex) => {
      [...entry.answer].forEach((letter, offset) => {
        const row = entry.row + (entry.vertical ? offset : 0);
        const col = entry.col + (entry.vertical ? 0 : offset);
        const key = cellKey(row, col);
        const previous = result.get(key);
        result.set(key, { letter, entries: [...(previous?.entries ?? []), entryIndex] });
      });
    });
    return result;
  }, []);
  const [letters, setLetters] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [hints, setHints] = useState<Set<number>>(new Set());

  const correct = [...cells].filter(([key, cell]) => letters[key] === cell.letter).length;
  const complete = correct === cells.size;
  const score = Math.max(0, correct * 100 - hints.size * 150);

  const revealHint = (entryIndex: number) => {
    if (hints.has(entryIndex)) return;
    const entry = ENTRIES[entryIndex];
    if (!entry) return;
    const offset = [...entry.answer].findIndex((_, index) => {
      const key = cellKey(
        entry.row + (entry.vertical ? index : 0),
        entry.col + (entry.vertical ? 0 : index),
      );
      return !letters[key];
    });
    if (offset < 0) return;
    const key = cellKey(
      entry.row + (entry.vertical ? offset : 0),
      entry.col + (entry.vertical ? 0 : offset),
    );
    const letter = entry.answer[offset] ?? "";
    setLetters((current) => ({ ...current, [key]: letter }));
    setHints((current) => new Set(current).add(entryIndex));
    setChecked(false);
  };

  const reset = () => {
    setLetters({});
    setHints(new Set());
    setChecked(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 sm:py-9">
      <SideAdRail placement="arcade-crossword" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to arcade" asChild>
          <Link to="/arcade">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Fanzeno arcade</p>
          <h1 className="mt-1 truncate text-3xl sm:text-5xl">Sports Crossword</h1>
        </div>
        <Puzzle className="size-8 text-primary" />
      </div>
      <TopAdBanner placement="arcade-crossword" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="panel overflow-hidden p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-primary">
                Mixed sports · Medium
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap a square and type. Intersections share letters.
              </p>
            </div>
            <div className="game-score-ring shrink-0">
              <div className="game-score-ring-inner text-center">
                <p className="font-display text-xl text-primary">{score}</p>
                <p className="text-[.5rem] font-black uppercase tracking-wider text-muted-foreground">
                  pts
                </p>
              </div>
            </div>
          </div>

          <div className="board-stage mb-8 mt-2">
            <div className="board-tilt board-rim board-wood mx-auto w-full max-w-xl p-3 sm:p-4">
              <div className="grid aspect-square w-full grid-cols-9 gap-1 sm:gap-1.5">
                {Array.from({ length: SIZE * SIZE }, (_, index) => {
                  const row = Math.floor(index / SIZE);
                  const col = index % SIZE;
                  const key = cellKey(row, col);
                  const cell = cells.get(key);
                  if (!cell) return <div key={key} className="tile-pocket" />;
                  const wrong = checked && letters[key] && letters[key] !== cell.letter;
                  const right = checked && letters[key] === cell.letter;
                  const number = ENTRIES.findIndex((e) => e.row === row && e.col === col);
                  return (
                    <div key={key} className="relative">
                      {number >= 0 && (
                        <span className="pointer-events-none absolute left-0 top-0 z-10 flex min-w-4 items-center justify-center gap-px rounded-br-md bg-primary px-0.5 py-px text-[0.48rem] font-black leading-none text-primary-foreground shadow-sm sm:min-w-5 sm:text-[0.58rem]">
                          {number + 1}
                          <span aria-hidden="true" className="text-[0.4rem] opacity-85">
                            {ENTRIES[number]?.vertical ? "↓" : "→"}
                          </span>
                        </span>
                      )}
                      <input
                        value={letters[key] ?? ""}
                        maxLength={1}
                        aria-label={`${number >= 0 ? `Clue ${number + 1} ${ENTRIES[number]?.vertical ? "Down" : "Across"}, ` : ""}crossword row ${row + 1}, column ${col + 1}`}
                        onChange={(event) => {
                          const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                          setLetters((current) => ({ ...current, [key]: value }));
                          setChecked(false);
                        }}
                        className={`tile-ivory size-full min-h-0 min-w-0 border-0 text-center font-display text-lg uppercase outline-none sm:text-3xl ${
                          wrong ? "tile-ivory-wrong" : right ? "tile-ivory-correct" : ""
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setChecked(true)} className="flex-1 sm:flex-none">
              <Check className="mr-2 size-4" /> Check answers
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 size-4" /> Reset
            </Button>
          </div>
          {checked && (
            <div
              className={`mt-4 rounded-2xl border p-4 ${complete ? "border-gold bg-gold/10" : "border-primary/30 bg-primary/5"}`}
            >
              <p className="flex items-center gap-2 font-black">
                {complete && <Trophy className="size-5 text-gold" />}
                {complete ? "Crossword complete!" : `${correct} of ${cells.size} letters correct`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hints cost 150 points, so solve unaided for the best score.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          {([false, true] as const).map((vertical) => (
            <section key={vertical ? "down" : "across"} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-black text-primary-foreground">
                  {vertical ? "↓" : "→"}
                </span>
                <p className="eyebrow">{vertical ? "Down" : "Across"}</p>
              </div>
              {ENTRIES.map((entry, index) => ({ entry, index }))
                .filter(({ entry }) => Boolean(entry.vertical) === vertical)
                .map(({ entry, index }) => (
                  <div
                    key={`${entry.answer}-${index}`}
                    className="game-card game-tile-pop flex gap-3 p-4"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/12 text-xs font-black text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{entry.clue}</p>
                      <p className="mt-1 text-[.65rem] font-black uppercase tracking-wider text-muted-foreground">
                        {entry.answer.length} letters
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => revealHint(index)}
                      aria-label={`Hint for clue ${index + 1}`}
                      className="self-start rounded-lg p-2 text-gold hover:bg-gold/10"
                    >
                      <Lightbulb className="size-4" />
                    </button>
                  </div>
                ))}
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
