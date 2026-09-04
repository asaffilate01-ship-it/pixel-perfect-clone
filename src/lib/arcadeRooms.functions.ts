import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { JUMPS, LUDO_HOME } from "@/lib/arcadeQuiz";

/**
 * Online arcade room actions (v0.11). Rooms, seats, questions and answers are all
 * controlled server-side; clients only ever see prompts and clues, never answer sets.
 */

const normalise = (x: string) =>
  x
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const words = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

function editDistance(a: string, b: string): number {
  const row: number[] = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j] ?? 0;
      const left = row[j - 1] ?? 0;
      row[j] = Math.min(above + 1, left + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length] ?? 0;
}

/** Accept authoritative aliases and limited typos without exposing possible answers. */
function answerMatches(input: string, accepted: string[]): boolean {
  const candidate = normalise(input);
  if (!candidate) return false;
  return accepted.some((answer) => {
    const canonical = normalise(answer);
    if (candidate === canonical) return true;
    const inputWords = words(input);
    const answerWords = words(answer);
    if (
      inputWords.length > 1 &&
      inputWords.length === answerWords.length &&
      [...inputWords].sort().join("") === [...answerWords].sort().join("")
    )
      return true;
    const longest = Math.max(candidate.length, canonical.length);
    if (Math.min(candidate.length, canonical.length) < 5) return false;
    const allowance = longest >= 12 ? 2 : 1;
    return (
      Math.abs(candidate.length - canonical.length) <= allowance &&
      editDistance(candidate, canonical) <= allowance
    );
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    mode: z.string().min(1),
    maxPlayers: z.number().int().min(2).max(4).default(4),
    difficulty: z.number().int().min(1).max(4).default(2),
    sportId: z.string().uuid().nullable().optional(),
    categoryKey: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal("join"), code: z.string().min(4) }),
  z.object({
    action: z.literal("matchmake"),
    mode: z.enum(["quiz-ludo", "quiz-snakes-ladders", "sports-mastermind"]),
    difficulty: z.number().int().min(1).max(4).default(2),
    sportId: z.string().uuid().nullable().optional(),
    categoryKey: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal("cancel_matchmaking") }),
  z.object({ action: z.literal("ready"), roomId: z.string().uuid(), ready: z.boolean() }),
  z.object({
    action: z.literal("settings"),
    roomId: z.string().uuid(),
    sportId: z.string().uuid().nullable().optional(),
    categoryKey: z.string().nullable().optional(),
    avatarId: z.string().optional(),
  }),
  z.object({ action: z.literal("start"), roomId: z.string().uuid() }),
  z.object({ action: z.literal("advance"), roomId: z.string().uuid() }),
  z.object({ action: z.literal("leave"), roomId: z.string().uuid() }),
]);

export type ArcadeRoomRow = {
  id: string;
  code: string;
  host_id: string;
  mode_slug: string;
  difficulty: number;
  status: string;
  settings: { max_players?: number } | null;
};

export type ArcadeRoomInput = z.infer<typeof actionSchema>;
export type ArcadeRoomResult = {
  room?: ArcadeRoomRow;
  ready?: boolean;
  started?: boolean;
  advanced?: boolean;
  finished?: boolean;
  left?: boolean;
  queued?: boolean;
  roomId?: string;
  settings?: Record<string, string | null>;
};

export const arcadeRoomAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => actionSchema.parse(data))
  .handler(async ({ data, context }): Promise<ArcadeRoomResult> => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, avatar_preset, preferred_sports")
      .eq("id", userId)
      .maybeSingle();

    const seatSettings = (extra: Record<string, unknown> = {}) => ({
      avatar_id: profile?.avatar_preset ?? "captain",
      sport_id: null,
      category_key: null,
      ...extra,
    });

    if (data.action === "matchmake") {
      const secureRpc = admin.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: string | null; error: { message: string } | null }>;
      const { data: roomId, error } = await secureRpc("matchmake_arcade_player", {
        p_user_id: userId,
        p_mode_slug: data.mode,
        p_difficulty: data.difficulty,
        p_sport_id: data.sportId ?? null,
        p_category_key: data.categoryKey ?? null,
      });
      if (error) throw new Error(error.message);
      if (roomId) {
        // A match is consumed as soon as this player receives it. The other player
        // keeps their ticket until their next poll, so both clients still reach the
        // same room without a completed ticket trapping either in an old match.
        await admin.from("arcade_matchmaking_queue").delete().eq("user_id", userId);
        return { roomId };
      }
      return { queued: true };
    }

    if (data.action === "cancel_matchmaking") {
      await admin.from("arcade_matchmaking_queue").delete().eq("user_id", userId);
      return { queued: false };
    }

    if (data.action === "create") {
      const createRoom = admin.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: ArcadeRoomRow | null; error: { message: string } | null }>;
      const { data: room, error } = await createRoom("create_arcade_room", {
        p_user_id: userId,
        p_mode_slug: data.mode,
        p_difficulty: data.difficulty,
        p_max_players: data.maxPlayers,
        p_sport_id: data.sportId ?? null,
        p_category_key: data.categoryKey ?? null,
      });
      if (error) throw new Error(error.message);
      if (!room) throw new Error("Could not create room");
      return { room };
    }

    if (data.action === "join") {
      const joinRoom = admin.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: ArcadeRoomRow | null; error: { message: string } | null }>;
      const { data: room, error } = await joinRoom("join_arcade_room", {
        p_user_id: userId,
        p_code: data.code.trim().toUpperCase(),
      });
      if (error) throw new Error(error.message);
      if (!room) throw new Error("Room not found or already started");
      return { room };
    }

    const { data: room } = await admin
      .from("arcade_rooms")
      .select("id, code, host_id, mode_slug, difficulty, status, settings")
      .eq("id", data.roomId)
      .maybeSingle();
    if (!room) throw new Error("Room not found");
    const { data: member } = await admin
      .from("arcade_room_players")
      .select("user_id, settings")
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a room participant");

    if (data.action === "ready") {
      await admin
        .from("arcade_room_players")
        .update({ status: data.ready ? "ready" : "active", last_seen_at: new Date().toISOString() })
        .eq("room_id", room.id)
        .eq("user_id", userId);
      return { ready: data.ready };
    }

    if (data.action === "settings") {
      const current = (member.settings ?? {}) as Record<string, string | null>;
      const next: Record<string, string | null> = {
        ...current,
        ...(data.sportId !== undefined ? { sport_id: data.sportId } : {}),
        ...(data.categoryKey !== undefined ? { category_key: data.categoryKey } : {}),
        ...(data.avatarId ? { avatar_id: data.avatarId } : {}),
      };
      await admin
        .from("arcade_room_players")
        .update({
          settings: next,
          ...(data.sportId !== undefined ? { sport_id: data.sportId } : {}),
          ...(data.categoryKey !== undefined ? { category_key: data.categoryKey } : {}),
          last_seen_at: new Date().toISOString(),
        })
        .eq("room_id", room.id)
        .eq("user_id", userId);
      return { settings: next };
    }

    if (data.action === "start") {
      if (room.host_id !== userId) throw new Error("Only the host can start");
      const { data: members } = await admin
        .from("arcade_room_players")
        .select("status")
        .eq("room_id", room.id);
      if ((members?.length ?? 0) < 2 || members?.some((m) => m.status !== "ready"))
        throw new Error("At least two players must be ready");
      await admin
        .from("arcade_rooms")
        .update({
          status: "active",
          active_seat: 0,
          round_no: 1,
          turn_started_at: new Date().toISOString(),
          turn_ends_at: new Date(Date.now() + 180_000).toISOString(),
        })
        .eq("id", room.id);
      return { started: true };
    }

    if (data.action === "advance") {
      // Mastermind: the active player's 3-minute slot ended. Host or active player may pass the baton.
      const { data: players } = await admin
        .from("arcade_room_players")
        .select("user_id, seat")
        .eq("room_id", room.id)
        .order("seat");
      const { data: live } = await admin
        .from("arcade_rooms")
        .select("active_seat, round_no")
        .eq("id", room.id)
        .single();
      const seats = (players ?? []).map((p) => p.seat);
      const activeUser = players?.find((p) => p.seat === live?.active_seat)?.user_id;
      if (room.host_id !== userId && activeUser !== userId)
        throw new Error("Only the host or active player can end a turn");
      const idx = seats.indexOf(live?.active_seat ?? 0);
      const wrap = idx + 1 >= seats.length;
      const nextSeat = wrap ? (seats[0] ?? 0) : (seats[idx + 1] ?? 0);
      const nextRound = wrap ? (live?.round_no ?? 1) + 1 : (live?.round_no ?? 1);
      await admin
        .from("arcade_rooms")
        .update({
          active_seat: nextSeat,
          round_no: nextRound,
          status: nextRound > 2 ? "finished" : "active",
          turn_started_at: new Date().toISOString(),
          turn_ends_at: new Date(Date.now() + 180_000).toISOString(),
        })
        .eq("id", room.id);
      return { advanced: true, finished: nextRound > 2 };
    }

    // leave
    const leaveRoom = admin.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    const { error: leaveError } = await leaveRoom("leave_arcade_room", {
      p_user_id: userId,
      p_room_id: room.id,
    });
    if (leaveError) throw new Error(leaveError.message);
    return { left: true };
  });

export type FairQuestion = {
  id: string;
  prompt: string;
  clue: string | null;
  question_type: string;
  difficulty_percentile: number;
};

const questionSchema = z.object({
  roomId: z.string().uuid().nullable().optional(),
  sportId: z.string().uuid(),
  competitionId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
  difficulty: z.number().int().min(1).max(4).default(2),
  questionTypes: z.array(z.string()).nullable().optional(),
});

/** Reserve a fair, never-recently-seen verified question. Only prompt + clue are returned. */
export const nextFairQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => questionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("reserve_fair_question", {
      p_user_id: context.userId,
      p_room_id: (data.roomId ?? null) as unknown as string,
      p_sport_id: data.sportId,
      ...(data.competitionId ? { p_competition_id: data.competitionId } : {}),
      ...(data.category ? { p_category_key: data.category } : {}),
      p_difficulty: data.difficulty,
      ...(data.questionTypes ? { p_question_types: data.questionTypes } : {}),
    });
    if (error) throw new Error(error.message);
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await admin
      .from("question_bank")
      .select("id, prompt_i18n, clue_i18n, question_type, difficulty_percentile")
      .eq("id", id as string)
      .single();
    if (!q) throw new Error("Question unavailable");
    const prompt = (q.prompt_i18n as Record<string, string>)["en"] ?? "";
    const clue = (q.clue_i18n as Record<string, string> | null)?.["en"] ?? null;
    if (data.roomId) {
      await admin.from("arcade_questions").insert({
        room_id: data.roomId,
        question_id: q.id,
        active_user_id: context.userId,
        sport_id: data.sportId,
        competition_id: data.competitionId ?? null,
        prompt_i18n: q.prompt_i18n,
        clue_i18n: q.clue_i18n,
        answer_display_i18n: {},
        turn_no: Math.floor(Date.now() / 1000),
        expires_at: new Date(Date.now() + 180_000).toISOString(),
      });
    }
    return {
      question: {
        id: q.id,
        prompt,
        clue,
        question_type: q.question_type,
        difficulty_percentile: Number(q.difficulty_percentile),
      } as FairQuestion,
    };
  });

const answerSchema = z.object({
  questionId: z.string().uuid(),
  roomId: z.string().uuid().nullable().optional(),
  answer: z.string().max(200).default(""),
  passed: z.boolean().default(false),
  usedClue: z.boolean().default(false),
  difficulty: z.number().int().min(1).max(4).default(2),
  responseMs: z.number().int().min(0).default(0),
  inputMethod: z.enum(["typed", "voice"]).default("typed"),
  transcriptConfidence: z.number().min(0).max(1).nullable().optional(),
});

const challengeSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().trim().min(1).max(200),
});

/** Save a recent rejected answer for editorial review; this never changes the game score. */
export const challengeArcadeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => challengeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: recentAttempt } = await admin
      .from("question_attempts")
      .select("id")
      .eq("question_id", data.questionId)
      .eq("user_id", context.userId)
      .eq("correct", false)
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!recentAttempt) throw new Error("Only a recent rejected answer can be challenged");

    const normalised = normalise(data.answer);
    const db = admin as unknown as {
      from: (table: "answer_challenges") => {
        upsert: (
          row: Record<string, unknown>,
          options: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await db.from("answer_challenges").upsert(
      {
        question_id: data.questionId,
        user_id: context.userId,
        submitted_answer: data.answer,
        normalised_answer: normalised,
      },
      { onConflict: "question_id,user_id,normalised_answer", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return { saved: true };
  });

/** Server-checks an answer, records the attempt for calibration, then reveals the canonical answer. */
export const submitArcadeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => answerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: q } = await admin
      .from("question_bank")
      .select("answer_rule, answer_display_i18n")
      .eq("id", data.questionId)
      .eq("verification_status", "verified")
      .maybeSingle();
    if (!q) throw new Error("Question unavailable");

    let roomQuestionId: string | null = null;
    if (data.roomId) {
      const { data: roomQ } = await admin
        .from("arcade_questions")
        .select("id, active_user_id, expires_at, revealed_answer")
        .eq("room_id", data.roomId)
        .eq("question_id", data.questionId)
        .order("turn_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!roomQ || roomQ.active_user_id !== context.userId || roomQ.revealed_answer)
        throw new Error("Not your active question");
      roomQuestionId = roomQ.id;
    }

    const accepted = ((q.answer_rule as { accepted?: string[] }) ?? {}).accepted ?? [];
    const correct =
      !data.passed && data.answer.trim().length > 0 && answerMatches(data.answer, accepted);
    const movement = correct ? (data.usedClue ? 5 : 6) : 0;

    // Service-role only: clients cannot forge correct answers or progression points by calling the RPC.
    const secureRpc = admin.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
    const { error } = await secureRpc("record_verified_question_attempt", {
      p_user_id: context.userId,
      p_question_id: data.questionId,
      p_room_id: (data.roomId ?? null) as unknown as string,
      p_difficulty: data.difficulty,
      p_correct: correct,
      p_used_clue: data.usedClue,
      p_passed: data.passed,
      p_response_ms: data.responseMs,
    });
    if (error) throw new Error(error.message);

    const answer = (q.answer_display_i18n as Record<string, string> | null)?.["en"] ?? "";

    if (data.roomId && roomQuestionId) {
      // Reveal to the room, record the submission, move the token / score, and pass the turn.
      await admin
        .from("arcade_questions")
        .update({ revealed_answer: true })
        .eq("id", roomQuestionId);
      await admin.from("arcade_submissions").insert({
        question_id: roomQuestionId,
        user_id: context.userId,
        action: data.passed ? "pass" : "answer",
        answer_text: data.passed ? null : data.answer,
        correct,
        movement,
        awarded_points: correct ? 100 : 0,
        input_method: data.inputMethod,
        transcript_confidence: data.transcriptConfidence ?? null,
      });

      const [{ data: room }, { data: players }] = await Promise.all([
        admin
          .from("arcade_rooms")
          .select("id, mode_slug, active_seat, round_no, status")
          .eq("id", data.roomId)
          .single(),
        admin
          .from("arcade_room_players")
          .select("user_id, seat, position, points, passes, correct_answers")
          .eq("room_id", data.roomId)
          .order("seat"),
      ]);
      const me = players?.find((p) => p.user_id === context.userId);
      if (room && me) {
        const mode = room.mode_slug;
        let position = me.position;
        if (mode === "quiz-snakes-ladders") {
          const raw = Math.min(100, position + movement);
          position = JUMPS[raw] ?? raw;
        } else if (mode === "quiz-ludo") {
          position = Math.min(LUDO_HOME, position + movement);
        }
        await admin
          .from("arcade_room_players")
          .update({
            position,
            points: me.points + (correct ? 100 : 0),
            passes: me.passes + (data.passed ? 1 : 0),
            correct_answers: me.correct_answers + (correct ? 1 : 0),
            last_seen_at: new Date().toISOString(),
          })
          .eq("room_id", data.roomId)
          .eq("user_id", context.userId);

        const won =
          (mode === "quiz-snakes-ladders" && position >= 100) ||
          (mode === "quiz-ludo" && position >= LUDO_HOME);
        // Mastermind keeps the same player on the clock; the turn ends via the "advance" action.
        if (mode === "sports-mastermind") return { correct, answer, movement };
        // A clean first-time answer in Ludo earns another go, like rolling a six.
        const again = mode === "quiz-ludo" && movement === 6 && !won;
        const seats = (players ?? []).map((p) => p.seat).sort((a, b) => a - b);
        const idx = seats.indexOf(me.seat);
        const nextSeat = again ? me.seat : (seats[(idx + 1) % seats.length] ?? me.seat);
        await admin
          .from("arcade_rooms")
          .update({
            status: won ? "finished" : room.status,
            active_seat: nextSeat,
            round_no: nextSeat <= me.seat && !again ? room.round_no + 1 : room.round_no,
            turn_started_at: new Date().toISOString(),
            turn_ends_at: new Date(Date.now() + 180_000).toISOString(),
          })
          .eq("id", data.roomId);
      }
    }

    return { correct, answer, movement };
  });
