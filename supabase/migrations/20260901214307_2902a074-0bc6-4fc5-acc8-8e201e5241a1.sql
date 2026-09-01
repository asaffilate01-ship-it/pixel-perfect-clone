create type public.scope_entity_kind as enum('sport','discipline','format','country','competition','team','constructor','manufacturer','stable','nation','person','player','driver','rider','boxer','fighter','horse','jockey','venue','award');

create table public.scope_entities(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports on delete cascade,
  kind public.scope_entity_kind not null,
  parent_id uuid references public.scope_entities on delete cascade,
  competition_id uuid references public.competitions on delete cascade,
  athlete_id uuid references public.athletes on delete cascade,
  slug text not null,
  name text not null,
  name_i18n jsonb not null default '{}',
  country_code char(2),
  valid_from date,
  valid_to date,
  verification_status text not null default 'pending' check(verification_status in('pending','verified','disputed','rejected')),
  source_id uuid references public.data_sources,
  created_at timestamptz not null default now(),
  unique(sport_id,kind,slug)
);
grant select on public.scope_entities to anon, authenticated;
grant insert, update, delete on public.scope_entities to authenticated;
grant all on public.scope_entities to service_role;
create index scope_entity_drilldown on public.scope_entities(sport_id,parent_id,kind,verification_status);

create table public.question_scope_links(
  criterion_id uuid not null references public.criteria on delete cascade,
  entity_id uuid not null references public.scope_entities on delete cascade,
  relationship text not null default 'applies_to',
  primary key(criterion_id,entity_id,relationship)
);
grant select on public.question_scope_links to anon, authenticated;
grant insert, update, delete on public.question_scope_links to authenticated;
grant all on public.question_scope_links to service_role;

alter table public.grids add column if not exists scope_path uuid[] not null default '{}';
alter table public.profiles add column if not exists recent_scope_paths jsonb not null default '[]';

alter table public.scope_entities enable row level security;
alter table public.question_scope_links enable row level security;
create policy "verified scope entities" on public.scope_entities for select using(verification_status='verified' or public.has_staff_role());
create policy "staff scope entities" on public.scope_entities for all to authenticated using(public.has_staff_role()) with check(public.has_staff_role());
create policy "scope links read" on public.question_scope_links for select using(true);
create policy "staff scope links" on public.question_scope_links for all to authenticated using(public.has_staff_role()) with check(public.has_staff_role());

-- Seed: verified team-like and person-like entities per sport
with src(sport_slug,kind,name,country) as (values
('football','team','Arsenal','GB'),('football','team','Barcelona','ES'),('football','team','Bayern Munich','DE'),('football','nation','Brazil','BR'),('football','team','Real Madrid','ES'),
('football','player','Lionel Messi','AR'),('football','player','Thierry Henry','FR'),('football','player','Marta','BR'),('football','player','Cristiano Ronaldo','PT'),
('cricket','nation','England','GB'),('cricket','nation','Australia','AU'),('cricket','nation','Pakistan','PK'),('cricket','team','Yorkshire','GB'),('cricket','team','Mumbai Indians','IN'),
('cricket','player','Babar Azam','PK'),('cricket','player','Ben Stokes','GB'),('cricket','player','Ellyse Perry','AU'),('cricket','player','Sachin Tendulkar','IN'),
('nba','team','Los Angeles Lakers','US'),('nba','team','Boston Celtics','US'),('nba','team','Chicago Bulls','US'),('nba','team','Golden State Warriors','US'),
('nba','player','LeBron James','US'),('nba','player','Michael Jordan','US'),('nba','player','Stephen Curry','US'),('nba','player','Kobe Bryant','US'),
('f1','constructor','Ferrari','IT'),('f1','constructor','McLaren','GB'),('f1','constructor','Mercedes','DE'),('f1','constructor','Red Bull Racing','AT'),('f1','constructor','Williams','GB'),
('f1','driver','Lewis Hamilton','GB'),('f1','driver','Max Verstappen','NL'),('f1','driver','Ayrton Senna','BR'),('f1','driver','Michael Schumacher','DE'),
('nascar','team','Hendrick Motorsports','US'),('nascar','team','Joe Gibbs Racing','US'),('nascar','team','Team Penske','US'),
('nascar','driver','Richard Petty','US'),('nascar','driver','Jimmie Johnson','US'),('nascar','driver','Dale Earnhardt','US'),
('indycar','team','Team Penske','US'),('indycar','team','Chip Ganassi Racing','US'),('indycar','team','Andretti Global','US'),
('indycar','driver','Scott Dixon','NZ'),('indycar','driver','Dario Franchitti','GB'),('indycar','driver','Hélio Castroneves','BR'),
('motogp','manufacturer','Ducati Lenovo','IT'),('motogp','manufacturer','Repsol Honda','JP'),('motogp','manufacturer','Monster Energy Yamaha','JP'),
('motogp','rider','Valentino Rossi','IT'),('motogp','rider','Marc Márquez','ES'),('motogp','rider','Jorge Lorenzo','ES'),
('superbikes','manufacturer','Ducati','IT'),('superbikes','manufacturer','Kawasaki Racing','JP'),('superbikes','manufacturer','Pata Yamaha','JP'),
('superbikes','rider','Jonathan Rea','GB'),('superbikes','rider','Carl Fogarty','GB'),('superbikes','rider','Toprak Razgatlıoğlu','TR'),
('horse-racing','nation','UK Racing','GB'),('horse-racing','nation','USA Racing','US'),('horse-racing','nation','Australian Racing','AU'),('horse-racing','stable','Godolphin','AE'),
('horse-racing','horse','Frankel','GB'),('horse-racing','horse','Winx','AU'),('horse-racing','horse','Secretariat','US'),('horse-racing','jockey','Lester Piggott','GB'),
('boxing-pro','team','WBC',null),('boxing-pro','team','WBA',null),('boxing-pro','team','IBF',null),('boxing-pro','team','WBO',null),('boxing-pro','nation','Great Britain','GB'),
('boxing-pro','boxer','Muhammad Ali','US'),('boxing-pro','boxer','Katie Taylor','IE'),('boxing-pro','boxer','Lennox Lewis','GB'),('boxing-pro','boxer','Claressa Shields','US'),
('ufc','discipline','Heavyweight',null),('ufc','discipline','Lightweight',null),('ufc','discipline','Welterweight',null),('ufc','discipline','Women’s Flyweight',null),
('ufc','fighter','Jon Jones','US'),('ufc','fighter','Amanda Nunes','BR'),('ufc','fighter','Georges St-Pierre','CA'),('ufc','fighter','Conor McGregor','IE')
)
insert into public.scope_entities(sport_id,kind,slug,name,country_code,verification_status,athlete_id)
select s.id, src.kind::public.scope_entity_kind,
  regexp_replace(lower(public.fz_norm(src.name)),'[^a-z0-9]+','-','g'),
  src.name, src.country, 'verified',
  (select a.id from public.athletes a where a.sport_id=s.id and a.name=src.name limit 1)
from src join public.sports s on s.slug=src.sport_slug
on conflict(sport_id,kind,slug) do nothing;