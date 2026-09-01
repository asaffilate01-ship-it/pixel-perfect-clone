import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Swords, Users } from "lucide-react";
import { createRoom, fetchDailyGrid, findRoom } from "@/lib/fanzeno";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/compete")({
  head: () => ({
    meta: [
      { title: "Arena — duel friends on the Fanzeno grid" },
      {
        name: "description",
        content:
          "Open a private room, share the code and settle who really knows the sport. Ranked grid battles on Fanzeno.",
      },
      { property: "og:title", content: "Arena — duel friends on the Fanzeno grid" },
      {
        property: "og:description",
        content: "Private rooms, room codes and ranked grid battles.",
      },
    ],
  }),
  component: Compete,
});

const sports = [
  { slug: "football", label: "Football" },
  { slug: "cricket", label: "Cricket" },
  { slug: "nba", label: "NBA" },
];

function Compete() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sport, setSport] = useState("football");
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const gridQuery = useQuery({
    queryKey: ["daily-grid", sport],
    queryFn: () => fetchDailyGrid(sport),
  });

  const host = async () => {
    if (!user) {
      toast.error("Sign in to host a room.");
      return;
    }
    const grid = gridQuery.data;
    if (!grid) {
      toast.error("No published grid for that sport yet.");
      return;
    }
    setBusy(true);
    try {
      const room = await createRoom(grid.id);
      setCreated(room.code);
      toast.success(`Room ${room.code} is open.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open a room.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (code.trim().length < 4) return;
    setBusy(true);
    try {
      const room = await findRoom(code.trim());
      if (!room) {
        toast.error("No room with that code.");
        return;
      }
      await navigate({ to: "/play/$sport", params: { sport: room.sportSlug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join that room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <p className="eyebrow">Arena</p>
      <h1 className="mt-3 text-5xl">Settle it head to head</h1>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground">
        Same grid, same clock, one winner. Host a room and share the code, or drop into a friend&apos;s.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="panel p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/12">
            <Swords className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-2xl">Host a room</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {sports.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSport(s.slug)}
                className={`rounded-full border px-3 py-1.5 text-[0.66rem] font-bold uppercase tracking-[0.12em] ${
                  sport === s.slug
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Button className="mt-5 w-full" onClick={() => void host()} disabled={busy}>
            Open room
          </Button>
          {created && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(created);
                toast.success("Code copied");
              }}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-primary/50 bg-primary/10 px-4 py-3"
            >
              <span className="font-display text-3xl tracking-[0.3em] text-primary">{created}</span>
              <Copy className="size-4 text-primary" />
            </button>
          )}
        </div>

        <div className="panel p-6">
          <span className="grid size-10 place-items-center rounded-xl bg-gold/12">
            <Users className="size-5 text-gold" />
          </span>
          <h2 className="mt-4 text-2xl">Join with a code</h2>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void join();
            }}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              className="font-display text-xl tracking-[0.3em]"
            />
            <Button type="submit" variant="secondary" disabled={busy}>
              Join
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Prefer solo? The{" "}
            <Link to="/play/$sport" params={{ sport }} className="text-primary underline">
              daily grid
            </Link>{" "}
            is always live.
          </p>
        </div>
      </div>
    </div>
  );
}
