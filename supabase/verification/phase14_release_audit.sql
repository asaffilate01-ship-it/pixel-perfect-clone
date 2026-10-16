-- FANZENO ONLY: read-only audit after applying phase-14 + provenance migrations.
-- Run using the SQL editor connected to Supabase project hcncbiufgcodempoapbf.
-- This does not create, update or delete any database records.
with expected(sport_slug,prompt,expected_type) as (
values
  ('snooker', 'Who won the 2020 World Snooker Championship?', 'single_choice'),
  ('snooker', 'True or false: Ronnie O''Sullivan won the 2015 World Snooker Championship.', 'single_choice'),
  ('snooker', 'Which Australian won the 2010 World Snooker Championship?', 'single_choice'),
  ('snooker', 'Who was world snooker champion in 1997?', 'typed_single'),
  ('snooker', 'Who beat Steve Davis to claim the 1985 World Snooker Championship?', 'single_choice'),
  ('snooker', 'Who won the 1991 World Snooker Championship?', 'typed_single'),
  ('snooker', 'True or false: Terry Griffiths was the 1979 world snooker champion.', 'single_choice'),
  ('snooker', 'Who won the first World Snooker Championship staged at the Crucible in 1977?', 'typed_single'),
  ('darts', 'Who won the 2024 PDC World Darts Championship?', 'single_choice'),
  ('darts', 'True or false: Luke Littler won the 2023 PDC World Darts Championship.', 'single_choice'),
  ('darts', 'Who became PDC world darts champion on New Year''s Day 2020?', 'typed_single'),
  ('darts', 'Who won the 2018 PDC World Darts Championship as a debutant?', 'typed_single'),
  ('f1', 'Who won the 2016 Formula 1 Drivers'' World Championship?', 'single_choice'),
  ('f1', 'Who won the 2009 Formula 1 Drivers'' World Championship for Brawn GP?', 'single_choice'),
  ('f1', 'True or false: Kimi Räikkönen won the 2007 Formula 1 Drivers'' World Championship.', 'single_choice'),
  ('f1', 'Who won the 1982 Formula 1 Drivers'' World Championship?', 'typed_single'),
  ('nba', 'Who was named NBA Finals MVP in 2014?', 'single_choice'),
  ('nba', 'Who was NBA Finals MVP in 2007?', 'single_choice'),
  ('nba', 'True or false: Kobe Bryant won the 2004 NBA Finals MVP award.', 'single_choice'),
  ('nba', 'Who was named NBA Finals MVP in 1989?', 'typed_single'),
  ('nhl', 'Which team won the 2010 Stanley Cup?', 'single_choice'),
  ('nhl', 'Which team won the 2007 Stanley Cup?', 'single_choice'),
  ('nhl', 'True or false: Dallas Stars won the 2004 Stanley Cup.', 'single_choice'),
  ('nhl', 'Which team won the 1999 Stanley Cup?', 'typed_single'),
  ('mlb', 'Which team won the 2015 World Series?', 'single_choice'),
  ('mlb', 'Which team won the 2008 World Series?', 'single_choice'),
  ('mlb', 'True or false: the Florida Marlins won the 1997 World Series.', 'single_choice'),
  ('mlb', 'Which team won the 2001 World Series in a seven-game final?', 'typed_single')
), matches as (
 select e.sport_slug, e.prompt, e.expected_type, s.id as sport_id,
        q.id as question_id, q.question_type, q.verification_status,
        q.active, q.difficulty_percentile, q.source_url, q.answer_rule,
        q.answer_display_i18n
 from expected e
 left join public.sports s on s.slug=e.sport_slug
 left join public.question_bank q
   on q.content_hash=encode(extensions.digest(e.prompt,'sha256'),'hex')
   and q.sport_id=s.id
), assessed as (
 select *,
   (question_id is not null
     and verification_status='verified' and active
     and question_type=expected_type
     and source_url like 'https://%'
     and jsonb_typeof(answer_rule->'accepted')='array'
     and jsonb_array_length(answer_rule->'accepted')>0
     and (expected_type <> 'single_choice' or
       (jsonb_typeof(answer_rule->'options')='array'
       and jsonb_array_length(answer_rule->'options') between 2 and 6
       and answer_rule->'options' @> jsonb_build_array(answer_display_i18n->>'en'))))
     as is_playable,
   public.question_difficulty_band(difficulty_percentile) as difficulty
 from matches
)
select sport_slug, count(*) expected_questions, count(question_id) found,
       count(*) filter(where is_playable) playable,
       count(*) filter(where expected_type='single_choice' and is_playable) playable_choices,
       count(distinct difficulty) filter(where is_playable) difficulty_bands,
       coalesce(jsonb_agg(jsonb_build_object('prompt',prompt,'reason',
         case when question_id is null then 'missing'
         when not coalesce(is_playable,false) then 'failed validation' else 'ok' end))
         filter(where not coalesce(is_playable,false)),'[]'::jsonb) as issues
from assessed
group by rollup(sport_slug)
order by sport_slug nulls last;

-- Expected: 28 found/28 playable in total; 19 playable choices;
-- snooker 8, darts/F1/NBA/NHL/MLB 4 each; four difficulty bands per sport.
-- Confirm three corrected darts source URLs in 20261016153000 provenance migration.
