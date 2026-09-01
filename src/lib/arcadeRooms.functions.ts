import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { JUMPS, LUDO_HOME } from "@/lib/arcadeQuiz";

/**
 * Online arcade room actions (v0.11). Rooms, seats, questions and answers are all
 * controlled server-side; clients only ever see prompts and clues, never answer sets.
 */

const roomCode = () => `FZ-${crypto.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;

const normalise = (x: string) =>
  x
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

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
  z.object({ action: z.literal("ready"), roomId: z.string().uuid(), ready: z.boolean() }),
  z.object({
    action: z.literal("settings"),
    roomId: z.string().uuid(),
    sportId: z.string().uuid().nullable().optional(),
    categoryKey: z.string().nullable().optional(),
    avatarId: z.string().optional(),
  }),
  z.object({ action: z.literal("start"), roomId: z.string().uuid() }),
  z.object({ action: z.literal("leave"), roomId: z.string().uuid() }),
]);

export type ArcadeRoomRow = {
  id: string;
  code: string;
  host_id: string;
  mode_slug: string;
  difficulty: number;
  status: string;
  settings: Record<string, unknown>;
};

export const arcadeRoomAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => actionSchema.parse(data))
  .handler(async ({ data, context }) => {
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

    if (data.action === "create") {
      const { data: allowed } = await admin.rpc("can_host_game", { p_user_id: userId, p_mode_slug: data.mode });
      if (!allowed) throw new Error("Fanzeno Pro is required to host this game");
      const { data: room, error } = await admin
        .from("arcade_rooms")
        .insert({
          code: roomCode(),
          host_id: userId,
          mode_slug: data.mode,
          difficulty: data.difficulty,
          visibility: "private",
          settings: { max_players: data.maxPlayers },
        })
        .select("id, code, host_id, mode_slug, difficulty, status, settings")
        .single();
      if (error) throw new Error(error.message);
      const { error: seatErr } = await admin.from("arcade_room_players").insert({
        room_id: room.id,
        user_id: userId,
        seat: 0,
        display_name: profile?.display_name ?? "Host",
        status: "ready",
        sport_id: data.sportId ?? null,
        category_key: data.categoryKey ?? null,
        settings: seatSettings({ sport_id: data.sportId ?? null, category_key: data.categoryKey ?? null }),
      });
      if (seatErr) throw new Error(seatErr.message);
      return { room: room as ArcadeRoomRow };
    }

    if (data.action === "join") {
      const { data: room } = await admin
        .from("arcade_rooms")
        .select("id, code, host_id, mode_slug, difficulty, status, settings")
        .eq("code", data.code.trim().toUpperCase())
        .eq("status", "lobby")
        .maybeSingle();
      if (!room) throw new Error("Room not found or already started");
      const { data: members } = await admin
        .from("arcade_room_players")
        .select("seat, user_id")
        .eq("room_id", room.id)
        .order("seat");
      if (members?.some((m) => m.user_id === userId)) return { room: room as ArcadeRoomRow };
      const max = Number((room.settings as { max_players?: number } | null)?.max_players ?? 4);
      if ((members?.length ?? 0) >= max) throw new Error("Room is full");
      const used = new Set((members ?? []).map((m) => m.seat));
      const seat = [0, 1, 2, 3].find((s) => !used.has(s));
      if (seat === undefined) throw new Error("Room is full");
      const { error } = await admin.from("arcade_room_players").insert({
        room_id: room.id,
        user_id: userId,
        seat,
        display_name: profile?.display_name ?? "Player",
        status: "active",
        settings: seatSettings(),
      });
      if (error) throw new Error(error.message);
      return { room: room as ArcadeRoomRow };
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
      const current = (member.settings ?? {}) as Record<string, unknown>;
      const next = {
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
      const { data: members } = await admin.from("arcade_room_players").select("status").eq("room_id", room.id);
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

    // leave
    await admin.from("arcade_room_players").delete().eq("room_id", room.id).eq("user_id", userId);
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
      p_competition_id: data.competitionId ?? undefined,
      p_category_key: data.category ?? undefined,
      p_difficulty: data.difficulty,
      p_question_types: data.questionTypes ?? undefined,
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
      question: { id: q.id, prompt, clue, question_type: q.question_type, difficulty_percentile: Number(q.difficulty_percentile) } as FairQuestion,
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

    const accepted = (((q.answer_rule as { accepted?: string[] }) ?? {}).accepted ?? []).map(normalise);
    const correct = !data.passed && data.answer.trim().length > 0 && accepted.includes(normalise(data.answer));
    const movement = correct ? (data.usedClue ? 5 : 6) : 0;

    const { error } = await context.supabase.rpc("record_question_attempt", {
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
      await admin.from("arcade_questions").update({ revealed_answer: true }).eq("id", roomQuestionId);
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
        admin.from("arcade_rooms").select("id, mode_slug, active_seat, round_no, status").eq("id", data.roomId).single(),
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
          (mode === "quiz-snakes-ladders" && position >= 100) || (mode === "quiz-ludo" && position >= LUDO_HOME);
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
