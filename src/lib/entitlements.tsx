import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Entitlements = {
  /** True when the signed-in user holds an active lifetime pass (no banners or side rail). */
  adFree: boolean;
  /** Fanzeno Pro — unlocks Pro arcade modes (Quiz Ludo, Sports Mastermind, Territory, …). */
  pro: boolean;
  loading: boolean;
};

const Context = createContext<Entitlements>({ adFree: false, pro: false, loading: true });

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [adFree, setAdFree] = useState(false);
  const [pro, setPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAdFree(false);
      setPro(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("entitlements")
      .select("key, active, tier, revoked_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .is("revoked_at", null)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = data ?? [];
        const lifetime = rows.some((r) => r.key === "ad_free_lifetime");
        setAdFree(lifetime);
        setPro(lifetime || rows.some((r) => r.tier === "pro"));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const value = useMemo(() => ({ adFree, pro, loading }), [adFree, pro, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useEntitlements = () => useContext(Context);
