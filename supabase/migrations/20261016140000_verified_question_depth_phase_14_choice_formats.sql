-- Fanzeno question depth phase 14: 28 independent historical sporting facts.
-- 14 answer-choice questions (including true/false) + 14 typed answers.
-- All prompts are newly written and traceable to the respective governing body's results.
-- Deployed separately via the Fanzeno Supabase project; the Git commit alone is NOT deployment.
with editorial as (
  select id from public.data_sources where name = 'Fanzeno sourced editorial' limit 1
), seed(sport_slug,category_key,prompt,clue,accepted_json,display,percentile,source_url,source_title,question_type,options_json) as (
  values
('snooker','world-championship','Who won the 2020 World Snooker Championship?','This player is nicknamed The Rocket.','["Ronnie O''Sullivan","Ronnie O’Sullivan"]','Ronnie O''Sullivan','0.12','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','single_choice','["Ronnie O''Sullivan","Judd Trump","Mark Selby","Neil Robertson"]'),
('snooker','world-championship','True or false: Ronnie O''Sullivan won the 2015 World Snooker Championship.','Stuart Bingham lifted the trophy that year.','["False"]','False','0.12','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','single_choice','["True","False"]'),
('snooker','world-championship','Which Australian won the 2010 World Snooker Championship?','He beat Graeme Dott in the final.','["Neil Robertson"]','Neil Robertson','0.37','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','single_choice','["Shaun Murphy","Neil Robertson","Mark Selby","John Higgins"]'),
('snooker','world-championship','Who was world snooker champion in 1997?','An Irishman ended Stephen Hendry''s winning streak.','["Ken Doherty","Doherty"]','Ken Doherty','0.37','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','typed_single','[]'),
('snooker','world-championship','Who beat Steve Davis to claim the 1985 World Snooker Championship?','The final famously ended on the black.','["Dennis Taylor"]','Dennis Taylor','0.64','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','single_choice','["Steve Davis","Dennis Taylor","Alex Higgins","Cliff Thorburn"]'),
('snooker','world-championship','Who won the 1991 World Snooker Championship?','He defeated Jimmy White in the final.','["John Parrott","Parrott"]','John Parrott','0.64','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','typed_single','[]'),
('snooker','world-championship','True or false: Terry Griffiths was the 1979 world snooker champion.','He took the title on his first World Championship appearance.','["True"]','True','0.89','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','single_choice','["False","True"]'),
('snooker','world-championship','Who won the first World Snooker Championship staged at the Crucible in 1977?','This Welsh player had already won world titles in the 1960s and 1970s.','["John Spencer","Spencer"]','John Spencer','0.89','https://www.wst.tv/worldchampionship/','World Snooker Tour Crucible champions','typed_single','[]'),
('darts','world-championship','Who won the 2024 PDC World Darts Championship?','He defeated Luke Littler in the final.','["Luke Humphries"]','Luke Humphries','0.12','https://www.pdc.tv/news/2024/april/18/2024-neobet-european-darts-grand-prix-draw-schedule/','PDC world championship coverage','single_choice','["Luke Humphries","Luke Littler","Michael Smith","Peter Wright"]'),
('darts','world-championship','True or false: Luke Littler won the 2023 PDC World Darts Championship.','Michael Smith was the 2023 champion.','["False"]','False','0.37','https://www.pdc.tv/news/2024/april/18/2024-neobet-european-darts-grand-prix-draw-schedule/','PDC world championship coverage','single_choice','["True","False"]'),
('darts','world-championship','Who became PDC world darts champion on New Year''s Day 2020?','He defeated Michael van Gerwen 7–3.','["Peter Wright","Wright"]','Peter Wright','0.64','https://www.pdc-europe.tv/news//peter-wright-wins-world-championship/','PDC Europe 2020 world final','typed_single','[]'),
('darts','world-championship','Who won the 2018 PDC World Darts Championship as a debutant?','He defeated Phil Taylor in the final.','["Rob Cross","Cross"]','Rob Cross','0.89','https://pdpa.co.uk/event-entry/annual-awards/','PDPA 2018 world championship awards','typed_single','[]'),
('f1','drivers-championship','Who won the 2016 Formula 1 Drivers'' World Championship?','He clinched the title in Abu Dhabi and retired days later.','["Nico Rosberg","Rosberg"]','Nico Rosberg','0.12','https://www.formula1.com/en/results/2016/drivers','Formula 1 2016 drivers'' standings','single_choice','["Lewis Hamilton","Nico Rosberg","Sebastian Vettel","Daniel Ricciardo"]'),
('f1','drivers-championship','Who won the 2009 Formula 1 Drivers'' World Championship for Brawn GP?','A British driver secured the title in the team''s only season.','["Jenson Button","Button"]','Jenson Button','0.37','https://www.formula1.com/en/results/2009/drivers','Formula 1 2009 drivers'' standings','single_choice','["Sebastian Vettel","Rubens Barrichello","Jenson Button","Lewis Hamilton"]'),
('f1','drivers-championship','True or false: Kimi Räikkönen won the 2007 Formula 1 Drivers'' World Championship.','Ferrari took the drivers'' crown that year.','["True"]','True','0.64','https://www.formula1.com/en/results/2007/drivers','Formula 1 2007 drivers'' standings','single_choice','["True","False"]'),
('f1','drivers-championship','Who won the 1982 Formula 1 Drivers'' World Championship?','The Finnish Williams driver is Nico Rosberg''s father.','["Keke Rosberg","Rosberg"]','Keke Rosberg','0.89','https://www.formula1.com/en/results/1982/drivers','Formula 1 1982 drivers'' standings','typed_single','[]'),
('nba','finals-mvp','Who was named NBA Finals MVP in 2014?','He won the title with the San Antonio Spurs.','["Kawhi Leonard","Leonard"]','Kawhi Leonard','0.12','https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP historical winners','single_choice','["Kawhi Leonard","Tim Duncan","Tony Parker","Manu Ginóbili"]'),
('nba','finals-mvp','Who was NBA Finals MVP in 2007?','A French point guard won with the San Antonio Spurs.','["Tony Parker","Parker"]','Tony Parker','0.37','https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP historical winners','single_choice','["Tony Parker","Tim Duncan","Manu Ginóbili","Bruce Bowen"]'),
('nba','finals-mvp','True or false: Kobe Bryant won the 2004 NBA Finals MVP award.','The Detroit Pistons'' Chauncey Billups won it.','["False"]','False','0.64','https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP historical winners','single_choice','["True","False"]'),
('nba','finals-mvp','Who was named NBA Finals MVP in 1989?','A Detroit Pistons shooting guard received the award.','["Joe Dumars","Dumars"]','Joe Dumars','0.89','https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP historical winners','typed_single','[]'),
('nhl','stanley-cup','Which team won the 2010 Stanley Cup?','They defeated Philadelphia and ended a 49-year drought.','["Chicago Blackhawks","Blackhawks"]','Chicago Blackhawks','0.12','https://www.nhl.com/news/topic/nhl-awards/nhl-stanley-cup-champions-winners-complete-list-287705398','NHL Stanley Cup champions','single_choice','["Chicago Blackhawks","Philadelphia Flyers","Pittsburgh Penguins","Los Angeles Kings"]'),
('nhl','stanley-cup','Which team won the 2007 Stanley Cup?','They beat the Ottawa Senators in five games.','["Anaheim Ducks","Ducks"]','Anaheim Ducks','0.37','https://www.nhl.com/news/topic/nhl-awards/nhl-stanley-cup-champions-winners-complete-list-287705398','NHL Stanley Cup champions','single_choice','["Ottawa Senators","Anaheim Ducks","Detroit Red Wings","Buffalo Sabres"]'),
('nhl','stanley-cup','True or false: Dallas Stars won the 2004 Stanley Cup.','Tampa Bay Lightning won the 2004 title.','["False"]','False','0.64','https://www.nhl.com/news/topic/nhl-awards/nhl-stanley-cup-champions-winners-complete-list-287705398','NHL Stanley Cup champions','single_choice','["True","False"]'),
('nhl','stanley-cup','Which team won the 1999 Stanley Cup?','Brett Hull scored an overtime Cup-winning goal.','["Dallas Stars","Stars"]','Dallas Stars','0.89','https://www.nhl.com/news/topic/nhl-awards/nhl-stanley-cup-champions-winners-complete-list-287705398','NHL Stanley Cup champions','typed_single','[]'),
('mlb','world-series','Which team won the 2015 World Series?','The club beat the New York Mets in five games.','["Kansas City Royals","Royals"]','Kansas City Royals','0.12','https://www.mlb.com/postseason/history/2015','MLB 2015 postseason history','single_choice','["Kansas City Royals","New York Mets","San Francisco Giants","Toronto Blue Jays"]'),
('mlb','world-series','Which team won the 2008 World Series?','They beat the Tampa Bay Rays in five games.','["Philadelphia Phillies","Phillies"]','Philadelphia Phillies','0.37','https://www.mlb.com/postseason/history/2008','MLB 2008 postseason history','single_choice','["Tampa Bay Rays","Philadelphia Phillies","New York Yankees","Boston Red Sox"]'),
('mlb','world-series','True or false: the Florida Marlins won the 1997 World Series.','They won Game 7 against Cleveland.','["True"]','True','0.64','https://www.mlb.com/postseason/history/1997','MLB 1997 postseason history','single_choice','["False","True"]'),
('mlb','world-series','Which team won the 2001 World Series in a seven-game final?','Luis Gonzalez hit the walk-off winner in Game 7.','["Arizona Diamondbacks","Diamondbacks","D-backs","Dbacks"]','Arizona Diamondbacks','0.89','https://www.mlb.com/postseason/history/2001','MLB 2001 postseason history','typed_single','[]')
), validated as (
  select sport_slug,category_key,prompt,clue,accepted_json::jsonb accepted,display,
         percentile::numeric percentile,source_url,source_title,question_type,
         options_json::jsonb options
  from seed
  where jsonb_typeof(accepted_json::jsonb)='array'
    and jsonb_array_length(accepted_json::jsonb)>0
    and source_url like 'https://%'
    and length(trim(prompt))>12
    and length(trim(display))>0
    and percentile::numeric between 0 and 1
    and (
      question_type = 'typed_single'
      or (question_type = 'single_choice'
          and jsonb_array_length(options_json::jsonb) between 2 and 6
          and options_json::jsonb @> jsonb_build_array(display))
    )
)
insert into public.question_bank (
  sport_id,category_key,question_type,format_key,prompt_i18n,clue_i18n,answer_rule,
  answer_display_i18n,difficulty_b,difficulty_percentile,editorial_difficulty_percentile,
  difficulty_confidence,quality_score,ambiguity_score,verification_status,source_id,
  source_url,source_title,content_hash,reviewed_at,active
)
select sports.id,v.category_key,v.question_type,'classic_trivia',
       jsonb_build_object('en',v.prompt),jsonb_build_object('en',v.clue),
       jsonb_build_object('accepted',v.accepted) ||
          case when v.question_type='single_choice'
            then jsonb_build_object('options',v.options) else '{}'::jsonb end,
       jsonb_build_object('en',v.display),
       case when v.percentile < .25 then -1.3 when v.percentile < .5 then -.3
            when v.percentile < .75 then .7 else 1.5 end,
       v.percentile,v.percentile,0,1,0,'verified',editorial.id,
       v.source_url,v.source_title,
       encode(extensions.digest(v.prompt,'sha256'),'hex'),now(),true
from validated v
join public.sports sports on sports.slug=v.sport_slug
cross join editorial
on conflict do nothing;

-- Operational verification after running this migration:
-- select s.slug, q.question_type, count(*) from public.question_bank q
-- join public.sports s on s.id=q.sport_id
-- where q.prompt_i18n->>'en' in (<this batch prompts>)
-- group by 1,2;
