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
    // Server-verified: only entitlements backed by a verified purchase (or an explicit staff grant) count.
    setLoading(true);
    supabase
      .rpc("my_entitlement_status")
      .then(({ data, error }) => {
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        // Fail closed on an unavailable/invalid entitlement response.
        setAdFree(!error && Boolean(row?.ad_free));
        setPro(!error && Boolean(row?.pro_active));
      })
      .catch(() => {
        if (cancelled) return;
        setAdFree(false);
        setPro(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const value = useMemo(() => ({ adFree, pro, loading }), [adFree, pro, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useEntitlements = () => useContext(Context);
