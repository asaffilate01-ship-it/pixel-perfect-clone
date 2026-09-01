import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Ad-free forever — Fanzeno" },
      {
        name: "description",
        content:
          "One payment removes ads from Fanzeno for life and unlocks unlimited practice grids and full answer reveals.",
      },
      { property: "og:title", content: "Ad-free forever — Fanzeno" },
      {
        property: "og:description",
        content: "One payment. Lifetime ad-free Fanzeno with unlimited practice grids.",
      },
    ],
  }),
  component: Upgrade,
});

const perks = [
  "Removes the discovery banner and the wide-screen side rail — the only ads Fanzeno ever shows",
  "No interstitials, pop-ups or ads between moves, on any tier",
  "All current and future sports and arcade modes",
  "Restore on your other devices — this is not a subscription",
];

function Upgrade() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14">
      <p className="eyebrow">Lifetime pass</p>
      <h1 className="mt-3 text-5xl">
        Play forever.
        <br />
        <span className="text-gold">Zero ads.</span>
      </h1>

      <div className="panel mt-8 p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-6 text-gold" />
          </span>
          <div>
            <p className="font-display text-4xl text-gold">£4.99</p>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              One payment · lifetime
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

        <Button className="mt-7 w-full" size="lg" disabled>
          Checkout coming soon
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Payments aren&apos;t wired up yet — ask and we&apos;ll connect Stripe checkout.
        </p>
      </div>

      <Button asChild variant="ghost" className="mt-6">
        <Link to="/">Back to the grid</Link>
      </Button>
    </div>
  );
}
