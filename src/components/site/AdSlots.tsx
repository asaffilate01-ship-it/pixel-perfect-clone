import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEntitlements } from "@/lib/entitlements";

/**
 * Banner-only free tier. Fanzeno never shows interstitials, pop-ups or ads between moves;
 * these two slots (a horizontal discovery banner and a wide-screen side rail) are the only
 * placements, and both disappear for lifetime ad-free holders.
 */
export function TopAdBanner({ placement }: { placement: string }) {
  const { adFree, loading } = useEntitlements();
  if (adFree || loading) return null;
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
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-extrabold">Partner spotlight</span>
        <span className="block truncate text-[0.65rem] text-muted-foreground">
          Relevant sports offers · {placement}
        </span>
      </span>
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
  if (adFree || loading) return null;
  return (
    <aside
      aria-label="Sponsored advertisement"
      className="fixed right-3 top-36 z-20 hidden h-64 w-14 flex-col items-center justify-around rounded-2xl border border-gold/25 bg-surface/80 py-3 backdrop-blur xl:flex"
    >
      <span className="w-40 rotate-90 text-center text-[0.5rem] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Sponsored · {placement}
      </span>
      <span className="grid size-9 place-items-center rounded-xl bg-gold/15">
        <Megaphone className="size-4 text-gold" />
      </span>
      <Link to="/upgrade" className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-gold">
        Remove
      </Link>
    </aside>
  );
}
