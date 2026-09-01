import { useEffect, useRef, useState } from "react";
import { Check, Lightbulb, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { nextFairQuestion, submitArcadeAnswer, type FairQuestion } from "@/lib/arcadeRooms.functions";
import { pickPrompt, type ClueBank } from "@/lib/arcadeQuiz";
import { AnswerComposer, type AnswerInput } from "@/components/game/AnswerComposer";

export type QuestionOutcome = { correct: boolean; usedClue: boolean; passed: boolean; answer?: string };

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
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ correct: boolean; answer: string } | null>(null);
  const started = useRef(Date.now());
  const loadedFor = useRef<string | number | null>(null);

  useEffect(() => {
    if (loadedFor.current === turnKey) return;
    loadedFor.current = turnKey;
    setClue(false);
    setReveal(null);
    setError(null);
    setQuestion(null);
    setFallback("");
    started.current = Date.now();
    let cancelled = false;
    (async () => {
      if (user && sportId && canAnswer) {
        try {
          const { question: q } = await nextFairQuestion({
            data: { sportId, category: categoryKey ?? null, difficulty, roomId: roomId ?? null },
          });
          if (!cancelled) setQuestion(q);
          return;
        } catch {
          /* fall through to the local prompt */
        }
      }
      if (!cancelled) setFallback(pickPrompt(bank ?? {}, sportId));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey, user, sportId, canAnswer]);

  const resolveServer = async (input: AnswerInput | null) => {
    if (!question) return;
    setBusy(true);
    setError(null);
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
      setTimeout(() => onResolved({ correct: res.correct, usedClue: clue, passed: !input, answer: res.answer }), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Answer rejected");
    } finally {
      setBusy(false);
    }
  };

  const prompt = question?.prompt ?? fallback;
  const loading = !prompt;

  return (
    <div className="panel mt-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[0.62rem] font-black uppercase tracking-[0.16em] ${clue ? "text-gold" : accentClass}`}>
          {rewardLabel(clue)}
        </p>
        {question && (
          <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck className="size-3 text-primary" /> Verified · server-checked
          </span>
        )}
      </div>
      <p className={`mt-2 font-display text-2xl leading-tight ${loading ? "animate-pulse text-muted-foreground" : ""}`}>
        {loading ? "Picking a fair question…" : prompt}
      </p>
      {clue && (
        <p className="mt-2 flex items-center gap-2 text-xs text-gold">
          <Lightbulb className="size-3.5" />
          {question?.clue ?? "Hint: think of a player active in the last two decades."}
        </p>
      )}

      {reveal ? (
        <div
          className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${
            reveal.correct ? "border-primary/60 bg-primary/10" : "border-destructive/60 bg-destructive/10"
          }`}
        >
          {reveal.correct ? <Check className="size-5 text-primary" /> : <X className="size-5 text-destructive" />}
          <div>
            <p className="text-sm font-bold">{reveal.correct ? "Correct!" : "Not this time"}</p>
            <p className="text-xs text-muted-foreground">Answer: {reveal.answer}</p>
          </div>
        </div>
      ) : !canAnswer ? (
        <p className="mt-4 text-xs text-muted-foreground">Waiting for the active player to answer…</p>
      ) : question ? (
        <>
          {!clue && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setClue(true)} disabled={busy}>
              <Lightbulb className="size-4" /> Get clue
            </Button>
          )}
          <AnswerComposer disabled={loading} busy={busy} onSubmit={(a) => void resolveServer(a)} onPass={() => void resolveServer(null)} />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
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
            <Button variant="destructive" disabled={loading} onClick={() => onResolved({ correct: false, usedClue: clue, passed: false })}>
              <X className="size-4" /> Wrong
            </Button>
            <Button className="flex-1" disabled={loading} onClick={() => onResolved({ correct: true, usedClue: clue, passed: false })}>
              <Check className="size-4" /> Correct
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
