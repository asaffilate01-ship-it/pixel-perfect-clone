-- Critical isolation fix: public room discoverability must never imply access to
-- that room's questions, revealed answers or submissions.

create or replace function public.is_arcade_participant(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.arcade_rooms r
      where r.id = p_room and r.host_id = auth.uid()
    )
    or exists (
      select 1 from public.arcade_room_players p
      where p.room_id = p_room and p.user_id = auth.uid()
    )
  )
$$;

revoke all on function public.is_arcade_participant(uuid) from public, anon;
grant execute on function public.is_arcade_participant(uuid) to authenticated, service_role;

drop policy if exists "questions visible to room" on public.arcade_questions;
drop policy if exists "questions visible only to participants" on public.arcade_questions;
create policy "questions visible only to participants"
on public.arcade_questions for select to authenticated
using (public.is_arcade_participant(room_id));

drop policy if exists "room submissions visible" on public.arcade_submissions;
drop policy if exists "submissions visible only to participants" on public.arcade_submissions;
create policy "submissions visible only to participants"
on public.arcade_submissions for select to authenticated
using (
  exists (
    select 1 from public.arcade_questions q
    where q.id = question_id
      and public.is_arcade_participant(q.room_id)
  )
);

-- Questions and scored submissions are written only by the trusted server path.
drop policy if exists "host issues questions" on public.arcade_questions;
drop policy if exists "active player submission only" on public.arcade_submissions;
revoke insert, update, delete on public.arcade_questions from authenticated;
revoke insert, update, delete on public.arcade_submissions from authenticated;

-- Never retain an answer payload on an unrevealed room question.
update public.arcade_questions
set answer_display_i18n = '{}'::jsonb
where not revealed_answer and answer_display_i18n <> '{}'::jsonb;

alter table public.arcade_questions
  drop constraint if exists unrevealed_arcade_answer_is_hidden;
alter table public.arcade_questions
  add constraint unrevealed_arcade_answer_is_hidden
  check (revealed_answer or answer_display_i18n = '{}'::jsonb);

-- Verified depth phase 2: 48 independently answerable history questions.
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

-- Stronger anti-repeat selection.
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