import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Flame, Leaf, Sparkles, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarPicker, type AvatarId } from "@/components/game/AvatarPicker";
import { MultiSportPicker } from "@/components/game/MultiSportPicker";
import { fetchSports } from "@/lib/fanzeno";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/lib/entitlements";
import { useQuizPrefs } from "@/lib/quizPrefs";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your arena — Fanzeno" },
      { name: "description", content: "Pick your name, avatar, sports and difficulty. Four quick steps and your first challenge is tuned to you." },
      { property: "og:title", content: "Set up your arena — Fanzeno" },
      { property: "og:description", content: "Four quick steps to a challenge tuned to you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const LEVELS = [
  { id: "beginner", name: "Beginner", icon: Leaf, copy: "More familiar names and extra time" },
  { id: "regular", name: "Regular", icon: Trophy, copy: "A balanced competitive challenge" },
  { id: "expert", name: "Expert", icon: Flame, copy: "Obscure history and tighter clocks" },
  { id: "adaptive", name: "Adaptive", icon: Sparkles, copy: "Difficulty learns from your answers" },
] as const;
type Level = (typeof LEVELS)[number]["id"];

function Onboarding() {
  const navigate = useNavigate();
  const { user, displayName, refresh } = useAuth();
  const { pro } = useEntitlements();
  const { prefs, setPrefs } = useQuizPrefs();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>("captain");
  const [picked, setPicked] = useState<string[]>(["football", "cricket"]);
  const [level, setLevel] = useState<Level>("adaptive");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_preset, preferred_sports, difficulty_preference")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName(data.display_name ?? displayName ?? "");
        if (data.avatar_preset) setAvatar(data.avatar_preset);
        if (data.preferred_sports?.length) setPicked(data.preferred_sports);
        if (data.difficulty_preference) setLevel(data.difficulty_preference as Level);
      });
  }, [user, displayName]);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || displayName,
        avatar_preset: avatar,
        avatar_settings: { preset: avatar, frame: "standard" },
        preferred_sports: picked,
        difficulty_preference: level,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (picked[0] && picked[0] !== prefs.sport) {
      void setPrefs({ ...prefs, sport: picked[0], competitionId: null, competitionName: null });
    }
    await refresh?.();
    toast.success("You're set. Every sport. Your arena.");
    void navigate({ to: "/play/$sport", params: { sport: picked[0] ?? "football" } });
  };

  const canNext = step === 0 ? name.trim().length >= 2 : step === 2 ? picked.length > 0 : true;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="grid grid-cols-4 gap-1.5" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((x) => (
          <span key={x} className={`h-1.5 rounded-full ${x <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      {step === 0 && (
        <section className="panel stadium-line mt-6 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <Avatar id={avatar} size={84} />
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-primary-foreground">
              <Zap className="size-3" /> Ready
            </span>
          </div>
          <p className="eyebrow mt-6">Welcome to Fanzeno</p>
          <h1 className="mt-2 text-5xl">
            Every sport.
            <br />
            <span className="text-primary">Your arena.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Build your player identity, choose what you know and start with a challenge tuned to you.
          </p>
          <label className="mt-6 block text-[0.62rem] font-black uppercase tracking-[0.18em] text-muted-foreground">Player name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Your display name"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background/60 px-4 text-lg outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </section>
      )}

      {step === 1 && (
        <section className="panel mt-6 p-6 sm:p-8">
          <p className="eyebrow">Step 2</p>
          <h1 className="mt-2 text-4xl">Choose your avatar</h1>
          <p className="mt-2 text-sm text-muted-foreground">Twelve original characters. Four are reserved for verified Pro players.</p>
          <div className="mt-5 flex items-center gap-4">
            <Avatar id={avatar} size={72} />
            <AvatarPicker value={avatar} pro={pro} onChange={(id: AvatarId) => setAvatar(id)} label="Your avatar" />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="panel mt-6 p-6 sm:p-8">
          <p className="eyebrow">Step 3</p>
          <h1 className="mt-2 text-4xl">What do you follow?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick up to six. Your first grid, clue ladder and arcade prompts come from these.</p>
          <div className="mt-5">
            <MultiSportPicker sports={sports ?? []} value={picked} onChange={setPicked} />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="panel mt-6 p-6 sm:p-8">
          <p className="eyebrow">Step 4</p>
          <h1 className="mt-2 text-4xl">Make every question fair.</h1>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {LEVELS.map((l) => {
              const Icon = l.icon;
              const on = level === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setLevel(l.id)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${on ? "border-primary bg-primary/12" : "border-border bg-surface/60 hover:border-primary/50"}`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12">
                    <Icon className="size-4 text-primary" />
                  </span>
                  <span>
                    <span className="block font-display text-xl">{l.name}</span>
                    <span className="block text-xs text-muted-foreground">{l.copy}</span>
                  </span>
                  {on && <Check className="ml-auto size-4 text-primary" />}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Adaptive is recommended and continuously calibrates question difficulty from your verified answers.
          </p>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
        {step < 3 ? (
          <Button size="lg" className="font-bold uppercase tracking-[0.14em]" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button size="lg" className="font-bold uppercase tracking-[0.14em]" disabled={busy} onClick={() => void finish()}>
            {busy ? "Saving…" : "Enter the arena"} <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
