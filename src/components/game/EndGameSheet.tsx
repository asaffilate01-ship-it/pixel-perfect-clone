import { Flag, Minus, RefreshCw, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reasonText, type MatchResult } from "@/lib/matchEngine";

type Props = {
  result: MatchResult | null;
  onRematch: () => void;
  onExit: () => void;
  rating?: { delta: number; next: number } | undefined;
};

export function EndGameSheet({ result, onRematch, onExit, rating }: Props) {
  if (!result) return null;
  const win = result.outcome === "win";
  const draw = result.outcome === "draw";
  const Icon = win ? Trophy : draw ? Minus : Flag;

  return (
    <Dialog open onOpenChange={(open) => !open && onExit()}>
      <DialogContent className="max-w-sm text-center">
        <span
          className={`mx-auto grid size-[76px] place-items-center rounded-3xl ${
            win ? "bg-primary text-primary-foreground" : draw ? "bg-gold/20 text-gold" : "bg-destructive/20 text-foreground"
          }`}
        >
          <Icon className="size-9" />
        </span>
        <p className="eyebrow mt-4">Match complete</p>
        <DialogTitle className="font-display text-5xl">
          {win ? "Victory!" : draw ? "Honours even" : "Defeat"}
        </DialogTitle>
        <DialogDescription>{reasonText[result.reason]}</DialogDescription>

        {rating && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/70 px-4 py-4 text-sm">
            <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Rating
            </span>
            <span
              className={`font-display text-2xl ${
                rating.delta > 0 ? "text-primary" : rating.delta < 0 ? "text-destructive" : "text-gold"
              }`}
            >
              {rating.delta > 0 ? `+${rating.delta}` : rating.delta}
            </span>
            <span className="font-display text-xl">{rating.next.toLocaleString()}</span>
          </div>
        )}

        <Button size="lg" className="mt-3 w-full font-bold uppercase tracking-[0.14em]" onClick={onRematch}>
          <RefreshCw className="size-4" /> Rematch
        </Button>
        <Button variant="ghost" onClick={onExit}>
          Back to arcade
        </Button>
      </DialogContent>
    </Dialog>
  );
}
