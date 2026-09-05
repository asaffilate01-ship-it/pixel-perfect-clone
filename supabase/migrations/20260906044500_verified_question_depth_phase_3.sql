-- Verified depth phase 3: another 24 sourced questions across twelve sports.
with editorial as (
  select id from public.data_sources where name='Fanzeno sourced editorial' limit 1
), seed(sport_slug,category_key,prompt,clue,accepted,display,percentile,source_url,source_title) as (
values
('football','world-cup','Which nation won the 2022 men''s FIFA World Cup?','Lionel Messi captained the winners in Qatar.','["Argentina","Argentina national team","La Albiceleste"]'::jsonb,'Argentina',.14,'https://www.fifa.com/tournaments/mens/worldcup/qatar2022','FIFA World Cup Qatar 2022'),
('football','euros','Which nation won UEFA EURO 2020?','They defeated England on penalties at Wembley.','["Italy","Italy national team","Azzurri","The Azzurri"]'::jsonb,'Italy',.42,'https://www.uefa.com/uefaeuro/history/seasons/2020/','UEFA EURO 2020'),
('cricket','world-cup','Which country won the 2023 men''s Cricket World Cup?','They defeated hosts India in Ahmedabad.','["Australia","Australia cricket team","Australian national cricket team"]'::jsonb,'Australia',.16,'https://www.icc-cricket.com/tournaments/cricketworldcup/2023','ICC Cricket World Cup 2023'),
('cricket','t20-world-cup','Which country won the inaugural men''s T20 World Cup in 2007?','They defeated Pakistan in Johannesburg.','["India","India cricket team","Indian national cricket team"]'::jsonb,'India',.46,'https://www.icc-cricket.com/tournaments/t20cricketworldcup/2007','ICC Men’s T20 World Cup 2007'),
('rugby','world-cup','Which nation won the 2015 men''s Rugby World Cup?','They defeated Australia at Twickenham.','["New Zealand","All Blacks","The All Blacks"]'::jsonb,'New Zealand',.34,'https://www.rugbyworldcup.com/2015','Rugby World Cup 2015'),
('rugby','world-cup','Which nation won the 1995 men''s Rugby World Cup?','Nelson Mandela presented the trophy to François Pienaar.','["South Africa","Springboks","The Springboks"]'::jsonb,'South Africa',.64,'https://www.rugbyworldcup.com/1995','Rugby World Cup 1995'),
('nfl','super-bowl','Which team won Super Bowl LIX?','They defeated Kansas City in New Orleans.','["Philadelphia Eagles","Eagles","Philly Eagles"]'::jsonb,'Philadelphia Eagles',.15,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
('nfl','super-bowl','Which team won Super Bowl LV?','Tom Brady was named MVP in Tampa.','["Tampa Bay Buccaneers","Buccaneers","Bucs","Tampa Bay"]'::jsonb,'Tampa Bay Buccaneers',.43,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
('nba','finals','Which team won the 2025 NBA Finals?','Shai Gilgeous-Alexander was Finals MVP.','["Oklahoma City Thunder","OKC Thunder","Thunder","Oklahoma City"]'::jsonb,'Oklahoma City Thunder',.15,'https://www.nba.com/playoffs','NBA Playoffs'),
('nba','finals','Which team won the 2016 NBA Finals?','They recovered from a 3–1 deficit against Golden State.','["Cleveland Cavaliers","Cavaliers","Cavs","Cleveland"]'::jsonb,'Cleveland Cavaliers',.44,'https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP history'),
('mlb','world-series','Which team won the 2023 World Series?','It was the franchise''s first championship.','["Texas Rangers","Rangers","Texas"]'::jsonb,'Texas Rangers',.28,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
('mlb','world-series','Which team won the 2004 World Series?','They ended an 86-year title drought.','["Boston Red Sox","Red Sox","Boston"]'::jsonb,'Boston Red Sox',.54,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
('nhl','stanley-cup','Which team won the 2025 Stanley Cup?','They defeated Edmonton for a second consecutive championship.','["Florida Panthers","Panthers","Florida"]'::jsonb,'Florida Panthers',.17,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
('nhl','stanley-cup','Which team won its first Stanley Cup in 2019?','They defeated Boston in seven games.','["St Louis Blues","St. Louis Blues","Blues"]'::jsonb,'St. Louis Blues',.51,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
('tennis','wimbledon','Who won the 2023 Wimbledon men''s singles title?','He defeated Novak Djokovic in five sets.','["Carlos Alcaraz","Alcaraz","Carlos Alcaraz Garfia"]'::jsonb,'Carlos Alcaraz',.22,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),
('tennis','wimbledon','Who won the 2008 Wimbledon men''s singles title?','He defeated Roger Federer in a five-set final.','["Rafael Nadal","Nadal","Rafael Nadal Parera"]'::jsonb,'Rafael Nadal',.52,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),
('golf','masters','Who won the 2025 Masters Tournament?','The victory completed his career Grand Slam.','["Rory McIlroy","McIlroy","Rory Daniel McIlroy"]'::jsonb,'Rory McIlroy',.18,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),
('golf','masters','Who won the 2005 Masters Tournament?','He beat Chris DiMarco in a playoff.','["Tiger Woods","Eldrick Woods","Woods","Tiger"]'::jsonb,'Tiger Woods',.52,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),
('f1','world-champions','Who won the 2023 Formula One World Drivers'' Championship?','The Red Bull driver won 19 races that season.','["Max Verstappen","Verstappen","Max Emilian Verstappen"]'::jsonb,'Max Verstappen',.18,'https://www.formula1.com/en/results/2023/drivers','Formula 1 2023 standings'),
('f1','world-champions','Who won the 1996 Formula One World Drivers'' Championship?','He secured the title at Suzuka.','["Damon Hill","Damon Graham Devereux Hill","Hill"]'::jsonb,'Damon Hill',.56,'https://www.formula1.com/en/results/1996/drivers','Formula 1 1996 standings'),
('darts','world-championship','Who won the 2025 PDC World Darts Championship?','The 17-year-old defeated Michael van Gerwen.','["Luke Littler","Littler","The Nuke"]'::jsonb,'Luke Littler',.16,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
('darts','world-championship','Who won the 2020 PDC World Darts Championship?','The Scot defeated Michael van Gerwen.','["Peter Wright","Wright","Snakebite"]'::jsonb,'Peter Wright',.53,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
('snooker','world-championship','Who won the 2025 World Snooker Championship?','The Chinese qualifier defeated Mark Williams.','["Zhao Xintong","Xintong Zhao","Zhao"]'::jsonb,'Zhao Xintong',.19,'https://www.wst.tv/worldchampionship','World Snooker Tour championship'),
('snooker','world-championship','Who won the 2010 World Snooker Championship?','The Australian defeated Graeme Dott.','["Neil Robertson","Robertson","The Thunder from Down Under"]'::jsonb,'Neil Robertson',.55,'https://www.wst.tv/worldchampionship','World Snooker Tour championship')
)
insert into public.question_bank(
 sport_id,category_key,question_type,format_key,prompt_i18n,clue_i18n,
 answer_rule,answer_display_i18n,difficulty_b,difficulty_percentile,
 editorial_difficulty_percentile,difficulty_confidence,quality_score,ambiguity_score,
 verification_status,source_id,source_url,source_title,content_hash,reviewed_at,active
)
select s.id,seed.category_key,'typed_single','classic_trivia',
 jsonb_build_object('en',seed.prompt),jsonb_build_object('en',seed.clue),
 jsonb_build_object('accepted',seed.accepted),jsonb_build_object('en',seed.display),
 case when seed.percentile<.25 then -1.3 when seed.percentile<.5 then -.3
   when seed.percentile<.75 then .7 else 1.5 end,
 seed.percentile,seed.percentile,0,1,0,'verified',editorial.id,
 seed.source_url,seed.source_title,
 encode(extensions.digest(seed.prompt,'sha256'),'hex'),now(),true
from seed join public.sports s on s.slug=seed.sport_slug cross join editorial
on conflict do nothing;

select public.prepare_verified_question_batch('Verified expansion 3 — mixed depth',24);
