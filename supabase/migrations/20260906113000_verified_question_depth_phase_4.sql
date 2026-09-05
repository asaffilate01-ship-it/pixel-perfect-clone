-- Verified depth phase 4: 24 additional sourced questions across twelve sports.
with editorial as (
  select id from public.data_sources where name='Fanzeno sourced editorial' limit 1
), seed(sport_slug,category_key,prompt,clue,accepted,display,percentile,source_url,source_title) as (
values
('football','champions-league','Which club won the 1999 UEFA Champions League final?','They scored twice in stoppage time against Bayern Munich.','["Manchester United","Man United","Manchester Utd","Man Utd"]'::jsonb,'Manchester United',.34,'https://www.uefa.com/uefachampionsleague/history/seasons/1998/','UEFA Champions League 1998/99'),
('football','euros','Which nation won UEFA EURO 2004?','They defeated hosts Portugal in the final.','["Greece","Greece national team","Hellas"]'::jsonb,'Greece',.57,'https://www.uefa.com/uefaeuro/history/seasons/2004/','UEFA EURO 2004'),
('cricket','world-cup','Which country won the 2019 men''s Cricket World Cup?','The final against New Zealand was decided by a boundary-count rule.','["England","England cricket team","English cricket team"]'::jsonb,'England',.23,'https://www.icc-cricket.com/tournaments/cricketworldcup/2019','ICC Cricket World Cup 2019'),
('cricket','t20-world-cup','Which country won the 2016 men''s T20 World Cup?','Carlos Brathwaite hit four consecutive sixes in the final over.','["West Indies","West Indies cricket team","The Windies","Windies"]'::jsonb,'West Indies',.49,'https://www.icc-cricket.com/tournaments/t20cricketworldcup/2016','ICC Men’s T20 World Cup 2016'),
('rugby','world-cup','Which nation won the 2003 men''s Rugby World Cup?','Jonny Wilkinson kicked the winning drop goal in extra time.','["England","England rugby team","England national rugby union team"]'::jsonb,'England',.28,'https://www.rugbyworldcup.com/2003','Rugby World Cup 2003'),
('rugby','world-cup','Which nation won the 2019 men''s Rugby World Cup?','They defeated England in the final in Yokohama.','["South Africa","Springboks","The Springboks"]'::jsonb,'South Africa',.37,'https://www.rugbyworldcup.com/2019','Rugby World Cup 2019'),
('nfl','super-bowl','Which team defeated the previously unbeaten Patriots in Super Bowl XLII?','David Tyree made a famous helmet catch.','["New York Giants","NY Giants","Giants"]'::jsonb,'New York Giants',.45,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
('nfl','super-bowl','Which team won Super Bowl LII?','Nick Foles was named MVP after defeating New England.','["Philadelphia Eagles","Eagles","Philly Eagles"]'::jsonb,'Philadelphia Eagles',.39,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
('nba','finals','Which team won the 1998 NBA Finals?','Michael Jordan hit the decisive shot in Game 6.','["Chicago Bulls","Bulls","Chicago"]'::jsonb,'Chicago Bulls',.31,'https://www.nba.com/news/history-nba-champions','NBA champions history'),
('nba','finals','Which team won the 2011 NBA Finals?','Dirk Nowitzki was named Finals MVP.','["Dallas Mavericks","Mavericks","Mavs","Dallas"]'::jsonb,'Dallas Mavericks',.48,'https://www.nba.com/news/history-nba-champions','NBA champions history'),
('mlb','world-series','Which team ended a 108-year championship drought by winning the 2016 World Series?','They defeated Cleveland in seven games.','["Chicago Cubs","Cubs","Chicago"]'::jsonb,'Chicago Cubs',.29,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
('mlb','world-series','Which team won the 2020 World Series?','They defeated the Tampa Bay Rays.','["Los Angeles Dodgers","LA Dodgers","Dodgers","Los Angeles"]'::jsonb,'Los Angeles Dodgers',.35,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
('nhl','stanley-cup','Which team won the 1994 Stanley Cup?','Mark Messier captained them to their first title since 1940.','["New York Rangers","NY Rangers","Rangers"]'::jsonb,'New York Rangers',.53,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
('nhl','stanley-cup','Which team won its first Stanley Cup in 2018?','Alexander Ovechkin won the Conn Smythe Trophy.','["Washington Capitals","Capitals","Caps","Washington"]'::jsonb,'Washington Capitals',.43,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
('tennis','us-open','Who won the 2012 US Open men''s singles title?','He defeated Novak Djokovic to win his first major singles title.','["Andy Murray","Murray","Sir Andy Murray"]'::jsonb,'Andy Murray',.38,'https://www.usopen.org/en_US/visit/history/mschamps.html','US Open men’s singles champions'),
('tennis','wimbledon','Who won the 2019 Wimbledon men''s singles title?','He defeated Roger Federer after the first final-set tiebreak at 12–12.','["Novak Djokovic","Djokovic","Novak Đoković"]'::jsonb,'Novak Djokovic',.44,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),
('golf','masters','Who won the 2019 Masters Tournament?','It was his fifth green jacket and fifteenth major title.','["Tiger Woods","Eldrick Woods","Woods","Tiger"]'::jsonb,'Tiger Woods',.24,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),
('golf','ryder-cup','Which team won the 2023 Ryder Cup?','The contest was played at Marco Simone near Rome.','["Europe","Team Europe","European team"]'::jsonb,'Europe',.31,'https://www.rydercup.com/history','Ryder Cup history'),
('f1','world-champions','Who won the 2007 Formula One World Drivers'' Championship?','The Ferrari driver won the title by one point.','["Kimi Raikkonen","Kimi Räikkönen","Raikkonen","Räikkönen"]'::jsonb,'Kimi Räikkönen',.49,'https://www.formula1.com/en/results/2007/drivers','Formula 1 2007 standings'),
('f1','world-champions','Who won the 2009 Formula One World Drivers'' Championship?','He drove for Brawn GP.','["Jenson Button","Button","Jenson Alexander Lyons Button"]'::jsonb,'Jenson Button',.46,'https://www.formula1.com/en/results/2009/drivers','Formula 1 2009 standings'),
('darts','world-championship','Who won the 2007 PDC World Darts Championship?','He defeated Phil Taylor in a sudden-death leg.','["Raymond van Barneveld","Raymond Van Barneveld","Van Barneveld","Barney"]'::jsonb,'Raymond van Barneveld',.63,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
('darts','world-championship','Who won the 2018 PDC World Darts Championship?','He defeated Phil Taylor in Taylor''s final professional match.','["Rob Cross","Cross","Voltage"]'::jsonb,'Rob Cross',.54,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
('snooker','world-championship','Who won the 1985 World Snooker Championship?','He defeated Steve Davis on the final black.','["Dennis Taylor","Taylor"]'::jsonb,'Dennis Taylor',.47,'https://www.wst.tv/worldchampionship','World Snooker Tour championship'),
('snooker','world-championship','Who won the 2005 World Snooker Championship as a qualifier?','He defeated Matthew Stevens in the final.','["Shaun Murphy","Murphy","The Magician"]'::jsonb,'Shaun Murphy',.58,'https://www.wst.tv/worldchampionship','World Snooker Tour championship')
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

select public.prepare_verified_question_batch('Verified expansion 4 — champions and classics',24);
