/** Fair, varied, seeded Higher or Lower comparisons. Pure for deterministic tests. */
export type ComparisonCard = {
  name: string;
  value: number;
  display: string;
  metric: string;
  sport: string;
};

export type ComparisonPair<T extends ComparisonCard> = { a: T; b: T; gap: number };

function randomFromSeed(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** Only like-for-like statistics can be compared. Harder levels use smaller differences. */
export function makeHigherLowerRun<T extends ComparisonCard>(
  cards: T[], difficulty: number, seed: number, limit = 15,
): ComparisonPair<T>[] {
  const random = randomFromSeed(seed + 1);
  const groups = new Map<string, T[]>();
  for (const card of cards) {
    if (!Number.isFinite(card.value) || card.value < 0 || !card.name.trim()) continue;
    const key = `${card.sport.trim().toLowerCase()}::${card.metric.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    if (!group.some((item) => item.name.toLowerCase() === card.name.toLowerCase())) {
      group.push(card);
      groups.set(key, group);
    }
  }
  const pairs: ComparisonPair<T>[] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        pairs.push({ a, b, gap: Math.abs(a.value - b.value) / Math.max(a.value, b.value, 1) });
      }
    }
  }
  // Seeded tie-breaking maintains difficulty ordering and fresh, reproducible runs.
  const ranked = shuffle(pairs, random).sort((a, b) => a.gap - b.gap);
  const total = ranked.length;
  const band = Math.max(Math.min(Math.ceil(total * 0.55), total), Math.min(limit, total));
  let pool: ComparisonPair<T>[];
  switch (difficulty) {
    case 1:
      pool = ranked.slice(Math.max(0, total - band));
      break;
    case 2:
      pool = ranked.slice(Math.max(0, Math.floor(total * 0.25)), Math.min(total, Math.ceil(total * 0.85)));
      break;
    case 3:
      pool = ranked.slice(Math.floor(total * 0.1), Math.min(total, Math.ceil(total * 0.7)));
      break;
    default:
      pool = ranked.slice(0, band);
  }
  if (!pool.length) pool = ranked;
  // Prefer fresh pairs and limit athlete repetition without starving small banks.
  const usage = new Map<string, number>();
  const chosen: ComparisonPair<T>[] = [];
  const shuffledPool = shuffle(pool, random);
  for (const pair of shuffledPool) {
    if (chosen.length >= limit) break;
    const ids = [`${pair.a.sport}:${pair.a.name}`, `${pair.b.sport}:${pair.b.name}`];
    if (ids.some((id) => (usage.get(id) ?? 0) >= 2)) continue;
    chosen.push(pair);
    ids.forEach((id) => usage.set(id, (usage.get(id) ?? 0) + 1));
  }
  for (const pair of shuffledPool) {
    if (chosen.length >= Math.min(limit, shuffledPool.length)) break;
    if (!chosen.includes(pair)) chosen.push(pair);
  }
  // Without this, data ordered by leaderboard is almost always answered "Lower".
  return shuffle(chosen, random).map((pair) =>
    random() < 0.5 ? { ...pair, a: pair.b, b: pair.a } : pair,
  );
}
