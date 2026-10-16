-- Read-only post-rollout audit for Fanzeno phase 15 (do not run on DISHBEE).
-- Required schema: phases 1-15. Run only in Fanzeno Supabase project hcncbiufgcodempoapbf.
with expected(sport_slug,prompt,question_type,difficulty) as (
  values
  ('afl','Which club won the 2024 AFL men''s premiership?','single_choice',1),
  ('afl','Which club claimed the 2023 AFL premiership, edging Brisbane in the Grand Final?','typed_single',1),
  ('afl','Who won the 2022 AFL Grand Final against Sydney?','single_choice',2),
  ('afl','True or false: Melbourne defeated Western Bulldogs to win the 2021 AFL Grand Final.','single_choice',2),
  ('afl','Which club ended a 62-year premiership drought in 2016?','typed_single',3),
  ('afl','Which club defeated Hawthorn in the 2012 AFL Grand Final?','single_choice',3),
  ('afl','Which club lost the 2007 AFL Grand Final to Geelong?','typed_single',4),
  ('afl','Which club won the 2010 AFL premiership?','single_choice',4),
  ('snooker','Who won the 2024 World Snooker Championship after defeating Jak Jones?','single_choice',1),
  ('snooker','Which Belgian won his first World Snooker Championship in 2023?','typed_single',1),
  ('snooker','Who lost to Ronnie O''Sullivan in the 2022 World Snooker Championship final?','single_choice',2),
  ('snooker','True or false: Shaun Murphy won the 2021 World Snooker Championship.','single_choice',2),
  ('snooker','Who defeated John Higgins 18-9 in the 2019 World Snooker Championship final?','typed_single',3),
  ('snooker','Who won the 2018 World Snooker Championship after beating John Higgins 18-16?','single_choice',3),
  ('snooker','Who finished runner-up to Shaun Murphy at the 2005 World Snooker Championship?','typed_single',4),
  ('snooker','Who made the first 147 break in a World Snooker Championship final, in 2023?','single_choice',4),
  ('darts','Who won the 2025 PDC World Darts Championship at age 17?','single_choice',1),
  ('darts','Which player became a two-time PDC World Champion in 2022?','typed_single',1),
  ('darts','Who was runner-up to Gerwyn Price in the 2021 PDC World Championship?','single_choice',2),
  ('darts','Who defeated Michael Smith to win the 2019 PDC World Championship?','typed_single',2),
  ('darts','Who defeated Phil Taylor in the 2015 PDC World Championship final?','single_choice',3),
  ('darts','True or false: the 2021 PDC World Championship was the first won by a Welsh player.','single_choice',3),
  ('darts','Who lost the 2022 PDC World Championship final 7-5 to Peter Wright?','typed_single',4),
  ('darts','What was the final set score when Gary Anderson beat Phil Taylor at the 2015 PDC World Championship?','single_choice',4),
  ('f1','Who won the 1996 Formula 1 Drivers'' World Championship?','single_choice',1),
  ('f1','Which driver won the 2008 Formula 1 Drivers'' Championship by one point?','typed_single',1),
  ('f1','Who won the 1984 Formula 1 Drivers'' Championship for McLaren?','single_choice',2),
  ('f1','True or false: Niki Lauda won the 1976 Formula 1 Drivers'' Championship.','single_choice',2),
  ('f1','Which driver won the 1992 Formula 1 Drivers'' Championship in a Williams?','typed_single',3),
  ('f1','Which American driver won the 1978 Formula 1 Drivers'' Championship?','single_choice',3),
  ('f1','Who became the 1961 Formula 1 Drivers'' World Champion for Ferrari?','typed_single',4),
  ('f1','Which Canadian won the 1997 Formula 1 Drivers'' World Championship?','single_choice',4)
), found as (
  select e.*, s.id sport_id,q.id question_id,q.active,q.verification_status,
    q.difficulty_percentile,q.answer_rule,q.answer_display_i18n,q.source_url,
    q.question_type actual_type
  from expected e
  left join public.sports s on s.slug=e.sport_slug
  left join public.question_bank q
    on q.sport_id=s.id and q.content_hash=encode(extensions.digest(e.prompt,'sha256'),'hex')
), quality as (
  select *,
   (question_id is not null
      and coalesce(active,false)
      and verification_status='verified'
      and actual_type=question_type
      and source_url like 'https://%'
      and difficulty=public.question_difficulty_band(difficulty_percentile)
      and case when jsonb_typeof(answer_rule->'accepted')='array'
        then jsonb_array_length(answer_rule->'accepted')>0 else false end
      and (question_type <> 'single_choice'
        or case when jsonb_typeof(answer_rule->'options')='array'
          then jsonb_array_length(answer_rule->'options') between 2 and 6
            and answer_rule->'options' @> jsonb_build_array(answer_display_i18n->>'en')
          else false end)
    ) is_playable
  from found
)
select coalesce(sport_slug,'TOTAL') sport,
  count(*) expected,
  count(question_id) present,
  count(*) filter(where is_playable) playable,
  count(*) filter(where is_playable and question_type='single_choice') choice_format,
  count(*) filter(where is_playable and difficulty=1) easy,
  count(*) filter(where is_playable and difficulty=2) medium,
  count(*) filter(where is_playable and difficulty=3) hard,
  count(*) filter(where is_playable and difficulty=4) expert,
  coalesce(jsonb_agg(jsonb_build_object('question',prompt,'reason',
    case when question_id is null then 'missing' else 'not eligible' end))
    filter (where not coalesce(is_playable,false)),'[]'::jsonb) issues
from quality
group by rollup(sport_slug)
order by sport_slug nulls last;

-- Expected total 32/32 present/playable, 20 choice, 8 per sport,
-- and per sport difficulty counts Easy 2 / Medium 2 / Hard 2 / Expert 2.
