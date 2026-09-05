-- Verified depth phase 5: 24 additional questions with aliases and calibrated difficulty.
with editorial as (
  select id from public.data_sources where name='Fanzeno sourced editorial' limit 1
), seed(sport_slug,category_key,prompt,clue,accepted,display,percentile,source_url,source_title) as (
values
('football','world-cup','Which nation won the first FIFA World Cup in 1930?','The host nation won the final in Montevideo.','["Uruguay","Uruguay national team"]'::jsonb,'Uruguay',.43,'https://www.fifa.com/tournaments/mens/worldcup/1930uruguay','FIFA World Cup 1930'),
('football','ballon-dor','Who won the men''s Ballon d''Or in 2007?','The Brazilian was playing for AC Milan.','["Kaka","Kaká","Ricardo Kaka","Ricardo Izecson dos Santos Leite"]'::jsonb,'Kaká',.54,'https://www.francefootball.fr/ballon-d-or/palmares/','France Football Ballon d’Or winners'),
('cricket','ashes','Which bowler took 8 for 43 at Trent Bridge in the 2015 Ashes?','The England seamer produced the spell on the first morning.','["Stuart Broad","Broad","Stuart Christopher John Broad"]'::jsonb,'Stuart Broad',.61,'https://www.ecb.co.uk/england/men','England and Wales Cricket Board'),
('cricket','t20-world-cup','Which country won the inaugural men''s T20 World Cup in 2007?','They defeated Pakistan in the final.','["India","India cricket team","Indian cricket team"]'::jsonb,'India',.37,'https://www.icc-cricket.com/tournaments/t20cricketworldcup','ICC Men’s T20 World Cup'),
('rugby','six-nations','Which nation completed a Six Nations Grand Slam in 2009?','Brian O''Driscoll captained the champions.','["Ireland","Ireland rugby team","Irish rugby team"]'::jsonb,'Ireland',.56,'https://www.sixnationsrugby.com/en/m6n','Six Nations Rugby'),
('rugby','world-cup','Who kicked the winning drop goal in the 2003 Rugby World Cup final?','The score came in extra time against Australia.','["Jonny Wilkinson","Jonathan Wilkinson","Sir Jonny Wilkinson","Wilkinson"]'::jsonb,'Jonny Wilkinson',.24,'https://www.rugbyworldcup.com/2003','Rugby World Cup 2003'),
('nfl','super-bowl','Which franchise won Super Bowl XX with the 1985 season''s famed defence?','They defeated the New England Patriots 46–10.','["Chicago Bears","Bears","Chicago"]'::jsonb,'Chicago Bears',.52,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
('nfl','awards','Which quarterback won NFL MVP for the 2015 season?','He led Carolina to a 15–1 regular-season record.','["Cam Newton","Newton","Cameron Newton"]'::jsonb,'Cam Newton',.46,'https://www.nfl.com/honors/','NFL Honors'),
('nba','finals','Which team won the 2004 NBA Finals?','They defeated the Los Angeles Lakers in five games.','["Detroit Pistons","Pistons","Detroit"]'::jsonb,'Detroit Pistons',.55,'https://www.nba.com/news/history-nba-champions','NBA champions history'),
('nba','awards','Who was the NBA''s regular-season MVP in 2001?','The Philadelphia 76ers guard also led his team to the Finals.','["Allen Iverson","Iverson","Allen Ezail Iverson"]'::jsonb,'Allen Iverson',.47,'https://www.nba.com/news/history-mvp-award-winners','NBA MVP history'),
('mlb','world-series','Which team won the 2001 World Series?','They defeated the Yankees on a walk-off hit in Game 7.','["Arizona Diamondbacks","Diamondbacks","D-backs","Dbacks","Arizona"]'::jsonb,'Arizona Diamondbacks',.58,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
('mlb','records','Who broke Major League Baseball''s single-season home-run record with 70 in 1998?','The St Louis Cardinals first baseman surpassed Roger Maris.','["Mark McGwire","McGwire","Mark David McGwire"]'::jsonb,'Mark McGwire',.45,'https://www.mlb.com/stats/home-runs/all-time-by-season','MLB single-season home-run leaders'),
('nhl','stanley-cup','Which team won the Stanley Cup in 1993?','They remain the most recent Canadian franchise to win it.','["Montreal Canadiens","Montréal Canadiens","Canadiens","Habs","Montreal"]'::jsonb,'Montreal Canadiens',.49,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
('nhl','awards','Which player won the Hart Trophy for the 2005–06 NHL season?','The San Jose Sharks centre scored 125 points.','["Joe Thornton","Thornton","Joseph Eric Thornton"]'::jsonb,'Joe Thornton',.68,'https://www.nhl.com/news/hart-memorial-trophy-winners-complete-list','NHL Hart Trophy winners'),
('tennis','australian-open','Who won the 2017 Australian Open men''s singles title?','He defeated Rafael Nadal in five sets.','["Roger Federer","Federer","Roger"]'::jsonb,'Roger Federer',.35,'https://ausopen.com/history/honour-roll','Australian Open honour roll'),
('tennis','roland-garros','Who won the 2004 French Open women''s singles title?','The Russian defeated Elena Dementieva in the final.','["Anastasia Myskina","Myskina","Anastasiya Myskina"]'::jsonb,'Anastasia Myskina',.72,'https://www.rolandgarros.com/en-us/champions-wall','Roland-Garros champions'),
('golf','open-championship','Who won The Open Championship at Carnoustie in 1999?','He survived Jean van de Velde''s final-hole collapse.','["Paul Lawrie","Lawrie","Paul Stewart Lawrie"]'::jsonb,'Paul Lawrie',.62,'https://www.theopen.com/previous-opens','The Open previous championships'),
('golf','majors','Who completed the career Grand Slam by winning the 2000 Open Championship?','He won by eight strokes at St Andrews.','["Tiger Woods","Woods","Tiger","Eldrick Woods"]'::jsonb,'Tiger Woods',.38,'https://www.theopen.com/previous-opens/129th-open-st-andrews-2000','The 129th Open'),
('f1','world-champions','Who won the 1996 Formula One World Drivers'' Championship?','The Williams driver clinched it in Japan.','["Damon Hill","Hill","Damon Graham Devereux Hill"]'::jsonb,'Damon Hill',.48,'https://www.formula1.com/en/results/1996/drivers','Formula 1 1996 standings'),
('f1','grand-prix','Who won the 2008 Brazilian Grand Prix?','He won the race, although Lewis Hamilton took the title.','["Felipe Massa","Massa","Felipe Drugovich Massa"]'::jsonb,'Felipe Massa',.57,'https://www.formula1.com/en/results/2008/races/849/brazil/race-result','Formula 1 2008 Brazilian GP'),
('darts','world-championship','Who won the 2020 PDC World Darts Championship?','The Scot defeated Michael van Gerwen in the final.','["Peter Wright","Wright","Peter Snakebite Wright","Snakebite"]'::jsonb,'Peter Wright',.44,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
('darts','world-championship','Who became PDC world champion for the first time in 2021?','He beat Gary Anderson 7–3 in the final.','["Gerwyn Price","Price","Gerwyn Iceman Price","The Iceman"]'::jsonb,'Gerwyn Price',.49,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
('snooker','world-championship','Who won the 1997 World Snooker Championship?','The Irish player defeated John Higgins in the final.','["Ken Doherty","Doherty","Ken"]'::jsonb,'Ken Doherty',.58,'https://www.wst.tv/worldchampionship','World Snooker Tour championship'),
('snooker','world-championship','Who won the 2002 World Snooker Championship?','He defeated Stephen Hendry 18–17 in the final.','["Peter Ebdon","Ebdon","Peter David Ebdon"]'::jsonb,'Peter Ebdon',.64,'https://www.wst.tv/worldchampionship','World Snooker Tour championship')
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
 case when seed.percentile<.25 then -1.3 when seed.percentile<.5 then -.3 when seed.percentile<.75 then .7 else 1.5 end,
 seed.percentile,seed.percentile,0,1,0,'verified',editorial.id,
 seed.source_url,seed.source_title,
 encode(extensions.digest(seed.prompt,'sha256'),'hex'),now(),true
from seed join public.sports s on s.slug=seed.sport_slug cross join editorial
on conflict do nothing;

select public.prepare_verified_question_batch('Verified expansion 5 — historic champions',24);
