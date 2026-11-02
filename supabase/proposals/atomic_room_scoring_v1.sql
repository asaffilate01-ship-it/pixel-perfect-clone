-- FANZENO REVIEW PROPOSAL — NOT AN APPLIED MIGRATION.
--
-- This file is intentionally under supabase/proposals, not supabase/migrations.
-- After reviewing the live Fanzeno schema, create a real CLI-generated migration
-- with this SQL; test it on Fanzeno staging BEFORE enabling the server flag.
--
-- Goal: one PostgREST RPC/one PostgreSQL transaction for room-question claim,
-- verified attempt/ability/XP, submission, player progress, and next turn.
-- Calls must be made ONLY via the authenticated TanStack server and its
-- service_role Supabase client. No user or browser receives these credentials.

create or replace function public.settle_arcade_room_answer_v1(
  p_room_id uuid,
  p_room_question_id uuid,
  p_question_id uuid,
  p_actor_id uuid,
  p_answer_text text,
  p_correct boolean,
  p_passed boolean,
  p_client_used_clue boolean,
  p_input_method text,
  p_transcript_confidence numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $body$
declare
  v_room public.arcade_rooms%rowtype;
  v_player public.arcade_room_players%rowtype;
  v_issued public.arcade_questions%rowtype;
  v_bank public.question_bank%rowtype;
  v_prior public.arcade_submissions%rowtype;
  v_now timestamptz;
  v_response_ms int;
  v_used_clue boolean;
  v_movement int;
  v_position int;
  v_won boolean;
  v_again boolean;
  v_next_seat smallint;
  v_next_round smallint;
  v_answer text;
begin
  if p_actor_id is null or p_room_id is null or p_room_question_id is null or p_question_id is null then
    raise exception 'Missing authenticated room answer scope';
  end if;
  if p_correct is null or p_passed is null or p_client_used_clue is null or
     (p_passed and p_correct) or
     p_input_method not in ('typed','voice') or p_input_method is null or
     length(coalesce(p_answer_text,'')) > 200 or
     (p_transcript_confidence is not null and
      (p_transcript_confidence < 0 or p_transcript_confidence > 1)) then
    raise exception 'Invalid verified answer parameters';
  end if;

  -- Common lock order: room, actor seat, question.  A timeout recovery
  -- updates the room first, so it cannot interleave with settlement.
  select * into v_room
  from public.arcade_rooms where id = p_room_id for update;
  if v_room.id is null then raise exception 'Room not found'; end if;

  select * into v_player
  from public.arcade_room_players
  where room_id = p_room_id and user_id = p_actor_id for update;
  if v_player.user_id is null or v_player.status in ('disconnected','finished') then
    raise exception 'Not an active room participant';
  end if;

  select * into v_issued
  from public.arcade_questions
  where id = p_room_question_id and room_id = p_room_id
    and question_id = p_question_id and active_user_id = p_actor_id
  for update;
  if v_issued.id is null then raise exception 'Question not issued to this player'; end if;

  select * into v_bank
  from public.question_bank
  where id = p_question_id;
  if v_bank.id is null then raise exception 'Question no longer exists'; end if;
  v_answer := coalesce(v_bank.answer_display_i18n->>'en', '');

  -- The exact room-question ID is the idempotency key. Replays return the
  -- original result WITHOUT awarding another point or touching the room.
  if v_issued.revealed_answer then
    select * into v_prior
    from public.arcade_submissions
    where question_id = v_issued.id and user_id = p_actor_id
    order by submitted_at desc limit 1;
    if v_prior.id is null then
      raise exception 'Question claimed without a settled submission; administrative review required';
    end if;
    return jsonb_build_object(
      'correct', coalesce(v_prior.correct,false),
      'movement', v_prior.movement,
      'usedClue', coalesce(v_issued.revealed_clue,false),
      'answer', v_answer,
      'duplicate', true,
      'roomStateChanged', false
    );
  end if;

  -- A settled answer remains replayable if its source question is later
  -- retired. Only NEW settlements require the source to remain verified.
  if not v_bank.active or v_bank.verification_status <> 'verified' then
    raise exception 'Question no longer verified';
  end if;

  -- Authoritative validation under the room lock (not a stale browser or
  -- preliminary server SELECT). No scoring of old turns or expired questions.
  v_now := clock_timestamp();
  if v_room.status <> 'active' or v_room.active_seat is distinct from v_player.seat then
    raise exception 'It is no longer your turn';
  end if;
  if v_room.mode_slug not in ('quiz-ludo','quiz-snakes-ladders','sports-mastermind') then
    raise exception 'Unsupported ranked room mode';
  end if;
  if v_room.turn_started_at is null or v_room.turn_ends_at is null or
     v_room.turn_started_at >= v_room.turn_ends_at or
     v_now < v_room.turn_started_at or v_now >= v_room.turn_ends_at then
    raise exception 'Room turn has expired';
  end if;
  if v_issued.issued_at < v_room.turn_started_at or
     v_issued.expires_at is null or v_now >= v_issued.expires_at or
     v_issued.expires_at <= v_issued.issued_at then
    raise exception 'Question expired or issued for an earlier turn';
  end if;
  if exists (
    select 1 from public.arcade_questions newer
    where newer.room_id = p_room_id
      and newer.active_user_id = p_actor_id
      and newer.turn_no > v_issued.turn_no
      and newer.issued_at >= v_room.turn_started_at
  ) then
    raise exception 'Only the latest room question can be settled';
  end if;

  v_used_clue := coalesce(v_issued.revealed_clue,false) or p_client_used_clue;
  v_movement := case when p_correct then (case when v_used_clue then 5 else 6 end) else 0 end;
  v_response_ms := least(
    2147483647::numeric,
    greatest(0::numeric, round(extract(epoch from v_now - v_issued.issued_at) * 1000))
  )::int;

  -- A throw at ANY point rolls the whole PostgREST call back (including the
  -- verified attempt's ability, leaderboard, and calibration updates).
  update public.arcade_questions
  set revealed_answer = true,
      revealed_clue = v_used_clue
  where id = v_issued.id and revealed_answer = false;

  perform public.record_verified_question_attempt(
    p_actor_id, p_question_id, p_room_id, v_room.difficulty,
    p_correct, v_used_clue, p_passed, v_response_ms
  );

  insert into public.arcade_submissions (
    question_id, user_id, action, answer_text, correct, movement,
    awarded_points, input_method, transcript_confidence
  ) values (
    v_issued.id, p_actor_id, case when p_passed then 'pass' else 'answer' end,
    case when p_passed then null else p_answer_text end,
    p_correct, v_movement, case when p_correct then 100 else 0 end,
    p_input_method, p_transcript_confidence
  );

  v_position := coalesce(v_player.position,0);
  if v_room.mode_slug = 'quiz-snakes-ladders' then
    v_position := least(100, v_position + v_movement);
    v_position := case v_position
      when 4 then 14 when 14 then 28 when 40 then 59
      when 51 then 71 when 63 then 84
      when 17 then 7 when 32 then 12 when 48 then 26
      when 69 then 49 when 88 then 68 when 96 then 76
      else v_position end;
  elsif v_room.mode_slug = 'quiz-ludo' then
    v_position := least(57, v_position + v_movement);
  end if;

  update public.arcade_room_players
  set position = v_position,
      points = points + (case when p_correct then 100 else 0 end),
      correct_answers = correct_answers + (case when p_correct then 1 else 0 end),
      passes = passes + (case when p_passed then 1 else 0 end),
      last_seen_at = v_now
  where room_id = p_room_id and user_id = p_actor_id;

  -- Mastermind keeps the same seat on the clock after every answer.
  if v_room.mode_slug <> 'sports-mastermind' then
    v_won := (v_room.mode_slug = 'quiz-snakes-ladders' and v_position >= 100) or
             (v_room.mode_slug = 'quiz-ludo' and v_position >= 57);
    v_again := v_room.mode_slug = 'quiz-ludo' and v_movement = 6 and not v_won;

    select seat into v_next_seat
    from public.arcade_room_players
    where room_id = p_room_id and seat > v_player.seat
    order by seat limit 1;
    if v_next_seat is null then
      select min(seat) into v_next_seat
      from public.arcade_room_players where room_id = p_room_id;
    end if;
    if v_next_seat is null then raise exception 'Room has no next player'; end if;
    if v_again then v_next_seat := v_player.seat; end if;
    v_next_round := v_room.round_no;
    if not v_again and v_next_seat <= v_player.seat then
      v_next_round := v_next_round + 1;
    end if;

    update public.arcade_rooms
    set status = case when v_won then 'complete' else 'active' end,
        active_seat = v_next_seat,
        round_no = v_next_round,
        turn_started_at = v_now,
        turn_ends_at = case when v_won then null else v_now + interval '180 seconds' end
    where id = p_room_id;
  end if;

  return jsonb_build_object(
    'correct', p_correct,
    'movement', v_movement,
    'usedClue', v_used_clue,
    'answer', v_answer,
    'duplicate', false,
    'roomStateChanged', false
  );
end
$body$;

-- SECURITY INVOKER intentionally runs as service_role, not SECURITY DEFINER.
-- PostgREST's Data API exposes public functions but this grant strictly limits
-- who can execute settlement. Never send the service key to client bundles.
revoke all on function public.settle_arcade_room_answer_v1(
  uuid,uuid,uuid,uuid,text,boolean,boolean,boolean,text,numeric
) from public, anon, authenticated;
grant execute on function public.settle_arcade_room_answer_v1(
  uuid,uuid,uuid,uuid,text,boolean,boolean,boolean,text,numeric
) to service_role;
