import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, ChevronLeft, Eye, Gem, Radio, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSports } from "@/lib/fanzeno";
import { fetchClueBank, fetchRoom, fetchRoomPlayers, SEAT_TEXT } from "@/lib/arcadeQuiz";
import { useEntitlements } from "@/lib/entitlements";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Chip, FairnessNote, Label, PlayerCard } from "@/components/game/ArcadeSetup";
import { Avatar, AvatarPicker, AVATARS } from "@/components/game/AvatarPicker";
import { QuestionCard } from "@/components/game/QuestionCard";
import { arcadeRoomAction } from "@/lib/arcadeRooms.functions";
import { ConnectionBanner, PresenceDot } from "@/components/game/RoomPresence";
import { useArcadePresence } from "@/hooks/useArcadePresence";

type Search = { room?: string };

export const Route = createFileRoute("/arcade_/mastermind")({
  validateSearch: (raw: Record<string, unknown>): Search =>
    typeof raw["room"] === "string" && raw["room"] ? { room: raw["room"] } : {},
  head: () => ({
    meta: [
      { title: "Sports Mastermind — Fanzeno Arcade" },
      {
        name: "description",
        content:
          "Three minutes on your chosen sport, then three minutes on everything. Most points wins; fewest passes breaks the tie.",
      },
      { property: "og:title", content: "Sports Mastermind — Fanzeno Arcade" },
      { property: "og:description", content: "Master your subject. Then survive everything." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MastermindPage,
});

const ROUND_SECONDS = 180;
type P = {
  name: string;
  avatar: string;
  sportId: string | null;
  categoryKey: string | null;
  points: number;
  passes: number;
  correct: number;
  userId?: string;
};

function MastermindPage() {
  const { room: roomId } = Route.useSearch();
  const online = !!roomId;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const presence = useArcadePresence(roomId, user?.id);
  const { pro, loading: entLoading } = useEntitlements();
  const { data: sports } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  const { data: bank } = useQuery({ queryKey: ["clue-bank"], queryFn: fetchClueBank });
  const { data: room } = useQuery({
    queryKey: ["arcade-room", roomId],
    queryFn: () => fetchRoom(roomId!),
    enabled: online,
  });
  const { data: roomPlayers } = useQuery({
    queryKey: ["arcade-room-players", roomId],
    queryFn: () => fetchRoomPlayers(roomId!),
    enabled: online,
  });

  const [setup, setSetup] = useState(true);
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState<P[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      name: `Player ${i + 1}`,
      avatar: AVATARS[i]!.id,
      sportId: null,
      categoryKey: null,
      points: 0,
      passes: 0,
      correct: 0,
    })),
  );
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [question, setQuestion] = useState(1);
  const [finished, setFinished] = useState(false);
  const nextTurnRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (online || !sports?.length) return;
    setPlayers((x) =>
      x.map((p, i) => (p.sportId ? p : { ...p, sportId: sports[i % sports.length]!.id })),
    );
  }, [sports, online]);

  useEffect(() => {
    if (!online) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ["arcade-room-players", roomId] });
      void qc.invalidateQueries({ queryKey: ["arcade-room", roomId] });
    };
    const channel = supabase
      .channel(`arcade-mm-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arcade_room_players",
          filter: `room_id=eq.${roomId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "arcade_rooms", filter: `id=eq.${roomId}` },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [online, roomId, qc]);

  // Online state is derived from the room row; the server owns seats, rounds and scores.
  const onlinePlayers: P[] = useMemo(
    () =>
      (roomPlayers ?? []).map((p) => ({
        name: p.display_name,
        avatar: p.avatar_id,
        sportId: p.sport_id,
        categoryKey: p.category_key,
        points: p.points,
        passes: p.passes,
        correct: p.correct_answers,
        userId: p.user_id,
      })),
    [roomPlayers],
  );
  const seatOrder = useMemo(() => (roomPlayers ?? []).map((p) => p.seat), [roomPlayers]);
  const list = online ? onlinePlayers : players;
  const n = online ? list.length : count;
  const activeIdx = online ? Math.max(0, seatOrder.indexOf(room?.active_seat ?? 0)) : active;
  const currentPhase: 1 | 2 = online ? ((room?.round_no ?? 1) >= 2 ? 2 : 1) : phase;
  const isFinished = online ? room?.status === "finished" : finished;
  const myTurn = online ? list[activeIdx]?.userId === user?.id : true;
  const [onlineSeconds, setOnlineSeconds] = useState(ROUND_SECONDS);

  const nextTurn = () => {
    setSeconds(ROUND_SECONDS);
    setQuestion(1);
    if (active + 1 < count) setActive(active + 1);
    else if (phase === 1) {
      setPhase(2);
      setActive(0);
    } else setFinished(true);
  };
  nextTurnRef.current = nextTurn;

  useEffect(() => {
    if (online || setup || finished) return;
    const t = setInterval(() => {
      setSeconds((x) => {
        if (x > 1) return x - 1;
        nextTurnRef.current();
        return ROUND_SECONDS;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [online, setup, finished]);

  // Online timer follows the server's turn_ends_at; the active player hands over when it hits zero.
  const advancing = useRef(false);
  useEffect(() => {
    if (!online || !room?.turn_ends_at || isFinished) return;
    const end = new Date(room.turn_ends_at).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setOnlineSeconds(left);
      if (left === 0 && myTurn && !advancing.current) {
        advancing.current = true;
        void arcadeRoomAction({ data: { action: "advance", roomId: roomId! } }).finally(() => {
          advancing.current = false;
        });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [online, room?.turn_ends_at, isFinished, myTurn, roomId]);

  const markLocal = (correct: boolean, passed: boolean) => {
    setPlayers((x) =>
      x.map((p, i) =>
        i === active
          ? {
              ...p,
              points: p.points + (correct ? 100 : 0),
              correct: p.correct + (correct ? 1 : 0),
              passes: p.passes + (passed ? 1 : 0),
            }
          : p,
      ),
    );
    setQuestion((q) => q + 1);
  };

  const standings = useMemo(
    () =>
      list
        .slice(0, n)
        .map((p, i) => ({ ...p, seat: i }))
        .sort((a, b) => b.points - a.points || a.passes - b.passes || b.correct - a.correct),
    [list, n],
  );

  const current = list[activeIdx];
  const turnKey = online
    ? `${room?.active_seat}-${room?.round_no}-${current?.points ?? 0}-${current?.passes ?? 0}`
    : `${active}-${phase}-${question}`;
  // Round 2 is "all sports": pick a random sport per question, stable for the life of the turn key.
  const randomSport = useMemo(
    () => sports?.[Math.floor(Math.random() * (sports.length || 1))]?.id ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [turnKey, sports],
  );

  const reset = () => {
    if (online) return void navigate({ to: "/arcade/rooms" });
    setSetup(true);
    setFinished(false);
    setPhase(1);
    setActive(0);
    setSeconds(ROUND_SECONDS);
    setPlayers((x) => x.map((p) => ({ ...p, points: 0, passes: 0, correct: 0 })));
  };

  if (!online && !entLoading && !pro) {
    return (
      <Shell onBack={() => void navigate({ to: "/arcade" })}>
        <div className="game-card mt-8 p-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gold/15">
            <Gem className="size-8 text-gold" />
          </span>
          <p className="eyebrow mt-4">Fanzeno Pro</p>
          <h2 className="mt-1 text-3xl">Sports Mastermind is a Pro game</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unlock it with Fanzeno Pro — one payment, lifetime. Free guests can still join a Pro
            host&apos;s private room.
          </p>
          <div className="game-progress mx-auto mt-5 max-w-xs">
            <div className="game-progress-fill w-3/4" />
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/upgrade">Unlock Fanzeno Pro</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/arcade/rooms">Join a room</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!online && setup) {
    return (
      <Shell onBack={() => void navigate({ to: "/arcade" })}>
        <h2 className="mt-6 text-4xl leading-tight">
          Master your subject. <span className="text-gold">Then survive everything.</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Each player gets three minutes on a chosen sport, followed by three minutes of all-sports
          questions. Correct answers score 100; passes count against you in a tie.
        </p>
        <Link
          to="/arcade/rooms"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/8 p-3 text-xs hover:border-primary"
        >
          <Radio className="size-4 shrink-0 text-primary" />
          <span>
            <span className="font-black uppercase tracking-[0.14em] text-primary">
              Host a live room
            </span>{" "}
            — friends join on their own devices; everyone sees the question, only the active player
            can answer.
          </span>
        </Link>
        <Label>Players</Label>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4].map((c) => (
            <Chip key={c} on={count === c} onClick={() => setCount(c)}>
              {c} players
            </Chip>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {players.slice(0, count).map((p, i) => (
            <PlayerCard
              key={i}
              seat={i}
              player={p}
              avatar={p.avatar}
              sports={sports ?? []}
              onName={(name) => setPlayers((x) => x.map((v, j) => (j === i ? { ...v, name } : v)))}
              onSport={(sportId) =>
                setPlayers((x) => x.map((v, j) => (j === i ? { ...v, sportId } : v)))
              }
              onCategory={(categoryKey) =>
                setPlayers((x) => x.map((v, j) => (j === i ? { ...v, categoryKey } : v)))
              }
            >
              <AvatarPicker
                value={p.avatar}
                pro={pro}
                label={`${p.name} avatar`}
                onChange={(avatar) =>
                  setPlayers((x) => x.map((v, j) => (j === i ? { ...v, avatar } : v)))
                }
              />
            </PlayerCard>
          ))}
          <FairnessNote />
        </div>
        <Button
          size="lg"
          className="mt-6 w-full font-bold uppercase tracking-[0.14em]"
          onClick={() => setSetup(false)}
          disabled={!sports?.length || players.slice(0, count).some((player) => !player.sportId)}
        >
          Start Mastermind
        </Button>
      </Shell>
    );
  }

  if (isFinished && standings[0]) {
    const w = standings[0];
    return (
      <Shell onBack={reset}>
        <div className="game-card mt-8 p-8 text-center">
          <Trophy className="mx-auto size-14 text-gold" />
          <p className="eyebrow mt-4">Winner</p>
          <div className="mt-3 flex justify-center">
            <Avatar id={w.avatar} size={64} />
          </div>
          <h2 className={`mt-3 text-5xl ${SEAT_TEXT[w.seat % 4]}`}>{w.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {w.points} points · {w.passes} passes
          </p>
        </div>
        <div className="game-card mt-4 space-y-2 p-3">
          {standings.map((p, i) => (
            <div key={p.seat} className="panel flex items-center gap-3 px-4 py-3">
              <span className="w-6 font-display text-2xl text-muted-foreground">{i + 1}</span>
              <Avatar id={p.avatar} size={28} />
              <span className="flex-1 text-sm font-bold">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.points} · {p.passes}P
              </span>
            </div>
          ))}
        </div>
        <Button className="mt-6 w-full" onClick={reset}>
          {online ? "Back to rooms" : "Play again"}
        </Button>
      </Shell>
    );
  }

  const p = list[activeIdx];
  if (!p) {
    return (
      <Shell onBack={reset}>
        <p className="mt-8 animate-pulse text-center text-sm text-muted-foreground">
          Joining the room…
        </p>
      </Shell>
    );
  }
  const sportName = sports?.find((s) => s.id === p.sportId)?.name ?? "Chosen sport";
  const shown = online ? onlineSeconds : seconds;
  const questionSport = currentPhase === 1 ? p.sportId : randomSport;

  return (
    <Shell onBack={reset} studio>
      {online && <ConnectionBanner status={presence.myStatus} />}
      <div className="mt-6 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em]">
        <span className="text-primary">
          ● Live room{online && room ? ` ${room.code}` : ""} · {n - 1} watching
        </span>
        <span className="text-muted-foreground">Round {currentPhase}/2</span>
      </div>
      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {list.slice(0, n).map((x, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-2xl p-3 text-center transition-all ${
              i === activeIdx ? "studio-chair studio-chair-active" : "studio-chair"
            }`}
          >
            <div className="flex justify-center">
              <Avatar id={x.avatar} size={30} />
            </div>
            <p
              className={`mt-1 truncate text-[0.6rem] font-black uppercase tracking-[0.12em] ${SEAT_TEXT[i % 4]}`}
            >
              {x.name} {x.userId && <PresenceDot status={presence.byUser.get(x.userId)} />}
            </p>
            <p className="font-display text-3xl text-white">
              <ScoreDigits value={x.points} />
            </p>
            <p className="text-[0.6rem] text-white/50">{x.passes} passes</p>
          </div>
        ))}
      </div>

      <div className="studio-spotlight mt-5 flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:flex-row sm:justify-center sm:gap-8">
        <AnalogClock seconds={shown} total={ROUND_SECONDS} danger={shown <= 10} />
        <div>
          <p className="font-display text-lg text-white">{p.name}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gold">
            {online && myTurn ? "Your turn · " : ""}
            {currentPhase === 1 ? sportName : "All sports"}
          </p>
        </div>
      </div>

      <QuestionCard
        modeSlug="sports-mastermind"
        turnKey={turnKey}
        sportId={questionSport}
        categoryKey={currentPhase === 1 ? p.categoryKey : null}
        difficulty={online ? (room?.difficulty ?? 2) : 2}
        roomId={roomId ?? null}
        canAnswer={myTurn}
        bank={bank}
        accentClass={SEAT_TEXT[activeIdx % 4]!}
        rewardLabel={() => `Question ${online ? p.correct + p.passes + 1 : question} · +100`}
        onResolved={(o) => {
          if (online) setQuestion((value) => value + 1);
          else markLocal(o.correct, o.passed);
        }}
      />
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="size-3.5 text-primary" /> Everyone sees the question; only the active player
        answers.
      </p>
      {(!online || myTurn || room?.host_id === user?.id) && (
        <Button
          variant="ghost"
          className="mt-2 w-full text-muted-foreground"
          onClick={() =>
            online
              ? void arcadeRoomAction({ data: { action: "advance", roomId: roomId! } })
              : nextTurn()
          }
        >
          End player&apos;s turn
        </Button>
      )}
    </Shell>
  );
}

function Shell({
  onBack,
  children,
  studio,
}: {
  onBack: () => void;
  children: React.ReactNode;
  studio?: boolean;
}) {
  return (
    <div className={`mx-auto w-full max-w-2xl px-4 py-8 ${studio ? "studio-set rounded-3xl" : ""}`}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <p className={`eyebrow ${studio ? "text-white/60" : ""}`}>Fanzeno live</p>
          <h1 className={`mt-1 text-3xl ${studio ? "text-white" : ""}`}>Sports Mastermind</h1>
        </div>
        <Brain className="size-6 text-gold" />
      </div>
      {children}
    </div>
  );
}

/** Analogue studio clock: sweeping SVG ring + big digital readout, presentation only. */
function AnalogClock({
  seconds,
  total,
  danger,
}: {
  seconds: number;
  total: number;
  danger: boolean;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, seconds / total));
  const offset = circumference * (1 - progress);
  return (
    <div className="relative grid size-32 shrink-0 place-items-center sm:size-36">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={danger ? "var(--destructive)" : "var(--gold)"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="text-center">
        <p
          className={`font-display text-4xl tabular-nums sm:text-5xl ${danger ? "text-destructive" : "text-white"}`}
        >
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}

/** Illuminated segment-style score readout. */
function ScoreDigits({ value }: { value: number }) {
  return <span className="segment-digits">{value}</span>;
}
