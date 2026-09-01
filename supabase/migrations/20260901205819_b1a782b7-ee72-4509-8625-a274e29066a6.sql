-- v0.6: historical catalogue + Olympic structure
alter table public.sports
  add column if not exists parent_sport_id uuid references public.sports,
  add column if not exists governing_body text,
  add column if not exists historical_from date not null default '1900-01-01',
  add column if not exists olympic_classification text check (olympic_classification in ('summer','winter','former','none')),
  add column if not exists metadata jsonb not null default '{}';
alter table public.competitions
  add column if not exists valid_from date not null default '1900-01-01',
  add column if not exists valid_to date,
  add column if not exists gender text not null default 'open' check (gender in ('men','women','mixed','open')),
  add column if not exists country_code char(2),
  add column if not exists governing_body text,
  add column if not exists metadata jsonb not null default '{}';

create table public.olympic_games(
  id uuid primary key default gen_random_uuid(),
  year int not null check (year >= 1896),
  season text not null check (season in ('summer','winter')),
  host_city text not null,
  host_country_code char(2),
  starts_on date,
  ends_on date,
  unique (year, season)
);
grant select on public.olympic_games to anon, authenticated;
grant insert, update, delete on public.olympic_games to authenticated;
grant all on public.olympic_games to service_role;
alter table public.olympic_games enable row level security;
create policy "olympic games read" on public.olympic_games for select using (true);
create policy "olympic games staff write" on public.olympic_games for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());

create table public.olympic_events(
  id uuid primary key default gen_random_uuid(),
  games_id uuid not null references public.olympic_games on delete cascade,
  sport_id uuid not null references public.sports,
  event_name text not null,
  event_name_i18n jsonb not null default '{}',
  gender text not null check (gender in ('men','women','mixed','open')),
  unique (games_id, sport_id, event_name, gender)
);
grant select on public.olympic_events to anon, authenticated;
grant insert, update, delete on public.olympic_events to authenticated;
grant all on public.olympic_events to service_role;
alter table public.olympic_events enable row level security;
create policy "olympic events read" on public.olympic_events for select using (true);
create policy "olympic events staff write" on public.olympic_events for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());

create table public.olympic_medals(
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.olympic_events on delete cascade,
  athlete_id uuid references public.athletes,
  nation_code char(3) not null,
  medal text not null check (medal in ('gold','silver','bronze')),
  team_name text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','disputed','rejected')),
  source_id uuid references public.data_sources,
  source_record_id text,
  unique (event_id, medal, athlete_id, nation_code, team_name)
);
grant select on public.olympic_medals to anon, authenticated;
grant insert, update, delete on public.olympic_medals to authenticated;
grant all on public.olympic_medals to service_role;
alter table public.olympic_medals enable row level security;
create policy "verified medals read" on public.olympic_medals for select using (verification_status = 'verified' or public.has_staff_role());
create policy "staff olympic write" on public.olympic_medals for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());
create index olympic_medal_lookup on public.olympic_medals(nation_code, medal, event_id) where verification_status = 'verified';

create table public.historical_seasons(
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions on delete cascade,
  season_label text not null,
  starts_on date,
  ends_on date,
  format jsonb not null default '{}',
  verification_status text not null default 'pending',
  unique (competition_id, season_label)
);
grant select on public.historical_seasons to anon, authenticated;
grant insert, update, delete on public.historical_seasons to authenticated;
grant all on public.historical_seasons to service_role;
alter table public.historical_seasons enable row level security;
create policy "seasons read" on public.historical_seasons for select using (verification_status = 'verified' or public.has_staff_role());
create policy "seasons staff write" on public.historical_seasons for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());
create index historical_season_dates on public.historical_seasons(competition_id, starts_on, ends_on);

-- Olympic sports catalogue (disabled until they have playable content)
insert into public.sports(slug,name,sort_order,governing_body,historical_from,olympic_classification,enabled) select v.slug,v.name,v.sort_order,v.governing_body,v.historical_from::date,v.olympic_classification,false from (values
('athletics','Athletics',20,'World Athletics','1900-01-01','summer'),('swimming','Swimming',21,'World Aquatics','1900-01-01','summer'),('diving','Diving',22,'World Aquatics','1904-01-01','summer'),('water-polo','Water Polo',23,'World Aquatics','1900-01-01','summer'),('artistic-swimming','Artistic Swimming',24,'World Aquatics','1984-01-01','summer'),('archery','Archery',25,'World Archery','1900-01-01','summer'),('badminton','Badminton',26,'BWF','1992-01-01','summer'),('basketball','Basketball',27,'FIBA','1936-01-01','summer'),('3x3-basketball','3x3 Basketball',28,'FIBA','2020-01-01','summer'),('boxing','Boxing',29,'World Boxing','1904-01-01','summer'),('canoe','Canoe',30,'ICF','1936-01-01','summer'),('cycling','Cycling',31,'UCI','1900-01-01','summer'),('equestrian','Equestrian',32,'FEI','1900-01-01','summer'),('fencing','Fencing',33,'FIE','1900-01-01','summer'),('field-hockey','Field Hockey',34,'FIH','1908-01-01','summer'),('gymnastics','Gymnastics',35,'FIG','1900-01-01','summer'),('handball','Handball',36,'IHF','1936-01-01','summer'),('judo','Judo',37,'IJF','1964-01-01','summer'),('modern-pentathlon','Modern Pentathlon',38,'UIPM','1912-01-01','summer'),('rowing','Rowing',39,'World Rowing','1900-01-01','summer'),('sailing','Sailing',40,'World Sailing','1900-01-01','summer'),('shooting','Shooting',41,'ISSF','1900-01-01','summer'),('skateboarding','Skateboarding',42,'World Skate','2020-01-01','summer'),('sport-climbing','Sport Climbing',43,'IFSC','2020-01-01','summer'),('surfing','Surfing',44,'ISA','2020-01-01','summer'),('table-tennis','Table Tennis',45,'ITTF','1988-01-01','summer'),('taekwondo','Taekwondo',46,'World Taekwondo','2000-01-01','summer'),('triathlon','Triathlon',47,'World Triathlon','2000-01-01','summer'),('volleyball','Volleyball',48,'FIVB','1964-01-01','summer'),('beach-volleyball','Beach Volleyball',49,'FIVB','1996-01-01','summer'),('weightlifting','Weightlifting',50,'IWF','1900-01-01','summer'),('wrestling','Wrestling',51,'UWW','1904-01-01','summer'),('breaking','Breaking',52,'WDSF','2024-01-01','summer'),('biathlon','Biathlon',60,'IBU','1960-01-01','winter'),('bobsleigh','Bobsleigh',61,'IBSF','1924-01-01','winter'),('curling','Curling',62,'World Curling','1924-01-01','winter'),('figure-skating','Figure Skating',63,'ISU','1908-01-01','winter'),('ice-hockey-olympic','Olympic Ice Hockey',64,'IIHF','1920-01-01','winter'),('luge','Luge',65,'FIL','1964-01-01','winter'),('skeleton','Skeleton',66,'IBSF','1928-01-01','winter'),('skiing','Skiing',67,'FIS','1924-01-01','winter'),('snowboard','Snowboard',68,'FIS','1998-01-01','winter'),('speed-skating','Speed Skating',69,'ISU','1924-01-01','winter'),('short-track','Short Track',70,'ISU','1992-01-01','winter')) as v(slug,name,sort_order,governing_body,historical_from,olympic_classification)
on conflict (slug) do update set governing_body = excluded.governing_body, olympic_classification = excluded.olympic_classification, historical_from = excluded.historical_from;

-- Global T20 leagues + country-specific rugby
do $$declare cr uuid;ru uuid;begin select id into cr from sports where slug='cricket';select id into ru from sports where slug='rugby';
insert into competitions(sport_id,slug,name,short_name,region,competition_type,country_code,gender,governing_body,valid_from)values
(cr,'hundred-men','The Hundred Men','HUNDRED','England','league','GB','men','ECB','2021-01-01'),(cr,'hundred-women','The Hundred Women','HUNDRED W','England','league','GB','women','ECB','2021-01-01'),(cr,'vitality-blast','T20 Blast','BLAST','England','league','GB','men','ECB','2003-01-01'),(cr,'super-smash-men','Super Smash Men','SS','New Zealand','league','NZ','men','NZC','2005-01-01'),(cr,'super-smash-women','Super Smash Women','SS W','New Zealand','league','NZ','women','NZC','2007-01-01'),(cr,'cpl','Caribbean Premier League','CPL','Caribbean','league',null,'men','CWI','2013-01-01'),(cr,'sa20','SA20','SA20','South Africa','league','ZA','men','CSA','2023-01-01'),(cr,'ilt20','International League T20','ILT20','UAE','league','AE','men','Emirates Cricket','2023-01-01'),(cr,'mlc','Major League Cricket','MLC','USA','league','US','men','USA Cricket','2023-01-01'),(cr,'bpl','Bangladesh Premier League','BPL','Bangladesh','league','BD','men','BCB','2012-01-01'),(cr,'lpl','Lanka Premier League','LPL','Sri Lanka','league','LK','men','SLC','2020-01-01'),(cr,'wpl','Women''s Premier League','WPL','India','league','IN','women','BCCI','2023-01-01'),(cr,'wbbl','Women''s Big Bash League','WBBL','Australia','league','AU','women','Cricket Australia','2015-01-01')on conflict(sport_id,slug)do nothing;
insert into competitions(sport_id,slug,name,short_name,region,competition_type,country_code,gender,governing_body,valid_from)values
(ru,'all-blacks-tests','New Zealand Test Rugby','ALL BLACKS','New Zealand','event','NZ','men','New Zealand Rugby','1903-01-01'),(ru,'npc','National Provincial Championship','NPC','New Zealand','league','NZ','men','New Zealand Rugby','1976-01-01'),(ru,'super-rugby-pacific','Super Rugby Pacific','SRP','Pacific','league','NZ','men','SANZAAR','1996-01-01'),(ru,'bunnings-heartland','Heartland Championship','HEARTLAND','New Zealand','league','NZ','men','New Zealand Rugby','2006-01-01'),(ru,'farah-palmer-cup','Farah Palmer Cup','FPC','New Zealand','league','NZ','women','New Zealand Rugby','1999-01-01'),(ru,'black-ferns-tests','New Zealand Women''s Test Rugby','BLACK FERNS','New Zealand','event','NZ','women','New Zealand Rugby','1991-01-01'),(ru,'urc','United Rugby Championship','URC','Europe/South Africa','league',null,'men','URC','2001-01-01'),(ru,'top14','Top 14','TOP14','France','league','FR','men','LNR','1892-01-01'),(ru,'currie-cup','Currie Cup','CURRIE','South Africa','league','ZA','men','SA Rugby','1891-01-01'),(ru,'japan-league-one','Japan Rugby League One','JRLO','Japan','league','JP','men','JRFU','2003-01-01'),(ru,'major-league-rugby','Major League Rugby','MLR','USA','league','US','men','USA Rugby','2018-01-01')on conflict(sport_id,slug)do nothing;end$$;

-- v0.6: complete match lifecycle
alter table public.games
  add column if not exists player_two uuid references auth.users on delete set null,
  add column if not exists outcome text check (outcome in ('player_one','player_two','draw')),
  add column if not exists end_reason text check (end_reason in ('line','board_full','passes','timeout','resigned','agreed_draw','forfeit','admin_void')),
  add column if not exists consecutive_passes smallint not null default 0,
  add column if not exists draw_offered_by uuid references auth.users,
  add column if not exists rematch_of uuid references public.games,
  add column if not exists settings jsonb not null default '{}';

create table public.match_events(
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games on delete cascade,
  actor_id uuid references auth.users,
  event_type text not null check (event_type in ('joined','started','move','pass','draw_offered','draw_declined','draw_accepted','resigned','timeout','ended','rematch_requested','rematch_accepted')),
  payload jsonb not null default '{}',
  game_version int not null,
  created_at timestamptz not null default now()
);
create index match_events_stream on public.match_events(game_id, id);
grant select on public.match_events to authenticated;
grant all on public.match_events to service_role;
alter table public.match_events enable row level security;
create policy "match participant events" on public.match_events for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and auth.uid() in (g.player_one, g.player_two)) or public.has_staff_role());

create table public.game_modes(
  slug text primary key,
  name text not null,
  description text not null,
  min_players int not null,
  max_players int not null,
  board_config jsonb not null,
  enabled boolean not null default true,
  sort_order int not null default 0
);
grant select on public.game_modes to anon, authenticated;
grant insert, update, delete on public.game_modes to authenticated;
grant all on public.game_modes to service_role;
alter table public.game_modes enable row level security;
create policy "game modes read" on public.game_modes for select using (enabled or public.has_staff_role());
create policy "game modes staff write" on public.game_modes for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());
insert into public.game_modes values
  ('tic-tac-toe','Grid Battle','Claim three verified intersections',2,2,'{"rows":3,"columns":3,"win":3}',true,1),
  ('connect-four','Connect Four','Answer and drop tokens to connect four',2,2,'{"rows":6,"columns":7,"win":4,"gravity":true}',true,2),
  ('territory','Territory','Capture and steal adjacent hex categories',2,2,'{"tiles":31,"layout":"hex"}',true,3),
  ('category-tower','Category Tower','Win streaks to capture sport categories',2,2,'{"attempts":7}',true,4),
  ('sports-501','Sports 501','Subtract verified athlete statistics to finish',2,8,'{"start":501,"bust_below":-10,"max_move":180}',true,5),
  ('connections','Connections','Find linked groups of four athletes',1,2,'{"items":16,"groups":4}',true,6),
  ('draft-xi','Draft XI','Draft athletes for chemistry and constraints',1,8,'{"squad":11}',true,7),
  ('bingo','Sports Bingo','Match athletes to a 4x4 criteria board',1,8,'{"rows":4,"columns":4}',true,8),
  ('stat-cards','Stat Cards','Beat the next athlete using selected stats',1,2,'{"cards":11,"lives":2}',true,9);