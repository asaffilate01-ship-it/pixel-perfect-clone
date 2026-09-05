import { supabase } from "@/integrations/supabase/client";

type RpcClient = {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

const contentApi = supabase as unknown as RpcClient;

export type CrosswordEntry = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  vertical?: boolean;
};

export type CrosswordPuzzle = {
  id: string;
  title: string;
  sportLabel: string;
  difficulty: number;
  size: number;
  entries: CrosswordEntry[];
};

export type HigherLowerCard = {
  id: string;
  name: string;
  value: number;
  display: string;
  metric: string;
  sport: string;
};

export function isValidCrossword(entries: CrosswordEntry[], size: number): boolean {
  if (!Number.isInteger(size) || size < 7 || size > 15 || entries.length < 2) return false;
  const letters = new Map<string, string>();
  for (const entry of entries) {
    const answer = entry.answer.trim().toUpperCase();
    if (!answer || !/^[A-Z]+$/.test(answer) || !entry.clue.trim()) return false;
    for (const [offset, letter] of [...answer].entries()) {
      const row = entry.row + (entry.vertical ? offset : 0);
      const col = entry.col + (entry.vertical ? 0 : offset);
      if (row < 0 || col < 0 || row >= size || col >= size) return false;
      const key = `${row}:${col}`;
      const existing = letters.get(key);
      if (existing && existing !== letter) return false;
      letters.set(key, letter);
    }
  }
  return true;
}

export async function reserveCrossword(difficulty: number): Promise<CrosswordPuzzle | null> {
  const { data, error } = await contentApi.rpc("reserve_crossword_puzzle", {
    p_difficulty: difficulty,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const puzzle = {
    id: String(row.id),
    title: String(row.title ?? "Sports Crossword"),
    sportLabel: String(row.sport_label ?? "Mixed sports"),
    difficulty: Number(row.difficulty ?? difficulty),
    size: Number(row.grid_size ?? 9),
    entries: Array.isArray(row.entries) ? (row.entries as CrosswordEntry[]) : [],
  };
  return isValidCrossword(puzzle.entries, puzzle.size) ? puzzle : null;
}

export async function fetchHigherLowerCards(difficulty: number): Promise<HigherLowerCard[]> {
  const { data, error } = await contentApi.rpc("reserve_higher_lower_cards", {
    p_difficulty: difficulty,
    p_limit: 40,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const value = row as Record<string, unknown>;
    return {
      id: String(value.id),
      name: String(value.name),
      value: Number(value.value),
      display: String(value.display_value),
      metric: String(value.metric_label),
      sport: String(value.sport_label),
    };
  });
}
