import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isStaff: boolean;
  displayName: string | null;
  /** null until the profile has loaded; false means the four-step setup has not been completed. */
  onboarded: boolean | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  isStaff: false,
  displayName: null,
  onboarded: null,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      setLoading(false);
      if (!next?.user) {
        setIsStaff(false);
        setDisplayName(null);
        setOnboarded(null);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", next.user.id);
      if (cancelled) return;
      setIsStaff(
        (roles ?? []).some((r) =>
          ["moderator", "content_editor", "admin", "owner"].includes(r.role),
        ),
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, onboarded_at")
        .eq("id", next.user.id)
        .maybeSingle();
      if (cancelled) return;

      const fallback =
        (next.user.user_metadata?.["display_name"] as string | undefined) ??
        next.user.email?.split("@")[0] ??
        "Fan";

      if (!profile) {
        await supabase.from("profiles").insert({ id: next.user.id, display_name: fallback });
        setDisplayName(fallback);
        setOnboarded(false);
      } else {
        setDisplayName(profile.display_name ?? fallback);
        setOnboarded(Boolean(profile.onboarded_at));
      }
    };

    supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void hydrate(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [tick]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isStaff,
      displayName,
      onboarded,
      refresh: async () => setTick((t) => t + 1),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, isStaff, displayName, onboarded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
