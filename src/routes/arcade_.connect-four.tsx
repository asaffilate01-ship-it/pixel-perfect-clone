import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Flag,
  Handshake,
  SkipForward,
  Sparkles,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EndGameSheet } from "@/components/game/EndGameSheet";
import {
  COLS,
  ROWS,
  connectWinner,
  dropToken,
  type MatchResult,
  type Side,
} from "@/lib/matchEngine";
import { DIFFICULTIES, fetchSports } from "@/lib/fanzeno";
import { fetchClueBank } from "@/lib/arcadeQuiz";
import { QuestionCard, type QuestionOutcome } from "@/components/game/QuestionCard";
import { Chip, Label } from "@/components/game/ArcadeSetup";

export const Route = createFileRoute("/arcade_/connect-four")({
  head: () => ({
    meta: [
      { title: "Connect Four — Fanzeno Arcade" },
      {
        name: "description",
        content:
          "Pick a column, answer its sports clue, drop your token. Connect four to win the match.",
      },
      { property: "og:title", content: "Connect Four — Fanzeno Arcade" },
      {
        property: "og:description",
        content: "Answer, drop and connect four. Tactical sports trivia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectFourPage,
});

const TURN_SECONDS = 30;

/** Finds the indices of a winning four-in-a-row on a gravity board, or an empty array. */
function findWinningCells(board: (Side | null)[], cols = COLS, rows = ROWS): number[] {
  const at = (r: number, c: number) => board[r * cols + c];
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = at(r, c);
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        const cells = [r * cols + c];
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || at(rr, cc) !== v) {
            ok = false;
            break;
          }
          cells.push(rr * cols + cc);
        }
        if (ok) return cells;
      }
    }
  }
  return [];
}

function ConnectFourPage() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<(Side | null)[]>(() => Array(COLS * ROWS).fill(null));
  const [turn, setTurn] = useState<Side>("me");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [seconds, setSeconds] = useState(TURN_SECONDS);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [sportId, setSportId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(2);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    data: sports,
    isLoading: sportsLoading,
    isError: sportsError,
    refetch: retrySports,
  } = useQuery({ queryKey: ["sports"], queryFn: fetchSports, staleTime: 5 * 60_000 });
  const { data: bank } = useQuery({
    queryKey: ["clue-bank"],
    queryFn: fetchClueBank,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!sportId && sports?.length) setSportId(sports[0]!.id);
  }, [sportId, sports]);

  const reset = () => {
    if (botTimer.current) clearTimeout(botTimer.current);
    setBoard(Array(COLS * ROWS).fill(null));
    setTurn("me");
    setResult(null);
    setDrawOffered(false);
    setSeconds(TURN_SECONDS);
    setLastIndex(null);
    setSelectedCol(null);
  };

  // Turn timer: running out forfeits the match (timeout end reason).
  useEffect(() => {
    if (result || turn !== "me" || !sportId) return;
    setSeconds(TURN_SECONDS);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setResult({ outcome: "loss", reason: "timeout" });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [turn, result, sportId]);

  useEffect(
    () => () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    },
    [],
  );

  const botReply = (from: (Side | null)[]) => {
    setTurn("them");
    botTimer.current = setTimeout(() => {
      const options = Array.from({ length: COLS }, (_, c) => c).filter((c) =>
        dropToken(from, c, "them"),
      );
      if (!options.length) {
        setResult({ outcome: "draw", reason: "board_full" });
        return;
      }
      // Greedy bot: win if possible, block if needed, else random.
      const winning = options.find(
        (c) => connectWinner(dropToken(from, c, "them")!.board) === "them",
      );
      const blocking = options.find((c) => connectWinner(dropToken(from, c, "me")!.board) === "me");
      const col = winning ?? blocking ?? options[Math.floor(Math.random() * options.length)]!;
      const reply = dropToken(from, col, "them")!;
      setBoard(reply.board);
      setLastIndex(reply.index);
      if (connectWinner(reply.board) === "them") setResult({ outcome: "loss", reason: "line" });
      else if (reply.board.every(Boolean)) setResult({ outcome: "draw", reason: "board_full" });
      else setTurn("me");
    }, 650);
  };

  const chooseColumn = (col: number) => {
    if (turn !== "me" || result) return;
    const move = dropToken(board, col, "me");
    if (!move) {
      toast("That column is full.");
      return;
    }
    setSelectedCol(col);
  };

  const play = (col: number) => {
    if (turn !== "me" || result) return;
    const move = dropToken(board, col, "me");
    if (!move) return;
    setBoard(move.board);
    setLastIndex(move.index);
    setSelectedCol(null);
    setDrawOffered(false);
    if (connectWinner(move.board) === "me") {
      setResult({ outcome: "win", reason: "line" });
      return;
    }
    if (move.board.every(Boolean)) {
      setResult({ outcome: "draw", reason: "board_full" });
      return;
    }
    botReply(move.board);
  };

  const resolveQuestion = ({ correct, passed }: QuestionOutcome) => {
    if (selectedCol === null || result) return;
    const col = selectedCol;
    setSelectedCol(null);
    if (correct) {
      play(col);
      return;
    }
    toast(passed ? "Question passed — rival turn." : "Incorrect — rival turn.");
    botReply(board);
  };

  const pass = () => {
    if (turn !== "me" || result) return;
    setSelectedCol(null);
    toast("Turn passed — your rival will play.");
    botReply(board);
  };

  const offerDraw = () => {
    if (turn !== "me" || result || drawOffered) return;
    setDrawOffered(true);
    // The rival accepts when it is behind on material, otherwise declines.
    const mine = board.filter((v) => v === "me").length;
    const theirs = board.filter((v) => v === "them").length;
    botTimer.current = setTimeout(() => {
      if (theirs <= mine && Math.random() < 0.5)
        setResult({ outcome: "draw", reason: "agreed_draw" });
      else toast("Draw declined — play on.");
    }, 700);
  };

  const filled = board.filter(Boolean).length;
  const winningCells = findWinningCells(board);

  return (
    <div className="connect-four-arena mx-auto min-h-screen w-full max-w-3xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="game-card relative flex items-center justify-between gap-2 overflow-hidden p-3 sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-surface to-gold/10 opacity-50" />
        <Button asChild variant="ghost" size="sm" className="relative z-10">
          <Link to="/arcade">
            <ChevronLeft className="size-4" /> Arcade
          </Link>
        </Button>
        <div className="relative z-10 text-center">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-primary">
            Tactical arena
          </p>
          <h1 className="font-display mt-1 text-3xl sm:text-4xl">Connect Four</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="relative z-10"
          onClick={() => setConfirmResign(true)}
          disabled={!!result}
        >
          <Flag className="size-4" /> Resign
        </Button>
      </div>

      <div className="game-card mt-4 flex items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4">
        <PlayerChip label="You" me active={turn === "me" && !result} />
        <div className="text-center">
          <p className="font-display text-xl text-gold">VS</p>
          <p
            className={`flex items-center justify-center gap-1 font-mono text-sm tabular-nums ${
              seconds <= 5 ? "text-destructive" : "text-muted-foreground"
            }`}
            aria-live="polite"
          >
            <Timer className="size-3.5" /> 00:{String(seconds).padStart(2, "0")}
          </p>
        </div>
        <PlayerChip label="Rival" active={turn === "them" && !result} />
      </div>

      <div className="game-card mt-4 p-3 sm:p-4">
        <Label>Question setup</Label>
        <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {(sports ?? []).map((sport) => (
            <Chip key={sport.id} on={sportId === sport.id} onClick={() => setSportId(sport.id)}>
              {sport.name}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {DIFFICULTIES.map((d) => (
            <Chip key={d.level} on={difficulty === d.level} onClick={() => setDifficulty(d.level)}>
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      {sportsError && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100">
          <span>Sports could not load. Check your connection and try again.</span>
          <Button variant="outline" size="sm" onClick={() => void retrySports()}>
            Try again
          </Button>
        </div>
      )}

      <p className="game-feedback game-feedback-info mt-4 w-full justify-center">
        <Sparkles className="size-4 text-gold" />
        <span>
          {result
            ? "Match over."
            : turn === "me"
              ? selectedCol === null
                ? "Tap an open column to reveal your question"
                : `Column ${selectedCol + 1} selected — answer to drop your token`
              : "Your rival is choosing…"}
        </span>
      </p>

      <div className="game-panel game-panel-accent-primary mt-4 p-3 sm:p-4">
        <div
          className="grid grid-cols-7 gap-1.5"
          role="group"
          aria-label="Choose a Connect Four column"
        >
          {Array.from({ length: COLS }, (_, i) => i).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => chooseColumn(i)}
              onMouseEnter={() => setHoveredCol(i)}
              onMouseLeave={() => setHoveredCol((c) => (c === i ? null : c))}
              onFocus={() => setHoveredCol(i)}
              onBlur={() => setHoveredCol((c) => (c === i ? null : c))}
              disabled={
                sportsLoading ||
                !sportId ||
                turn !== "me" ||
                !!result ||
                selectedCol !== null ||
                !dropToken(board, i, "me")
              }
              className={`game-tile-pop min-h-12 text-[0.55rem] ${
                selectedCol === i
                  ? "game-tile-reward"
                  : "border-t-4 border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5"
              }`}
              aria-label={`Choose column ${i + 1}`}
              aria-pressed={selectedCol === i}
            >
              <ChevronDown
                className={`size-4 ${selectedCol === i ? "text-gold-foreground" : "text-primary"}`}
                aria-hidden
              />
              <span>Drop {i + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedCol !== null && turn === "me" && !result && (
        <QuestionCard
          modeSlug="connect-four"
          turnKey={`connect-four-${filled}-${selectedCol}`}
          sportId={sportId}
          categoryKey={null}
          difficulty={difficulty}
          bank={bank}
          accentClass="text-primary"
          onResolved={resolveQuestion}
          rewardLabel={(clue) =>
            `Column ${selectedCol + 1} · ${clue ? "hint used" : "answer to drop"}`
          }
        />
      )}

      <div className="board-stage mt-5 px-2 pb-8 sm:px-4">
        <div className="relative mx-auto max-w-xl">
          {/* Ghost preview disc floating above the hovered / selected column */}
          <div
            className="pointer-events-none absolute -top-7 left-0 grid w-full grid-cols-7 gap-[1.4%] px-[3%] sm:-top-9"
            aria-hidden
          >
            {Array.from({ length: COLS }, (_, c) => {
              const activeCol = selectedCol ?? hoveredCol;
              const show = activeCol === c && turn === "me" && !result && dropToken(board, c, "me");
              return (
                <div key={c} className="grid place-items-center">
                  {show && (
                    <div
                      className={`disc-3d ${turn === "me" ? "disc-red" : "disc-yellow"} aspect-square w-[70%] animate-bounce opacity-60`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="board-tilt board-rim board-plastic-blue relative aspect-[7/6] p-[2.5%] sm:p-[3%]"
            role="grid"
            aria-label="Connect Four board"
          >
            <div className="grid h-full w-full grid-cols-7 gap-[1.4%]">
              {board.map((v, i) => {
                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const isLast = lastIndex === i;
                const isWinning = winningCells.includes(i);
                const isHoveredCol = (selectedCol ?? hoveredCol) === col;
                return (
                  <div
                    key={i}
                    role="gridcell"
                    aria-label={v === "me" ? "Your token" : v === "them" ? "Rival token" : "Empty"}
                    className={`board-hole relative aspect-square overflow-hidden transition-colors duration-200 ${
                      isHoveredCol && !v
                        ? "outline outline-2 outline-offset-1 outline-primary/40"
                        : ""
                    }`}
                  >
                    {v && (
                      <div
                        className={`disc-3d absolute inset-[4%] ${v === "me" ? "disc-red" : "disc-yellow"} ${
                          isLast ? "disc-dropping" : ""
                        } ${isWinning ? "ring-4 ring-[var(--color-gold)] animate-pulse" : ""}`}
                        style={
                          isLast
                            ? ({ "--drop-distance": `${(row + 1) * 52}px` } as React.CSSProperties)
                            : undefined
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legs / feet so the frame stands like the real toy */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-6 flex justify-between px-[8%] sm:-bottom-8">
            <div className="board-rim board-plastic-blue h-6 w-10 rounded-md sm:h-8 sm:w-14" />
            <div className="board-rim board-plastic-blue h-6 w-10 rounded-md sm:h-8 sm:w-14" />
          </div>
          {/* Floor shadow */}
          <div
            className="pointer-events-none absolute inset-x-[6%] -bottom-7 h-4 rounded-[100%] bg-black/30 blur-md sm:-bottom-9 sm:h-5"
            aria-hidden
          />
        </div>
      </div>

      <div className="game-panel mt-5 flex flex-wrap items-center justify-center gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={pass}
          disabled={turn !== "me" || !!result}
        >
          <SkipForward className="size-4" /> Pass turn
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-gold/40 text-gold hover:bg-gold/10 hover:text-gold"
          onClick={offerDraw}
          disabled={turn !== "me" || !!result || drawOffered}
        >
          <Handshake className="size-4" /> {drawOffered ? "Draw offered" : "Offer draw"}
        </Button>
        <span className="game-feedback game-feedback-info">
          {filled}/{COLS * ROWS} tokens
        </span>
      </div>

      <AlertDialog open={confirmResign} onOpenChange={setConfirmResign}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resign this match?</AlertDialogTitle>
            <AlertDialogDescription>
              Your rival takes the win and the rating change applies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmResign(false);
                setResult({ outcome: "loss", reason: "resigned" });
              }}
            >
              Resign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EndGameSheet
        result={result}
        rating={
          result
            ? {
                delta: result.outcome === "win" ? 18 : result.outcome === "draw" ? 0 : -14,
                next: result.outcome === "win" ? 1658 : result.outcome === "draw" ? 1640 : 1626,
              }
            : undefined
        }
        onRematch={reset}
        onExit={() => void navigate({ to: "/arcade" })}
      />
    </div>
  );
}

function PlayerChip({ label, me, active }: { label: string; me?: boolean; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${
        active
          ? me
            ? "border-gold/60 bg-gold/15 text-gold-foreground shadow-md shadow-gold/20"
            : "border-destructive/60 bg-destructive/15 text-destructive-foreground shadow-md shadow-destructive/20"
          : "border-border text-muted-foreground"
      }`}
    >
      <span className={`disc-3d ${me ? "disc-red" : "disc-yellow"} size-6`} aria-hidden />
      {label}
      {active && (
        <span
          className={`size-1.5 animate-pulse rounded-full ${me ? "bg-gold" : "bg-destructive"}`}
          aria-hidden
        />
      )}
    </div>
  );
}
