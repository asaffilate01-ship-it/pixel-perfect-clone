import { supabase } from "@/integrations/supabase/client";

export type ClueBank = Record<string, string[]>;

/** Enabled criterion labels grouped by sport id — used as live prompts in the board games. */
export async function fetchClueBank(): Promise<ClueBank> {
  const { data, error } = await supabase
    .from("criteria")
    .select("sport_id, label")
    .eq("enabled", true)
    .limit(1000);
  if (error) throw error;
  const bank: ClueBank = {};
  for (const row of data ?? []) {
    if (!row.sport_id) continue;
    (bank[row.sport_id] ??= []).push(row.label);
  }
  return bank;
}

/** Random prompt for a sport; falls back to the whole bank when a sport has no criteria yet. */
export function pickPrompt(bank: ClueBank, sportId: string | null): string {
  const pool = (sportId && bank[sportId]?.length ? bank[sportId] : Object.values(bank).flat()) ?? [];
  if (!pool.length) return "Name an athlete who fits this verified fact.";
  return `Name an athlete: ${pool[Math.floor(Math.random() * pool.length)]}`;
}

export const SEAT_COLORS = ["bg-primary", "bg-gold", "bg-chart-3", "bg-chart-4"] as const;
export const SEAT_TEXT = ["text-primary", "text-gold", "text-chart-3", "text-chart-4"] as const;

/** Snakes & Ladders board: ladders lift, snakes drop. Shared by the client board and the server move logic. */
export const LADDERS: Record<number, number> = { 4: 14, 14: 28, 40: 59, 51: 71, 63: 84 };
export const SNAKES: Record<number, number> = { 17: 7, 32: 12, 48: 26, 69: 49, 88: 68, 96: 76 };
export const JUMPS: Record<number, number> = { ...LADDERS, ...SNAKES };
export const LUDO_HOME = 57;
export const LUDO_SAFE = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

/** Online room player as stored in `arcade_room_players` (+ per-seat settings). */
export type RoomPlayer = {
  user_id: string;
  seat: number;
  display_name: string;
  status: string;
  points: number;
  passes: number;
  position: number;
  correct_answers: number;
  sport_id: string | null;
  category_key: string | null;
  avatar_id: string;
};

export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from("arcade_room_players")
    .select("user_id, seat, display_name, status, points, passes, position, correct_answers, sport_id, category_key, settings")
    .eq("room_id", roomId)
    .order("seat");
  if (error) throw error;
  return (data ?? []).map((p) => {
    const s = (p.settings ?? {}) as { avatar_id?: string; sport_id?: string | null; category_key?: string | null };
    return {
      user_id: p.user_id,
      seat: p.seat,
      display_name: p.display_name,
      status: p.status,
      points: p.points,
      passes: p.passes,
      position: p.position,
      correct_answers: p.correct_answers,
      sport_id: p.sport_id ?? s.sport_id ?? null,
      category_key: p.category_key ?? s.category_key ?? null,
      avatar_id: s.avatar_id ?? "captain",
    };
  });
}

export type RoomRow = {
  id: string;
  code: string;
  host_id: string;
  mode_slug: string;
  difficulty: number;
  status: string;
  active_seat: number | null;
  round_no: number;
  turn_ends_at: string | null;
  settings: { max_players?: number } | null;
};

export async function fetchRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from("arcade_rooms")
    .select("id, code, host_id, mode_slug, difficulty, status, active_seat, round_no, turn_ends_at, settings")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomRow | null) ?? null;
}

export function modeName(slug: string) {
  return slug === "quiz-ludo" ? "Quiz Ludo" : slug === "sports-mastermind" ? "Sports Mastermind" : "Quiz Snakes & Ladders";
}
