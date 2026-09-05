-- Question quality and depth phase 1.
-- Adds one independently-written, sourced question at each difficulty for ten
-- headline sports, repairs two bad legacy prompts, and lets real attempts refine
-- difficulty without weakening the strict cross-sport bands.

-- Remove two known-bad legacy items. Replacement questions below retain the topics
-- with accurate wording and authoritative sources.
update public.question_bank
set active = false, verification_status = 'rejected'
where prompt_i18n->>'en' in (
  'Which Frenchman scored a hat-trick in the 2018 World Cup final? Trick question — who scored twice?',
  'Which Australian scored 400 not out in a Test against Zimbabwe in 2003?'
);

alter table public.question_bank
  add column if not exists editorial_difficulty_percentile numeric,
  add column if not exists difficulty_confidence numeric not null default 0,
  add column if not exists needs_difficulty_review boolean not null default false;

update public.question_bank
set editorial_difficulty_percentile = difficulty_percentile
where editorial_difficulty_percentile is null;

alter table public.question_bank
  alter column editorial_difficulty_percentile set not null,
  drop constraint if exists question_bank_editorial_difficulty_range,
  drop constraint if exists question_bank_difficulty_confidence_range;
alter table public.question_bank
  add constraint question_bank_editorial_difficulty_range
    check (editorial_difficulty_percentile between 0 and 1),
  add constraint question_bank_difficulty_confidence_range
    check (difficulty_confidence between 0 and 1);

with editorial as (
  select id from public.data_sources where name = 'Fanzeno sourced editorial' limit 1
), seed(
  sport_slug, category_key, prompt, clue, accepted, display, percentile,
  source_url, source_title
) as (
  values
  -- Football
  ('football','world-cup','Which nation won the 1966 men''s FIFA World Cup?','The hosts defeated West Germany after extra time.','["England","England national team","Three Lions"]'::jsonb,'England',.12,'https://www.fifa.com/tournaments/mens/worldcup/1966england','FIFA World Cup England 1966'),
  ('football','euros','Which nation won UEFA EURO 2004?','They defeated hosts Portugal in the final.','["Greece","Greece national team","Greek national team"]'::jsonb,'Greece',.38,'https://www.uefa.com/uefaeuro/history/seasons/2004/','UEFA EURO 2004'),
  ('football','awards','Who won the first Ballon d''Or in 1956?','The England winger was nicknamed the Wizard of the Dribble.','["Stanley Matthews","Sir Stanley Matthews","Matthews"]'::jsonb,'Stanley Matthews',.63,'https://www.francefootball.fr/ballon-d-or/palmares/','France Football Ballon d’Or winners'),
  ('football','historic-cups','Which club won the first UEFA Cup final in 1972?','They beat Wolverhampton Wanderers over two legs.','["Tottenham Hotspur","Tottenham","Spurs","Tottenham Hotspur FC"]'::jsonb,'Tottenham Hotspur',.87,'https://www.uefa.com/uefaeuropaleague/history/seasons/1971/','UEFA Cup 1971/72'),

  -- Cricket
  ('cricket','world-cup','Which country won the 2019 men''s Cricket World Cup?','They defeated New Zealand at Lord''s after a tied Super Over.','["England","England cricket team","England national cricket team"]'::jsonb,'England',.14,'https://www.icc-cricket.com/tournaments/cricketworldcup/2019','ICC Cricket World Cup 2019'),
  ('cricket','odi','Who made the highest individual score in men''s One Day Internationals: 264?','The India opener made it against Sri Lanka in Kolkata in 2014.','["Rohit Sharma","Rohit Gurunath Sharma","Rohit"]'::jsonb,'Rohit Sharma',.39,'https://www.icc-cricket.com/news/rohit-sharma-rewrites-record-books-with-264','ICC: Rohit Sharma 264'),
  ('cricket','tests','Who scored the first triple-century in Test cricket?','The England opener made 325 against West Indies in 1930.','["Andy Sandham","Andrew Sandham","Sandham"]'::jsonb,'Andy Sandham',.66,'https://www.lords.org/lords/our-history/honours-boards/a-sandham','Lord’s: Andy Sandham'),
  ('cricket','tests','Who captained West Indies in the first tied Test, against Australia in 1960?','The series trophy was later named after him and Richie Benaud.','["Frank Worrell","Sir Frank Worrell","Worrell"]'::jsonb,'Frank Worrell',.88,'https://www.cricket.com.au/news/3244976/the-tied-test-1960-australia-west-indies-brisbane-gabba','Cricket Australia: the Tied Test'),

  -- Rugby union
  ('rugby','world-cup','Which nation won the 2023 men''s Rugby World Cup?','They beat New Zealand by one point in the final.','["South Africa","Springboks","The Springboks","South African national team"]'::jsonb,'South Africa',.13,'https://www.rugbyworldcup.com/2023/match/final-winner','Rugby World Cup 2023 final'),
  ('rugby','six-nations','Which nation completed a Six Nations Grand Slam in 2003 before winning the World Cup that year?','Martin Johnson captained the side.','["England","England rugby team","England national rugby union team"]'::jsonb,'England',.41,'https://www.sixnationsrugby.com/en/m6n/championship-history','Six Nations championship history'),
  ('rugby','world-cup','Who scored the first try in men''s Rugby World Cup history in 1987?','The New Zealand flanker scored against Italy.','["Michael Jones","Sir Michael Jones","Jones"]'::jsonb,'Michael Jones',.67,'https://www.world.rugby/news/245170','World Rugby: Rugby World Cup firsts'),
  ('rugby','world-cup','Who captained New Zealand to victory in the inaugural men''s Rugby World Cup final in 1987?','The scrum-half scored a try in the final at Eden Park.','["David Kirk","David Edward Kirk","Kirk"]'::jsonb,'David Kirk',.91,'https://www.rugbyworldcup.com/2023/about','Rugby World Cup history'),

  -- NFL
  ('nfl','super-bowl','Which quarterback has won seven Super Bowls?','Six came with New England and one with Tampa Bay.','["Tom Brady","Thomas Brady","Brady","Tom Brady Jr"]'::jsonb,'Tom Brady',.10,'https://www.nfl.com/players/tom-brady/stats/career','NFL: Tom Brady'),
  ('nfl','super-bowl','Who was the first Black starting quarterback to win a Super Bowl?','He was named MVP of Super Bowl XXII for Washington.','["Doug Williams","Douglas Williams","Williams"]'::jsonb,'Doug Williams',.43,'https://www.nfl.com/news/doug-williams-super-bowl-xxii-history','NFL: Doug Williams'),
  ('nfl','super-bowl','Who is the only Super Bowl MVP from the losing team?','The Dallas linebacker won the award after Super Bowl V.','["Chuck Howley","Charles Howley","Howley"]'::jsonb,'Chuck Howley',.69,'https://www.nfl.com/photos/super-bowl-mvps-09000d5d8269e811','NFL Super Bowl MVPs'),
  ('nfl','super-bowl','Who won the first two Super Bowl MVP awards?','The Green Bay Packers quarterback wore number 15.','["Bart Starr","Bryan Bartlett Starr","Starr"]'::jsonb,'Bart Starr',.86,'https://www.nfl.com/players/bart-starr/','NFL: Bart Starr'),

  -- NBA
  ('nba','records','Who scored 100 points in a single NBA game?','The record was set for Philadelphia against New York in 1962.','["Wilt Chamberlain","Wilton Chamberlain","Wilt","Chamberlain"]'::jsonb,'Wilt Chamberlain',.11,'https://www.nba.com/news/history-wilt-chamberlain-100-point-game','NBA: Wilt Chamberlain’s 100-point game'),
  ('nba','finals','Who was Finals MVP when Dallas won its first NBA title in 2011?','The German forward wore number 41.','["Dirk Nowitzki","Nowitzki","Dirk"]'::jsonb,'Dirk Nowitzki',.40,'https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP history'),
  ('nba','records','Who recorded the NBA''s first officially recognised quadruple-double?','The Chicago Bulls centre achieved it in 1974.','["Nate Thurmond","Nathaniel Thurmond","Thurmond"]'::jsonb,'Nate Thurmond',.68,'https://www.nba.com/news/history-quadruple-doubles','NBA quadruple-doubles'),
  ('nba','records','Who is the shortest player in NBA history at 5 feet 3 inches?','The point guard played most of his career for Charlotte.','["Muggsy Bogues","Tyrone Bogues","Bogues","Muggsy"]'::jsonb,'Muggsy Bogues',.86,'https://www.nba.com/hornets/history-muggsy-bogues','NBA: Muggsy Bogues'),

  -- MLB
  ('mlb','world-series','Which franchise has won the most World Series titles?','The team plays home games in the Bronx.','["New York Yankees","NY Yankees","Yankees","The Yankees"]'::jsonb,'New York Yankees',.09,'https://www.mlb.com/postseason/history/world-series','MLB World Series history'),
  ('mlb','history','Who became the first player unanimously elected to the Baseball Hall of Fame?','The Yankees closer was elected in 2019.','["Mariano Rivera","Rivera"]'::jsonb,'Mariano Rivera',.42,'https://baseballhall.org/hall-of-famers/rivera-mariano','National Baseball Hall of Fame: Mariano Rivera'),
  ('mlb','world-series','Who is the only World Series MVP from the losing team?','The Yankees second baseman won the award in 1960.','["Bobby Richardson","Robert Richardson","Richardson"]'::jsonb,'Bobby Richardson',.69,'https://www.mlb.com/news/world-series-mvp-award-history','MLB World Series MVP history'),
  ('mlb','records','Who threw consecutive no-hitters in Major League Baseball in 1938?','The Cincinnati Reds pitcher achieved the unique feat.','["Johnny Vander Meer","John Vander Meer","Vander Meer","VanderMeer"]'::jsonb,'Johnny Vander Meer',.91,'https://www.mlb.com/news/johnny-vander-meer-consecutive-no-hitters','MLB: Johnny Vander Meer'),

  -- NHL
  ('nhl','stanley-cup','Which franchise has won the most Stanley Cups?','The club is based in Montreal.','["Montreal Canadiens","Canadiens","Habs","The Canadiens"]'::jsonb,'Montreal Canadiens',.12,'https://www.nhl.com/news/stanley-cup-champions-list-287705398','NHL Stanley Cup champions'),
  ('nhl','awards','Which trophy is awarded to the NHL playoff MVP?','It was first presented in 1965.','["Conn Smythe Trophy","Conn Smythe","The Conn Smythe Trophy"]'::jsonb,'Conn Smythe Trophy',.38,'https://www.nhl.com/news/conn-smythe-trophy-winners-complete-list-287709808','NHL Conn Smythe winners'),
  ('nhl','stanley-cup','Which expansion-era team became the first to win the Stanley Cup, in 1974?','The Broad Street Bullies defeated Boston.','["Philadelphia Flyers","Flyers","The Flyers"]'::jsonb,'Philadelphia Flyers',.64,'https://www.nhl.com/flyers/team/history','Philadelphia Flyers history'),
  ('nhl','awards','Who won the first Conn Smythe Trophy in 1965?','The Montreal Canadiens captain was the first recipient.','["Jean Beliveau","Jean Béliveau","Beliveau","Béliveau"]'::jsonb,'Jean Béliveau',.88,'https://www.nhl.com/news/conn-smythe-trophy-winners-complete-list-287709808','NHL Conn Smythe winners'),

  -- Tennis
  ('tennis','grand-slams','On which surface is Wimbledon played?','It is the only Grand Slam played on this surface.','["Grass","Grass court","Grass courts"]'::jsonb,'Grass',.07,'https://www.wimbledon.com/en_GB/about_wimbledon/history.html','Wimbledon history'),
  ('tennis','grand-slams','Who completed the calendar-year Golden Slam in singles in 1988?','The German won all four majors and Olympic gold.','["Steffi Graf","Stefanie Graf","Graf"]'::jsonb,'Steffi Graf',.39,'https://www.wtatennis.com/players/70044/steffi-graf/bio','WTA: Steffi Graf'),
  ('tennis','grand-slams','Who became the youngest Wimbledon men''s singles champion of the Open Era in 1985?','The unseeded German was 17 years old.','["Boris Becker","Becker"]'::jsonb,'Boris Becker',.62,'https://www.wimbledon.com/en_GB/about_wimbledon/history.html','Wimbledon history'),
  ('tennis','grand-slams','Who became the first wildcard to win the Wimbledon men''s singles title, in 2001?','The Croatian defeated Patrick Rafter in five sets.','["Goran Ivanisevic","Goran Ivanišević","Ivanisevic","Ivanišević"]'::jsonb,'Goran Ivanišević',.88,'https://www.wimbledon.com/en_GB/about_wimbledon/history.html','Wimbledon history'),

  -- Golf
  ('golf','majors','At which course is the Masters Tournament always played?','The course is in Georgia, USA.','["Augusta National Golf Club","Augusta National","Augusta"]'::jsonb,'Augusta National Golf Club',.08,'https://www.masters.com/en_US/tournament/index.html','Masters Tournament'),
  ('golf','history','Who completed golf''s pre-Masters Grand Slam in 1930?','The American then retired from championship golf.','["Bobby Jones","Robert Tyre Jones Jr","Jones"]'::jsonb,'Bobby Jones',.41,'https://www.usga.org/content/usga/home-page/articles/2020/09/bobby-jones-grand-slam-1930.html','USGA: Bobby Jones Grand Slam'),
  ('golf','majors','Who became the first European winner of the Masters in 1980?','The Spaniard was nicknamed Seve.','["Seve Ballesteros","Severiano Ballesteros","Ballesteros","Seve"]'::jsonb,'Seve Ballesteros',.66,'https://www.masters.com/en_US/tournament/history.html','Masters Tournament history'),
  ('golf','majors','Who became the first left-handed golfer to win a men''s major, at The Open in 1963?','The New Zealander defeated Phil Rodgers in a playoff.','["Bob Charles","Sir Bob Charles","Robert Charles","Charles"]'::jsonb,'Bob Charles',.90,'https://www.theopen.com/players/bob-charles','The Open: Bob Charles'),

  -- Formula 1
  ('f1','world-champions','Who won the first Formula One World Drivers'' Championship in 1950?','The Italian drove for Alfa Romeo.','["Giuseppe Farina","Nino Farina","Emilio Giuseppe Farina","Farina"]'::jsonb,'Giuseppe “Nino” Farina',.13,'https://www.formula1.com/en/results/1950/drivers','Formula 1 1950 standings'),
  ('f1','world-champions','Who is Formula One''s only posthumous world champion?','The Austrian secured the 1970 title.','["Jochen Rindt","Karl Jochen Rindt","Rindt"]'::jsonb,'Jochen Rindt',.40,'https://www.formula1.com/en/results/1970/drivers','Formula 1 1970 standings'),
  ('f1','constructors','Which team raced the six-wheeled P34 in Formula One?','The car won the 1976 Swedish Grand Prix.','["Tyrrell","Tyrrell Racing","Elf Team Tyrrell"]'::jsonb,'Tyrrell',.68,'https://www.formula1.com/en/latest/article/the-six-wheeled-tyrrell-p34.2k3FoVoP5k2XudR8XbVDBA','Formula 1: Tyrrell P34'),
  ('f1','race-winners','Who scored Renault''s first Formula One victory, at the 1979 French Grand Prix?','The French driver won at Dijon in a turbocharged Renault.','["Jean-Pierre Jabouille","Jean Pierre Jabouille","Jabouille"]'::jsonb,'Jean-Pierre Jabouille',.89,'https://www.formula1.com/en/results/1979/races/363/france/race-result','Formula 1 1979 French Grand Prix')
)
insert into public.question_bank(
  sport_id, category_key, question_type, format_key, prompt_i18n, clue_i18n,
  answer_rule, answer_display_i18n, difficulty_b, difficulty_percentile,
  editorial_difficulty_percentile, difficulty_confidence, quality_score,
  ambiguity_score, verification_status, source_id, source_url, source_title,
  content_hash, reviewed_at, active
)
select
  s.id, seed.category_key, 'typed_single', 'classic_trivia',
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

-- Empirical calibration uses a 40-attempt editorial prior. This prevents a small
-- sample or one unusually strong sport audience from moving a question abruptly.
create or replace function public.refresh_question_difficulty_from_attempts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  total_attempts int;
  wrong_attempts int;
  editorial numeric;
  calibrated numeric;
begin
  select count(*)::int,
    count(*) filter (where not correct and not passed)::int
  into total_attempts, wrong_attempts
  from public.question_attempts
  where question_id = new.question_id and not passed;

  select editorial_difficulty_percentile into editorial
  from public.question_bank where id = new.question_id;

  if total_attempts >= 20 and editorial is not null then
    calibrated := (wrong_attempts + 40 * editorial) / (total_attempts + 40);
    update public.question_bank
    set difficulty_percentile = greatest(0, least(1, calibrated)),
      difficulty_b = ln(greatest(.01, calibrated) / greatest(.01, 1 - calibrated)),
      difficulty_confidence = least(1, total_attempts / 100.0),
      needs_difficulty_review = total_attempts >= 50
        and abs(calibrated - editorial) >= .22
    where id = new.question_id;
  end if;
  return new;
end $$;

drop trigger if exists question_attempt_recalibrate on public.question_attempts;
create trigger question_attempt_recalibrate
after insert on public.question_attempts
for each row execute function public.refresh_question_difficulty_from_attempts();

revoke all on function public.refresh_question_difficulty_from_attempts() from public, anon, authenticated;
grant execute on function public.refresh_question_difficulty_from_attempts() to service_role;

-- Operational coverage view: a subcategory is launch-ready only when all four bands
-- have at least 25 verified questions; 100 per band remains the content target.
create or replace view public.question_pool_readiness as
with coverage as (
  select sport_id, category_key,
    public.question_difficulty_band(difficulty_percentile) difficulty,
    count(*) filter (
      where active and verification_status = 'verified'
        and quality_score >= .8 and ambiguity_score <= .1
    )::int playable_questions
  from public.question_bank
  group by sport_id, category_key,
    public.question_difficulty_band(difficulty_percentile)
)
select sport_id, category_key,
  coalesce(max(playable_questions) filter (where difficulty = 1), 0)::int easy,
  coalesce(max(playable_questions) filter (where difficulty = 2), 0)::int medium,
  coalesce(max(playable_questions) filter (where difficulty = 3), 0)::int hard,
  coalesce(max(playable_questions) filter (where difficulty = 4), 0)::int expert,
  least(
    coalesce(max(playable_questions) filter (where difficulty = 1), 0),
    coalesce(max(playable_questions) filter (where difficulty = 2), 0),
    coalesce(max(playable_questions) filter (where difficulty = 3), 0),
    coalesce(max(playable_questions) filter (where difficulty = 4), 0)
  ) >= 25 launch_ready,
  least(
    coalesce(max(playable_questions) filter (where difficulty = 1), 0),
    coalesce(max(playable_questions) filter (where difficulty = 2), 0),
    coalesce(max(playable_questions) filter (where difficulty = 3), 0),
    coalesce(max(playable_questions) filter (where difficulty = 4), 0)
  ) >= 100 depth_target_met
from coverage
group by sport_id, category_key;

revoke all on public.question_pool_readiness from public, anon, authenticated;
grant select on public.question_pool_readiness to service_role;
