import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Entitlements = {
  /** True when the signed-in user holds an active lifetime ad-free pass. */
  adFree: boolean;
  loading: boolean;
};

const Context = createContext<Entitlements>({ adFree: false, loading: true });

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [adFree, setAdFree] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAdFree(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("entitlements")
      .select("key, active")
      .eq("user_id", user.id)
      .eq("key", "ad_free_lifetime")
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setAdFree(!!data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const value = useMemo(() => ({ adFree, loading }), [adFree, loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useEntitlements = () => useContext(Context);
