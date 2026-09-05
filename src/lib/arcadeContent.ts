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

export async function reserveCrossword(difficulty: number): Promise<CrosswordPuzzle | null> {
  const { data, error } = await contentApi.rpc("reserve_crossword_puzzle", {
    p_difficulty: difficulty,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title ?? "Sports Crossword"),
    sportLabel: String(row.sport_label ?? "Mixed sports"),
    difficulty: Number(row.difficulty ?? difficulty),
    size: Number(row.grid_size ?? 9),
    entries: Array.isArray(row.entries) ? (row.entries as CrosswordEntry[]) : [],
  };
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
