-- READ-ONLY preflight for Fanzeno staging, ref hcncbiufgcodempoapbf.
-- Run ONLY after verifying the project ID and backing up the right database.
-- Never run against the unrelated DISHBEE project.
-- A missing candidate function is expected BEFORE the reviewed rollout.

select
  current_database() as database_name,
  to_regprocedure('public.settle_arcade_room_answer_v1(uuid,uuid,uuid,uuid,text,boolean,boolean,boolean,text,numeric)') is not null
    as atomic_settlement_installed,
  to_regprocedure('public.record_verified_question_attempt(uuid,uuid,uuid,smallint,boolean,boolean,boolean,integer)') is not null
    as verified_attempt_function_installed;

with candidate as (
  select to_regprocedure(
    'public.settle_arcade_room_answer_v1(uuid,uuid,uuid,uuid,text,boolean,boolean,boolean,text,numeric)'
  ) as oid
)
select
  case when oid is null then null else has_function_privilege('service_role',oid,'EXECUTE') end
    as service_role_may_execute,
  case when oid is null then null else has_function_privilege('authenticated',oid,'EXECUTE') end
    as authenticated_may_execute,
  case when oid is null then null else has_function_privilege('anon',oid,'EXECUTE') end
    as anon_may_execute
from candidate;

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'arcade_rooms' and column_name in
      ('id','status','mode_slug','active_seat','round_no','turn_started_at','turn_ends_at','difficulty'))
    or (table_name = 'arcade_questions' and column_name in
      ('id','room_id','question_id','active_user_id','issued_at','expires_at','revealed_answer','revealed_clue'))
    or (table_name = 'arcade_submissions' and column_name in
      ('question_id','user_id','action','answer_text','correct','movement','awarded_points','input_method','transcript_confidence'))
    or (table_name = 'arcade_room_players' and column_name in
      ('room_id','user_id','seat','status','position','points','correct_answers','passes'))
  )
order by table_name,column_name;
