import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Era buckets shared by every quiz mode (mirrors the v0.4 mobile filter). */
export const ERAS = [
  { id: "all", label: "All time", start: null, end: null },
  { id: "current", label: "Current season", start: 2026, end: null },
  { id: "2020", label: "2020s", start: 2020, end: 2029 },
  { id: "2010", label: "2010s", start: 2010, end: 2019 },
  { id: "2000", label: "2000s", start: 2000, end: 2009 },
  { id: "classic", label: "Before 2000", start: null, end: 1999 },
] as const;

export type EraId = (typeof ERAS)[number]["id"];

/** Question focus buckets (v0.10). */
export const QUESTION_FOCUS = [
  "Mixed",
  "Players & careers",
  "Teams & titles",
  "Stats & records",
  "Awards & honours",
  "Venues & events",
  "Images & badges",
] as const;
export type QuestionFocus = (typeof QUESTION_FOCUS)[number];

export type ScopePick = { id: string; name: string } | null;

export type QuizPrefs = {
  sport: string;
  /** null = whole sport. Otherwise a competitions.id */
  competitionId: string | null;
  competitionName: string | null;
  era: EraId;
  /** Optional drill-down to a team-like or person-like scope entity (v0.10). */
  team?: ScopePick;
  person?: ScopePick;
  focus?: QuestionFocus;
};

export const DEFAULT_PREFS: QuizPrefs = {
  sport: "football",
  competitionId: null,
  competitionName: null,
  era: "all",
  team: null,
  person: null,
  focus: "Mixed",
};

const STORAGE_KEY = "fz.quizPrefs";

function readLocal(): QuizPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<QuizPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

type Ctx = {
  prefs: QuizPrefs;
  hydrated: boolean;
  setPrefs: (next: QuizPrefs) => Promise<void>;
};

const QuizPrefsContext = createContext<Ctx | null>(null);

export function QuizPrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [prefs, setLocal] = useState<QuizPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  // Local storage first (guests + instant paint), then the profile wins when signed in.
  useEffect(() => {
    setLocal(readLocal());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("quiz_preferences")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.quiz_preferences) return;
        const p = data.quiz_preferences as Partial<QuizPrefs> & { scope?: string };
        if (!p.sport && !p.competitionId && (!p.era || p.era === "all")) return; // untouched default
        const next = { ...DEFAULT_PREFS, ...p };
        setLocal(next);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setPrefs = useCallback(
    async (next: QuizPrefs) => {
      setLocal(next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (user) {
        await supabase
          .from("profiles")
          .update({
            quiz_preferences: {
              scope: next.competitionId ? "competition" : "all",
              ...next,
            },
          })
          .eq("id", user.id);
      }
    },
    [user],
  );

  const value = useMemo(() => ({ prefs, hydrated, setPrefs }), [prefs, hydrated, setPrefs]);
  return <QuizPrefsContext.Provider value={value}>{children}</QuizPrefsContext.Provider>;
}

export function useQuizPrefs() {
  const ctx = useContext(QuizPrefsContext);
  if (!ctx) throw new Error("useQuizPrefs must be used inside QuizPrefsProvider");
  return ctx;
}

/** Short human label for the active scope, e.g. "EPL · 2010s". */
export function scopeLabel(prefs: QuizPrefs, sportName?: string) {
  const parts = [prefs.competitionName ?? (sportName ? `All ${sportName}` : "All")];
  const era = ERAS.find((e) => e.id === prefs.era);
  if (era && era.id !== "all") parts.push(era.label);
  return parts.join(" · ");
}
