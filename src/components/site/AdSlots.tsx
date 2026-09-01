import { useEffect } from "react";
import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEntitlements } from "@/lib/entitlements";
import { useAuth } from "@/hooks/useAuth";
import { recordAdEvent } from "@/lib/fanzeno";

const AD_UNITS = {
  banner: "fanzeno-web-banner-top",
  rail: "fanzeno-web-rail-side",
} as const;

/** Logs one impression per mount and returns a click handler for the unit. */
function useAdTracking(placement: string, unit: keyof typeof AD_UNITS, active: boolean) {
  const { user } = useAuth();
  const adUnitId = AD_UNITS[unit];
  useEffect(() => {
    if (!active) return;
    void recordAdEvent({ placement, adUnitId, eventType: "impression", profileId: user?.id });
    // Impression is per placement mount, not per auth change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, placement, adUnitId]);
  return () => void recordAdEvent({ placement, adUnitId, eventType: "click", profileId: user?.id });
}

/**
 * Banner-only free tier. Fanzeno never shows interstitials, pop-ups or ads between moves;
 * these two slots (a horizontal discovery banner and a wide-screen side rail) are the only
 * placements, and both disappear for lifetime ad-free holders.
 */
export function TopAdBanner({ placement }: { placement: string }) {
  const { adFree, loading } = useEntitlements();
  const show = !adFree && !loading;
  const onClick = useAdTracking(placement, "banner", show);
  if (!show) return null;
  return (
    <aside
      aria-label="Sponsored advertisement"
      className="relative mt-4 flex h-[58px] items-center gap-3 overflow-hidden rounded-2xl border border-gold/25 bg-surface/70 px-3"
    >
      <span className="absolute right-2 top-1 text-[0.5rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Sponsored
      </span>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/15">
        <Megaphone className="size-4 text-gold" />
      </span>
      <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-xs font-extrabold">Partner spotlight</span>
        <span className="block truncate text-[0.65rem] text-muted-foreground">
          Relevant sports offers · {placement}
        </span>
      </button>
      <Link
        to="/upgrade"
        className="pr-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-gold hover:underline"
      >
        Go ad-free
      </Link>
    </aside>
  );
}

export function SideAdRail({ placement }: { placement: string }) {
  const { adFree, loading } = useEntitlements();
  const show = !adFree && !loading;
  const onClick = useAdTracking(placement, "rail", show);
  if (!show) return null;
  return (
    <aside
      aria-label="Sponsored advertisement"
      className="fixed right-3 top-36 z-20 hidden h-64 w-14 flex-col items-center justify-around rounded-2xl border border-gold/25 bg-surface/80 py-3 backdrop-blur xl:flex"
    >
      <span className="w-40 rotate-90 text-center text-[0.5rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Sponsored · {placement}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label="Open sponsored offer"
        className="grid size-9 place-items-center rounded-xl bg-gold/15"
      >
        <Megaphone className="size-4 text-gold" />
      </button>
      <Link to="/upgrade" className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-gold">
        Remove
      </Link>
    </aside>
  );
}
