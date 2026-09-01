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
