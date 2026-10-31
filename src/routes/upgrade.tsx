import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/lib/entitlements";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Fanzeno Pro — lifetime unlock" },
      {
        name: "description",
        content:
          "Explore Fanzeno Pro game modes and lifetime ad-free benefits. Checkout is currently unavailable for new purchases.",
      },
      { property: "og:title", content: "Fanzeno Pro — lifetime unlock" },
      {
        property: "og:description",
        content: "Existing Pro members can access premium games. New lifetime purchases are coming soon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Upgrade,
});

const perks = [
  "Quiz Ludo and Sports Mastermind",
  "Selected premium tactical game modes",
  "Lifetime entitlement for existing Pro members",
  "No Fanzeno discovery banners or side rails while Pro is active",
  "Use your Pro access after signing in on another device",
];

function Upgrade() {
  const { pro } = useEntitlements();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14">
      <p className="eyebrow">Lifetime Pro</p>
      <h1 className="mt-3 text-5xl">
        {pro ? "You’re Fanzeno Pro." : "More ways to play."}
        <br />
        <span className="text-gold">{pro ? "Your membership is active." : "Lifetime Pro is coming soon."}</span>
      </h1>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">
        {pro
          ? "Your lifetime Pro entitlement is active on this account."
          : "Existing Pro members can access premium modes and ad-free play. New purchases aren't available yet; free guests can still join a Pro host’s private match."}
      </p>

      <div className="panel mt-8 p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-6 text-gold" />
          </span>
          <div>
            <p className="font-display text-4xl text-gold">£4.99</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Planned one-time lifetime price
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {perk}
            </li>
          ))}
        </ul>

        {!pro && (
          <>
            <Button className="mt-7 w-full font-bold uppercase tracking-[0.14em]" size="lg" disabled>
              Unlock Fanzeno Pro · checkout coming soon
            </Button>
            <p role="status" className="mt-3 text-center text-xs text-muted-foreground">
              Checkout isn&apos;t available yet. No payment can be taken on this page.
            </p>
          </>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <Button asChild variant="ghost">
          <Link to="/arcade">Browse the arcade</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Back to the grid</Link>
        </Button>
      </div>
    </div>
  );
}
