import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Entitlements = {
  /** True when the signed-in user holds an active lifetime pass (no banners or side rail). */
  adFree: boolean;
  /** Fanzeno Pro — unlocks Pro arcade modes (Quiz Ludo, Sports Mastermind, Territory, …). */
  pro: boolean;
  loading: boolean;
  /** True when the server could not confirm the signed-in membership. */
  verificationError: boolean;
  retry: () => void;
};

const Context = createContext<Entitlements>({ adFree: false, pro: false, loading: true, verificationError: false, retry: () => undefined });

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [adFree, setAdFree] = useState(false);
  const [pro, setPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verificationError, setVerificationError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAdFree(false);
      setPro(false);
      setVerificationError(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Server-verified: only entitlements backed by a verified purchase (or an explicit staff grant) count.
    setLoading(true);
    setVerificationError(false);
    Promise.resolve(supabase.rpc("my_entitlement_status"))
      .then(({ data, error }) => {
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        // Keep gated actions locked and mark failed verification as distinct from a free account.
        const verified = !error && Boolean(row) && typeof row === "object";
        setVerificationError(!verified);
        setAdFree(verified && Boolean(row?.ad_free));
        setPro(verified && Boolean(row?.pro_active));
      })
      .catch(() => {
        if (cancelled) return;
        setAdFree(false);
        setPro(false);
        setVerificationError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadToken]);

  const value = useMemo(() => ({ adFree, pro, loading, verificationError, retry }), [adFree, pro, loading, verificationError, retry]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useEntitlements = () => useContext(Context);
