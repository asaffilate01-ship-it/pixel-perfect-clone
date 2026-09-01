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
          "One payment unlocks Quiz Ludo, Sports Mastermind, premium tactical games and tournaments, and removes every banner forever.",
      },
      { property: "og:title", content: "Fanzeno Pro — lifetime unlock" },
      {
        property: "og:description",
        content: "Premium games, tournament formats and ad-free play. One payment, not a subscription.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Upgrade,
});

const perks = [
  "Quiz Ludo and Sports Mastermind",
  "Premium tactical games and the full grid archive",
  "Premium tournaments and every future Pro mode",
  "No discovery banner or wide-screen side rail — the only ads Fanzeno ever shows",
  "Restore on your other devices — this is not a subscription",
];

function Upgrade() {
  const { pro } = useEntitlements();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14">
      <p className="eyebrow">Lifetime Pro</p>
      <h1 className="mt-3 text-5xl">
        {pro ? "You’re Fanzeno Pro." : "Unlock the full arena."}
        <br />
        <span className="text-gold">{pro ? "Everything is open." : "One payment. Forever."}</span>
      </h1>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">
        {pro
          ? "Your lifetime Pro entitlement is active on this account."
          : "Premium games, tournament formats and completely ad-free play. Free guests can still join a Pro host’s private match."}
      </p>

      <div className="panel mt-8 p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-6 text-gold" />
          </span>
          <div>
            <p className="font-display text-4xl text-gold">£4.99</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              One-time lifetime purchase
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
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Payments aren&apos;t wired up yet — ask and we&apos;ll connect Stripe checkout.
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
