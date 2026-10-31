import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { JUMPS, LUDO_HOME } from "@/lib/arcadeQuiz";
import {
  assertActiveRoomTurnWindow,
  assertQuestionIssuedThisTurn,
  assertRoomAnswerDifficulty,
  assertRoomQuestionScope,
  assertQuizRaceTurnRecoverable,
  firstOccupiedSeat,
  nextQuizRaceTurn,
  nextMastermindTurn,
  publicRoomQuestion,
  ROOM_COMPLETE_STATUS,
} from "@/lib/roomLifecycle";

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
    mode: z.enum(["quiz-ludo", "quiz-snakes-ladders", "sports-mastermind"]),
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
  z.object({ action: z.literal("recover_timeout"), roomId: z.string().uuid() }),
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

    const requireHostingAccess = async (mode: string) => {
      if (mode === "quiz-snakes-ladders") return;
      // Client-side Pro gating is not authorization. Enforce it for both private
      // hosting and matchmaking, even when someone calls this endpoint directly.
      const { data: allowed, error } = await admin.rpc("can_host_game", {
        p_user_id: userId,
        p_mode_slug: mode,
      });
      if (error) throw new Error(error.message);
      if (!allowed) throw new Error("Fanzeno Pro is required to host this game");
    };

    if (data.action === "matchmake") {
      if (!data.sportId) throw new Error("Choose a sport before entering ranked matchmaking");
      await requireHostingAccess(data.mode);
      const secureRpc = admin.rpc.bind(admin) as unknown as (
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
      const { error } = await admin.from("arcade_matchmaking_queue").delete().eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { queued: false };
    }

    if (data.action === "create") {
      await requireHostingAccess(data.mode);
      const createRoom = admin.rpc.bind(admin) as unknown as (
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
      const joinRoom = admin.rpc.bind(admin) as unknown as (
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
      .select("user_id, status, settings, sport_id")
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Not a room participant");

    if (data.action === "ready") {
      if (room.status !== "lobby") throw new Error("Room setup is already closed");
      const selectedSport = member.sport_id ?? (member.settings as { sport_id?: string | null } | null)?.sport_id;
      if (data.ready && !selectedSport)
        throw new Error("Choose a sport before marking yourself ready");
      const { error } = await admin
        .from("arcade_room_players")
        .update({ status: data.ready ? "ready" : "active", last_seen_at: new Date().toISOString() })
        .eq("room_id", room.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ready: data.ready };
    }

    if (data.action === "settings") {
      if (room.status !== "lobby") throw new Error("Room setup is already closed");
      const current = (member.settings ?? {}) as Record<string, string | null>;
      const next: Record<string, string | null> = {
        ...current,
        ...(data.sportId !== undefined ? { sport_id: data.sportId } : {}),
        ...(data.categoryKey !== undefined ? { category_key: data.categoryKey } : {}),
        ...(data.avatarId ? { avatar_id: data.avatarId } : {}),
      };
      const { error } = await admin
        .from("arcade_room_players")
        .update({
          settings: next,
          // Any player-settings change invalidates an earlier ready confirmation.
          status: "active",
          ...(data.sportId !== undefined ? { sport_id: data.sportId } : {}),
          ...(data.categoryKey !== undefined ? { category_key: data.categoryKey } : {}),
          last_seen_at: new Date().toISOString(),
        })
        .eq("room_id", room.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { settings: next };
    }

    if (data.action === "start") {
      if (room.host_id !== userId) throw new Error("Only the host can start");
      if (room.status !== "lobby") throw new Error("This match has already started");
      const { data: members, error: membersError } = await admin
        .from("arcade_room_players")
        .select("status, seat, sport_id")
        .eq("room_id", room.id);
      if (membersError) throw new Error(membersError.message);
      if ((members?.length ?? 0) < 2 || members?.some((m) => m.status !== "ready"))
        throw new Error("At least two players must be ready");
      if (members?.some((m) => !m.sport_id))
        throw new Error("Every player must choose a sport before starting");
      const firstSeat = firstOccupiedSeat((members ?? []).map((m) => m.seat));
      const { data: started, error: startError } = await admin
        .from("arcade_rooms")
        .update({
          status: "active",
          active_seat: firstSeat,
          round_no: 1,
          turn_started_at: new Date().toISOString(),
          turn_ends_at: new Date(Date.now() + 180_000).toISOString(),
        })
        .eq("id", room.id)
        .eq("status", "lobby")
        .select("id")
        .maybeSingle();
      if (startError) throw new Error(startError.message);
      if (!started) throw new Error("Another player already started this match");
      return { started: true };
    }

    if (data.action === "advance") {
      if (room.mode_slug !== "sports-mastermind") throw new Error("Only Mastermind uses timed advance");
      if (room.status !== "active") throw new Error("This round is no longer active");
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
      if (!live || !seats.length || live.active_seat === null) throw new Error("No active round");
      const activeUser = players?.find((p) => p.seat === live?.active_seat)?.user_id;
      if (room.host_id !== userId && activeUser !== userId)
        throw new Error("Only the host or active player can end a turn");
      const progression = nextMastermindTurn(seats, live.active_seat, live.round_no);
      const nextSeat = progression.seat;
      const nextRound = progression.round;
      const { data: advanced, error: advanceError } = await admin
        .from("arcade_rooms")
        .update({
          active_seat: nextSeat,
          round_no: nextRound,
          status: progression.complete ? ROOM_COMPLETE_STATUS : "active",
          turn_started_at: new Date().toISOString(),
          turn_ends_at: progression.complete ? null : new Date(Date.now() + 180_000).toISOString(),
        })
        .eq("id", room.id)
        .eq("status", "active")
        .eq("active_seat", live.active_seat)
        .eq("round_no", live.round_no)
        .select("id")
        .maybeSingle();
      if (advanceError) throw new Error(advanceError.message);
      if (!advanced) throw new Error("This round was already advanced");
      return { advanced: true, finished: progression.complete };
    }

    if (data.action === "recover_timeout") {
      // Any *currently seated* player may help an expired Quiz Race progress;
      // no client may skip a live turn or advance a different game mode.
      if (member.status === "disconnected" || member.status === "finished")
        throw new Error("You are no longer active in this room");
      const [roomResult, playersResult] = await Promise.all([
        admin
          .from("arcade_rooms")
          .select("status, mode_slug, active_seat, round_no, turn_started_at, turn_ends_at")
          .eq("id", room.id)
          .single(),
        admin
          .from("arcade_room_players")
          .select("seat")
          .eq("room_id", room.id)
          .order("seat"),
      ]);
      if (roomResult.error) throw new Error(roomResult.error.message);
      if (playersResult.error) throw new Error(playersResult.error.message);
      const live = roomResult.data;
      if (!live || live.active_seat === null) throw new Error("No active Quiz Race turn");
      const nowMs = Date.now();
      assertQuizRaceTurnRecoverable(
        live.mode_slug,
        live.status,
        live.turn_started_at,
        live.turn_ends_at,
        nowMs,
      );
      // The validator fails closed at runtime; narrow nullable database columns
      // explicitly as well before using them in the conditional update.
      if (!live.turn_started_at || !live.turn_ends_at) {
        throw new Error("Invalid Quiz Race turn deadline");
      }
      const next = nextQuizRaceTurn(
        (playersResult.data ?? []).map((player) => player.seat),
        live.active_seat,
        live.round_no,
      );
      const { data: advanced, error: updateError } = await admin
        .from("arcade_rooms")
        .update({
          active_seat: next.seat,
          round_no: next.round,
          turn_started_at: new Date(nowMs).toISOString(),
          turn_ends_at: new Date(nowMs + 180_000).toISOString(),
        })
        .eq("id", room.id)
        .eq("status", "active")
        .eq("active_seat", live.active_seat)
        .eq("round_no", live.round_no)
        .eq("turn_started_at", live.turn_started_at)
        .eq("turn_ends_at", live.turn_ends_at)
        .select("id")
        .maybeSingle();
      if (updateError) throw new Error(updateError.message);
      // Another player may already have recovered this turn; that is not a
      // second move. Refresh client room state instead of retrying the mutation.
      return { advanced: !!advanced };
    }

    // leave
    const leaveRoom = admin.rpc.bind(admin) as unknown as (
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
  /** Public answer choices only; correct answers stay on the server. */
  options?: string[];
};

const questionSchema = z.object({
  roomId: z.string().uuid().nullable().optional(),
  modeSlug: z.string().min(1).max(80).nullable().optional(),
  sportId: z.string().uuid(),
  competitionId: z.string().uuid().nullable().optional(),
  category: z.string().nullable().optional(),
  difficulty: z.number().int().min(1).max(4).default(2),
  questionTypes: z.array(z.string()).nullable().optional(),
});

async function requireActiveRoomTurn(
  admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  roomId: string,
  userId: string,
) {
  const [roomResult, playerResult] = await Promise.all([
    admin
      .from("arcade_rooms")
      .select("status, active_seat, mode_slug, round_no, difficulty, turn_started_at, turn_ends_at")
      .eq("id", roomId)
      .maybeSingle(),
    admin
      .from("arcade_room_players")
      .select("seat, status, sport_id, category_key, settings")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (roomResult.error) throw new Error(roomResult.error.message);
  if (playerResult.error) throw new Error(playerResult.error.message);
  const room = roomResult.data;
  const player = playerResult.data;
  if (!room || !player) throw new Error("You are not a participant in this room");
  if (room.status !== "active") throw new Error("This room is not active");
  if (room.active_seat === null || room.active_seat !== player.seat)
    throw new Error("It is not your turn");
  if (player.status === "disconnected" || player.status === "finished")
    throw new Error("This player cannot take a turn");
  assertActiveRoomTurnWindow(room.turn_started_at, room.turn_ends_at);
  return { room, player };
}

/** Reserve a fair, never-recently-seen verified question. Only prompt + clue are returned. */
export const nextFairQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => questionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    let currentRoomTurnStartedAt: string | null = null;
    if (data.roomId) {
      const { room, player } = await requireActiveRoomTurn(admin, data.roomId, context.userId);
      currentRoomTurnStartedAt = room.turn_started_at;
      assertRoomQuestionScope(
        { modeSlug: room.mode_slug, roundNo: room.round_no, difficulty: room.difficulty },
        {
          sportId: player.sport_id ??
            (player.settings as { sport_id?: string | null } | null)?.sport_id ?? null,
          categoryKey: player.category_key ??
            (player.settings as { category_key?: string | null } | null)?.category_key ?? null,
        },
        { sportId: data.sportId, categoryKey: data.category ?? null, difficulty: data.difficulty },
      );
    }
    if (!data.roomId && data.modeSlug) {
      const secureRpc = admin.rpc.bind(admin) as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      const { data: allowed, error: accessError } = await secureRpc("can_host_game", {
        p_user_id: context.userId,
        p_mode_slug: data.modeSlug,
      });
      if (accessError || !allowed) throw new Error("Fanzeno Pro is required for this game");
    }
    // Refreshes within the same player's turn must reuse their outstanding
    // question instead of consuming the verified bank or issuing duplicate turns.
    let id: string | null = null;
    let existingRoomQuestionId: string | null = null;
    if (data.roomId) {
      if (!currentRoomTurnStartedAt) throw new Error("No current room turn");
      const pending = admin
        .from("arcade_questions")
        .select("id, question_id")
        .eq("room_id", data.roomId)
        .eq("active_user_id", context.userId)
        .eq("revealed_answer", false)
        .gt("expires_at", new Date().toISOString())
        .gte("issued_at", currentRoomTurnStartedAt);
      const { data: existing, error: pendingError } = await pending
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pendingError) throw new Error(pendingError.message);
      if (existing?.question_id) {
        id = existing.question_id;
        existingRoomQuestionId = existing.id;
      }
    }
    if (!id) {
      const { data: reservedId, error } = await context.supabase.rpc("reserve_fair_question", {
        p_user_id: context.userId,
        p_room_id: (data.roomId ?? null) as unknown as string,
        p_sport_id: data.sportId,
        ...(data.competitionId ? { p_competition_id: data.competitionId } : {}),
        ...(data.category ? { p_category_key: data.category } : {}),
        p_difficulty: data.difficulty,
        ...(data.questionTypes ? { p_question_types: data.questionTypes } : {}),
      });
      if (error) {
        // An empty verified pool is an expected outcome, not a server fault.
        if (/No verified .* question is available/i.test(error.message)) {
          return { question: null, unavailable: error.message } as {
            question: FairQuestion | null;
            unavailable?: string;
          };
        }
        throw new Error(error.message);
      }
      id = reservedId as string | null;
    }
    if (!id) throw new Error("Question reservation returned no ID");
    const { data: q } = await admin
      .from("question_bank")
      .select("id, prompt_i18n, clue_i18n, question_type, difficulty_percentile, answer_rule")
      .eq("id", id as string)
      .single();
    if (!q) throw new Error("Question unavailable");
    const prompt = (q.prompt_i18n as Record<string, string>)["en"] ?? "";
    const clue = (q.clue_i18n as Record<string, string> | null)?.["en"] ?? null;
    // Answer rule is privileged. Only allow-listed distractor labels leave the server.
    const rawOptions = (q.answer_rule as { options?: unknown } | null)?.options;
    const options =
      q.question_type === "single_choice" && Array.isArray(rawOptions) &&
      rawOptions.length >= 2 && rawOptions.length <= 6 &&
      rawOptions.every((option): option is string =>
        typeof option === "string" && option.trim().length > 0 && option.length <= 90) &&
      new Set(rawOptions.map((option: string) => option.trim().toLowerCase())).size === rawOptions.length
        ? (rawOptions as string[])
        : undefined;
    if (options) {
      // Shuffle server-side so option position never becomes the answer key.
      for (let index = options.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [options[index], options[swapIndex]] = [options[swapIndex]!, options[index]!];
      }
    }
    if (data.roomId && !existingRoomQuestionId) {
      // A second question can be created within the same second during a fast
      // Mastermind round, so do not use Unix seconds as an unexamined unique ID.
      const { data: latest, error: turnError } = await admin
        .from("arcade_questions")
        .select("turn_no")
        .eq("room_id", data.roomId)
        .order("turn_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (turnError) throw new Error(turnError.message);
      const nextTurnNo = Math.max(Math.floor(Date.now() / 1000), (latest?.turn_no ?? 0) + 1);
      const { error: issueError } = await admin.from("arcade_questions").insert({
        room_id: data.roomId,
        question_id: q.id,
        active_user_id: context.userId,
        sport_id: data.sportId,
        competition_id: data.competitionId ?? null,
        prompt_i18n: q.prompt_i18n,
        clue_i18n: q.clue_i18n,
        answer_display_i18n: {},
        turn_no: nextTurnNo,
        expires_at: new Date(Date.now() + 180_000).toISOString(),
      });
      if (issueError) throw new Error("Could not issue this room question: " + issueError.message);
    }
    return {
      question: {
        id: q.id,
        prompt,
        clue,
        question_type: q.question_type,
        difficulty_percentile: Number(q.difficulty_percentile),
        ...(options ? { options } : {}),
      } as FairQuestion,
    } as { question: FairQuestion | null; unavailable?: string };
  });

/**
 * Spectator-safe view of the current verified question.
 * Only seated participants can view the current prompt; never return the
 * scoring answer, answer_rule, accepted aliases or other privileged fields.
 * Separate from nextFairQuestion so spectators never reserve new questions.
 */
export const observeActiveRoomQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ roomId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const [memberResult, roomResult] = await Promise.all([
      admin
        .from("arcade_room_players")
        .select("user_id, status")
        .eq("room_id", data.roomId)
        .eq("user_id", context.userId)
        .maybeSingle(),
      admin
        .from("arcade_rooms")
        .select("status, active_seat, turn_started_at")
        .eq("id", data.roomId)
        .maybeSingle(),
    ]);
    if (memberResult.error) throw new Error(memberResult.error.message);
    if (roomResult.error) throw new Error(roomResult.error.message);
    if (!memberResult.data || memberResult.data.status === "disconnected" ||
        memberResult.data.status === "finished") {
      throw new Error("Not an active participant in this room");
    }
    const room = roomResult.data;
    if (!room || room.status !== "active" || room.active_seat === null || !room.turn_started_at) {
      return { question: null };
    }

    const { data: activePlayer, error: activeError } = await admin
      .from("arcade_room_players")
      .select("user_id")
      .eq("room_id", data.roomId)
      .eq("seat", room.active_seat)
      .maybeSingle();
    if (activeError) throw new Error(activeError.message);
    if (!activePlayer) return { question: null };

    const { data: issued, error: issuedError } = await admin
      .from("arcade_questions")
      .select("id, prompt_i18n, issued_at")
      .eq("room_id", data.roomId)
      .eq("active_user_id", activePlayer.user_id)
      .eq("revealed_answer", false)
      .gte("issued_at", room.turn_started_at)
      .gt("expires_at", new Date().toISOString())
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (issuedError) throw new Error(issuedError.message);
    return {
      question: issued
        ? publicRoomQuestion({
            id: issued.id,
            prompt_i18n: issued.prompt_i18n as Record<string, string> | null,
            issued_at: issued.issued_at,
          })
        : null,
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
    let currentRoomTurnStartedAt: string | null = null;
    if (data.roomId) {
      const { room } = await requireActiveRoomTurn(admin, data.roomId, context.userId);
      assertRoomAnswerDifficulty(room.difficulty, data.difficulty);
      currentRoomTurnStartedAt = room.turn_started_at;
    }
    const { data: q } = await admin
      .from("question_bank")
      .select("answer_rule, answer_display_i18n, question_type")
      .eq("id", data.questionId)
      .eq("verification_status", "verified")
      .maybeSingle();
    if (!q) throw new Error("Question unavailable");

    let roomQuestionId: string | null = null;
    if (data.roomId) {
      if (!currentRoomTurnStartedAt) throw new Error("No current room turn");
      const { data: roomQ, error: roomQuestionError } = await admin
        .from("arcade_questions")
        .select("id, question_id, active_user_id, issued_at, expires_at, revealed_answer")
        .eq("room_id", data.roomId)
        .eq("active_user_id", context.userId)
        .eq("revealed_answer", false)
        .gte("issued_at", currentRoomTurnStartedAt)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (roomQuestionError) throw new Error(roomQuestionError.message);
      if (!roomQ || roomQ.question_id !== data.questionId ||
          roomQ.active_user_id !== context.userId || roomQ.revealed_answer)
        throw new Error("Not your active question");
      assertQuestionIssuedThisTurn(
        roomQ.issued_at,
        currentRoomTurnStartedAt,
        roomQ.expires_at,
      );
      roomQuestionId = roomQ.id;
    } else {
      // A solo player can only submit an actively reserved question. Prevent
      // repeated submits against an old ID from inflating their scoring history.
      const { data: exposure, error: exposureError } = await admin
        .from("question_exposures")
        .select("id, exposed_at")
        .eq("user_id", context.userId)
        .eq("question_id", data.questionId)
        .gte("exposed_at", new Date(Date.now() - 30 * 60_000).toISOString())
        .order("exposed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (exposureError) throw new Error(exposureError.message);
      if (!exposure) throw new Error("Reserve a new question before submitting an answer");
      const { data: previous, error: attemptsError } = await admin
        .from("question_attempts")
        .select("id")
        .eq("user_id", context.userId)
        .eq("question_id", data.questionId)
        .gte("created_at", exposure.exposed_at)
        .limit(1)
        .maybeSingle();
      if (attemptsError) throw new Error(attemptsError.message);
      if (previous) throw new Error("You already answered this question");
    }

    const rule = q.answer_rule as { accepted?: string[]; options?: string[] } | null;
    const accepted = Array.isArray(rule?.accepted) ? rule.accepted : [];
    const isValidChoice = q.question_type !== "single_choice" ||
      (Array.isArray(rule?.options) &&
        rule.options.some((option) => option === data.answer));
    const correct = !data.passed && data.answer.trim().length > 0 &&
      isValidChoice && answerMatches(data.answer, accepted);
    const movement = correct ? (data.usedClue ? 5 : 6) : 0;

    if (data.roomId && roomQuestionId) {
      // Conditional claim makes two simultaneous submissions for one room
      // question mutually exclusive. Claim before awarding points.
      const { data: claimed, error: claimError } = await admin
        .from("arcade_questions")
        .update({ revealed_answer: true })
        .eq("id", roomQuestionId)
        .eq("active_user_id", context.userId)
        .eq("revealed_answer", false)
        .select("id")
        .maybeSingle();
      if (claimError) throw new Error(claimError.message);
      if (!claimed) throw new Error("This question was already answered");
    }

    // Service-role only: clients cannot forge correct answers or progression points by calling the RPC.
    const secureRpc = admin.rpc.bind(admin) as unknown as (
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
      // The room question has already been exclusively claimed above.
      const { error: submissionError } = await admin.from("arcade_submissions").insert({
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
      if (submissionError) throw new Error(submissionError.message);

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
        const { error: scoreError } = await admin
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
        if (scoreError) throw new Error(scoreError.message);

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
        const { error: turnError } = await admin
          .from("arcade_rooms")
          .update({
            status: won ? ROOM_COMPLETE_STATUS : room.status,
            active_seat: nextSeat,
            round_no: nextSeat <= me.seat && !again ? room.round_no + 1 : room.round_no,
            turn_started_at: new Date().toISOString(),
            turn_ends_at: won ? null : new Date(Date.now() + 180_000).toISOString(),
          })
          .eq("id", data.roomId)
          .eq("status", "active");
        if (turnError) throw new Error(turnError.message);
      }
    }

    return { correct, answer, movement };
  });
