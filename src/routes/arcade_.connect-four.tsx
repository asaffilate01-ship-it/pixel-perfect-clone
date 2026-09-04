import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Flag,
  Handshake,
  Shield,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Trophy,
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
          <p className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-primary">Tactical arena</p>
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

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Sparkles className="size-4 text-gold" />
        {result
          ? "Match over."
          : turn === "me"
            ? selectedCol === null
              ? "Tap an open column to reveal your question"
              : `Column ${selectedCol + 1} selected — answer to drop your token`
            : "Your rival is choosing…"}
      </p>

      <div className="game-card mt-4 p-3 sm:p-4">
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
              disabled={
                sportsLoading ||
                !sportId ||
                turn !== "me" ||
                !!result ||
                selectedCol !== null ||
                !dropToken(board, i, "me")
              }
              className={`game-tile min-h-12 text-[0.55rem] ${
                selectedCol === i
                  ? "game-tile-reward"
                  : "border-primary/20 text-primary hover:border-primary/50 hover:bg-primary/10"
              }`}
              aria-label={`Choose column ${i + 1}`}
              aria-pressed={selectedCol === i}
            >
              <ChevronDown className="size-4 text-primary" aria-hidden />
              <span>Drop {i + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedCol !== null && turn === "me" && !result && (
        <QuestionCard
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

      <div
        className="game-card mt-2 grid grid-cols-7 gap-1.5 bg-gradient-to-b from-surface to-background p-2.5 sm:gap-2 sm:p-3"
        role="grid"
        aria-label="Connect Four board"
      >
        {board.map((v, i) => (
          <div
            key={i}
            role="gridcell"
            aria-label={v === "me" ? "Your token" : v === "them" ? "Rival token" : "Empty"}
            className={`grid aspect-square place-items-center rounded-full border transition-all duration-300 ${
              v === "me"
                ? "game-tile-reward"
                : v === "them"
                  ? "border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25"
                  : "border-border bg-background shadow-inner"
            } ${lastIndex === i ? "scale-105 ring-2 ring-primary/80 ring-offset-2 ring-offset-background" : ""}`}
          >
            {v === "me" && <Trophy className="size-3.5 sm:size-5" />}
            {v === "them" && <Shield className="size-3.5 sm:size-5" />}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={pass} disabled={turn !== "me" || !!result}>
          <SkipForward className="size-4" /> Pass turn
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={offerDraw}
          disabled={turn !== "me" || !!result || drawOffered}
        >
          <Handshake className="size-4" /> {drawOffered ? "Draw offered" : "Offer draw"}
        </Button>
        <span className="text-xs text-muted-foreground">
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
      <span
        className={`grid size-6 place-items-center rounded-full ${
          me
            ? "bg-gradient-to-br from-yellow-200 to-orange-500 text-amber-950"
            : "bg-gradient-to-br from-rose-400 to-red-600 text-white"
        }`}
      >
        {me ? <ShieldCheck className="size-3.5" /> : <Shield className="size-3.5" />}
      </span>
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
