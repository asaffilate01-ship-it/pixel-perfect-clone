import { createFileRoute, Link } from "@tanstack/react-router";
import { Swords, Users, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuizPrefs } from "@/lib/quizPrefs";

/**
 * The legacy Arena page no longer creates a grid room that silently drops its
 * room ID when a friend joins. Direct players to the verified arcade room flow.
 */
export const Route = createFileRoute("/compete")({
  head: () => ({
    meta: [
      { title: "Play online with friends — Fanzeno" },
      {
        name: "description",
        content: "Find a live sports quiz rival or invite friends to an Arcade Room. Play Daily 9 separately.",
      },
    ],
  }),
  component: Compete,
});

function Compete() {
  const { prefs } = useQuizPrefs();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="eyebrow">Arena · Online play</p>
      <h1 className="mt-3 text-4xl">Challenge your friends</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Real-time Arcade Rooms support Quiz Snakes &amp; Ladders, Quiz Ludo and
        Sports Mastermind. Each player picks their own subject. Daily 9 is a
        separate grid challenge, not a shared live room.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="panel flex flex-col p-5">
          <Swords className="size-7 text-primary" aria-hidden />
          <h2 className="mt-4 font-display text-2xl">Find a live rival</h2>
          <p className="mt-2 flex-1 text-xs text-muted-foreground">
            Match with an available player in a supported room game. Sign in required.
          </p>
          <Button asChild className="mt-5">
            <Link to="/arcade/rooms" search={{ sport: prefs.sport, difficulty: 2 }}>Open Arcade Rooms</Link>
          </Button>
        </div>
        <div className="panel flex flex-col p-5">
          <Users className="size-7 text-gold" aria-hidden />
          <h2 className="mt-4 font-display text-2xl">Invite chosen players</h2>
          <p className="mt-2 flex-1 text-xs text-muted-foreground">
            Create a private live room or enter a friend&apos;s FZ room code.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/arcade/rooms" search={{ sport: prefs.sport, difficulty: 2 }}>Host or join a room</Link>
          </Button>
        </div>
      </div>
      <div className="panel mt-4 flex flex-wrap items-center gap-3 p-4">
        <Grid3x3 className="size-5 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          Prefer the daily nine-square grid? It is playable separately.
        </p>
        <Button asChild variant="ghost">
          <Link to="/play/$sport" params={{ sport: prefs.sport }}>Play Daily 9</Link>
        </Button>
      </div>
    </div>
  );
}
