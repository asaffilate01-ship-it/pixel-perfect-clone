import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, BookOpen, ChevronLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME_ART, TONE_TEXT } from "@/lib/gameCatalog";
import { GAME_RULES } from "@/lib/gameRules";

export const Route = createFileRoute("/arcade_/rules")({
  head: () => ({ meta: [{ title: "How to Play — Fanzeno Arcade" }] }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to arcade" asChild>
          <Link to="/arcade">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <p className="eyebrow">Player guide</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">How to play</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every live Fanzeno game, explained before your first move.
          </p>
        </div>
        <BookOpen className="size-9 text-primary" />
      </div>

      <nav
        className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"
        aria-label="Game rules"
      >
        {Object.entries(GAME_RULES).map(([slug, rule]) => (
          <a
            key={slug}
            href={`#${slug}`}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-2 text-xs font-bold hover:border-primary"
          >
            {rule.name}
          </a>
        ))}
      </nav>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {Object.entries(GAME_RULES).map(([slug, rule]) => {
          const art = GAME_ART[slug];
          const Icon = art?.icon ?? BookOpen;
          return (
            <article
              id={slug}
              key={slug}
              className="game-card card-3d scroll-mt-24 overflow-hidden p-5"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/12 shadow-inner">
                  <Icon className={`size-6 ${art ? TONE_TEXT[art.tone] : "text-primary"}`} />
                </span>
                <div>
                  <h2 className="font-display text-2xl">{rule.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" /> {rule.players}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-bold">
                {rule.goal}
              </p>
              <ol className="mt-4 space-y-2">
                {rule.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-surface-strong text-[.65rem] font-black text-primary">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <ArrowDown className="size-4 shrink-0 text-gold" />
                <span>
                  <strong className="text-foreground">Scoring:</strong> {rule.scoring}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <Button asChild size="lg" className="mt-7 w-full">
        <Link to="/arcade">
          Choose a game <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
