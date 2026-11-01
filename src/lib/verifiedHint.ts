/**
 * Rank points and race movement must never trust a client that says it did
 * not use a clue after the server has recorded a reveal.
 *
 * Accepting an old client's voluntary true flag is conservative: it can only
 * reduce its reward, never erase a hint already disclosed by the server.
 */
export function authoritativeClueUsed(
  recordedRoomReveal: boolean,
  soloSelectionScope: unknown,
  clientDeclaredClue: boolean,
): boolean {
  const savedSoloReveal =
    typeof soloSelectionScope === "object" &&
    soloSelectionScope !== null &&
    !Array.isArray(soloSelectionScope) &&
    (soloSelectionScope as Record<string, unknown>)["hint_used"] === true;
  return recordedRoomReveal || savedSoloReveal || clientDeclaredClue;
}

/** Clues are disclosed only after reservation and server-side usage marking. */
export function verifiedClueText(clueI18n: unknown): string {
  if (typeof clueI18n !== "object" || clueI18n === null || Array.isArray(clueI18n)) {
    throw new Error("This question has no verified clue available");
  }
  const hint = (clueI18n as Record<string, unknown>)["en"];
  if (typeof hint !== "string" || !hint.trim()) {
    throw new Error("This question has no verified clue available");
  }
  return hint.trim();
}
