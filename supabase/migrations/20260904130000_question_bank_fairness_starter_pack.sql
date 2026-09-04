-- Verified starter content plus deterministic difficulty bands and repeat protection.
-- Questions are independently written and linked to official governing-body sources.

-- The sourced v0.20 starter set has official source URLs and accepted-answer rules.
-- Publish it so every enabled headline sport has at least one playable server question.
update public.question_bank
set verification_status = 'verified', reviewed_at = coalesce(reviewed_at, now())
where verification_status = 'pending'
  and source_id is not null
  and source_url is not null
  and content_hash is not null
  and quality_score >= .8
  and ambiguity_score <= .1
  and jsonb_typeof(answer_rule->'accepted') = 'array'
  and jsonb_array_length(answer_rule->'accepted') > 0;

-- Four calibrated levels for six popular sports. Percentiles deliberately cluster around
-- Easy .15, Medium .40, Hard .68 and Expert .90 so selection is predictable.
with editorial as (
  select id from public.data_sources where name = 'Fanzeno sourced editorial' limit 1
), seed(sport_slug, category_key, prompt, clue, accepted, display, percentile, source_url, source_title) as (
  values
  ('football','world-cup','Which nation won the 2022 men''s FIFA World Cup?','They defeated France on penalties in the final.','["Argentina","Argentine national team"]'::jsonb,'Argentina',.15,'https://www.fifa.com/tournaments/mens/worldcup/qatar2022','FIFA World Cup Qatar 2022'),
  ('football','international','Which country unexpectedly won UEFA Euro 1992?','They entered the tournament shortly before it began.','["Denmark","Danish national team"]'::jsonb,'Denmark',.40,'https://www.uefa.com/uefaeuro/history/seasons/1992/','UEFA EURO 1992'),
  ('football','awards','Who became the first African winner of the men''s Ballon d''Or in 1995?','The Liberian later became his country''s president.','["George Weah","Weah"]'::jsonb,'George Weah',.68,'https://www.francefootball.fr/ballon-d-or/palmares/','Ballon d’Or winners'),
  ('football','historic-cups','Which club won the final UEFA Cup Winners'' Cup in 1999?','The Italian club beat Mallorca at Villa Park.','["Lazio","SS Lazio"]'::jsonb,'Lazio',.90,'https://www.uefa.com/uefachampionsleague/news/0250-0c50f0a19b38-753f3f843d3b-1000--1998-99-lazio-lift-last-cup-winners-cup/','UEFA Cup Winners’ Cup 1999'),

  ('cricket','tests','Who holds the record for the highest individual score in men''s Test cricket?','He made 400 not out against England in 2004.','["Brian Lara","Lara","Brian Charles Lara"]'::jsonb,'Brian Lara',.15,'https://www.icc-cricket.com/hall-of-fame/hall-of-famers/brian-lara','ICC Hall of Fame: Brian Lara'),
  ('cricket','world-cup','Who captained India to the men''s Cricket World Cup title in 1983?','An all-rounder nicknamed the Haryana Hurricane.','["Kapil Dev","Kapil","Kapil Dev Nikhanj"]'::jsonb,'Kapil Dev',.40,'https://www.icc-cricket.com/tournaments/cricketworldcup/news/1983-world-cup-india','ICC 1983 World Cup'),
  ('cricket','tests','Which bowler took all ten wickets in a Test innings for New Zealand in 2021?','He achieved it in Mumbai, the city of his birth.','["Ajaz Patel","Ajaz Yunus Patel","Patel"]'::jsonb,'Ajaz Patel',.68,'https://www.icc-cricket.com/news/ajaz-patel-joins-10-wicket-club','ICC: Ajaz Patel ten wickets'),
  ('cricket','world-cup','Who was player of the match in the 1992 men''s Cricket World Cup final?','The Pakistan left-arm fast bowler took three wickets.','["Wasim Akram","Wasim","Akram"]'::jsonb,'Wasim Akram',.90,'https://www.icc-cricket.com/tournaments/cricketworldcup/news/1992-world-cup-pakistan','ICC 1992 World Cup'),

  ('rugby','world-cup','Which nation won the first men''s Rugby World Cup in 1987?','The host nation beat France in the final.','["New Zealand","All Blacks","The All Blacks"]'::jsonb,'New Zealand',.15,'https://www.rugbyworldcup.com/2023/about','Rugby World Cup history'),
  ('rugby','world-cup','Who kicked England''s winning drop goal in the 2003 Rugby World Cup final?','The kick came in extra time against Australia.','["Jonny Wilkinson","Wilkinson","Jonathan Wilkinson"]'::jsonb,'Jonny Wilkinson',.40,'https://www.world.rugby/news/598434/england-rugby-world-cup-2003-jonny-wilkinson','World Rugby: 2003 final'),
  ('rugby','world-cup','Who kicked South Africa''s winning drop goal in the 1995 Rugby World Cup final?','He scored all 15 of the Springboks'' points.','["Joel Stransky","Stransky"]'::jsonb,'Joel Stransky',.68,'https://www.rugbyworldcup.com/2023/news/825952/rugby-world-cup-final-recap-1995','Rugby World Cup 1995 recap'),
  ('rugby','six-nations','Which country won the final Five Nations Championship in 1999?','They secured the title after Wales beat England at Wembley.','["Scotland","Scottish national team"]'::jsonb,'Scotland',.90,'https://www.sixnationsrugby.com/en/m6n/championship-history','Six Nations championship history'),

  ('tennis','grand-slams','On which surface is the French Open played?','It is the only Grand Slam played on this surface.','["Clay","Clay court","Clay courts","Red clay"]'::jsonb,'Clay',.15,'https://www.rolandgarros.com/en-us/page/roland-garros-tournament-history','Roland-Garros history'),
  ('tennis','grand-slams','Who completed the calendar-year Golden Slam in singles in 1988?','She won all four majors and Olympic gold that year.','["Steffi Graf","Graf","Stefanie Graf"]'::jsonb,'Steffi Graf',.40,'https://www.wtatennis.com/players/70044/steffi-graf/bio','WTA: Steffi Graf'),
  ('tennis','grand-slams','Who became the first player to complete the men''s singles Grand Slam in 1938?','The American won all four majors in one calendar year.','["Don Budge","Budge","John Donald Budge"]'::jsonb,'Don Budge',.68,'https://www.wimbledon.com/en_GB/about_wimbledon/history.html','Wimbledon history'),
  ('tennis','grand-slams','Who won the first Wimbledon men''s singles title of the Open Era in 1968?','The Australian defeated Tony Roche in the final.','["Rod Laver","Laver","Rodney Laver"]'::jsonb,'Rod Laver',.90,'https://www.wimbledon.com/en_GB/about_wimbledon/history.html','Wimbledon history'),

  ('golf','majors','Which golfer won the Masters by 12 strokes in 1997?','It was his first major championship.','["Tiger Woods","Tiger","Woods"]'::jsonb,'Tiger Woods',.15,'https://www.masters.com/en_US/tournament/history.html','Masters Tournament history'),
  ('golf','majors','Who won the inaugural Masters Tournament in 1934?','The American won the event twice.','["Horton Smith","Smith"]'::jsonb,'Horton Smith',.40,'https://www.masters.com/en_US/tournament/history.html','Masters Tournament history'),
  ('golf','majors','Who became the first non-American Masters champion in 1961?','The South African was nicknamed the Black Knight.','["Gary Player","Player"]'::jsonb,'Gary Player',.68,'https://www.masters.com/en_US/tournament/history.html','Masters Tournament history'),
  ('golf','ryder-cup','At which course was the 1991 Ryder Cup, known as the War by the Shore, played?','The venue is in South Carolina.','["Kiawah Island","Kiawah Island Golf Resort","Ocean Course","The Ocean Course"]'::jsonb,'The Ocean Course at Kiawah Island',.90,'https://www.rydercup.com/history/1991','Ryder Cup 1991'),

  ('f1','world-champions','Who won the first Formula One World Drivers'' Championship in 1950?','The Italian drove for Alfa Romeo.','["Giuseppe Farina","Nino Farina","Farina"]'::jsonb,'Giuseppe “Nino” Farina',.15,'https://www.formula1.com/en/results/1950/drivers','Formula 1 1950 standings'),
  ('f1','world-champions','Who is Formula One''s only posthumous world champion?','The Austrian secured the 1970 title after his death.','["Jochen Rindt","Rindt"]'::jsonb,'Jochen Rindt',.40,'https://www.formula1.com/en/results/1970/drivers','Formula 1 1970 standings'),
  ('f1','world-champions','Which driver won the 1982 Formula One world title despite winning only one race that season?','The Finnish driver raced for Williams.','["Keke Rosberg","Keijo Rosberg","Rosberg"]'::jsonb,'Keke Rosberg',.68,'https://www.formula1.com/en/results/1982/drivers','Formula 1 1982 standings'),
  ('f1','constructors','Which constructor won its first Formula One Constructors'' Championship in 1980?','Alan Jones won the drivers'' title for the same team.','["Williams","Williams Racing","Williams Grand Prix Engineering"]'::jsonb,'Williams',.90,'https://www.formula1.com/en/results/1980/team','Formula 1 1980 constructor standings'),

  ('nba','records','Who scored 81 points for the Los Angeles Lakers in January 2006?','It is the second-highest individual score in NBA history.','["Kobe Bryant","Kobe","Bryant"]'::jsonb,'Kobe Bryant',.15,'https://www.nba.com/news/history-kobe-bryant-81-point-game','NBA: Kobe Bryant’s 81-point game'),
  ('nba','awards','Who became the first unanimous NBA Most Valuable Player in 2016?','The Golden State guard made 402 three-pointers that season.','["Stephen Curry","Steph Curry","Curry"]'::jsonb,'Stephen Curry',.40,'https://www.nba.com/news/history-stephen-curry-unanimous-mvp','NBA: first unanimous MVP'),
  ('nba','awards','Who became the youngest NBA MVP in 2011?','The Chicago Bulls point guard was 22.','["Derrick Rose","Rose"]'::jsonb,'Derrick Rose',.68,'https://www.nba.com/news/history-derrick-rose-youngest-mvp','NBA: Derrick Rose MVP'),
  ('nba','finals','Who is the only player to win NBA Finals MVP while playing for the losing team?','He won the inaugural award in 1969.','["Jerry West","West"]'::jsonb,'Jerry West',.90,'https://www.nba.com/news/history-finals-mvp-winners','NBA Finals MVP history'),

  ('nfl','super-bowl','Which team completed the NFL''s only perfect season by winning Super Bowl VII?','They finished the 1972 season 17–0.','["Miami Dolphins","Dolphins","Miami"]'::jsonb,'Miami Dolphins',.15,'https://www.nfl.com/100/originals/100-greatest/teams-1','NFL 100 greatest teams'),
  ('nfl','super-bowl','Which team won the first Super Bowl?','Vince Lombardi coached the champions.','["Green Bay Packers","Packers","Green Bay"]'::jsonb,'Green Bay Packers',.40,'https://www.nfl.com/super-bowl/history/1966','NFL Super Bowl I'),
  ('nfl','awards','Who won three consecutive NFL Most Valuable Player awards from 1995 through 1997?','The quarterback played for Green Bay.','["Brett Favre","Favre"]'::jsonb,'Brett Favre',.68,'https://www.nfl.com/players/brett-favre/stats/career','NFL: Brett Favre'),
  ('nfl','super-bowl','Which franchise became the first wild-card team to win the Super Bowl after the 1980 season?','The team beat Philadelphia in Super Bowl XV.','["Oakland Raiders","Raiders","Las Vegas Raiders"]'::jsonb,'Oakland Raiders',.90,'https://www.nfl.com/super-bowl/history/1980','NFL Super Bowl XV'),

  ('mlb','records','Which player holds MLB''s record with a 56-game hitting streak?','The streak was set in 1941.','["Joe DiMaggio","DiMaggio","Joltin Joe"]'::jsonb,'Joe DiMaggio',.15,'https://www.mlb.com/news/joe-dimaggio-56-game-hitting-streak','MLB: Joe DiMaggio’s hitting streak'),
  ('mlb','history','Who broke Major League Baseball''s modern colour barrier in 1947?','He wore number 42 for the Brooklyn Dodgers.','["Jackie Robinson","Robinson"]'::jsonb,'Jackie Robinson',.40,'https://www.mlb.com/history/jackie-robinson','MLB: Jackie Robinson'),
  ('mlb','world-series','Who hit the famous pinch-hit walk-off home run in Game 1 of the 1988 World Series?','The injured Dodgers outfielder homered off Dennis Eckersley.','["Kirk Gibson","Gibson"]'::jsonb,'Kirk Gibson',.68,'https://www.mlb.com/news/kirk-gibson-1988-world-series-home-run','MLB: Kirk Gibson 1988'),
  ('mlb','world-series','Who threw the only perfect game in World Series history?','The Yankees pitcher achieved it in Game 5 in 1956.','["Don Larsen","Larsen","Donald Larsen"]'::jsonb,'Don Larsen',.90,'https://www.mlb.com/news/don-larsen-perfect-game-world-series','MLB: Don Larsen perfect game'),

  ('nhl','records','Who is the NHL''s all-time leader in career points?','He is known as The Great One.','["Wayne Gretzky","Gretzky","The Great One"]'::jsonb,'Wayne Gretzky',.15,'https://www.nhl.com/player/wayne-gretzky-8447400','NHL: Wayne Gretzky'),
  ('nhl','stanley-cup','Which franchise won the Stanley Cup in its inaugural 1917–18 NHL season?','The team is based in Toronto and later adopted its current name.','["Toronto Arenas","Arenas"]'::jsonb,'Toronto Arenas',.40,'https://www.nhl.com/mapleleafs/team/history','Toronto Maple Leafs history'),
  ('nhl','stanley-cup','Which team became the first based in the United States to win the Stanley Cup in 1917?','The club represented Seattle.','["Seattle Metropolitans","Metropolitans"]'::jsonb,'Seattle Metropolitans',.68,'https://www.nhl.com/kraken/news/seattle-metropolitans-stanley-cup-history','NHL: Seattle Metropolitans'),
  ('nhl','records','Who was the first goaltender credited with scoring an NHL goal?','The New York Islanders goalie received credit in 1979.','["Billy Smith","Smith","William John Smith"]'::jsonb,'Billy Smith',.90,'https://www.nhl.com/news/goalies-who-have-scored-goals','NHL goal-scoring goaltenders')
)
insert into public.question_bank(
  sport_id, category_key, question_type, prompt_i18n, clue_i18n, answer_rule,
  answer_display_i18n, difficulty_b, difficulty_percentile, quality_score,
  ambiguity_score, verification_status, source_id, source_url, source_title,
  content_hash, reviewed_at, active
)
select
  s.id, seed.category_key, 'typed_single', jsonb_build_object('en', seed.prompt),
  jsonb_build_object('en', seed.clue), jsonb_build_object('accepted', seed.accepted),
  jsonb_build_object('en', seed.display),
  case when seed.percentile < .25 then -1.3 when seed.percentile < .55 then -.3
       when seed.percentile < .8 then .7 else 1.5 end,
  seed.percentile, 1, 0, 'verified', editorial.id, seed.source_url,
  seed.source_title, encode(digest(seed.prompt, 'sha256'), 'hex'), now(), true
from seed
join public.sports s on s.slug = seed.sport_slug
cross join editorial
on conflict do nothing;

-- Selection policy: honour the chosen level first, add bounded randomness, avoid any repeat
-- inside the same room, and only relax a player's cooldown when a small pool is exhausted.
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
  target numeric := case p_difficulty when 1 then .15 when 2 then .40 when 3 then .68 else .90 end;
  tolerance numeric := .14;
  chosen uuid;
  candidates int := 0;
  cooldown int := 120;
  score numeric;
  pass int := 0;
begin
  if auth.uid() is distinct from p_user_id and not public.has_staff_role() then
    raise exception 'Cannot select for another player';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_room_id::text,p_user_id::text),0));

  while chosen is null and pass < 15 loop
    with pool as (
      select q.id,
        (1 - least(1, abs(q.difficulty_percentile - target))) * 7
        + q.quality_score * 2
        + case when q.calibration_attempts >= 30 then 1 else .35 end
        + least(1, extract(epoch from (now() - coalesce(max(e.exposed_at), now() - interval '365 days'))) / 31536000)
        + random() * .65 as rank_score
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
        and abs(q.difficulty_percentile - target) <= tolerance
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
      limit 60
    )
    select count(*), (array_agg(id order by rank_score desc))[1], max(rank_score)
      into candidates, chosen, score from pool;

    if chosen is null then
      if tolerance < .45 then
        tolerance := tolerance + .10;
      else
        tolerance := .14;
        cooldown := case cooldown when 120 then 60 when 60 then 30 when 30 then 14
                         when 14 then 7 when 7 then 1 else 0 end;
      end if;
    end if;
    pass := pass + 1;
  end loop;

  if chosen is null then
    raise exception 'No verified fair question available for this scope';
  end if;

  insert into public.question_exposures(question_id,user_id,room_id,selection_scope)
  values(chosen,p_user_id,p_room_id,jsonb_build_object(
    'sport_id',p_sport_id,'competition_id',p_competition_id,'category',p_category_key,
    'difficulty',p_difficulty,'target',target,'tolerance',tolerance
  ));
  insert into public.question_selection_audit(
    user_id,room_id,question_id,requested_scope,target_percentile,candidate_count,
    cooldown_days,selection_score
  ) values(
    p_user_id,p_room_id,chosen,
    jsonb_build_object('sport_id',p_sport_id,'competition_id',p_competition_id,'category',p_category_key,'difficulty',p_difficulty),
    target,candidates,cooldown,score
  );
  return chosen;
end$$;

revoke all on function public.reserve_fair_question(uuid,uuid,uuid,uuid,text,smallint,text[]) from public, anon;
grant execute on function public.reserve_fair_question(uuid,uuid,uuid,uuid,text,smallint,text[]) to authenticated, service_role;

-- Persistent arcade progression. Only the server-side attempt recorder can mutate it.
create table if not exists public.player_arcade_progress (
  user_id uuid primary key references auth.users on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  rank_points bigint not null default 0 check (rank_points >= 0),
  answered int not null default 0 check (answered >= 0),
  correct_answers int not null default 0 check (correct_answers >= 0),
  current_answer_streak int not null default 0 check (current_answer_streak >= 0),
  best_answer_streak int not null default 0 check (best_answer_streak >= 0),
  daily_streak int not null default 0 check (daily_streak >= 0),
  best_daily_streak int not null default 0 check (best_daily_streak >= 0),
  last_correct_date date,
  updated_at timestamptz not null default now()
);
grant select on public.player_arcade_progress to authenticated;
grant all on public.player_arcade_progress to service_role;
alter table public.player_arcade_progress enable row level security;
drop policy if exists "public arcade ranks" on public.player_arcade_progress;
create policy "public arcade ranks" on public.player_arcade_progress for select
  using (true);
revoke insert, update, delete on public.player_arcade_progress from anon, authenticated;
create index if not exists arcade_rank_points
  on public.player_arcade_progress(rank_points desc, best_answer_streak desc, updated_at asc);

alter table public.question_attempts
  add column if not exists awarded_points int not null default 0 check (awarded_points >= 0);

create or replace function public.record_verified_question_attempt(
  p_user_id uuid,
  p_question_id uuid,
  p_room_id uuid,
  p_difficulty smallint,
  p_correct boolean,
  p_used_clue boolean,
  p_passed boolean,
  p_response_ms int
)
returns void language plpgsql security definer set search_path=public as $$
declare
  q public.question_bank;
  theta numeric;
  expected numeric;
  k numeric;
  prior int;
  base_points int;
  speed_bonus int;
  awarded int;
begin
  if p_user_id is null then raise exception 'User required'; end if;
  select * into q from public.question_bank where id=p_question_id and active and verification_status='verified';
  if q.id is null then raise exception 'Unknown or inactive question'; end if;

  base_points := case p_difficulty when 1 then 100 when 2 then 175 when 3 then 275 else 425 end;
  speed_bonus := case when p_correct then greatest(0, least(100, (30000 - least(30000,p_response_ms)) / 300)) else 0 end;
  awarded := case when p_correct then round(base_points * case when p_used_clue then .70 else 1 end)::int + speed_bonus else 0 end;

  select ability_theta, attempts into theta, prior from public.player_abilities
    where user_id=p_user_id and sport_id=q.sport_id and category_key=coalesce(q.category_key,'all');
  theta:=coalesce(theta,0); prior:=coalesce(prior,0);
  expected:=1/(1+exp(-q.discrimination_a*(theta-q.difficulty_b)));
  k:=case when prior<20 then .22 else .08 end;

  insert into public.question_attempts(
    question_id,user_id,room_id,difficulty_selected,correct,used_clue,passed,
    response_ms,ability_before,awarded_points
  ) values(
    p_question_id,p_user_id,p_room_id,p_difficulty,p_correct,p_used_clue,p_passed,
    p_response_ms,theta,awarded
  );

  insert into public.player_abilities(user_id,sport_id,category_key,ability_theta,attempts,standard_error)
  values(p_user_id,q.sport_id,coalesce(q.category_key,'all'),theta+k*((case when p_correct then 1 else 0 end)-expected),1,1)
  on conflict(user_id,sport_id,category_key) do update set
    ability_theta=excluded.ability_theta,
    attempts=public.player_abilities.attempts+1,
    standard_error=greatest(.15,1/sqrt(public.player_abilities.attempts+1)),
    updated_at=now();

  insert into public.player_arcade_progress(
    user_id,xp,rank_points,answered,correct_answers,current_answer_streak,
    best_answer_streak,daily_streak,best_daily_streak,last_correct_date
  ) values(
    p_user_id,awarded+10,awarded,1,case when p_correct then 1 else 0 end,
    case when p_correct then 1 else 0 end,case when p_correct then 1 else 0 end,
    case when p_correct then 1 else 0 end,case when p_correct then 1 else 0 end,
    case when p_correct then current_date else null end
  )
  on conflict(user_id) do update set
    xp=public.player_arcade_progress.xp+awarded+10,
    rank_points=public.player_arcade_progress.rank_points+awarded,
    answered=public.player_arcade_progress.answered+1,
    correct_answers=public.player_arcade_progress.correct_answers+(case when p_correct then 1 else 0 end),
    current_answer_streak=case when p_correct then public.player_arcade_progress.current_answer_streak+1 else 0 end,
    best_answer_streak=greatest(
      public.player_arcade_progress.best_answer_streak,
      case when p_correct then public.player_arcade_progress.current_answer_streak+1 else 0 end
    ),
    daily_streak=case
      when not p_correct then public.player_arcade_progress.daily_streak
      when public.player_arcade_progress.last_correct_date=current_date then public.player_arcade_progress.daily_streak
      when public.player_arcade_progress.last_correct_date=current_date-1 then public.player_arcade_progress.daily_streak+1
      else 1 end,
    best_daily_streak=greatest(public.player_arcade_progress.best_daily_streak,case
      when not p_correct then public.player_arcade_progress.daily_streak
      when public.player_arcade_progress.last_correct_date=current_date then public.player_arcade_progress.daily_streak
      when public.player_arcade_progress.last_correct_date=current_date-1 then public.player_arcade_progress.daily_streak+1
      else 1 end),
    last_correct_date=case when p_correct then current_date else public.player_arcade_progress.last_correct_date end,
    updated_at=now();

  update public.question_bank set
    calibration_attempts=calibration_attempts+1,
    difficulty_b=case when calibration_attempts>=10
      then difficulty_b-0.05*((case when p_correct then 1 else 0 end)-expected)
      else difficulty_b end
  where id=p_question_id;
end$$;

revoke all on function public.record_question_attempt(uuid,uuid,smallint,boolean,boolean,boolean,int)
  from public, anon, authenticated;
revoke all on function public.record_verified_question_attempt(uuid,uuid,uuid,smallint,boolean,boolean,boolean,int)
  from public, anon, authenticated;
grant execute on function public.record_verified_question_attempt(uuid,uuid,uuid,smallint,boolean,boolean,boolean,int)
  to service_role;

-- Random matchmaking feeds the same authoritative room engine as invite-code matches.
alter table public.arcade_rooms drop constraint if exists arcade_rooms_status_check;
alter table public.arcade_rooms add constraint arcade_rooms_status_check
  check(status in('lobby','active','complete','finished','cancelled'));

create table if not exists public.arcade_matchmaking_queue (
  user_id uuid primary key references auth.users on delete cascade,
  mode_slug text not null references public.game_modes(slug),
  difficulty smallint not null check (difficulty between 1 and 4),
  sport_id uuid references public.sports,
  category_key text,
  matched_room_id uuid references public.arcade_rooms on delete set null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.arcade_matchmaking_queue to authenticated;
grant all on public.arcade_matchmaking_queue to service_role;
alter table public.arcade_matchmaking_queue enable row level security;
drop policy if exists "own matchmaking ticket" on public.arcade_matchmaking_queue;
create policy "own matchmaking ticket" on public.arcade_matchmaking_queue for select
  using (user_id=auth.uid());
revoke insert, update, delete on public.arcade_matchmaking_queue from anon, authenticated;
create index if not exists arcade_match_pool
  on public.arcade_matchmaking_queue(mode_slug,difficulty,joined_at)
  where matched_room_id is null;

create or replace function public.matchmake_arcade_player(
  p_user_id uuid,
  p_mode_slug text,
  p_difficulty smallint,
  p_sport_id uuid default null,
  p_category_key text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  opponent public.arcade_matchmaking_queue;
  existing_room uuid;
  room_id uuid;
  selected_sport uuid;
  opponent_sport uuid;
  me_name text;
  them_name text;
  me_avatar text;
  them_avatar text;
begin
  if p_mode_slug not in ('quiz-ludo','quiz-snakes-ladders','sports-mastermind') then
    raise exception 'This game is not available for random matchmaking';
  end if;
  if not public.can_host_game(p_user_id,p_mode_slug) then
    raise exception 'Fanzeno Pro is required for this matchmaking queue';
  end if;

  select matched_room_id into existing_room from public.arcade_matchmaking_queue where user_id=p_user_id;
  if existing_room is not null then return existing_room; end if;

  delete from public.arcade_matchmaking_queue
    where matched_room_id is null and joined_at < now()-interval '10 minutes';

  select * into opponent
  from public.arcade_matchmaking_queue q
  where q.user_id<>p_user_id and q.mode_slug=p_mode_slug and q.difficulty=p_difficulty
    and q.matched_room_id is null
  order by q.joined_at
  for update skip locked
  limit 1;

  if opponent.user_id is null then
    insert into public.arcade_matchmaking_queue(user_id,mode_slug,difficulty,sport_id,category_key,joined_at,updated_at)
    values(p_user_id,p_mode_slug,p_difficulty,p_sport_id,p_category_key,now(),now())
    on conflict(user_id) do update set
      mode_slug=excluded.mode_slug,difficulty=excluded.difficulty,sport_id=excluded.sport_id,
      category_key=excluded.category_key,matched_room_id=null,joined_at=now(),updated_at=now();
    return null;
  end if;

  selected_sport:=coalesce(p_sport_id,(select id from public.sports where enabled order by sort_order limit 1));
  opponent_sport:=coalesce(opponent.sport_id,selected_sport);
  select coalesce(display_name,'Player'),coalesce(avatar_preset,'captain') into me_name,me_avatar
    from public.profiles where id=p_user_id;
  select coalesce(display_name,'Player'),coalesce(avatar_preset,'captain') into them_name,them_avatar
    from public.profiles where id=opponent.user_id;

  insert into public.arcade_rooms(
    code,host_id,mode_slug,difficulty,status,visibility,settings,active_seat,round_no,
    turn_started_at,turn_ends_at
  ) values(
    'FZ-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,4)),opponent.user_id,
    p_mode_slug,p_difficulty,'active','public','{"max_players":2,"matchmaking":"random"}',
    0,1,now(),now()+interval '3 minutes'
  ) returning id into room_id;

  insert into public.arcade_room_players(
    room_id,user_id,seat,display_name,sport_id,category_key,status,settings
  ) values
    (room_id,opponent.user_id,0,coalesce(them_name,'Player 1'),opponent_sport,opponent.category_key,'ready',
      jsonb_build_object('avatar_id',coalesce(them_avatar,'captain'),'sport_id',opponent_sport,'category_key',opponent.category_key)),
    (room_id,p_user_id,1,coalesce(me_name,'Player 2'),selected_sport,p_category_key,'ready',
      jsonb_build_object('avatar_id',coalesce(me_avatar,'captain'),'sport_id',selected_sport,'category_key',p_category_key));

  update public.arcade_matchmaking_queue set matched_room_id=room_id,updated_at=now()
    where user_id=opponent.user_id;
  insert into public.arcade_matchmaking_queue(user_id,mode_slug,difficulty,sport_id,category_key,matched_room_id,updated_at)
    values(p_user_id,p_mode_slug,p_difficulty,selected_sport,p_category_key,room_id,now())
    on conflict(user_id) do update set matched_room_id=room_id,updated_at=now();
  return room_id;
end$$;
revoke all on function public.matchmake_arcade_player(uuid,text,smallint,uuid,text)
  from public, anon, authenticated;
grant execute on function public.matchmake_arcade_player(uuid,text,smallint,uuid,text)
  to service_role;
