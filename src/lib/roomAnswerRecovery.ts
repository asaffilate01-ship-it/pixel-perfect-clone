/**
 * A player may only recover the result of their OWN previously settled room
 * submission. Never serialize source answer rules, submitted answer text, user
 * identifiers or calibration data into this response.
 */
export type SettledRoomAnswer = {
  settled: true;
  correct: boolean;
  usedClue: boolean;
  passed: boolean;
  answer: string;
};

export type UnsettledRoomAnswer = { settled: false; needsReview: boolean };
export type RoomAnswerRecovery = SettledRoomAnswer | UnsettledRoomAnswer;

export function settledRoomAnswer(
  submission: { action: string; correct: boolean | null; movement: number },
  canonicalAnswer: string,
  hintRecorded: boolean,
): SettledRoomAnswer {
  if (
    !["pass", "answer"].includes(submission.action) ||
    typeof submission.correct !== "boolean" ||
    (submission.correct ? ![5, 6].includes(submission.movement) : submission.movement !== 0) ||
    (submission.action === "pass" && submission.correct) ||
    !canonicalAnswer.trim()
  ) {
    throw new Error("The stored room answer requires review");
  }
  return {
    settled: true,
    correct: submission.correct,
    usedClue: hintRecorded || submission.movement === 5,
    passed: submission.action === "pass",
    answer: canonicalAnswer,
  };
}
