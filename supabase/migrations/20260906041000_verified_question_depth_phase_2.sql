-- Verified depth phase 2: 48 independently answerable history questions,
-- four difficulty bands across twelve sports. Wording is original; facts link to
-- governing-body or competition-owner sources.

with editorial as (
  select id from public.data_sources where name = 'Fanzeno sourced editorial' limit 1
), seed(sport_slug, category_key, prompt, clue, accepted, display, percentile, source_url, source_title) as (
  values
  ('football','world-cup','Which nation won the 2018 men''s FIFA World Cup?','They defeated Croatia in the final.','["France","France national team","Les Bleus"]'::jsonb,'France',.12,'https://www.fifa.com/tournaments/mens/worldcup/2018russia','FIFA World Cup Russia 2018'),
  ('football','world-cup','Which nation won the 2010 men''s FIFA World Cup?','Andrés Iniesta scored the final''s only goal.','["Spain","Spain national team","La Roja"]'::jsonb,'Spain',.38,'https://www.fifa.com/tournaments/mens/worldcup/2010south-africa','FIFA World Cup South Africa 2010'),
  ('football','world-cup','Which nation won the 1994 men''s FIFA World Cup?','They beat Italy after a penalty shootout.','["Brazil","Brazil national team","Selecao","Seleção"]'::jsonb,'Brazil',.63,'https://www.fifa.com/tournaments/mens/worldcup/1994usa','FIFA World Cup USA 1994'),
  ('football','world-cup','Which nation won the 1954 men''s FIFA World Cup?','They defeated Hungary in the Miracle of Bern.','["West Germany","Germany","Federal Republic of Germany"]'::jsonb,'West Germany',.88,'https://www.fifa.com/tournaments/mens/worldcup/1954switzerland','FIFA World Cup Switzerland 1954'),

  ('cricket','world-cup','Which country won the 2011 men''s Cricket World Cup?','They beat Sri Lanka in Mumbai.','["India","India cricket team","Indian national cricket team"]'::jsonb,'India',.12,'https://www.icc-cricket.com/tournaments/cricketworldcup/2011','ICC Cricket World Cup 2011'),
  ('cricket','world-cup','Which country won the 1992 men''s Cricket World Cup?','Imran Khan captained the champions.','["Pakistan","Pakistan cricket team","Pakistan national cricket team"]'::jsonb,'Pakistan',.38,'https://www.icc-cricket.com/tournaments/cricketworldcup/1992','ICC Cricket World Cup 1992'),
  ('cricket','world-cup','Which country won the 1983 men''s Cricket World Cup?','Kapil Dev captained the champions.','["India","India cricket team","Indian national cricket team"]'::jsonb,'India',.63,'https://www.icc-cricket.com/tournaments/cricketworldcup/1983','ICC Cricket World Cup 1983'),
  ('cricket','world-cup','Which team won the inaugural men''s Cricket World Cup in 1975?','Clive Lloyd captained the champions.','["West Indies","West Indies cricket team","The West Indies"]'::jsonb,'West Indies',.88,'https://www.icc-cricket.com/tournaments/cricketworldcup/1975','ICC Cricket World Cup 1975'),

  ('rugby','world-cup','Which nation won the 2019 men''s Rugby World Cup?','They defeated England in Yokohama.','["South Africa","Springboks","The Springboks"]'::jsonb,'South Africa',.12,'https://www.rugbyworldcup.com/2019','Rugby World Cup 2019'),
  ('rugby','world-cup','Which nation won the 2011 men''s Rugby World Cup?','They defeated France by one point in the final.','["New Zealand","All Blacks","The All Blacks"]'::jsonb,'New Zealand',.38,'https://www.rugbyworldcup.com/2011','Rugby World Cup 2011'),
  ('rugby','world-cup','Which nation won the 1991 men''s Rugby World Cup?','They defeated England at Twickenham.','["Australia","Wallabies","The Wallabies"]'::jsonb,'Australia',.63,'https://www.rugbyworldcup.com/1991','Rugby World Cup 1991'),
  ('rugby','world-cup','Which nation won the inaugural men''s Rugby World Cup in 1987?','David Kirk captained the champions.','["New Zealand","All Blacks","The All Blacks"]'::jsonb,'New Zealand',.88,'https://www.rugbyworldcup.com/1987','Rugby World Cup 1987'),

  ('nfl','super-bowl','Which team won Super Bowl LVIII?','Patrick Mahomes was named MVP.','["Kansas City Chiefs","Chiefs","KC Chiefs"]'::jsonb,'Kansas City Chiefs',.12,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
  ('nfl','super-bowl','Which team won Super Bowl LII?','They defeated New England in Minneapolis.','["Philadelphia Eagles","Eagles","Philly Eagles"]'::jsonb,'Philadelphia Eagles',.38,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
  ('nfl','super-bowl','Which team won Super Bowl XXXIV?','They stopped Tennessee one yard short.','["St Louis Rams","St. Louis Rams","Rams"]'::jsonb,'St. Louis Rams',.63,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),
  ('nfl','super-bowl','Which team won Super Bowl III?','Joe Namath was named MVP.','["New York Jets","NY Jets","Jets"]'::jsonb,'New York Jets',.88,'https://www.nfl.com/super-bowl/history','NFL Super Bowl history'),

  ('nba','finals','Which team won the 2024 NBA Finals?','They defeated Dallas for the franchise''s 18th championship.','["Boston Celtics","Celtics","Boston"]'::jsonb,'Boston Celtics',.12,'https://www.nba.com/playoffs/2024/nba-finals','NBA Finals 2024'),
  ('nba','finals','Which team won the 2011 NBA Finals?','Dirk Nowitzki was Finals MVP.','["Dallas Mavericks","Mavericks","Mavs","Dallas"]'::jsonb,'Dallas Mavericks',.38,'https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP history'),
  ('nba','finals','Which team won the 1977 NBA Finals?','Bill Walton was Finals MVP.','["Portland Trail Blazers","Trail Blazers","Blazers","Portland"]'::jsonb,'Portland Trail Blazers',.63,'https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP history'),
  ('nba','finals','Which team won the 1955 NBA Finals?','The franchise was then based in Syracuse.','["Syracuse Nationals","Nationals","Syracuse"]'::jsonb,'Syracuse Nationals',.88,'https://www.nba.com/history','NBA history'),

  ('mlb','world-series','Which team won the 2024 World Series?','They defeated the New York Yankees.','["Los Angeles Dodgers","LA Dodgers","Dodgers"]'::jsonb,'Los Angeles Dodgers',.12,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
  ('mlb','world-series','Which team won the 2016 World Series?','They ended a 108-year championship drought.','["Chicago Cubs","Cubs","The Cubs"]'::jsonb,'Chicago Cubs',.38,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
  ('mlb','world-series','Which team won the 1986 World Series?','They defeated Boston in seven games.','["New York Mets","NY Mets","Mets"]'::jsonb,'New York Mets',.63,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
  ('mlb','world-series','Which club won the first modern World Series in 1903?','The team was then known as the Boston Americans.','["Boston Americans","Americans","Boston Red Sox","Red Sox"]'::jsonb,'Boston Americans',.88,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),

  ('nhl','stanley-cup','Which team won the 2024 Stanley Cup?','They defeated Edmonton in seven games.','["Florida Panthers","Panthers","Florida"]'::jsonb,'Florida Panthers',.12,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
  ('nhl','stanley-cup','Which team won its first Stanley Cup in 2018?','Alexander Ovechkin captained the champions.','["Washington Capitals","Capitals","Caps","Washington"]'::jsonb,'Washington Capitals',.38,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
  ('nhl','stanley-cup','Which team won the 1994 Stanley Cup?','They ended a 54-year title drought.','["New York Rangers","NY Rangers","Rangers"]'::jsonb,'New York Rangers',.63,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
  ('nhl','stanley-cup','Which team won the Stanley Cup in 1918?','The champions were known as the Toronto Arenas.','["Toronto Arenas","Arenas","Toronto"]'::jsonb,'Toronto Arenas',.88,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),

  ('tennis','wimbledon','Who won the 2024 Wimbledon men''s singles title?','He defeated Novak Djokovic in the final.','["Carlos Alcaraz","Alcaraz","Carlos Alcaraz Garfia"]'::jsonb,'Carlos Alcaraz',.12,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),
  ('tennis','wimbledon','Who won the 2012 Wimbledon men''s singles title?','He defeated Andy Murray in the final.','["Roger Federer","Federer","Roger"]'::jsonb,'Roger Federer',.38,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),
  ('tennis','wimbledon','Who won the 2001 Wimbledon men''s singles title?','The Croatian entered the tournament as a wildcard.','["Goran Ivanisevic","Goran Ivanišević","Ivanisevic","Ivanišević"]'::jsonb,'Goran Ivanišević',.63,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),
  ('tennis','wimbledon','Who won the 1987 Wimbledon men''s singles title?','The Australian defeated Ivan Lendl.','["Pat Cash","Patrick Cash","Cash"]'::jsonb,'Pat Cash',.88,'https://www.wimbledon.com/en_GB/draws_archive/champions/champions.html','Wimbledon champions'),

  ('golf','masters','Who won the 2024 Masters Tournament?','It was his second green jacket.','["Scottie Scheffler","Scheffler","Scott Alexander Scheffler"]'::jsonb,'Scottie Scheffler',.12,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),
  ('golf','masters','Who won the 2019 Masters Tournament?','It was his fifth green jacket.','["Tiger Woods","Eldrick Woods","Woods","Tiger"]'::jsonb,'Tiger Woods',.38,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),
  ('golf','masters','Who won the 1999 Masters Tournament?','The Spaniard won his second green jacket.','["Jose Maria Olazabal","José María Olazábal","Olazabal","Olazábal"]'::jsonb,'José María Olazábal',.63,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),
  ('golf','masters','Who became the first non-American Masters champion in 1961?','The South African won by one stroke.','["Gary Player","Player"]'::jsonb,'Gary Player',.88,'https://www.masters.com/en_US/tournament/past_winners.html','Masters past winners'),

  ('f1','world-champions','Who won the 2024 Formula One World Drivers'' Championship?','The Red Bull driver secured a fourth consecutive title.','["Max Verstappen","Verstappen","Max Emilian Verstappen"]'::jsonb,'Max Verstappen',.12,'https://www.formula1.com/en/results/2024/drivers','Formula 1 2024 standings'),
  ('f1','world-champions','Who won the 2009 Formula One World Drivers'' Championship?','He drove for Brawn GP.','["Jenson Button","Button","Jenson Alexander Lyons Button"]'::jsonb,'Jenson Button',.38,'https://www.formula1.com/en/results/2009/drivers','Formula 1 2009 standings'),
  ('f1','world-champions','Who won the 1976 Formula One World Drivers'' Championship?','The Briton beat Niki Lauda by one point.','["James Hunt","James Simon Wallis Hunt","Hunt"]'::jsonb,'James Hunt',.63,'https://www.formula1.com/en/results/1976/drivers','Formula 1 1976 standings'),
  ('f1','world-champions','Who became Britain''s first Formula One world champion in 1958?','He won the title by one point.','["Mike Hawthorn","John Michael Hawthorn","Hawthorn"]'::jsonb,'Mike Hawthorn',.88,'https://www.formula1.com/en/results/1958/drivers','Formula 1 1958 standings'),

  ('darts','world-championship','Who won the 2024 PDC World Darts Championship?','He defeated Luke Littler in the final.','["Luke Humphries","Humphries","Cool Hand Luke"]'::jsonb,'Luke Humphries',.12,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
  ('darts','world-championship','Who won the 2015 PDC World Darts Championship?','The Scot defeated Phil Taylor in the final.','["Gary Anderson","Anderson","The Flying Scotsman"]'::jsonb,'Gary Anderson',.38,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
  ('darts','world-championship','Who won the 2007 PDC World Darts Championship?','He defeated Phil Taylor in a sudden-death leg.','["Raymond van Barneveld","Raymond Van Barneveld","Van Barneveld","Barney"]'::jsonb,'Raymond van Barneveld',.63,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),
  ('darts','world-championship','Who won the inaugural PDC World Darts Championship in 1994?','He defeated Phil Taylor in the final.','["Dennis Priestley","Priestley","The Menace"]'::jsonb,'Dennis Priestley',.88,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship'),

  ('snooker','world-championship','Who won the 2024 World Snooker Championship?','He defeated Jak Jones in the final.','["Kyren Wilson","Wilson","The Warrior"]'::jsonb,'Kyren Wilson',.12,'https://www.wst.tv/worldchampionship','World Snooker Tour championship'),
  ('snooker','world-championship','Who won the 2005 World Snooker Championship?','The qualifier defeated Matthew Stevens in the final.','["Shaun Murphy","Murphy","The Magician"]'::jsonb,'Shaun Murphy',.38,'https://www.wst.tv/worldchampionship','World Snooker Tour championship'),
  ('snooker','world-championship','Who won the 1985 World Snooker Championship?','He beat Steve Davis on the final black.','["Dennis Taylor","Taylor"]'::jsonb,'Dennis Taylor',.63,'https://www.wst.tv/worldchampionship','World Snooker Tour championship'),
  ('snooker','world-championship','Who won the inaugural World Snooker Championship in 1927?','He also organised the tournament.','["Joe Davis","Joseph Davis","Davis"]'::jsonb,'Joe Davis',.88,'https://www.wst.tv/worldchampionship','World Snooker Tour championship')
)
insert into public.question_bank(
  sport_id, category_key, question_type, format_key, prompt_i18n, clue_i18n,
  answer_rule, answer_display_i18n, difficulty_b, difficulty_percentile,
  editorial_difficulty_percentile, difficulty_confidence, quality_score,
  ambiguity_score, verification_status, source_id, source_url, source_title,
  content_hash, reviewed_at, active
)
select s.id, seed.category_key, 'typed_single', 'classic_trivia',
  jsonb_build_object('en', seed.prompt), jsonb_build_object('en', seed.clue),
  jsonb_build_object('accepted', seed.accepted), jsonb_build_object('en', seed.display),
  case when seed.percentile < .25 then -1.3 when seed.percentile < .5 then -.3
    when seed.percentile < .75 then .7 else 1.5 end,
  seed.percentile, seed.percentile, 0, 1, 0, 'verified', editorial.id,
  seed.source_url, seed.source_title,
  encode(extensions.digest(seed.prompt, 'sha256'), 'hex'), now(), true
from seed
join public.sports s on s.slug = seed.sport_slug
cross join editorial
on conflict do nothing;

select public.prepare_verified_question_batch('Verified expansion 2 — history depth', 48);
