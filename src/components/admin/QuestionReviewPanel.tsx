import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpenCheck, Check, ExternalLink, Flag, Gem, ShieldCheck, Undo2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "pending" | "verified";

async function fetchQuestions(status: Status) {
  const { data, error } = await supabase
    .from("question_bank")
    .select(
      "id, prompt_i18n, clue_i18n, answer_display_i18n, answer_rule, category_key, format_key, difficulty_percentile, source_url, source_title, reviewed_at, verification_status, sports!inner(name)",
    )
    .eq("verification_status", status)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  return data ?? [];
}

function en(v: unknown) {
  return (v as { en?: string } | null)?.en ?? "";
}

type AnswerChallenge = {
  id: string;
  question_id: string;
  submitted_answer: string;
  canonical_answer: string;
  prompt: string;
  sport: string;
  category_key: string | null;
  occurrence_count: number;
  created_at: string;
};

const rpc = supabase.rpc as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function fetchAnswerChallenges(): Promise<AnswerChallenge[]> {
  const { data, error } = await rpc("list_answer_challenges", { p_limit: 100 });
  if (error) throw error;
  return (data ?? []) as AnswerChallenge[];
}

/** Provenance-gated question review: publish only when a source URL and accepted answers exist (v0.20). */
export function QuestionReviewPanel() {
  const [status, setStatus] = useState<Status>("pending");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-questions", status],
    queryFn: () => fetchQuestions(status),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const { data: challenges, refetch: refetchChallenges } = useQuery({
    queryKey: ["answer-challenges"],
    queryFn: fetchAnswerChallenges,
  });

  const act = async (id: string, fn: "publish_question" | "unpublish_question") => {
    setBusy(id);
    const { error } = await supabase.rpc(fn, { p_question_id: id });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success(
        fn === "publish_question" ? "Published to the fair selector" : "Returned to pending",
      );
      void refetch();
    }
  };

  const grant = async () => {
    const term = grantEmail.trim();
    if (!term) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", term)
      .maybeSingle();
    if (!profile) {
      toast.error("No player with that display name");
      return;
    }
    const { error } = await supabase.rpc("grant_pro_lifetime", {
      p_user_id: profile.id,
      p_reason: "ops console grant",
    });
    if (error) toast.error(error.message);
    else toast.success(`Lifetime Pro granted to ${profile.display_name}`);
  };

  const resolveChallenge = async (id: string, accept: boolean) => {
    setBusy(id);
    const { error } = await rpc("resolve_answer_challenge", {
      p_challenge_id: id,
      p_accept: accept,
      p_note: accept ? "Approved in ops console" : "Rejected in ops console",
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success(accept ? "Answer added to the accepted set" : "Challenge rejected");
      void refetchChallenges();
      if (accept) void refetch();
    }
  };

  return (
    <>
      <div className="panel mt-5 divide-y divide-border/70">
        <div className="flex items-center gap-2 px-5 py-3.5">
          <Flag className="size-4 text-gold" />
          <span className="font-display text-xl">Answer challenges</span>
          <span className="ml-auto rounded-full bg-gold/10 px-2 py-1 text-xs font-bold text-gold">
            {(challenges ?? []).length} pending
          </span>
        </div>
        {(challenges ?? []).length === 0 && (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            No challenged answers awaiting review.
          </p>
        )}
        {(challenges ?? []).map((challenge) => (
          <div key={challenge.id} className="px-5 py-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {challenge.sport} · {challenge.category_key ?? "general"} · reported{" "}
              {challenge.occurrence_count}×
            </p>
            <p className="mt-1 text-sm font-semibold">{challenge.prompt}</p>
            <div className="mt-2 grid gap-2 rounded-xl border border-border/70 bg-background/40 p-3 text-xs sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Player submitted:</span>{" "}
                <strong>{challenge.submitted_answer}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Current answer:</span>{" "}
                <strong>{challenge.canonical_answer}</strong>
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={busy === challenge.id}
                onClick={() => void resolveChallenge(challenge.id, true)}
              >
                <Check className="size-4" /> Accept answer
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === challenge.id}
                onClick={() => void resolveChallenge(challenge.id, false)}
              >
                <X className="size-4" /> Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel mt-5 divide-y divide-border/70">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
          <BookOpenCheck className="size-4 text-primary" />
          <span className="font-display text-xl">Question bank review</span>
          <div className="ml-auto flex gap-1">
            {(["pending", "verified"] as Status[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => setStatus(s)}
              >
                {s === "pending" ? "Pending" : "Published"}
              </Button>
            ))}
          </div>
        </div>
        {isLoading && <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="px-5 py-4 text-sm text-muted-foreground">Nothing {status} right now.</p>
        )}
        {(data ?? []).map((q) => {
          const accepted = ((q.answer_rule as { accepted?: string[] } | null)?.accepted ??
            []) as string[];
          const ready = Boolean(q.source_url) && accepted.length > 0;
          return (
            <div key={q.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    {(q.sports as { name: string } | null)?.name} · {q.category_key} ·{" "}
                    {q.format_key} · p{Math.round((q.difficulty_percentile ?? 0) * 100)}
                  </p>
                  <p className="mt-1 font-semibold">{en(q.prompt_i18n)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Answer: <span className="text-foreground">{en(q.answer_display_i18n)}</span>
                    {accepted.length > 1 && (
                      <>
                        {" "}
                        · also {accepted.filter((a) => a !== en(q.answer_display_i18n)).join(", ")}
                      </>
                    )}
                  </p>
                  {en(q.clue_i18n) && (
                    <p className="text-xs text-muted-foreground">Clue: {en(q.clue_i18n)}</p>
                  )}
                  {q.source_url ? (
                    <a
                      href={q.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" /> {q.source_title ?? q.source_url}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-destructive">No source URL — cannot publish</p>
                  )}
                </div>
                {status === "pending" ? (
                  <Button
                    size="sm"
                    disabled={!ready || busy === q.id}
                    onClick={() => void act(q.id, "publish_question")}
                  >
                    <ShieldCheck className="size-4" /> Publish
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === q.id}
                    onClick={() => void act(q.id, "unpublish_question")}
                  >
                    <Undo2 className="size-4" /> Unpublish
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel mt-5 p-5">
        <div className="flex items-center gap-2">
          <Gem className="size-4 text-gold" />
          <span className="font-display text-xl">Grant lifetime Pro</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pro is server-verified: a flag only counts when backed by a verified purchase or a
          recorded staff grant. Use this for testers and support cases until checkout ships.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="Player display name"
            aria-label="Player display name"
          />
          <Button onClick={() => void grant()} disabled={!grantEmail.trim()}>
            Grant
          </Button>
        </div>
      </div>
    </>
  );
}
