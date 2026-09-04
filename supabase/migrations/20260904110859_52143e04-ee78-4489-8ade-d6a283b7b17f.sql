-- v0.12–v0.20 fold-in ---------------------------------------------------------
-- 1. Editorial quiz formats
create table if not exists public.quiz_formats (
  key text primary key,
  title text not null,
  interaction text not null check (interaction in ('single_choice','typed_single','typed_list','ordered_grid','image_choice','higher_lower')),
  default_time_seconds int,
  scoring_rule jsonb not null default '{}',
  active boolean not null default true
);
grant select on public.quiz_formats to anon, authenticated;
grant all on public.quiz_formats to service_role;
insert into public.quiz_formats(key,title,interaction,default_time_seconds,scoring_rule) values
('classic_trivia','Classic trivia','single_choice',30,'{"base":100,"speed_bonus":true}'),
('list_blitz','List Blitz','typed_list',420,'{"per_answer":100,"streak_bonus":true}'),
('starting_lineup','Starting Lineup','ordered_grid',300,'{"per_slot":100,"perfect_bonus":500}'),
('career_path','Career Path','typed_single',45,'{"clue_decay":[500,400,300,200,100]}'),
('guess_grid','Guess the Grid','ordered_grid',240,'{"per_slot":100,"order_bonus":250}'),
('circuit_shape','Circuit Shapes','image_choice',20,'{"base":100,"speed_bonus":true}'),
('picture_reveal','Picture Reveal','typed_single',30,'{"reveal_decay":[500,400,300,200,100]}'),
('higher_lower','Higher or Lower','higher_lower',15,'{"streak_multiplier":true}'),
('weekend_roundup','Weekend Round-up','single_choice',20,'{"base":100,"speed_bonus":true}')
on conflict (key) do nothing;
alter table public.question_bank
  add column if not exists format_key text not null default 'classic_trivia' references public.quiz_formats(key),
  add column if not exists media_assets jsonb not null default '[]',
  add column if not exists max_answers smallint not null default 1 check(max_answers between 1 and 50),
  add column if not exists time_limit_seconds int check(time_limit_seconds between 5 and 900);
create index if not exists question_format_pool on public.question_bank(format_key,sport_id,competition_id,difficulty_percentile)
  where active and verification_status='verified';
alter table public.quiz_formats enable row level security;
drop policy if exists "quiz formats visible" on public.quiz_formats;
create policy "quiz formats visible" on public.quiz_formats for select using(active or public.has_staff_role());

-- 2. Notifications
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  match_turns boolean not null default true,
  room_invites boolean not null default true,
  daily_challenge boolean not null default true,
  streak_risk boolean not null default true,
  tournaments boolean not null default true,
  product_news boolean not null default false,
  sound boolean not null default true,
  quiet_hours boolean not null default true,
  quiet_start time not null default '22:00',
  quiet_end time not null default '08:00',
  timezone text not null default 'Europe/London',
  updated_at timestamptz not null default now()
);
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  expo_token text not null unique,
  platform text not null check(platform in('ios','android','web')),
  locale text not null default 'en',
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check(kind in('turn','room','daily','streak','tournament','achievement','system')),
  title text not null,
  body text not null,
  route text,
  payload jsonb not null default '{}',
  delivery_status text not null default 'queued' check(delivery_status in('queued','sent','failed','in_app_only')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.push_devices to authenticated;
grant select, update(read_at) on public.user_notifications to authenticated;
grant all on public.notification_preferences, public.push_devices, public.user_notifications to service_role;
create index if not exists user_notifications_inbox on public.user_notifications(user_id,read_at,created_at desc);
create index if not exists queued_push_delivery on public.user_notifications(delivery_status,created_at) where delivery_status='queued';
alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.user_notifications enable row level security;
drop policy if exists "own notification preferences" on public.notification_preferences;
create policy "own notification preferences" on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "own push devices" on public.push_devices;
create policy "own push devices" on public.push_devices for select to authenticated using(user_id=auth.uid());
drop policy if exists "own notification inbox" on public.user_notifications;
create policy "own notification inbox" on public.user_notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "mark own notifications read" on public.user_notifications;
create policy "mark own notifications read" on public.user_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.queue_arcade_turn_alert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.active_user_id is not null then
    insert into user_notifications(user_id,kind,title,body,route,payload)
    select new.active_user_id,'turn','Your turn','A new Arcade question is waiting for your answer.','/arcade/rooms/'||new.room_id,jsonb_build_object('room_id',new.room_id,'question_id',new.id)
    where coalesce((select match_turns from notification_preferences where user_id=new.active_user_id),true);
  end if;
  return new;
end$$;
drop trigger if exists arcade_question_turn_alert on public.arcade_questions;
create trigger arcade_question_turn_alert after insert on public.arcade_questions for each row execute function public.queue_arcade_turn_alert();

create or replace function public.queue_room_invite_alert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='invited' then
    insert into user_notifications(user_id,kind,title,body,route,payload)
    select new.user_id,'room','New room invitation','A player invited you to an Arcade room.','/arcade/rooms/'||new.room_id,jsonb_build_object('room_id',new.room_id)
    where coalesce((select room_invites from notification_preferences where user_id=new.user_id),true);
  end if;
  return new;
end$$;
drop trigger if exists arcade_room_invite_alert on public.arcade_room_players;
create trigger arcade_room_invite_alert after insert on public.arcade_room_players for each row execute function public.queue_room_invite_alert();
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='user_notifications') then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;

-- 3. Server-verified entitlements
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check (provider in ('stripe','revenuecat','apple','google','manual')),
  product_id text not null default 'fanzeno.pro.lifetime',
  external_ref text,
  status text not null default 'pending' check (status in ('pending','verified','refunded','revoked')),
  amount_minor int,
  currency text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.purchases to authenticated;
grant all on public.purchases to service_role;
alter table public.purchases enable row level security;
drop policy if exists "own purchases" on public.purchases;
create policy "own purchases" on public.purchases for select to authenticated using (user_id=auth.uid() or public.has_staff_role());
alter table public.entitlements
  add column if not exists source_purchase_id uuid references public.purchases(id),
  add column if not exists granted_by uuid references auth.users(id),
  add column if not exists grant_reason text;
revoke insert,update,delete on public.purchases, public.entitlements from anon, authenticated;

create or replace function public.entitlement_verified(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.entitlements e
    left join public.purchases p on p.id=e.source_purchase_id and p.user_id=e.user_id
    where e.user_id=p_user_id and e.active and e.revoked_at is null
      and (e.key='ad_free_lifetime' or e.tier='pro')
      and ((p.status='verified' and p.verified_at is not null) or e.granted_by is not null)
  )
$$;
revoke all on function public.entitlement_verified(uuid) from public;
grant execute on function public.entitlement_verified(uuid) to authenticated, service_role;

create or replace function public.my_entitlement_status()
returns table(pro_active boolean, ad_free boolean, verified_at timestamptz)
language sql stable security definer set search_path=public as $$
  select public.entitlement_verified(auth.uid()), public.entitlement_verified(auth.uid()),
         (select max(coalesce(p.verified_at, e.granted_at)) from public.entitlements e
            left join public.purchases p on p.id=e.source_purchase_id where e.user_id=auth.uid() and e.active and e.revoked_at is null)
$$;
revoke all on function public.my_entitlement_status() from public;
grant execute on function public.my_entitlement_status() to authenticated;

create or replace function public.can_host_game(p_user_id uuid, p_mode_slug text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.game_modes gm where gm.slug=p_mode_slug
    and (gm.access_tier='free' or public.entitlement_verified(p_user_id)))
$$;

create or replace function public.grant_pro_lifetime(p_user_id uuid, p_reason text default 'staff grant')
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_staff_role() then raise exception 'Staff role required'; end if;
  insert into public.entitlements(user_id,key,active,tier,lifetime,granted_by,grant_reason)
  values (p_user_id,'ad_free_lifetime',true,'pro',true,auth.uid(),p_reason)
  on conflict (user_id,key) do update set active=true, revoked_at=null, tier='pro', lifetime=true, granted_by=auth.uid(), grant_reason=p_reason;
end$$;
revoke all on function public.grant_pro_lifetime(uuid,text) from public;
grant execute on function public.grant_pro_lifetime(uuid,text) to authenticated;

-- 4. Question provenance + staff publishing
alter table public.question_bank
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists content_hash text,
  add column if not exists reviewed_by uuid references auth.users,
  add column if not exists reviewed_at timestamptz;
create unique index if not exists question_bank_content_hash on public.question_bank(content_hash) where content_hash is not null;
alter table public.question_bank drop constraint if exists verified_question_has_source;
alter table public.question_bank add constraint verified_question_has_source check(
  verification_status<>'verified' or(source_id is not null and source_url is not null and reviewed_at is not null)
) not valid;
alter table public.question_bank drop constraint if exists question_has_accepted_answer;
alter table public.question_bank add constraint question_has_accepted_answer check(
  jsonb_typeof(answer_rule->'accepted')='array' and jsonb_array_length(answer_rule->'accepted')>0
) not valid;

create or replace function public.publish_question(p_question_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_staff_role() then raise exception 'Staff role required'; end if;
 update public.question_bank set verification_status='verified',reviewed_by=auth.uid(),reviewed_at=now()
 where id=p_question_id and source_id is not null and source_url is not null
   and jsonb_typeof(answer_rule->'accepted')='array' and jsonb_array_length(answer_rule->'accepted')>0;
 if not found then raise exception 'Question needs a source and accepted answer'; end if;
end$$;
revoke all on function public.publish_question(uuid) from public;
grant execute on function public.publish_question(uuid) to authenticated;

create or replace function public.unpublish_question(p_question_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_staff_role() then raise exception 'Staff role required'; end if;
 update public.question_bank set verification_status='pending', reviewed_by=null, reviewed_at=null where id=p_question_id;
end$$;
revoke all on function public.unpublish_question(uuid) from public;
grant execute on function public.unpublish_question(uuid) to authenticated;

drop policy if exists "staff review question bank" on public.question_bank;
create policy "staff review question bank" on public.question_bank for select to authenticated using (public.has_staff_role());

-- 5. Sourced starter questions (pending until a reviewer publishes)
insert into public.data_sources(name, source_type, licence_notes)
select 'Fanzeno sourced editorial','editorial_review','Independently written questions; fact checked against the per-question official source URL.'
where not exists (select 1 from public.data_sources where name='Fanzeno sourced editorial');
insert into public.question_bank(sport_id,category_key,question_type,prompt_i18n,clue_i18n,answer_rule,answer_display_i18n,difficulty_percentile,quality_score,ambiguity_score,verification_status,source_id,source_url,source_title,content_hash,active)
select s.id,v.cat,'text',v.p,v.c,v.a,v.d,v.diff,1,0,'pending',(select id from public.data_sources where name='Fanzeno sourced editorial'),v.url,v.title,v.hash,true
from (values
('football','world-cup','{"en": "Which country won the 2018 FIFA World Cup?"}'::jsonb,'{"en": "They defeated Croatia in the final."}'::jsonb,'{"accepted": ["France", "French national team"]}'::jsonb,'{"en": "France"}'::jsonb,0.18,'https://www.fifa.com/tournaments/mens/worldcup/2018russia','FIFA 2018 World Cup','843f6dffd537622a863d76eb66ce53a000410794e74bf00b6920dee9bd88f74e'),
('football','euros','{"en": "Which country won UEFA Euro 2016?"}'::jsonb,'{"en": "They defeated France after extra time."}'::jsonb,'{"accepted": ["Portugal", "Portuguese national team"]}'::jsonb,'{"en": "Portugal"}'::jsonb,0.28,'https://www.uefa.com/uefaeuro/history/seasons/2016/','UEFA Euro 2016','f44441923a1a1efb4e3c5b62872c8592b6e4e229a95089ae71ae46ae34770016'),
('football','champions-league','{"en": "Which club won the 1999 UEFA Champions League final?"}'::jsonb,'{"en": "They scored twice in added time."}'::jsonb,'{"accepted": ["Manchester United", "Man United", "Man Utd", "MUFC"]}'::jsonb,'{"en": "Manchester United"}'::jsonb,0.24,'https://www.uefa.com/uefachampionsleague/history/seasons/1998/','UEFA Champions League 1998/99','b098863da931d212ef284ac06eac91fcca0848c2104a885503dbe758b0065497'),
('cricket','world-cup','{"en": "Which country won the first men''s Cricket World Cup in 1975?"}'::jsonb,'{"en": "Clive Lloyd captained the winners."}'::jsonb,'{"accepted": ["West Indies", "Windies"]}'::jsonb,'{"en": "West Indies"}'::jsonb,0.42,'https://www.icc-cricket.com/tournaments/cricketworldcup','ICC Cricket World Cup history','cee3d81f7dd8fce937df53d2706a0b6701556f9d72ea45697b1671705ac27f32'),
('cricket','t20','{"en": "Which country won the inaugural men''s T20 World Cup in 2007?"}'::jsonb,'{"en": "They beat Pakistan in the final."}'::jsonb,'{"accepted": ["India", "Indian national team"]}'::jsonb,'{"en": "India"}'::jsonb,0.26,'https://www.icc-cricket.com/tournaments/t20cricketworldcup','ICC Men''s T20 World Cup','fcd49c802674f89b1695c9ef5ac5d60f32c16f14c2a4a7af886469fa042082f5'),
('rugby','world-cup','{"en": "Which country won the men''s Rugby World Cup in 2019?"}'::jsonb,'{"en": "They defeated England in Yokohama."}'::jsonb,'{"accepted": ["South Africa", "Springboks", "The Springboks"]}'::jsonb,'{"en": "South Africa"}'::jsonb,0.2,'https://www.rugbyworldcup.com/2019','Rugby World Cup 2019','46479b6123dd9b334368d3c8e06a0667b7ee0ae0707353c75fc409021fa058df'),
('nfl','super-bowl','{"en": "Which team won Super Bowl LVIII?"}'::jsonb,'{"en": "They defeated San Francisco in overtime."}'::jsonb,'{"accepted": ["Kansas City Chiefs", "Chiefs", "KC Chiefs"]}'::jsonb,'{"en": "Kansas City Chiefs"}'::jsonb,0.17,'https://www.nfl.com/super-bowl/history/2023','NFL Super Bowl LVIII','8ea7de99ab9b9ee1b4cbd36a28d8cc738e7ad8865bb209c2a9747ef5aff53cf7'),
('nba','championship','{"en": "With which team did Michael Jordan win six NBA championships?"}'::jsonb,'{"en": "The titles came in two three-peats."}'::jsonb,'{"accepted": ["Chicago Bulls", "Bulls"]}'::jsonb,'{"en": "Chicago Bulls"}'::jsonb,0.12,'https://www.nba.com/history/legends/profiles/michael-jordan','NBA Michael Jordan profile','d0300fead0c1563363a0682298db91f105544e8c04413ef5036e7e3aa36d128c'),
('mlb','world-series','{"en": "Which franchise has won the most World Series championships?"}'::jsonb,'{"en": "The franchise plays in the Bronx."}'::jsonb,'{"accepted": ["New York Yankees", "Yankees", "NY Yankees"]}'::jsonb,'{"en": "New York Yankees"}'::jsonb,0.22,'https://www.mlb.com/postseason/history/world-series','MLB World Series history','dcba542e3d696f6892ed0f3b015d46ffdf9e547d0b41de0ca76641a3dabbc77c'),
('nhl','stanley-cup','{"en": "Which trophy is awarded to the NHL playoff champion?"}'::jsonb,'{"en": "It is named after Lord Stanley of Preston."}'::jsonb,'{"accepted": ["Stanley Cup", "The Stanley Cup"]}'::jsonb,'{"en": "Stanley Cup"}'::jsonb,0.08,'https://www.nhl.com/info/stanley-cup','NHL Stanley Cup','e6f3a9de4abc8ef76d0ba99a98ec7ebfd7bd7b8e817078cf88ba51d9875fcbb3'),
('afl','grand-final','{"en": "What is the trophy awarded to the AFL premiership winner called?"}'::jsonb,'{"en": "It is presented after the Grand Final."}'::jsonb,'{"accepted": ["Premiership Cup", "AFL Premiership Cup"]}'::jsonb,'{"en": "Premiership Cup"}'::jsonb,0.3,'https://www.afl.com.au/finals','Australian Football League','44c96e0852a5cd4d8b961641709cbcb65d6a94b50f0e559985c4ac29ddc7b749'),
('tennis','grand-slams','{"en": "On which surface is Wimbledon played?"}'::jsonb,'{"en": "It is the only Grand Slam still played on this surface."}'::jsonb,'{"accepted": ["Grass", "Grass court", "Grass courts"]}'::jsonb,'{"en": "Grass"}'::jsonb,0.08,'https://www.wimbledon.com/en_GB/about_wimbledon/history.html','Wimbledon history','3da2c29276780415dbd4c6275d80f9c53a57c71ea50573513938371504c2b6fe'),
('golf','majors','{"en": "At which course is the Masters Tournament played?"}'::jsonb,'{"en": "The course is in Georgia, USA."}'::jsonb,'{"accepted": ["Augusta National Golf Club", "Augusta National", "Augusta"]}'::jsonb,'{"en": "Augusta National Golf Club"}'::jsonb,0.16,'https://www.masters.com/en_US/tournament/index.html','Masters Tournament','57915ae3f154bf6b4e628530b012b7f6461ee25aa72d2e8505561a677f46f0f7'),
('f1','world-champions','{"en": "Who won the 2008 Formula One World Drivers'' Championship?"}'::jsonb,'{"en": "He secured the title by one point."}'::jsonb,'{"accepted": ["Lewis Hamilton", "Hamilton"]}'::jsonb,'{"en": "Lewis Hamilton"}'::jsonb,0.24,'https://www.formula1.com/en/results/2008/drivers','Formula 1 2008 standings','1cd7d16858ebc918f8c3c25e2dbe4e3520a52482cd8f374c028c8179de8c4b10'),
('motogp','world-champions','{"en": "Which rider won the 2021 MotoGP world championship?"}'::jsonb,'{"en": "He rode for Yamaha."}'::jsonb,'{"accepted": ["Fabio Quartararo", "Quartararo"]}'::jsonb,'{"en": "Fabio Quartararo"}'::jsonb,0.42,'https://www.motogp.com/en/gp-results/2021/motogp/world-standing','MotoGP 2021 standings','b2ac8cfae49a28881212fe62b826baeae56020f1d95b4b12f94b609839b5fc06'),
('snooker','world-championship','{"en": "At which venue is the World Snooker Championship traditionally staged?"}'::jsonb,'{"en": "The venue is in Sheffield."}'::jsonb,'{"accepted": ["Crucible Theatre", "The Crucible", "Crucible"]}'::jsonb,'{"en": "Crucible Theatre"}'::jsonb,0.19,'https://www.wst.tv/worldchampionship','World Snooker Tour','39881e7447cdf3131c756164d8c2dd577e8cde765b33f2d6a7f11b70b5f22620'),
('darts','world-championship','{"en": "Which venue hosts the PDC World Darts Championship?"}'::jsonb,'{"en": "The venue is in north London."}'::jsonb,'{"accepted": ["Alexandra Palace", "Ally Pally"]}'::jsonb,'{"en": "Alexandra Palace"}'::jsonb,0.24,'https://www.pdc.tv/tournament/paddy-power-world-darts-championship','PDC World Championship','54843f422693c5b28abb8c23b3a218d1845841fc8863255e01a326ef9b023d38'),
('horse-racing','uk','{"en": "At which racecourse is the Grand National run?"}'::jsonb,'{"en": "The course is near Liverpool."}'::jsonb,'{"accepted": ["Aintree", "Aintree Racecourse"]}'::jsonb,'{"en": "Aintree"}'::jsonb,0.16,'https://www.thejockeyclub.co.uk/aintree/events-tickets/grand-national/','The Grand National','1e6eb1f0d6677aa4c240903b73015a587a30dd4c339bf1a5abaad3f77f97399e'),
('boxing-pro','heavyweight','{"en": "Who defeated George Foreman in the Rumble in the Jungle?"}'::jsonb,'{"en": "The bout took place in Kinshasa in 1974."}'::jsonb,'{"accepted": ["Muhammad Ali", "Ali"]}'::jsonb,'{"en": "Muhammad Ali"}'::jsonb,0.19,'https://www.ibhof.com/pages/about/inductees/modern/ali.html','International Boxing Hall of Fame','1107599cbf59aa4af0fbe4bc0de8ce578162960727c34e4edf00ac80baa7a5e4'),
('ufc','champions','{"en": "Who was the first UFC women''s bantamweight champion?"}'::jsonb,'{"en": "She was presented with the title before UFC 157."}'::jsonb,'{"accepted": ["Ronda Rousey", "Rousey"]}'::jsonb,'{"en": "Ronda Rousey"}'::jsonb,0.48,'https://www.ufc.com/athlete/ronda-rousey','UFC Ronda Rousey profile','ca916e889d0b119ce0e22ccdf63e0025513643e428f11691af2f099f0fa2387c')
) as v(slug,cat,p,c,a,d,diff,url,title,hash)
join public.sports s on s.slug=v.slug
on conflict do nothing;

-- 6. Expanded competition taxonomy
do $$declare fb uuid;af uuid;bb uuid;ih uuid;begin
select id into fb from public.sports where slug='football';select id into af from public.sports where slug='nfl';select id into bb from public.sports where slug='nba';select id into ih from public.sports where slug='nhl';
insert into public.competitions(sport_id,slug,name,short_name,region,competition_type,country_code,category_key,level_key,governing_body,valid_from) values
(fb,'fa-cup','FA Cup','FAC','England','cup','GB','domestic-cup','senior','FA','1900-01-01'),(fb,'copa-del-rey','Copa del Rey','CDR','Spain','cup','ES','domestic-cup','senior','RFEF','1900-01-01'),(fb,'dfb-pokal','DFB-Pokal','DFB','Germany','cup','DE','domestic-cup','senior','DFB','1935-01-01'),
(fb,'copa-libertadores','Copa Libertadores','LIB','South America','cup',null,'confederation-club','senior','CONMEBOL','1960-01-01'),(fb,'concacaf-champions-cup','CONCACAF Champions Cup','CCC','North/Central America','cup',null,'confederation-club','senior','CONCACAF','1962-01-01'),(fb,'caf-champions-league','CAF Champions League','CAFCL','Africa','cup',null,'confederation-club','senior','CAF','1964-01-01'),(fb,'afc-champions-league','AFC Champions League Elite','ACLE','Asia','cup',null,'confederation-club','senior','AFC','1967-01-01'),(fb,'ofc-champions-league','OFC Champions League','OFC','Oceania','cup',null,'confederation-club','senior','OFC','1987-01-01'),
(fb,'afcon','Africa Cup of Nations','AFCON','Africa','cup',null,'confederation-national','senior','CAF','1957-01-01'),(fb,'copa-america','Copa América','COPA','South America','cup',null,'confederation-national','senior','CONMEBOL','1916-01-01'),(fb,'gold-cup','CONCACAF Gold Cup','GOLD','North/Central America','cup',null,'confederation-national','senior','CONCACAF','1963-01-01'),(fb,'asian-cup','AFC Asian Cup','ASIA','Asia','cup',null,'confederation-national','senior','AFC','1956-01-01'),(fb,'ofc-nations-cup','OFC Nations Cup','OFC','Oceania','cup',null,'confederation-national','senior','OFC','1973-01-01'),(fb,'olympic-football','Olympic Football','OLY','International','event',null,'international','senior','IOC/FIFA','1900-01-01'),(fb,'club-world-cup','FIFA Club World Cup','CWC','International','cup',null,'international-club','senior','FIFA','2000-01-01'),
(af,'nfl','National Football League','NFL','USA','league','US','professional','senior','NFL','1920-01-01'),(af,'cfl','Canadian Football League','CFL','Canada','league','CA','professional','senior','CFL','1958-01-01'),(af,'ncaa-football','NCAA Football','NCAA','USA','league','US','college','college','NCAA','1900-01-01'),(af,'college-football-playoff','College Football Playoff','CFP','USA','event','US','college','college','CFP','2014-01-01'),
(bb,'nba','National Basketball Association','NBA','USA','league','US','professional','senior','NBA','1946-01-01'),(bb,'wnba','Women''s National Basketball Association','WNBA','USA','league','US','professional','senior','WNBA','1997-01-01'),(bb,'ncaa-basketball','NCAA Basketball','NCAA','USA','league','US','college','college','NCAA','1906-01-01'),(bb,'euroleague','EuroLeague','EL','Europe','league',null,'club','senior','Euroleague Basketball','1958-01-01'),(bb,'eurobasket','FIBA EuroBasket','EB','Europe','cup',null,'international','senior','FIBA Europe','1935-01-01'),(bb,'fiba-world-cup','FIBA Basketball World Cup','FIBA','International','cup',null,'international','senior','FIBA','1950-01-01'),(bb,'olympic-basketball','Olympic Basketball','OLY','International','event',null,'international','senior','IOC/FIBA','1936-01-01'),
(ih,'nhl','National Hockey League','NHL','North America','league',null,'professional','senior','NHL','1917-01-01'),(ih,'stanley-cup','Stanley Cup Playoffs','SC','North America','cup',null,'professional','senior','NHL','1900-01-01'),(ih,'iihf-worlds','IIHF World Championship','IIHF','International','cup',null,'international','senior','IIHF','1920-01-01'),(ih,'olympic-ice-hockey','Olympic Ice Hockey','OLY','International','event',null,'international','senior','IOC/IIHF','1920-01-01'),(ih,'world-juniors','IIHF World Junior Championship','WJC','International','cup',null,'international','under-20','IIHF','1977-01-01')
on conflict(sport_id,slug) do update set name=excluded.name,category_key=excluded.category_key,level_key=excluded.level_key,governing_body=excluded.governing_body;
end$$;

-- 7. Monthly skill competitions
create table if not exists public.monthly_competitions(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,division text not null check(division in('open','pro')),starts_at timestamptz not null,ends_at timestamptz not null,scoring_rules jsonb not null,official_rules_url text not null,eligible_countries text[] not null default '{}',minimum_age int not null default 18,prize_type text not null default 'recognition' check(prize_type in('recognition','merchandise','cash')),prize_description text not null,purchase_required boolean not null default false,free_entry_available boolean not null default true,status text not null default 'draft' check(status in('draft','open','review','final','cancelled')),created_at timestamptz not null default now(),check(ends_at>starts_at),check(not purchase_required or free_entry_available));
create table if not exists public.monthly_competition_scores(competition_id uuid references public.monthly_competitions on delete cascade,user_id uuid references auth.users on delete cascade,verified_points bigint not null default 0,verified_wins int not null default 0,verified_games int not null default 0,tie_break_ms bigint not null default 0,integrity_status text not null default 'pending' check(integrity_status in('pending','verified','review','disqualified')),updated_at timestamptz not null default now(),primary key(competition_id,user_id));
create table if not exists public.prize_awards(id uuid primary key default gen_random_uuid(),competition_id uuid not null references public.monthly_competitions,user_id uuid not null references auth.users,rank int not null check(rank>0),status text not null default 'pending' check(status in('pending','eligible','claimed','fulfilled','withheld')),eligibility_evidence jsonb not null default '{}',awarded_at timestamptz,unique(competition_id,rank),unique(competition_id,user_id));
create table if not exists public.security_events(id bigint generated always as identity primary key,user_id uuid references auth.users on delete set null,event_type text not null,severity text not null check(severity in('info','warning','critical')),device_hash text,ip_hash text,evidence jsonb not null default '{}',created_at timestamptz not null default now());
grant select on public.monthly_competitions, public.monthly_competition_scores, public.prize_awards, public.security_events to authenticated, anon;
grant all on public.monthly_competitions, public.monthly_competition_scores, public.prize_awards, public.security_events to service_role;
alter table public.monthly_competitions enable row level security;alter table public.monthly_competition_scores enable row level security;alter table public.prize_awards enable row level security;alter table public.security_events enable row level security;
drop policy if exists "published competitions read" on public.monthly_competitions;
create policy "published competitions read" on public.monthly_competitions for select using(status in('open','review','final') or public.has_staff_role());
drop policy if exists "verified leaderboard read" on public.monthly_competition_scores;
create policy "verified leaderboard read" on public.monthly_competition_scores for select using(integrity_status='verified' or user_id=auth.uid() or public.has_staff_role());
drop policy if exists "own prize read" on public.prize_awards;
create policy "own prize read" on public.prize_awards for select using(user_id=auth.uid() or public.has_staff_role());
drop policy if exists "staff security read" on public.security_events;
create policy "staff security read" on public.security_events for select using(public.has_staff_role());
revoke insert,update,delete on public.monthly_competitions,public.monthly_competition_scores,public.prize_awards,public.security_events from anon,authenticated;
create index if not exists monthly_rank on public.monthly_competition_scores(competition_id,verified_points desc,verified_wins desc,tie_break_ms asc) where integrity_status='verified';
insert into public.monthly_competitions(slug,name,division,starts_at,ends_at,scoring_rules,official_rules_url,eligible_countries,minimum_age,prize_type,prize_description,purchase_required,free_entry_available,status)
values ('2026-09-open','September 2026 Open','open','2026-09-01T00:00:00Z','2026-10-01T00:00:00Z',
  '{"points":"verified online game points","tie_break":"fastest cumulative correct-answer time","min_games":5}',
  'https://fanzeno.app/rules/monthly','{}',18,'recognition','Monthly champion badge on your profile and the global honours board.',false,true,'open')
on conflict (slug) do nothing;

-- 8. Avatar collection v2
insert into public.avatar_presets(id,display_name,asset_key,accent,access_tier,active,sort_order) values
('captain','Captain','atlas-v1-0','#45E6A0','free',true,1),('playmaker','Playmaker','atlas-v1-1','#49C6E5','free',true,2),('striker','Striker','atlas-v1-2','#FF6B5C','free',true,3),('champion','Champion','atlas-v1-3','#FFD84A','free',true,4),('ace','Ace','atlas-v1-4','#45E6A0','free',true,5),('racer','Racer','atlas-v1-5','#4D8DFF','free',true,6),('legend','Legend','atlas-v1-6','#9A7BFF','free',true,7),('challenger','Challenger','atlas-v1-7','#FF6B5C','free',true,8),('veteran','Veteran','atlas-v1-8','#E9A83D','pro',true,9),('maverick','Maverick','atlas-v1-9','#9A7BFF','pro',true,10),('rookie','Rookie','atlas-v1-10','#45E6A0','pro',true,11),('allstar','All-Star','atlas-v1-11','#49C6E5','pro',true,12)
on conflict(id) do update set display_name=excluded.display_name,asset_key=excluded.asset_key,accent=excluded.accent,access_tier=excluded.access_tier,active=true,sort_order=excluded.sort_order;
update public.avatar_presets set active=false where id in ('batter','fighter','hoops','rocket','lion','eagle');

create or replace function public.enforce_avatar_access() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.avatar_preset is not null
    and exists(select 1 from public.avatar_presets where id=new.avatar_preset and access_tier='pro')
    and not public.entitlement_verified(new.id) then
   raise exception 'Verified Pro entitlement required for this avatar';
 end if;
 return new;
end$$;
drop trigger if exists profiles_avatar_access on public.profiles;
create trigger profiles_avatar_access before insert or update of avatar_preset on public.profiles for each row execute function public.enforce_avatar_access();

-- 9. Player onboarding preferences
alter table public.profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists difficulty_preference text not null default 'adaptive' check (difficulty_preference in ('beginner','regular','expert','adaptive'));