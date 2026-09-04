-- Scalable question production from verified facts. This never copies third-party
-- quiz wording: prompts are generated from Fanzeno's structured, sourced records.

create table if not exists public.question_pool_targets (
  sport_id uuid not null references public.sports on delete cascade,
  category_key text not null,
  difficulty smallint not null check (difficulty between 1 and 4),
  target_count int not null default 100 check (target_count >= 100),
  priority smallint not null default 3 check (priority between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (sport_id, category_key, difficulty)
);

grant select on public.question_pool_targets to authenticated;
grant all on public.question_pool_targets to service_role;
alter table public.question_pool_targets enable row level security;
drop policy if exists "staff question targets" on public.question_pool_targets;
create policy "staff question targets" on public.question_pool_targets for select to authenticated
  using (public.has_staff_role());

-- Register every known sport/category with a target of 100 questions in each band.
insert into public.question_pool_targets(sport_id, category_key, difficulty)
select scope.sport_id, scope.category_key, level
from (
  select distinct sport_id, coalesce(category_key, competition_type) as category_key
  from public.competitions where active
  union
  select distinct sport_id, criteria_type from public.criteria where enabled
  union
  select distinct sport_id, honour_type from public.honours
) scope
cross join generate_series(1,4) level
where scope.category_key is not null
on conflict do nothing;

create or replace view public.question_pool_target_status as
select
  t.sport_id,
  s.slug as sport_slug,
  t.category_key,
  t.difficulty,
  t.target_count,
  count(q.id) filter (
    where q.active and q.verification_status = 'verified'
      and q.quality_score >= .8 and q.ambiguity_score <= .1
  )::int as playable_count,
  greatest(0, t.target_count - count(q.id) filter (
    where q.active and q.verification_status = 'verified'
      and q.quality_score >= .8 and q.ambiguity_score <= .1
  ))::int as questions_needed,
  case
    when count(q.id) filter (where q.active and q.verification_status = 'verified'
      and q.quality_score >= .8 and q.ambiguity_score <= .1) >= t.target_count then 'ready'
    when count(q.id) filter (where q.active and q.verification_status = 'verified') > 0 then 'building'
    else 'empty'
  end as status
from public.question_pool_targets t
join public.sports s on s.id = t.sport_id
left join public.question_bank q on q.sport_id = t.sport_id
  and coalesce(q.category_key, 'general') = t.category_key
  and public.question_difficulty_band(q.difficulty_percentile) = t.difficulty
group by t.sport_id, s.slug, t.category_key, t.difficulty, t.target_count;

revoke all on public.question_pool_target_status from public, anon, authenticated;
grant select on public.question_pool_target_status to service_role;

-- Generate intersection questions from two verified criteria. Every athlete who
-- satisfies both facts is included, along with all reviewed aliases. Difficulty is
-- based on how many valid answers exist, then stays inside a strict level band.
create or replace function public.generate_verified_intersection_questions(
  p_sport_id uuid default null,
  p_category_key text default null,
  p_limit int default 5000
)
returns int language plpgsql security definer set search_path=public, extensions as $$
declare inserted_count int;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;

  with pairs as (
    select
      c1.sport_id,
      c1.id as criterion_one,
      c2.id as criterion_two,
      c1.label as label_one,
      c2.label as label_two,
      coalesce(cp1.category_key, cp2.category_key, c1.criteria_type, 'career') as category_key,
      coalesce(ac1.competition_id, ac2.competition_id) as competition_id,
      (array_agg(ac1.source_id order by ac1.source_id::text))[1] as source_id,
      array_remove(array_agg(distinct coalesce(ac1.evidence_url, ac2.evidence_url)), null) as evidence_urls,
      count(distinct ac1.athlete_id)::int as answer_count,
      array_agg(distinct ac1.athlete_id) as athlete_ids
    from public.criteria c1
    join public.criteria c2 on c2.sport_id=c1.sport_id and c2.id>c1.id and c2.enabled
    join public.athlete_criteria ac1 on ac1.criterion_id=c1.id and ac1.verification_status='verified'
    join public.athlete_criteria ac2 on ac2.criterion_id=c2.id
      and ac2.athlete_id=ac1.athlete_id and ac2.verification_status='verified'
    left join public.competitions cp1 on cp1.id=ac1.competition_id
    left join public.competitions cp2 on cp2.id=ac2.competition_id
    where c1.enabled
      and (p_sport_id is null or c1.sport_id=p_sport_id)
      and (ac1.evidence_url is not null or ac2.evidence_url is not null)
    group by c1.sport_id,c1.id,c2.id,c1.label,c2.label,
      coalesce(cp1.category_key,cp2.category_key,c1.criteria_type,'career'),
      coalesce(ac1.competition_id,ac2.competition_id)
  ), eligible as (
    select *,
      case when answer_count >= 12 then .12 when answer_count >= 7 then .37
           when answer_count >= 3 then .62 else .87 end::numeric as percentile
    from pairs
    where answer_count > 0
      and cardinality(evidence_urls)>0
      and (p_category_key is null or category_key=p_category_key)
    order by answer_count desc, criterion_one, criterion_two
    limit least(greatest(p_limit,1),20000)
  ), assembled as (
    select e.*,
      (select jsonb_agg(distinct answer order by answer)
       from (
         select a.name as answer from public.athletes a where a.id=any(e.athlete_ids)
         union
         select unnest(a.aliases) from public.athletes a where a.id=any(e.athlete_ids)
         union
         select aa.alias from public.athlete_aliases aa where aa.athlete_id=any(e.athlete_ids)
       ) names where nullif(btrim(answer),'') is not null) as accepted,
      (select a.name from public.athletes a where a.id=any(e.athlete_ids) order by a.name limit 1) as display_answer
    from eligible e
  )
  insert into public.question_bank(
    sport_id,competition_id,category_key,entity_ids,question_type,format_key,
    prompt_i18n,clue_i18n,answer_rule,answer_display_i18n,difficulty_b,
    difficulty_percentile,quality_score,ambiguity_score,verification_status,
    source_id,source_url,source_title,content_hash,reviewed_at,active
  )
  select
    a.sport_id,a.competition_id,a.category_key,a.athlete_ids,'typed_single','classic_trivia',
    jsonb_build_object('en','Name an athlete who matches both: '||a.label_one||' and '||a.label_two||'.'),
    jsonb_build_object('en',case when a.answer_count=1 then 'There is one verified answer in this data set.'
      else 'There are '||a.answer_count||' verified answers in this data set.' end),
    jsonb_build_object('accepted',a.accepted,'evidence_urls',to_jsonb(a.evidence_urls)),
    jsonb_build_object('en',a.display_answer),
    case when a.percentile<.25 then -1.3 when a.percentile<.5 then -.3
      when a.percentile<.75 then .7 else 1.5 end,
    a.percentile,1,0,'verified',a.source_id,a.evidence_urls[1],
    'Generated from verified athlete criteria',
    encode(digest(a.sport_id::text||':'||a.criterion_one::text||':'||a.criterion_two::text||':'||
      coalesce(a.competition_id::text,'all'),'sha256'),'hex'),now(),true
  from assembled a
  where jsonb_array_length(a.accepted)>0
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end$$;

revoke all on function public.generate_verified_intersection_questions(uuid,text,int) from public,anon;
grant execute on function public.generate_verified_intersection_questions(uuid,text,int) to authenticated,service_role;

-- Generate one authoritative question per honour/year. Team awards correctly accept
-- every verified athlete attached to that honour rather than a single incomplete key.
create or replace function public.generate_verified_honour_questions(
  p_sport_id uuid default null,
  p_limit int default 5000
)
returns int language plpgsql security definer set search_path=public, extensions as $$
declare inserted_count int;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;

  with grouped as (
    select h.sport_id,h.id honour_id,h.name,h.honour_type,h.governing_body,h.metadata,
      ah.year,(array_agg(ah.source_id order by ah.source_id::text))[1] source_id,
      array_agg(distinct ah.athlete_id) athlete_ids,count(distinct ah.athlete_id)::int answer_count
    from public.honours h
    join public.athlete_honours ah on ah.honour_id=h.id and ah.verification_status='verified'
    where (p_sport_id is null or h.sport_id=p_sport_id)
      and ah.result='winner' and coalesce(h.metadata->>'source_url','')<>''
    group by h.sport_id,h.id,h.name,h.honour_type,h.governing_body,h.metadata,ah.year
    order by ah.year desc,h.name limit least(greatest(p_limit,1),20000)
  ), assembled as (
    select g.*,
      (select jsonb_agg(distinct answer order by answer) from (
        select a.name answer from public.athletes a where a.id=any(g.athlete_ids)
        union select unnest(a.aliases) from public.athletes a where a.id=any(g.athlete_ids)
        union select aa.alias from public.athlete_aliases aa where aa.athlete_id=any(g.athlete_ids)
      ) names where nullif(btrim(answer),'') is not null) accepted,
      (select a.name from public.athletes a where a.id=any(g.athlete_ids) order by a.name limit 1) display_answer
    from grouped g
  )
  insert into public.question_bank(
    sport_id,category_key,entity_ids,question_type,format_key,prompt_i18n,clue_i18n,
    answer_rule,answer_display_i18n,difficulty_b,difficulty_percentile,quality_score,
    ambiguity_score,verification_status,source_id,source_url,source_title,content_hash,reviewed_at,active
  )
  select a.sport_id,coalesce(a.metadata->>'category_key',a.honour_type),a.athlete_ids,
    'typed_single','classic_trivia',jsonb_build_object('en','Name an athlete who won '||a.name||' in '||a.year||'.'),
    jsonb_build_object('en',coalesce(a.governing_body,'The governing body')||' records this honour.'),
    jsonb_build_object('accepted',a.accepted),jsonb_build_object('en',a.display_answer),
    case when a.year>=2015 then -.8 when a.year>=1990 then -.1 when a.year>=1960 then .7 else 1.5 end,
    case when a.year>=2015 then .18 when a.year>=1990 then .42 when a.year>=1960 then .67 else .88 end,
    1,0,'verified',a.source_id,a.metadata->>'source_url','Generated from verified honour records',
    encode(digest(a.sport_id::text||':honour:'||a.honour_id::text||':'||a.year,'sha256'),'hex'),now(),true
  from assembled a where jsonb_array_length(a.accepted)>0
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end$$;

revoke all on function public.generate_verified_honour_questions(uuid,int) from public,anon;
grant execute on function public.generate_verified_honour_questions(uuid,int) to authenticated,service_role;

-- Run after each verified fact import. Existing hashes make it safe and idempotent.
create or replace function public.fill_verified_question_pools(p_limit_each int default 10000)
returns jsonb language plpgsql security definer set search_path=public as $$
declare intersections int; honours_count int;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;
  intersections := public.generate_verified_intersection_questions(null,null,p_limit_each);
  honours_count := public.generate_verified_honour_questions(null,p_limit_each);
  return jsonb_build_object('intersection_questions_added',intersections,
    'honour_questions_added',honours_count,'target_per_subcategory_per_level',100);
end$$;

revoke all on function public.fill_verified_question_pools(int) from public,anon;
grant execute on function public.fill_verified_question_pools(int) to authenticated,service_role;

select public.fill_verified_question_pools(10000);