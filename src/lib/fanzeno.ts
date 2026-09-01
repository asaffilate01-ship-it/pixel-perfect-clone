import { supabase } from "@/integrations/supabase/client";

export type Sport = {
  id: string;
  slug: string;
  name: string;
  accent: string;
  enabled: boolean;
  sort_order: number;
};

export type GridPuzzle = {
  id: string;
  difficulty: number;
  scheduled_for: string | null;
  sport: { id: string; slug: string; name: string; accent: string };
  rows: string[];
  cols: string[];
};

export type CellState = {
  guess?: string | undefined;
  athlete?: string | undefined;
  status: "empty" | "correct" | "wrong";
};

export const emptyBoard = (): CellState[] =>
  Array.from({ length: 9 }, () => ({ status: "empty" as const }));

export async function fetchSports(): Promise<Sport[]> {
  const { data, error } = await supabase
    .from("sports")
    .select("id, slug, name, accent, enabled, sort_order")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export type Competition = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  region: string | null;
  competition_type: string;
  sport_id: string;
};

export async function fetchCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("id, slug, name, short_name, region, competition_type, sport_id")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export type GridScope = { competitionId?: string | null | undefined };

/**
 * Latest published grid for a sport. When a competition scope is given, a grid tagged
 * with that competition is preferred; if none exists we fall back to the whole-sport
 * grid and flag it with `scopeFallback` so the UI can say so.
 */
export async function fetchDailyGrid(
  slug: string,
  scope: GridScope = {},
): Promise<(GridPuzzle & { scopeFallback: boolean }) | null> {
  const base = () =>
    supabase
      .from("grids")
      .select(
        "id, difficulty, scheduled_for, row_criteria, column_criteria, competition_ids, sports!inner(id, slug, name, accent)",
      )
      .eq("sports.slug", slug)
      .not("published_at", "is", null)
      .order("scheduled_for", { ascending: false })
      .limit(1);

  let data: Awaited<ReturnType<typeof base>>["data"] extends (infer R)[] | null ? R | null : never = null;
  let scopeFallback = false;

  if (scope.competitionId) {
    const scoped = await base().contains("competition_ids", [scope.competitionId]).maybeSingle();
    if (scoped.error) throw scoped.error;
    data = scoped.data;
  }
  if (!data) {
    const any = await base().maybeSingle();
    if (any.error) throw any.error;
    data = any.data;
    scopeFallback = !!scope.competitionId && !!data;
  }
  if (!data) return null;

  const ids = [...data.row_criteria, ...data.column_criteria];
  const { data: criteria, error: cErr } = await supabase
    .from("criteria")
    .select("id, label")
    .in("id", ids);
  if (cErr) throw cErr;
  const byId = new Map((criteria ?? []).map((c) => [c.id, c.label]));
  const sport = data.sports as unknown as GridPuzzle["sport"];

  return {
    id: data.id,
    difficulty: data.difficulty,
    scheduled_for: data.scheduled_for,
    sport,
    rows: data.row_criteria.map((id: string) => byId.get(id) ?? "—"),
    cols: data.column_criteria.map((id: string) => byId.get(id) ?? "—"),
    scopeFallback,
  };
}

export type AthleteOption = {
  id: string;
  name: string;
  aliases: string[];
  countryCode: string | null;
  verified: boolean;
  score: number;
};

/**
 * Fuzzy, typo-tolerant athlete search (accents, nicknames and transliterations).
 * Only verified athletes are returned, so a picked option is always a real answer key entry.
 */
export async function searchAthletes(query: string, sportId?: string | null): Promise<AthleteOption[]> {
  if (query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("search_athletes", {
    p_query: query.trim(),
    ...(sportId ? { p_sport_id: sportId } : {}),
    p_limit: 6,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    aliases: r.aliases ?? [],
    countryCode: r.country_code,
    verified: r.verified,
    score: r.score,
  }));
}

export type CriterionIcon = "trophy" | "flag" | "people" | "stats" | "hand" | "shield";

/** Picks a meaningful glyph for a criterion label (team, country, trophy, manager, stat). */
export function criterionIcon(label: string): CriterionIcon {
  const x = label.toLowerCase();
  if (/champion|cup|trophy|winner|title|medal|ashes|series/.test(x)) return "trophy";
  if (/represent|international|national|caps|\b(france|england|spain|pakistan|india|australia|brazil|argentina|usa)\b/.test(x))
    return "flag";
  if (/managed|captain|coach/.test(x)) return "people";
  if (/appearance|runs|goals|points|wickets|assists|rebounds|\d+\+|\bavg\b|average/.test(x)) return "stats";
  if (/left-handed|left handed|left-arm/.test(x)) return "hand";
  return "shield";
}

export type MoveResult = {
  accepted: boolean;
  athlete_name: string | null;
  score?: number | undefined;
  points?: number | undefined;
  move_points?: number | undefined;
};

export type PlayMode = "daily" | "endless" | "pass" | "cpu";
export type PersistedMode = "daily" | "endless";

/** Difficulty ladder shared by Endless, Pass & Play and CPU battles (mirrors `scoring_rules`). */
export const DIFFICULTIES = [
  { level: 1, label: "Easy", multiplier: 1 },
  { level: 2, label: "Medium", multiplier: 2 },
  { level: 3, label: "Hard", multiplier: 3 },
  { level: 4, label: "Expert", multiplier: 5 },
] as const;
export type DifficultyLevel = (typeof DIFFICULTIES)[number]["level"];
export const difficultyMeta = (level: number) =>
  DIFFICULTIES.find((d) => d.level === level) ?? DIFFICULTIES[1];
export const BASE_POINTS = 100;

/** Signed-in play persists the attempt; guest play is validated but not stored. */
export async function submitGuess(args: {
  gridId: string;
  cell: number;
  guess: string;
  signedIn: boolean;
  mode?: PersistedMode | undefined;
}): Promise<MoveResult> {
  if (args.signedIn) {
    const { data, error } = await supabase.rpc("fz_play_move", {
      p_grid: args.gridId,
      p_cell: args.cell,
      p_guess: args.guess,
      p_mode: args.mode ?? "daily",
    });
    if (error) throw error;
    const res = data as unknown as MoveResult;
    return {
      accepted: !!res.accepted,
      athlete_name: res.athlete_name ?? null,
      score: res.score,
      points: res.points,
      move_points: res.move_points,
    };
  }
  return checkGuess(args);
}

/** Stateless validation against the answer key (used for guests and local battles). */
export async function checkGuess(args: { gridId: string; cell: number; guess: string }): Promise<MoveResult> {
  const { data, error } = await supabase.rpc("fz_check_answer", {
    p_grid: args.gridId,
    p_cell: args.cell,
    p_guess: args.guess,
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  return { accepted: !!row?.accepted, athlete_name: row?.athlete_name ?? null };
}

/** A specific published grid (used for Endless and shared rooms). */
export async function fetchGridById(id: string): Promise<GridPuzzle | null> {
  const { data, error } = await supabase
    .from("grids")
    .select("id, difficulty, scheduled_for, row_criteria, column_criteria, sports!inner(id, slug, name, accent)")
    .eq("id", id)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ids = [...data.row_criteria, ...data.column_criteria];
  const { data: criteria, error: cErr } = await supabase.from("criteria").select("id, label").in("id", ids);
  if (cErr) throw cErr;
  const byId = new Map((criteria ?? []).map((c) => [c.id, c.label]));
  return {
    id: data.id,
    difficulty: data.difficulty,
    scheduled_for: data.scheduled_for,
    sport: data.sports as unknown as GridPuzzle["sport"],
    rows: data.row_criteria.map((x: string) => byId.get(x) ?? "—"),
    cols: data.column_criteria.map((x: string) => byId.get(x) ?? "—"),
  };
}

/** Asks the server for a fresh, never-repeated grid built only from verified facts. */
export async function generateEndlessGrid(args: {
  sportId: string;
  competitionId?: string | null | undefined;
  difficulty: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc("generate_endless_grid", {
    p_sport_id: args.sportId,
    ...(args.competitionId ? { p_competition_id: args.competitionId } : {}),
    p_difficulty: args.difficulty,
  });
  if (error) throw error;
  return data as string;
}

export type Owner = "p1" | "p2";
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
/** Grid Battle win check: three claimed squares in a row, column or diagonal. */
export function hasLine(owners: (Owner | undefined)[], who: Owner): boolean {
  return LINES.some((line) => line.every((i) => owners[i] === who));
}
/** Simple tactical pick: win if possible, otherwise block, otherwise centre/random. */
export function tacticalPick(owners: (Owner | undefined)[], me: Owner): number | null {
  const free = owners.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
  if (!free.length) return null;
  const other: Owner = me === "p1" ? "p2" : "p1";
  for (const who of [me, other]) {
    for (const line of LINES) {
      const mine = line.filter((i) => owners[i] === who).length;
      const empty = line.filter((i) => !owners[i]);
      if (mine === 2 && empty.length === 1) return empty[0]!;
    }
  }
  if (!owners[4]) return 4;
  return free[Math.floor(Math.random() * free.length)]!;
}

export async function fetchReveal(gridId: string): Promise<Record<number, string[]>> {
  const { data, error } = await supabase.rpc("fz_reveal", { p_grid: gridId });
  if (error) throw error;
  const out: Record<number, string[]> = {};
  for (const row of data ?? []) out[row.cell_index] = row.answers ?? [];
  return out;
}

export async function createRoom(gridId: string) {
  const { data, error } = await supabase.rpc("fz_create_room", { p_grid: gridId });
  if (error) throw error;
  return data as unknown as { id: string; code: string };
}

export async function findRoom(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, code, grid_id, grids!inner(sports!inner(slug))")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const slug = (data.grids as unknown as { sports: { slug: string } }).sports.slug;
  return { id: data.id, code: data.code, gridId: data.grid_id, sportSlug: slug };
}

export type LeaderRow = {
  userId: string;
  name: string;
  rating: number;
  played: number;
  bestScore: number;
  streak: number;
  sport: string;
};

export async function fetchLeaderboard(sportId?: string): Promise<LeaderRow[]> {
  let query = supabase
    .from("player_ratings")
    .select("user_id, rating, played, best_score, streak, sport_id, sports!inner(name)")
    .order("rating", { ascending: false })
    .limit(25);
  if (sportId) query = query.eq("sport_id", sportId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profiles ?? []) names.set(p.id, p.display_name ?? "Anonymous fan");
  }
  return rows.map((r) => ({
    userId: r.user_id,
    name: names.get(r.user_id) ?? "Anonymous fan",
    rating: r.rating,
    played: r.played,
    bestScore: r.best_score,
    streak: r.streak,
    sport: (r.sports as unknown as { name: string }).name,
  }));
}

export async function fetchMyGame(gridId: string, userId: string, mode: PersistedMode = "daily") {
  const { data: game } = await supabase
    .from("games")
    .select("id, score, status, points")
    .eq("grid_id", gridId)
    .eq("player_one", userId)
    .eq("mode", mode)
    .maybeSingle();
  if (!game) return null;
  const { data: moves } = await supabase
    .from("game_moves")
    .select("cell_index, guess, accepted, athlete_id")
    .eq("game_id", game.id)
    .order("created_at");
  return { ...game, moves: moves ?? [] };
}
