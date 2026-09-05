-- Stronger anti-repeat selection. Preserve exact difficulty fairness while adding
-- a recent-question queue and enough random weight to vary equally eligible items.

create or replace function public.reserve_fair_question(
  p_user_id uuid,
  p_room_id uuid,
  p_sport_id uuid,
  p_competition_id uuid default null,
  p_category_key text default null,
  p_difficulty smallint default 2,
  p_question_types text[] default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  band_low numeric;
  band_high numeric;
  target numeric;
  chosen uuid;
  candidates int := 0;
  cooldown int := 120;
  recent_limit int := 12;
  score numeric;
begin
  if p_difficulty not between 1 and 4 then
    raise exception 'Difficulty must be Easy (1), Medium (2), Hard (3), or Expert (4)';
  end if;
  if auth.uid() is distinct from p_user_id and not public.has_staff_role() then
    raise exception 'Cannot select for another player';
  end if;
  if p_room_id is not null and not public.is_arcade_participant(p_room_id) then
    raise exception 'Player is not a participant in this room';
  end if;

  band_low := (p_difficulty - 1) * .25;
  band_high := p_difficulty * .25;
  target := (band_low + band_high) / 2;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_room_id::text,p_user_id::text),0));

  loop
    with recent as (
      select e.question_id
      from public.question_exposures e
      where e.user_id = p_user_id
      order by e.exposed_at desc
      limit recent_limit
    ), pool as (
      select q.id,
        (1 - abs(q.difficulty_percentile - target)) * 7
        + q.quality_score * 2
        + case when q.calibration_attempts >= 30 then 1 else .35 end
        + least(1, extract(epoch from (
            now() - coalesce(max(e.exposed_at), now() - interval '365 days')
          )) / 31536000)
        + random() * 4 as rank_score
      from public.question_bank q
      left join public.question_exposures e on e.question_id = q.id
      where q.sport_id = p_sport_id
        and (p_competition_id is null or q.competition_id = p_competition_id)
        and (p_category_key is null or q.category_key = p_category_key)
        and (p_question_types is null or q.question_type = any(p_question_types))
        and q.active
        and q.verification_status = 'verified'
        and q.quality_score >= .8
        and q.ambiguity_score <= .1
        and q.difficulty_percentile >= band_low
        and (q.difficulty_percentile < band_high
          or (p_difficulty = 4 and q.difficulty_percentile <= 1))
        and (recent_limit = 0 or not exists (
          select 1 from recent where recent.question_id = q.id
        ))
        and not exists (
          select 1 from public.question_exposures rx
          where rx.question_id = q.id
            and p_room_id is not null
            and rx.room_id = p_room_id
        )
        and not exists (
          select 1 from public.question_exposures ux
          where ux.question_id = q.id
            and ux.user_id = p_user_id
            and ux.exposed_at > now() - make_interval(days => cooldown)
        )
      group by q.id, q.difficulty_percentile, q.quality_score, q.calibration_attempts
      order by rank_score desc
      limit 100
    )
    select count(*), (array_agg(id order by rank_score desc))[1], max(rank_score)
    into candidates, chosen, score from pool;

    exit when chosen is not null or (cooldown = 1 and recent_limit = 0);
    if cooldown > 1 then
      cooldown := case cooldown when 120 then 60 when 60 then 30 when 30 then 14
        when 14 then 7 when 7 then 1 else 1 end;
    else
      recent_limit := case recent_limit when 12 then 6 when 6 then 3
        when 3 then 1 else 0 end;
    end if;
  end loop;

  if chosen is null then
    raise exception 'No verified % question is available for this exact scope',
      case p_difficulty when 1 then 'Easy' when 2 then 'Medium'
        when 3 then 'Hard' else 'Expert' end;
  end if;

  insert into public.question_exposures(question_id,user_id,room_id,selection_scope)
  values(chosen,p_user_id,p_room_id,jsonb_build_object(
    'sport_id',p_sport_id,'competition_id',p_competition_id,
    'category',p_category_key,'difficulty',p_difficulty,
    'band_low',band_low,'band_high',band_high,'cooldown_days',cooldown,
    'recent_queue',recent_limit
  ));
  insert into public.question_selection_audit(
    user_id,room_id,question_id,requested_scope,target_percentile,candidate_count,
    cooldown_days,selection_score
  ) values(
    p_user_id,p_room_id,chosen,
    jsonb_build_object('sport_id',p_sport_id,'competition_id',p_competition_id,
      'category',p_category_key,'difficulty',p_difficulty,'strict_band',true,
      'recent_queue',recent_limit),
    target,candidates,cooldown,score
  );
  return chosen;
end$$;

revoke all on function public.reserve_fair_question(
  uuid,uuid,uuid,uuid,text,smallint,text[]
) from public, anon;
grant execute on function public.reserve_fair_question(
  uuid,uuid,uuid,uuid,text,smallint,text[]
) to authenticated, service_role;
