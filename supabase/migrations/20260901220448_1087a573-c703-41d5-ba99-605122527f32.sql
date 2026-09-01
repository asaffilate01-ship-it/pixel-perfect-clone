-- profiles / rooms / players
alter table public.profiles add column if not exists avatar_preset text not null default 'captain';
alter table public.profiles add column if not exists avatar_settings jsonb not null default '{"preset":"captain","frame":"standard"}';
alter table public.arcade_room_players add column if not exists settings jsonb not null default '{}';
alter table public.arcade_room_players add column if not exists last_seen_at timestamptz not null default now();
alter table public.arcade_rooms add column if not exists version int not null default 1;

-- presence
create table public.arcade_presence(
  room_id uuid not null references public.arcade_rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  connection_id uuid not null,
  device_id text,
  status text not null default 'online' check(status in('online','background','reconnecting','offline')),
  last_seen_at timestamptz not null default now(),
  primary key(room_id,user_id,connection_id)
);
grant select, insert, update, delete on public.arcade_presence to authenticated;
grant all on public.arcade_presence to service_role;
alter table public.arcade_presence enable row level security;
create policy "room presence visible" on public.arcade_presence for select to authenticated
  using(exists(select 1 from public.arcade_room_players p where p.room_id=arcade_presence.room_id and p.user_id=auth.uid()));
create policy "own presence" on public.arcade_presence for insert to authenticated
  with check(user_id=auth.uid() and exists(select 1 from public.arcade_room_players p where p.room_id=arcade_presence.room_id and p.user_id=auth.uid()));
create policy "own presence update" on public.arcade_presence for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "own presence delete" on public.arcade_presence for delete to authenticated using(user_id=auth.uid());
alter publication supabase_realtime add table public.arcade_presence;

-- voice answers
alter table public.arcade_submissions add column if not exists input_method text not null default 'typed' check(input_method in('typed','voice'));
alter table public.arcade_submissions add column if not exists transcript_confidence numeric(5,4);
alter table public.arcade_submissions add column if not exists locale text;
alter table public.arcade_submissions add column if not exists confirmed_transcript text;

-- avatar presets
create table public.avatar_presets(
  id text primary key,
  display_name text not null,
  asset_key text not null,
  accent text not null,
  access_tier text not null default 'free' check(access_tier in('free','pro')),
  active boolean not null default true,
  sort_order int not null default 0
);
grant select on public.avatar_presets to anon, authenticated;
grant all on public.avatar_presets to service_role;
insert into public.avatar_presets values
('captain','Captain','captain','#49C6E5','free',true,1),('champion','Champion','champion','#FFD84A','free',true,2),
('striker','Striker','striker','#45E6A0','free',true,3),('batter','Batter','batter','#FF8A5C','free',true,4),
('racer','Racer','racer','#FF5B71','free',true,5),('fighter','Fighter','fighter','#9A7BFF','free',true,6),
('ace','Ace','ace','#D7EF55','free',true,7),('hoops','Hoops','hoops','#F39A46','free',true,8),
('rocket','Rocket','rocket','#5CB7FF','pro',true,9),('lion','Lion','lion','#E9A83D','pro',true,10),
('eagle','Eagle','eagle','#7AC9DB','pro',true,11),('legend','Legend','legend','#D59BFF','pro',true,12)
on conflict(id) do update set display_name=excluded.display_name,accent=excluded.accent;
alter table public.avatar_presets enable row level security;
create policy "avatar presets read" on public.avatar_presets for select using(active or public.has_staff_role());

-- fair question bank
create table public.question_bank(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports,
  competition_id uuid references public.competitions,
  category_key text,
  entity_ids uuid[] not null default '{}',
  question_type text not null,
  prompt_i18n jsonb not null,
  clue_i18n jsonb not null default '{}',
  answer_rule jsonb not null,
  answer_display_i18n jsonb not null default '{}',
  difficulty_b numeric(6,3) not null default 0,
  discrimination_a numeric(5,3) not null default 1,
  difficulty_percentile numeric(5,4) not null default .5,
  quality_score numeric(5,4) not null default 1,
  ambiguity_score numeric(5,4) not null default 0,
  calibration_attempts int not null default 0,
  median_response_ms int,
  verification_status text not null default 'pending' check(verification_status in('pending','verified','disputed','rejected')),
  source_id uuid references public.data_sources,
  valid_from date, valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fair_question_pool on public.question_bank(sport_id,competition_id,category_key,difficulty_percentile)
  where active and verification_status='verified' and quality_score>=.8 and ambiguity_score<=.1;
create trigger question_bank_updated before update on public.question_bank for each row execute function public.update_updated_at_column();

create table public.question_attempts(
  id bigint generated always as identity primary key,
  question_id uuid not null references public.question_bank on delete cascade,
  user_id uuid references auth.users on delete set null,
  room_id uuid references public.arcade_rooms on delete cascade,
  difficulty_selected smallint not null check(difficulty_selected between 1 and 4),
  correct boolean not null,
  used_clue boolean not null default false,
  passed boolean not null default false,
  response_ms int check(response_ms>=0),
  ability_before numeric(6,3),
  created_at timestamptz not null default now()
);
create table public.question_exposures(
  id bigint generated always as identity primary key,
  question_id uuid not null references public.question_bank on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  room_id uuid references public.arcade_rooms on delete cascade,
  exposed_at timestamptz not null default now(),
  selection_scope jsonb not null default '{}'
);
create index personal_question_cooldown on public.question_exposures(user_id,question_id,exposed_at desc);
create index room_question_cooldown on public.question_exposures(room_id,question_id,exposed_at desc);
create index question_global_recency on public.question_exposures(question_id,exposed_at desc);
create table public.player_abilities(
  user_id uuid not null references auth.users on delete cascade,
  sport_id uuid not null references public.sports on delete cascade,
  category_key text not null default 'all',
  ability_theta numeric(6,3) not null default 0,
  attempts int not null default 0,
  standard_error numeric(6,3) not null default 1,
  updated_at timestamptz not null default now(),
  primary key(user_id,sport_id,category_key)
);
create table public.question_selection_audit(
  id bigint generated always as identity primary key,
  user_id uuid, room_id uuid,
  question_id uuid references public.question_bank,
  requested_scope jsonb not null,
  target_percentile numeric(5,4) not null,
  candidate_count int not null,
  cooldown_days int not null,
  selection_score numeric(10,5),
  selected_at timestamptz not null default now()
);

-- grants: staff-only / own-row reads via RLS; writes only through security-definer RPCs + service role
grant select on public.question_bank to authenticated;
grant select on public.question_attempts, public.question_exposures, public.player_abilities, public.question_selection_audit to authenticated;
grant all on public.question_bank, public.question_attempts, public.question_exposures, public.player_abilities, public.question_selection_audit to service_role;

alter table public.question_bank enable row level security;
alter table public.question_attempts enable row level security;
alter table public.question_exposures enable row level security;
alter table public.player_abilities enable row level security;
alter table public.question_selection_audit enable row level security;
-- answers never leave the server: only staff may read question rows directly
create policy "staff questions read" on public.question_bank for select to authenticated using(public.has_staff_role());
create policy "own attempts" on public.question_attempts for select to authenticated using(user_id=auth.uid() or public.has_staff_role());
create policy "own exposures" on public.question_exposures for select to authenticated using(user_id=auth.uid() or public.has_staff_role());
create policy "own abilities" on public.player_abilities for select to authenticated using(user_id=auth.uid() or public.has_staff_role());
create policy "staff selection audit" on public.question_selection_audit for select to authenticated using(public.has_staff_role());

create or replace function public.reserve_fair_question(p_user_id uuid,p_room_id uuid,p_sport_id uuid,p_competition_id uuid default null,p_category_key text default null,p_difficulty smallint default 2,p_question_types text[] default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare target numeric:=case p_difficulty when 1 then .20 when 2 then .43 when 3 then .68 else .88 end; chosen uuid; candidates int; cooldown int:=180; score numeric;
begin
 if auth.uid() is distinct from p_user_id and not public.has_staff_role() then raise exception 'Cannot select for another player';end if;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(p_room_id::text,p_user_id::text),0));
 loop
  with pool as(
    select q.id,
      (1-abs(q.difficulty_percentile-target))*5+q.quality_score*2
      +(case when q.calibration_attempts>=100 then 1 else .35 end)
      +(least(365,coalesce(extract(day from now()-max(e.exposed_at)),365))/365)
      +(-ln(greatest(random(),.000001))) as rank_score
    from question_bank q left join question_exposures e on e.question_id=q.id
    where q.sport_id=p_sport_id
      and(p_competition_id is null or q.competition_id=p_competition_id)
      and(p_category_key is null or q.category_key=p_category_key)
      and(p_question_types is null or q.question_type=any(p_question_types))
      and q.active and q.verification_status='verified' and q.quality_score>=.8 and q.ambiguity_score<=.1
      and not exists(select 1 from question_exposures x where x.question_id=q.id
        and((x.user_id=p_user_id)or(p_room_id is not null and x.room_id=p_room_id))
        and x.exposed_at>now()-make_interval(days=>cooldown))
    group by q.id,q.difficulty_percentile,q.quality_score,q.calibration_attempts
    order by rank_score desc limit 60)
  select count(*),(array_agg(id order by rank_score desc))[1],max(rank_score) into candidates,chosen,score from pool;
  exit when chosen is not null or cooldown<=60;
  cooldown:=cooldown-60;
 end loop;
 if chosen is null then raise exception 'No verified fair question available for this scope';end if;
 insert into question_exposures(question_id,user_id,room_id,selection_scope)values(chosen,p_user_id,p_room_id,jsonb_build_object('sport_id',p_sport_id,'competition_id',p_competition_id,'category',p_category_key,'difficulty',p_difficulty));
 insert into question_selection_audit(user_id,room_id,question_id,requested_scope,target_percentile,candidate_count,cooldown_days,selection_score)values(p_user_id,p_room_id,chosen,jsonb_build_object('sport_id',p_sport_id,'competition_id',p_competition_id,'category',p_category_key),target,candidates,cooldown,score);
 return chosen;
end$$;
revoke all on function public.reserve_fair_question(uuid,uuid,uuid,uuid,text,smallint,text[]) from public, anon;
grant execute on function public.reserve_fair_question(uuid,uuid,uuid,uuid,text,smallint,text[]) to authenticated, service_role;

create or replace function public.record_question_attempt(p_question_id uuid,p_room_id uuid,p_difficulty smallint,p_correct boolean,p_used_clue boolean,p_passed boolean,p_response_ms int)
returns void language plpgsql security definer set search_path=public as $$
declare q question_bank; theta numeric; expected numeric; k numeric; prior int;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into q from question_bank where id=p_question_id;
 if q.id is null then raise exception 'Unknown question'; end if;
 select ability_theta, attempts into theta, prior from player_abilities where user_id=auth.uid() and sport_id=q.sport_id and category_key=coalesce(q.category_key,'all');
 theta:=coalesce(theta,0); prior:=coalesce(prior,0);
 expected:=1/(1+exp(-q.discrimination_a*(theta-q.difficulty_b)));
 k:=case when prior<20 then .22 else .08 end;
 insert into question_attempts(question_id,user_id,room_id,difficulty_selected,correct,used_clue,passed,response_ms,ability_before)
  values(p_question_id,auth.uid(),p_room_id,p_difficulty,p_correct,p_used_clue,p_passed,p_response_ms,theta);
 insert into player_abilities(user_id,sport_id,category_key,ability_theta,attempts,standard_error)
  values(auth.uid(),q.sport_id,coalesce(q.category_key,'all'),theta+k*((case when p_correct then 1 else 0 end)-expected),1,1)
 on conflict(user_id,sport_id,category_key) do update set
  ability_theta=excluded.ability_theta,
  attempts=player_abilities.attempts+1,
  standard_error=greatest(.15,1/sqrt(player_abilities.attempts+1)),
  updated_at=now();
 -- light item recalibration once enough evidence exists
 update question_bank set
  calibration_attempts=calibration_attempts+1,
  difficulty_b=case when calibration_attempts>=10 then difficulty_b-0.05*((case when p_correct then 1 else 0 end)-expected) else difficulty_b end
 where id=p_question_id;
end$$;
revoke all on function public.record_question_attempt(uuid,uuid,smallint,boolean,boolean,boolean,int) from public, anon;
grant execute on function public.record_question_attempt(uuid,uuid,smallint,boolean,boolean,boolean,int) to authenticated, service_role;

-- starter verified questions
insert into public.question_bank(sport_id,question_type,prompt_i18n,clue_i18n,answer_rule,answer_display_i18n,difficulty_b,difficulty_percentile,verification_status)
select s.id, v.qtype, jsonb_build_object('en',v.prompt), jsonb_build_object('en',v.clue), jsonb_build_object('accepted',v.accepted), jsonb_build_object('en',v.display), v.b, v.pct, 'verified'
from (values
 ('football','player','Which Argentine forward won the 2022 FIFA World Cup as captain?','He spent most of his club career at Barcelona.','["Lionel Messi","Messi","Leo Messi"]'::jsonb,'Lionel Messi',-1.2,0.12),
 ('football','player','Who is the Premier League''s all-time top scorer with 260 goals?','He played for Blackburn and Newcastle.','["Alan Shearer","Shearer"]'::jsonb,'Alan Shearer',-0.6,0.30),
 ('football','team','Which club won the first five European Cups from 1956 to 1960?','They play in white at the Bernabéu.','["Real Madrid","Madrid"]'::jsonb,'Real Madrid',-0.4,0.35),
 ('football','player','Which Portuguese forward is the all-time top scorer in men''s international football?','He has played for Sporting, Manchester United, Real Madrid and Juventus.','["Cristiano Ronaldo","Ronaldo","CR7"]'::jsonb,'Cristiano Ronaldo',-1.0,0.15),
 ('football','player','Which Brazilian is the only player to win three World Cups?','His first was in 1958 at age 17.','["Pele","Pelé","Edson Arantes do Nascimento"]'::jsonb,'Pelé',-0.5,0.32),
 ('football','team','Which club went the entire 2003–04 Premier League season unbeaten?','Managed by Arsène Wenger.','["Arsenal","Arsenal FC","The Arsenal"]'::jsonb,'Arsenal',0.1,0.48),
 ('football','player','Which Frenchman scored a hat-trick in the 2018 World Cup final? Trick question — who scored twice?','He was 19 at the time and plays for PSG then Real Madrid.','["Kylian Mbappe","Kylian Mbappé","Mbappe","Mbappé"]'::jsonb,'Kylian Mbappé',0.6,0.66),
 ('football','player','Who captained Leicester City to the 2015–16 Premier League title?','A Jamaican international defender.','["Wes Morgan","Morgan"]'::jsonb,'Wes Morgan',1.4,0.90),
 ('nba','player','Which player holds the NBA record for most career points?','He won titles with Miami, Cleveland and the Lakers.','["LeBron James","LeBron","James"]'::jsonb,'LeBron James',-1.1,0.14),
 ('nba','player','Who scored 100 points in a single NBA game in 1962?','He played for the Philadelphia Warriors.','["Wilt Chamberlain","Chamberlain","Wilt"]'::jsonb,'Wilt Chamberlain',-0.2,0.42),
 ('nba','team','Which franchise did Michael Jordan win all six of his championships with?','Based in Illinois.','["Chicago Bulls","Bulls","Chicago"]'::jsonb,'Chicago Bulls',-1.3,0.10),
 ('nba','player','Who is the NBA''s all-time leader in three-pointers made?','Golden State Warriors guard, number 30.','["Stephen Curry","Steph Curry","Curry"]'::jsonb,'Stephen Curry',-0.7,0.26),
 ('nba','player','Which Greek forward won back-to-back MVPs in 2019 and 2020?','Nicknamed the Greek Freak.','["Giannis Antetokounmpo","Giannis","Antetokounmpo"]'::jsonb,'Giannis Antetokounmpo',0.3,0.55),
 ('nba','player','Who was the Finals MVP when the Toronto Raptors won their first title in 2019?','He later joined the LA Clippers.','["Kawhi Leonard","Kawhi","Leonard"]'::jsonb,'Kawhi Leonard',0.9,0.74),
 ('cricket','player','Which Indian batter has scored 100 international centuries?','Known as the Little Master.','["Sachin Tendulkar","Tendulkar","Sachin"]'::jsonb,'Sachin Tendulkar',-1.2,0.12),
 ('cricket','player','Who is the leading wicket-taker in Test cricket history?','A Sri Lankan off-spinner with 800 wickets.','["Muttiah Muralitharan","Muralitharan","Murali"]'::jsonb,'Muttiah Muralitharan',0.0,0.45),
 ('cricket','player','Which Australian scored 400 not out in a Test against Zimbabwe in 2003?','He also captained the Melbourne Renegades.','["Matthew Hayden","Hayden"]'::jsonb,'Matthew Hayden',1.2,0.84),
 ('cricket','player','Which England all-rounder hit 135 not out to win the 2019 Headingley Ashes Test?','He also starred in the 2019 World Cup final.','["Ben Stokes","Stokes"]'::jsonb,'Ben Stokes',-0.3,0.38)
) as v(sport,qtype,prompt,clue,accepted,display,b,pct)
join public.sports s on s.slug=v.sport;