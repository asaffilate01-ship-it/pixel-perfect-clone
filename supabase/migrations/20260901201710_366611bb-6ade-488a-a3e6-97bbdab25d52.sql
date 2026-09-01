create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete cascade,
  slug text not null,
  name text not null,
  name_i18n jsonb not null default '{}'::jsonb,
  short_name text,
  region text,
  competition_type text not null check (competition_type in ('league','cup','tour','format','event')),
  active boolean not null default true,
  sort_order int not null default 0,
  unique (sport_id, slug)
);
grant select on public.competitions to anon, authenticated;
grant all on public.competitions to service_role;
grant insert, update, delete on public.competitions to authenticated;
alter table public.competitions enable row level security;
create policy "competitions read" on public.competitions for select using (active or public.has_staff_role());
create policy "staff competitions write" on public.competitions for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());
create index competition_sport_idx on public.competitions(sport_id, active);

alter table public.grids
  add column competition_ids uuid[] not null default '{}',
  add column era_start int,
  add column era_end int;
alter table public.clue_puzzles
  add column competition_ids uuid[] not null default '{}',
  add column era_start int,
  add column era_end int;
alter table public.profiles
  add column quiz_preferences jsonb not null default '{"scope":"all","competition_id":null,"era":"all"}'::jsonb;

create index grids_competition_idx on public.grids using gin (competition_ids);
create index clue_competition_idx on public.clue_puzzles using gin (competition_ids);

insert into public.competitions (sport_id, slug, name, short_name, region, competition_type, sort_order)
select s.id, c.slug, c.name, c.short, c.region, c.ctype, c.ord
from (values
  ('football','epl','Premier League','EPL','England','league',1),
  ('football','ucl','UEFA Champions League','UCL','Europe','cup',2),
  ('football','uel','UEFA Europa League','UEL','Europe','cup',3),
  ('football','laliga','La Liga','LAL','Spain','league',4),
  ('football','bundesliga','Bundesliga','BUN','Germany','league',5),
  ('football','seriea','Serie A','SEA','Italy','league',6),
  ('football','ligue1','Ligue 1','L1','France','league',7),
  ('football','worldcup','FIFA World Cup','WC','International','event',8),
  ('cricket','tests','Test Cricket','TEST','International','format',1),
  ('cricket','odi','One Day Internationals','ODI','International','format',2),
  ('cricket','t20i','T20 Internationals','T20I','International','format',3),
  ('cricket','ipl','Indian Premier League','IPL','India','league',4),
  ('cricket','bbl','Big Bash League','BBL','Australia','league',5),
  ('cricket','psl','Pakistan Super League','PSL','Pakistan','league',6),
  ('cricket','ashes','The Ashes','ASH','England/Australia','event',7),
  ('rugby','sixnations','Six Nations','6N','Europe','event',1),
  ('rugby','rwc','Rugby World Cup','RWC','International','event',2),
  ('rugby','premrugby','Premiership Rugby','PR','England','league',3),
  ('rugby','superrugby','Super Rugby','SR','Southern Hemisphere','league',4),
  ('afl','afl','Australian Football League','AFL','Australia','league',1),
  ('nfl','nfl','National Football League','NFL','USA','league',1),
  ('nfl','superbowl','Super Bowl','SB','USA','event',2),
  ('mlb','mlb','Major League Baseball','MLB','USA','league',1),
  ('mlb','worldseries','World Series','WS','USA','event',2),
  ('nhl','nhl','National Hockey League','NHL','North America','league',1),
  ('nhl','stanley','Stanley Cup','SC','North America','event',2),
  ('nba','nba','National Basketball Association','NBA','USA','league',1),
  ('nba','wnba','Women''s NBA','WNBA','USA','league',2),
  ('tennis','atp','ATP Tour','ATP','International','tour',1),
  ('tennis','wta','WTA Tour','WTA','International','tour',2),
  ('tennis','wimbledon','Wimbledon','WIM','UK','event',3),
  ('tennis','australianopen','Australian Open','AO','Australia','event',4),
  ('tennis','rolandgarros','Roland-Garros','RG','France','event',5),
  ('tennis','usopen-tennis','US Open','USO','USA','event',6),
  ('golf','pga','PGA Tour','PGA','USA','tour',1),
  ('golf','dpworld','DP World Tour','DPWT','International','tour',2),
  ('golf','masters','The Masters','MAS','USA','event',3),
  ('golf','open','The Open Championship','OPEN','UK','event',4),
  ('golf','rydercup','Ryder Cup','RC','Europe/USA','event',5)
) as c(sport, slug, name, short, region, ctype, ord)
join public.sports s on s.slug = c.sport;