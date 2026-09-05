import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Brain, Flame, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/lib/entitlements";
import { Avatar, AvatarPicker } from "@/components/game/AvatarPicker";
import { AvatarCustomiser } from "@/components/game/AvatarCustomiser";
import { PhotoAvatarStudio } from "@/components/game/PhotoAvatarStudio";
import {
  DEFAULT_AVATAR_SETTINGS,
  parseAvatarSettings,
  type AvatarSettings,
} from "@/lib/avatarSettings";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Fanzeno" },
      {
        name: "description",
        content:
          "Your Fanzeno ratings, streaks and per-sport form across every grid you've played.",
      },
      { property: "og:title", content: "Your profile — Fanzeno" },
      { property: "og:description", content: "Your Fanzeno ratings, streaks and per-sport form." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

async function fetchMyStats(userId: string) {
  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("rating, played, best_score, streak, sports!inner(name)")
    .eq("user_id", userId)
    .order("rating", { ascending: false });
  const { data: clues } = await supabase
    .from("clue_attempts")
    .select("solved, score")
    .eq("user_id", userId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_preset, avatar_settings, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  const { data: abilities } = await supabase
    .from("player_abilities")
    .select("ability_theta, attempts, category_key, sports!inner(name)")
    .eq("user_id", userId)
    .order("attempts", { ascending: false });
  return {
    ratings: ratings ?? [],
    clues: clues ?? [],
    avatar: profile?.avatar_preset ?? "captain",
    avatarUrl: profile?.avatar_url ?? null,
    avatarSettings: parseAvatarSettings(profile?.avatar_settings),
    abilities: abilities ?? [],
  };
}

function ProfilePage() {
  const { user, displayName } = useAuth();
  const { pro } = useEntitlements();
  const [avatar, setAvatar] = useState("captain");
  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>(DEFAULT_AVATAR_SETTINGS);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const { data } = useQuery({
    queryKey: ["my-stats", user?.id],
    queryFn: () => fetchMyStats(user!.id),
    enabled: !!user,
  });

  const ratings = data?.ratings ?? [];
  const played = ratings.reduce((sum, r) => sum + r.played, 0);
  const bestStreak = ratings.reduce((max, r) => Math.max(max, r.streak), 0);
  const cluePoints = (data?.clues ?? []).reduce((sum, c) => sum + c.score, 0);
  useEffect(() => {
    if (data?.avatar) setAvatar(data.avatar);
    if (data?.avatarSettings) setAvatarSettings(data.avatarSettings);
  }, [data?.avatar, data?.avatarSettings]);
  const saveAvatar = async (id: string) => {
    setAvatar(id);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_preset: id, avatar_settings: { preset: id, frame: "standard" } })
      .eq("id", user!.id);
    if (error) toast.error(error.message);
    else toast.success("Avatar updated");
  };
  const saveCustomAvatar = async () => {
    setSavingAvatar(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_settings: { ...avatarSettings, preset: avatar } })
      .eq("id", user!.id);
    setSavingAvatar(false);
    if (error) toast.error(error.message);
    else toast.success("Custom avatar saved");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="eyebrow">Your profile</p>
      <div className="mt-6 flex items-center gap-4">
        {data?.avatarUrl ? (
          <img
            src={data.avatarUrl}
            alt="Your generated avatar"
            className="size-16 shrink-0 rounded-[1.3rem] object-cover shadow-xl"
          />
        ) : (
          <Avatar id={avatar} size={64} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl">{displayName ?? "Fanzeno player"}</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <AvatarPicker
        value={avatar}
        pro={pro}
        label="Arcade avatar"
        onChange={(id) => void saveAvatar(id)}
      />
      <AvatarCustomiser
        value={avatarSettings}
        preset={avatar}
        onChange={setAvatarSettings}
        onSave={() => void saveCustomAvatar()}
        saving={savingAvatar}
      />
      {user && <PhotoAvatarStudio pro={pro} userId={user.id} settings={avatarSettings} />}

      <div className="panel mt-7 grid grid-cols-3 divide-x divide-border/70">
        <Stat value={String(played)} label="Grids played" />
        <Stat value={String(bestStreak)} label="Best streak" />
        <Stat value={String(cluePoints)} label="Clue points" />
      </div>

      {(data?.abilities.length ?? 0) > 0 && (
        <>
          <h2 className="mt-9 text-2xl">Quiz form</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Calibrated from your server-checked arcade answers. Positive means you beat the field on
            that subject.
          </p>
          <div className="panel mt-4 divide-y divide-border/70">
            {data!.abilities.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-gold/12">
                  <Brain className="size-4 text-gold" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {(a.sports as unknown as { name: string }).name}
                  </p>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {a.category_key === "all" ? "All categories" : a.category_key} · {a.attempts}{" "}
                    answered
                  </p>
                </div>
                <span
                  className={`font-display text-2xl ${Number(a.ability_theta) >= 0 ? "text-primary" : "text-muted-foreground"}`}
                >
                  {Number(a.ability_theta) >= 0 ? "+" : ""}
                  {Number(a.ability_theta).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-9 text-2xl">Sport ratings</h2>
      <div className="panel mt-4 divide-y divide-border/70">
        {ratings.length === 0 && (
          <div className="p-8 text-center">
            <Flame className="mx-auto size-7 text-gold" />
            <p className="mt-3 text-sm text-muted-foreground">
              No rated games yet — finish a daily grid to start a rating.
            </p>
          </div>
        )}
        {ratings.map((r) => (
          <div
            key={(r.sports as unknown as { name: string }).name}
            className="flex items-center gap-3 px-5 py-4"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary/12">
              <Trophy className="size-4 text-primary" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {(r.sports as unknown as { name: string }).name}
              </p>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {r.played} played · best {r.best_score}/9 · streak {r.streak}
              </p>
            </div>
            <span className="font-display text-2xl text-primary">{r.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="font-display text-3xl">{value}</p>
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
