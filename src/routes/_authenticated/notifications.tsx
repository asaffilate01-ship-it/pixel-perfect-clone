import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, Check, Dices, Flame, Moon, Radio, Sparkles, Trophy, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNotificationPrefs, useNotifications, type Notification, type NotificationPrefs } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Fanzeno" },
      { name: "description", content: "Your turn alerts, room invitations, daily challenge reminders and notification settings." },
      { property: "og:title", content: "Notifications — Fanzeno" },
      { property: "og:description", content: "Turn alerts, room invitations and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<Notification["kind"], React.ElementType> = {
  turn: Dices,
  room: Radio,
  daily: Sparkles,
  streak: Flame,
  tournament: Trophy,
  achievement: Trophy,
  system: Bell,
};

const TOGGLES: { key: keyof NotificationPrefs; label: string; sub: string; icon: React.ElementType }[] = [
  { key: "match_turns", label: "Match turns", sub: "When it is your move in an online room", icon: Dices },
  { key: "room_invites", label: "Room invitations", sub: "When a friend seats you in a private room", icon: Radio },
  { key: "daily_challenge", label: "Daily challenge", sub: "A nudge when today's grid and clue ladder go live", icon: Sparkles },
  { key: "streak_risk", label: "Streak at risk", sub: "Evening reminder before a streak breaks", icon: Flame },
  { key: "tournaments", label: "Tournaments", sub: "Monthly competition openings and results", icon: Trophy },
  { key: "product_news", label: "Product news", sub: "New sports, modes and features", icon: Bell },
  { key: "sound", label: "Sound", sub: "Play a short tone with in-app alerts", icon: Volume2 },
];

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function NotificationsPage() {
  const { items, unread, loading, markRead, markAllRead } = useNotifications(60);
  const { prefs, update, loaded } = useNotificationPrefs();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="mt-1 text-4xl">Notifications</h1>
        </div>
        <Button variant="outline" size="sm" disabled={!unread} onClick={() => void markAllRead()}>
          <Check className="size-4" /> Mark all read
        </Button>
      </div>

      <section className="mt-6 space-y-2" aria-live="polite">
        {loading && <div className="panel h-20 animate-pulse" aria-hidden />}
        {!loading && items.length === 0 && (
          <div className="panel flex items-center gap-4 p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/12">
              <BellOff className="size-5 text-primary" />
            </span>
            <div>
              <p className="font-display text-2xl">Nothing yet</p>
              <p className="text-sm text-muted-foreground">
                Turn alerts and room invitations land here the moment they happen.{" "}
                <Link to="/arcade/rooms" className="text-primary hover:underline">
                  Host a room
                </Link>{" "}
                to try it.
              </p>
            </div>
          </div>
        )}
        {items.map((n) => {
          const Icon = ICONS[n.kind] ?? Bell;
          const unreadRow = !n.read_at;
          const inner = (
            <>
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${unreadRow ? "bg-primary/15 text-primary" : "bg-surface text-muted-foreground"}`}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`font-display text-xl ${unreadRow ? "" : "text-muted-foreground"}`}>{n.title}</span>
                  {unreadRow && <span className="size-2 rounded-full bg-primary" aria-label="unread" />}
                </span>
                <span className="block text-xs text-muted-foreground">{n.body}</span>
              </span>
              <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{timeAgo(n.created_at)}</span>
            </>
          );
          const cls = `panel flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-primary/60 ${unreadRow ? "border-primary/40" : ""}`;
          return n.route ? (
            <Link key={n.id} to={n.route} className={cls} onClick={() => void markRead(n.id)}>
              {inner}
            </Link>
          ) : (
            <button key={n.id} type="button" className={cls} onClick={() => void markRead(n.id)}>
              {inner}
            </button>
          );
        })}
      </section>

      <section className="mt-10">
        <p className="eyebrow">Settings</p>
        <h2 className="mt-1 text-3xl">What reaches you</h2>
        <div className={`panel mt-4 divide-y divide-border/70 ${loaded ? "" : "opacity-60"}`}>
          {TOGGLES.map((t) => {
            const Icon = t.icon;
            return (
              <label key={t.key} className="flex cursor-pointer items-center gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface">
                  <Icon className="size-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.sub}</span>
                </span>
                <Switch checked={Boolean(prefs[t.key])} onCheckedChange={(v) => void update({ [t.key]: v })} aria-label={t.label} />
              </label>
            );
          })}
          <div className="p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface">
                <Moon className="size-4 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Quiet hours</span>
                <span className="block text-xs text-muted-foreground">Hold alerts overnight ({prefs.timezone})</span>
              </span>
              <Switch checked={prefs.quiet_hours} onCheckedChange={(v) => void update({ quiet_hours: v })} aria-label="Quiet hours" />
            </label>
            {prefs.quiet_hours && (
              <div className="mt-3 flex items-center gap-3 pl-12 text-xs">
                <label className="flex items-center gap-2">
                  From
                  <input
                    type="time"
                    value={prefs.quiet_start}
                    onChange={(e) => void update({ quiet_start: e.target.value })}
                    className="rounded-md border border-border bg-background/60 px-2 py-1 text-foreground"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Until
                  <input
                    type="time"
                    value={prefs.quiet_end}
                    onChange={(e) => void update({ quiet_end: e.target.value })}
                    className="rounded-md border border-border bg-background/60 px-2 py-1 text-foreground"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Alerts are queued by the server the moment a turn or invitation is created, so the same preferences apply to the phone apps.
        </p>
      </section>
    </div>
  );
}
