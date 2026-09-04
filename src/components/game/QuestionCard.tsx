import { useEffect, useRef, useState } from "react";
import { Check, Lightbulb, LoaderCircle, RefreshCw, ShieldCheck, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  nextFairQuestion,
  submitArcadeAnswer,
  type FairQuestion,
} from "@/lib/arcadeRooms.functions";
import { pickPrompt, type ClueBank } from "@/lib/arcadeQuiz";
import { AnswerComposer, type AnswerInput } from "@/components/game/AnswerComposer";

export type QuestionOutcome = {
  correct: boolean;
  usedClue: boolean;
  passed: boolean;
  answer?: string;
};

/**
 * One turn's question. Signed-in players get a server-reserved fair question from the verified bank
 * and the server checks their answer; guests (or an empty scope) fall back to a criterion prompt
 * that the table marks itself.
 */
export function QuestionCard({
  turnKey,
  sportId,
  categoryKey,
  difficulty,
  roomId,
  canAnswer = true,
  bank,
  accentClass,
  onResolved,
  rewardLabel = (clue) => (clue ? "Second chance · move 5" : "First attempt · move 6"),
}: {
  turnKey: string | number;
  sportId: string | null;
  categoryKey?: string | null | undefined;
  difficulty: number;
  roomId?: string | null | undefined;
  canAnswer?: boolean;
  bank: ClueBank | undefined;
  accentClass: string;
  onResolved: (o: QuestionOutcome) => void;
  rewardLabel?: (clue: boolean) => string;
}) {
  const { user } = useAuth();
  const [question, setQuestion] = useState<FairQuestion | null>(null);
  const [fallback, setFallback] = useState<string>("");
  const [clue, setClue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [reveal, setReveal] = useState<{ correct: boolean; answer: string } | null>(null);
  const started = useRef(Date.now());
  const loadedFor = useRef<string | null>(null);

  const loadKey = [
    turnKey,
    user?.id ?? "guest",
    sportId ?? "all-sports",
    categoryKey ?? "all-categories",
    difficulty,
    roomId ?? "solo",
    canAnswer ? "active" : "waiting",
    reload,
  ].join(":");

  useEffect(() => {
    if (loadedFor.current === loadKey) return;
    loadedFor.current = loadKey;
    setClue(false);
    setReveal(null);
    setLoadError(null);
    setSubmitError(null);
    setQuestion(null);
    setFallback("");
    setLoading(true);
    started.current = Date.now();
    let cancelled = false;
    (async () => {
      if (user && sportId && canAnswer) {
        try {
          const request = nextFairQuestion({
            data: { sportId, category: categoryKey ?? null, difficulty, roomId: roomId ?? null },
          });
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Question request timed out")), 8_000),
          );
          const { question: q } = await Promise.race([request, timeout]);
          if (!cancelled) {
            setQuestion(q);
            setLoading(false);
          }
          return;
        } catch (e) {
          if (!cancelled) {
            setLoadError(
              e instanceof Error
                ? `${e.message}. A local question has been loaded instead.`
                : "Verified question unavailable. A local question has been loaded instead.",
            );
          }
        }
      }
      if (!cancelled) {
        setFallback(pickPrompt(bank ?? {}, sportId));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey, bank, canAnswer, categoryKey, difficulty, roomId, sportId, user]);

  const resolveServer = async (input: AnswerInput | null) => {
    if (!question) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await submitArcadeAnswer({
        data: {
          questionId: question.id,
          roomId: roomId ?? null,
          answer: input?.text ?? "",
          passed: !input,
          usedClue: clue,
          difficulty,
          responseMs: Date.now() - started.current,
          inputMethod: input?.method ?? "typed",
          transcriptConfidence: input?.confidence ?? null,
        },
      });
      setReveal({ correct: res.correct, answer: res.answer });
      setTimeout(
        () =>
          onResolved({ correct: res.correct, usedClue: clue, passed: !input, answer: res.answer }),
        1400,
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Answer rejected");
    } finally {
      setBusy(false);
    }
  };

  const prompt = question?.prompt ?? fallback;
  const borderAccent = accentClass.replace("text-", "border-");
  return (
    <div className={`game-card relative mt-4 overflow-hidden border-t-4 ${borderAccent} p-5`}>
      <div className="pointer-events-none absolute -right-12 -top-16 size-36 rounded-full bg-gradient-to-br from-primary/10 to-gold/10 blur-3xl" />
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-[0.62rem] font-black uppercase tracking-[0.16em] ${clue ? "text-gold" : accentClass}`}
        >
          {rewardLabel(clue)}
        </p>
        {question && (
          <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck className="size-3 text-primary" /> Verified · server-checked
          </span>
        )}
      </div>
      <p
        className={`relative mt-2 font-display text-2xl leading-tight ${loading ? "text-muted-foreground" : ""}`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-5 animate-spin text-cyan-300" /> Picking a fair question…
          </span>
        ) : (
          prompt
        )}
      </p>
      {loadError && !loading && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-100">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{loadError}</span>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-bold text-amber-200 active:scale-95"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      )}
      {clue && (
        <p className="mt-2 flex items-center gap-2 text-xs text-gold">
          <Lightbulb className="size-3.5" />
          {question?.clue ?? "Hint: think of a player active in the last two decades."}
        </p>
      )}

      {reveal ? (
        <div
          className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${
            reveal.correct
              ? "border-primary/60 bg-primary/10"
              : "border-destructive/60 bg-destructive/10"
          }`}
        >
          {reveal.correct ? (
            <Check className="size-5 text-primary" />
          ) : (
            <X className="size-5 text-destructive" />
          )}
          <div>
            <p className="text-sm font-bold">{reveal.correct ? "Correct!" : "Not this time"}</p>
            <p className="text-xs text-muted-foreground">Answer: {reveal.answer}</p>
          </div>
        </div>
      ) : !canAnswer ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Waiting for the active player to answer…
        </p>
      ) : question ? (
        <>
          {!clue && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setClue(true)}
              disabled={busy}
            >
              <Lightbulb className="size-4" /> Get clue
            </Button>
          )}
          <AnswerComposer
            disabled={loading}
            busy={busy}
            onSubmit={(a) => void resolveServer(a)}
            onPass={() => void resolveServer(null)}
          />
          {submitError && <p className="mt-2 text-xs text-destructive">{submitError}</p>}
        </>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {user
              ? "No verified bank question for this scope yet — the table decides this one."
              : "Sign in for server-checked questions. For now, say your answer out loud — the table decides."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!clue && (
              <Button variant="outline" onClick={() => setClue(true)} disabled={loading}>
                <Lightbulb className="size-4" /> Get clue
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => onResolved({ correct: false, usedClue: clue, passed: false })}
            >
              <X className="size-4" /> Wrong
            </Button>
            <Button
              className="flex-1"
              disabled={loading}
              onClick={() => onResolved({ correct: true, usedClue: clue, passed: false })}
            >
              <Check className="size-4" /> Correct
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
