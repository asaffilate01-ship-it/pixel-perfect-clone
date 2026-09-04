-- Difficulty must mean the same thing in every sport. A selector may relax only
-- repeat protection; it must never cross the requested percentile band.
alter table public.question_bank
  drop constraint if exists question_bank_difficulty_percentile_range;
update public.question_bank
set difficulty_percentile = greatest(0, least(1, difficulty_percentile))
where difficulty_percentile < 0 or difficulty_percentile > 1;
alter table public.question_bank
  add constraint question_bank_difficulty_percentile_range
  check (difficulty_percentile >= 0 and difficulty_percentile <= 1) not valid;
alter table public.question_bank
  validate constraint question_bank_difficulty_percentile_range;

create or replace function public.question_difficulty_band(p_percentile numeric)
returns smallint language sql immutable parallel safe as $$
  select case
    when p_percentile < .25 then 1::smallint
    when p_percentile < .50 then 2::smallint
    when p_percentile < .75 then 3::smallint
    else 4::smallint
  end
$$;

create or replace view public.question_pool_coverage as
select
  sport_id,
  competition_id,
  category_key,
  public.question_difficulty_band(difficulty_percentile) as difficulty,
  count(*) filter (where active and verification_status = 'verified'
    and quality_score >= .8 and ambiguity_score <= .1) as playable_questions
from public.question_bank
group by sport_id, competition_id, category_key,
  public.question_difficulty_band(difficulty_percentile);

revoke all on public.question_pool_coverage from public, anon, authenticated;
grant select on public.question_pool_coverage to service_role;

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
  score numeric;
begin
  if p_difficulty not between 1 and 4 then
    raise exception 'Difficulty must be Easy (1), Medium (2), Hard (3), or Expert (4)';
  end if;
  if auth.uid() is distinct from p_user_id and not public.has_staff_role() then
    raise exception 'Cannot select for another player';
  end if;

  band_low := (p_difficulty - 1) * .25;
  band_high := p_difficulty * .25;
  target := (band_low + band_high) / 2;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_room_id::text,p_user_id::text),0));

  loop
    with pool as (
      select q.id,
        (1 - abs(q.difficulty_percentile - target)) * 7
        + q.quality_score * 2
        + case when q.calibration_attempts >= 30 then 1 else .35 end
        + least(1, extract(epoch from (now() - coalesce(max(e.exposed_at), now() - interval '365 days'))) / 31536000)
        + random() * 1.25 as rank_score
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
        and (q.difficulty_percentile < band_high or (p_difficulty = 4 and q.difficulty_percentile <= 1))
        and not exists (
          select 1 from public.question_exposures rx
          where rx.question_id = q.id and p_room_id is not null and rx.room_id = p_room_id
        )
        and not exists (
          select 1 from public.question_exposures ux
          where ux.question_id = q.id and ux.user_id = p_user_id
            and ux.exposed_at > now() - make_interval(days => cooldown)
        )
      group by q.id, q.difficulty_percentile, q.quality_score, q.calibration_attempts
      order by rank_score desc
      limit 60
    )
    select count(*), (array_agg(id order by rank_score desc))[1], max(rank_score)
      into candidates, chosen, score from pool;

    exit when chosen is not null or cooldown = 0;
    cooldown := case cooldown when 120 then 60 when 60 then 30 when 30 then 14
      when 14 then 7 when 7 then 1 else 0 end;
  end loop;

  if chosen is null then
    raise exception 'No verified % question is available for this exact scope',
      case p_difficulty when 1 then 'Easy' when 2 then 'Medium' when 3 then 'Hard' else 'Expert' end;
  end if;

  insert into public.question_exposures(question_id,user_id,room_id,selection_scope)
  values(chosen,p_user_id,p_room_id,jsonb_build_object(
    'sport_id',p_sport_id,'competition_id',p_competition_id,'category',p_category_key,
    'difficulty',p_difficulty,'band_low',band_low,'band_high',band_high
  ));
  insert into public.question_selection_audit(
    user_id,room_id,question_id,requested_scope,target_percentile,candidate_count,
    cooldown_days,selection_score
  ) values(
    p_user_id,p_room_id,chosen,
    jsonb_build_object('sport_id',p_sport_id,'competition_id',p_competition_id,
      'category',p_category_key,'difficulty',p_difficulty,'strict_band',true),
    target,candidates,cooldown,score
  );
  return chosen;
end$$;

revoke all on function public.reserve_fair_question(uuid,uuid,uuid,uuid,text,smallint,text[]) from public, anon;
grant execute on function public.reserve_fair_question(uuid,uuid,uuid,uuid,text,smallint,text[]) to authenticated, service_role;

-- Grid answers use the same invisible spelling assistance. Exact names and aliases
-- win first; a conservative fuzzy match is allowed only for names of five characters+
-- and only against verified answers that are valid for the selected square.
create or replace function public.fz_check_answer(p_grid uuid, p_cell smallint, p_guess text)
returns table(accepted boolean, athlete_id uuid, athlete_name text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_id uuid; v_name text; v_norm text;
begin
  if p_guess is null or char_length(btrim(p_guess)) < 2 then
    return query select false, null::uuid, null::text; return;
  end if;
  v_norm := public.fz_norm(p_guess);
  select a.id, a.name into v_id, v_name
  from public.grid_answers ga
  join public.athletes a on a.id = ga.athlete_id
  left join public.athlete_aliases aa on aa.athlete_id = a.id
  where ga.grid_id = p_grid
    and ga.cell_index = p_cell
    and ga.verification_status = 'verified'
    and a.verification_status = 'verified'
    and (
      a.normalized_name = v_norm
      or public.fz_norm(a.name) = v_norm
      or exists (select 1 from unnest(a.aliases) al where public.fz_norm(al) = v_norm)
      or exists (select 1 from public.athlete_aliases ax where ax.athlete_id = a.id and ax.normalized_alias = v_norm)
      or (
        char_length(v_norm) >= 5
        and abs(char_length(v_norm) - char_length(a.normalized_name)) <= 2
        and extensions.similarity(a.normalized_name, v_norm) >=
          case when greatest(char_length(v_norm), char_length(a.normalized_name)) >= 12 then .78 else .84 end
      )
      or (
        char_length(v_norm) >= 5
        and aa.normalized_alias is not null
        and abs(char_length(v_norm) - char_length(aa.normalized_alias)) <= 2
        and extensions.similarity(aa.normalized_alias, v_norm) >=
          case when greatest(char_length(v_norm), char_length(aa.normalized_alias)) >= 12 then .78 else .84 end
      )
    )
  order by greatest(
    extensions.similarity(a.normalized_name, v_norm),
    coalesce(extensions.similarity(aa.normalized_alias, v_norm), 0)
  ) desc
  limit 1;
  return query select v_id is not null, v_id, v_name;
end $$;

revoke all on function public.fz_check_answer(uuid, smallint, text) from public;
grant execute on function public.fz_check_answer(uuid, smallint, text) to anon, authenticated;