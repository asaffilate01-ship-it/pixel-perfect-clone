import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Flag, Handshake, Shield, ShieldCheck, SkipForward, Timer } from "lucide-react";
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
import { COLS, ROWS, connectWinner, dropToken, type MatchResult, type Side } from "@/lib/matchEngine";
import { criterionIcon } from "@/lib/fanzeno";
import { CriterionGlyph } from "@/components/game/CriterionGlyph";

export const Route = createFileRoute("/arcade_/connect-four")({
  head: () => ({
    meta: [
      { title: "Connect Four — Fanzeno Arcade" },
      {
        name: "description",
        content: "Pick a column, answer its sports clue, drop your token. Connect four to win the match.",
      },
      { property: "og:title", content: "Connect Four — Fanzeno Arcade" },
      { property: "og:description", content: "Answer, drop and connect four. Tactical sports trivia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectFourPage,
});

const CLUES = [
  "Premier League",
  "Champions League",
  "World Cup",
  "Played in Spain",
  "International captain",
  "Major trophy",
  "100+ appearances",
];

const TURN_SECONDS = 30;

function ConnectFourPage() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<(Side | null)[]>(() => Array(COLS * ROWS).fill(null));
  const [turn, setTurn] = useState<Side>("me");
  const [passes, setPasses] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [seconds, setSeconds] = useState(TURN_SECONDS);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    if (botTimer.current) clearTimeout(botTimer.current);
    setBoard(Array(COLS * ROWS).fill(null));
    setTurn("me");
    setPasses(0);
    setResult(null);
    setDrawOffered(false);
    setSeconds(TURN_SECONDS);
    setLastIndex(null);
  };

  // Turn timer: running out forfeits the match (timeout end reason).
  useEffect(() => {
    if (result || turn !== "me") return;
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
  }, [turn, result]);

  useEffect(() => () => {
    if (botTimer.current) clearTimeout(botTimer.current);
  }, []);

  const botReply = (from: (Side | null)[]) => {
    setTurn("them");
    botTimer.current = setTimeout(() => {
      const options = Array.from({ length: COLS }, (_, c) => c).filter((c) => dropToken(from, c, "them"));
      if (!options.length) {
        setResult({ outcome: "draw", reason: "board_full" });
        return;
      }
      // Greedy bot: win if possible, block if needed, else random.
      const winning = options.find((c) => connectWinner(dropToken(from, c, "them")!.board) === "them");
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

  const play = (col: number) => {
    if (turn !== "me" || result) return;
    const move = dropToken(board, col, "me");
    if (!move) {
      toast("That column is full.");
      return;
    }
    setBoard(move.board);
    setLastIndex(move.index);
    setPasses(0);
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

  const pass = () => {
    if (turn !== "me" || result) return;
    const n = passes + 1;
    if (n >= 2) {
      setResult({ outcome: "draw", reason: "passes" });
      return;
    }
    setPasses(n);
    toast("You passed. Rival passes too and the match is drawn.");
    setTurn("them");
    botTimer.current = setTimeout(() => setTurn("me"), 500);
  };

  const offerDraw = () => {
    if (turn !== "me" || result || drawOffered) return;
    setDrawOffered(true);
    // The rival accepts when it is behind on material, otherwise declines.
    const mine = board.filter((v) => v === "me").length;
    const theirs = board.filter((v) => v === "them").length;
    botTimer.current = setTimeout(() => {
      if (theirs <= mine && Math.random() < 0.5) setResult({ outcome: "draw", reason: "agreed_draw" });
      else toast("Draw declined — play on.");
    }, 700);
  };

  const filled = board.filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/arcade">
            <ChevronLeft className="size-4" /> Arcade
          </Link>
        </Button>
        <div className="text-center">
          <p className="eyebrow">Tactical arena</p>
          <h1 className="mt-1 text-3xl">Connect Four</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirmResign(true)} disabled={!!result}>
          <Flag className="size-4" /> Resign
        </Button>
      </div>

      <div className="panel mt-6 flex items-center justify-between gap-3 px-5 py-4">
        <PlayerChip label="You" me active={turn === "me" && !result} />
        <div className="text-center">
          <p className="font-display text-xl text-muted-foreground">VS</p>
          <p
            className={`flex items-center justify-center gap-1 font-mono text-sm tabular-nums ${
              seconds <= 5 ? "text-destructive" : "text-foreground"
            }`}
            aria-live="polite"
          >
            <Timer className="size-3.5" /> 00:{String(seconds).padStart(2, "0")}
          </p>
        </div>
        <PlayerChip label="Rival" active={turn === "them" && !result} />
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {result
          ? "Match over."
          : turn === "me"
            ? "Choose a column, then answer its sports clue"
            : "Your rival is choosing…"}
      </p>

      <div className="mt-4 grid grid-cols-7 gap-1.5" role="group" aria-label="Column clues">
        {CLUES.map((clue, i) => (
          <button
            key={clue}
            type="button"
            onClick={() => play(i)}
            disabled={turn !== "me" || !!result}
            className="panel flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[0.6rem] font-bold uppercase leading-tight tracking-wide transition-colors hover:border-primary/60 disabled:opacity-60"
            aria-label={`Drop in column ${i + 1}: ${clue}`}
          >
            <CriterionGlyph icon={criterionIcon(clue)} className="size-3.5 text-primary" />
            <span className="line-clamp-2">{clue}</span>
          </button>
        ))}
      </div>

      <div
        className="mt-2 grid grid-cols-7 gap-1.5 rounded-2xl border border-border/70 bg-background/60 p-2"
        role="grid"
        aria-label="Connect Four board"
      >
        {board.map((v, i) => (
          <div
            key={i}
            role="gridcell"
            aria-label={v === "me" ? "Your token" : v === "them" ? "Rival token" : "Empty"}
            className={`grid aspect-square place-items-center rounded-full border transition-colors ${
              v === "me"
                ? "border-primary bg-primary text-primary-foreground"
                : v === "them"
                  ? "border-border bg-surface-strong text-foreground"
                  : "border-border/60 bg-surface/40"
            } ${lastIndex === i ? "ring-2 ring-gold/70" : ""}`}
          >
            {v === "me" && <ShieldCheck className="size-4" />}
            {v === "them" && <Shield className="size-4" />}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={pass} disabled={turn !== "me" || !!result}>
          <SkipForward className="size-4" /> Pass {passes > 0 && `(${passes}/2)`}
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
            <AlertDialogDescription>Your rival takes the win and the rating change applies.</AlertDialogDescription>
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
        active ? "border-primary bg-primary/12 text-foreground" : "border-border text-muted-foreground"
      }`}
    >
      <span
        className={`grid size-6 place-items-center rounded-full ${
          me ? "bg-primary text-primary-foreground" : "bg-surface-strong text-foreground"
        }`}
      >
        {me ? <ShieldCheck className="size-3.5" /> : <Shield className="size-3.5" />}
      </span>
      {label}
      {active && <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />}
    </div>
  );
}
