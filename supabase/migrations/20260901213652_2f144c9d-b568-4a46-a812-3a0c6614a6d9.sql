insert into public.game_modes(slug,name,description,min_players,max_players,board_config,enabled,sort_order) values
('quiz-ludo','Quiz Ludo','Answer first clue to move 6, second clue to move 5; wrong answers do not move',2,4,'{"first_answer_move":6,"clue_answer_move":5,"wrong_move":0,"local":true,"online":true}',true,10),
('quiz-snakes-ladders','Quiz Snakes & Ladders','Answer to move around a 100-space snakes and ladders board',2,4,'{"spaces":100,"first_answer_move":6,"clue_answer_move":5,"wrong_move":0}',true,11),
('sports-mastermind','Sports Mastermind','Three minutes chosen sport then three minutes all-sports',2,4,'{"round_seconds":180,"rounds":["chosen","all_sports"],"tie_break":"least_passes"}',true,12)
on conflict(slug) do update set description=excluded.description,max_players=excluded.max_players,board_config=excluded.board_config;

alter table public.game_modes add column if not exists access_tier text not null default 'free' check(access_tier in('free','pro'));
alter table public.game_modes add column if not exists guest_join_allowed boolean not null default true;
update public.game_modes set access_tier='pro' where slug in('quiz-ludo','sports-mastermind','territory','category-tower','sports-501','draft-xi','stat-cards');
update public.game_modes set access_tier='free' where slug in('tic-tac-toe','connect-four','quiz-snakes-ladders','connections','bingo');

alter table public.entitlements add column if not exists tier text not null default 'free' check(tier in('free','pro'));
alter table public.entitlements add column if not exists lifetime boolean not null default false;
alter table public.entitlements add column if not exists revoked_at timestamptz;
update public.entitlements set tier='pro', lifetime=true where key='ad_free_lifetime' and active;

create or replace function public.can_host_game(p_user_id uuid,p_mode_slug text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from game_modes gm where gm.slug=p_mode_slug and (gm.access_tier='free'
    or exists(select 1 from entitlements e where e.user_id=p_user_id and e.active and e.revoked_at is null and (e.tier='pro' or e.key='ad_free_lifetime'))))
$$;
revoke execute on function public.can_host_game(uuid,text) from public, anon;
grant execute on function public.can_host_game(uuid,text) to authenticated, service_role;

create table public.arcade_rooms(
  id uuid primary key default gen_random_uuid(),
  code text unique not null check(code~'^[A-Z0-9-]{6,9}$'),
  host_id uuid not null,
  mode_slug text not null references public.game_modes(slug),
  difficulty smallint not null check(difficulty between 1 and 4),
  status text not null default 'lobby' check(status in('lobby','active','complete','cancelled')),
  visibility public.match_visibility not null default 'private',
  settings jsonb not null default '{}',
  active_seat smallint,
  round_no smallint not null default 0,
  turn_started_at timestamptz,
  turn_ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.arcade_room_players(
  room_id uuid not null references public.arcade_rooms on delete cascade,
  user_id uuid not null,
  seat smallint not null check(seat between 0 and 3),
  display_name text not null,
  sport_id uuid references public.sports,
  competition_id uuid references public.competitions,
  category_key text,
  position int not null default 0,
  points int not null default 0,
  passes int not null default 0,
  correct_answers int not null default 0,
  status text not null default 'ready' check(status in('invited','ready','active','finished','disconnected')),
  primary key(room_id,user_id), unique(room_id,seat)
);
create table public.arcade_questions(
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.arcade_rooms on delete cascade,
  turn_no int not null,
  active_user_id uuid not null,
  question_id uuid,
  prompt_i18n jsonb not null,
  clue_i18n jsonb not null default '{}',
  answer_display_i18n jsonb not null,
  sport_id uuid references public.sports,
  competition_id uuid references public.competitions,
  revealed_clue boolean not null default false,
  revealed_answer boolean not null default false,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(room_id,turn_no)
);
create table public.arcade_submissions(
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.arcade_questions on delete cascade,
  user_id uuid not null,
  action text not null check(action in('answer','pass','clue')),
  answer_text text,
  correct boolean,
  awarded_points int not null default 0,
  movement int not null default 0,
  submitted_at timestamptz not null default now(),
  unique(question_id,user_id,action)
);
grant select, insert on public.arcade_rooms, public.arcade_room_players, public.arcade_questions, public.arcade_submissions to authenticated;
grant all on public.arcade_rooms, public.arcade_room_players, public.arcade_questions, public.arcade_submissions to service_role;
create index arcade_room_active on public.arcade_rooms(status,mode_slug,created_at desc);
create index arcade_question_stream on public.arcade_questions(room_id,turn_no);

alter table public.arcade_rooms enable row level security;
alter table public.arcade_room_players enable row level security;
alter table public.arcade_questions enable row level security;
alter table public.arcade_submissions enable row level security;

create or replace function public.is_arcade_member(p_room uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from arcade_rooms r where r.id=p_room and (r.visibility='public' or r.host_id=auth.uid()))
      or exists(select 1 from arcade_room_players p where p.room_id=p_room and p.user_id=auth.uid())
$$;
revoke execute on function public.is_arcade_member(uuid) from public, anon;
grant execute on function public.is_arcade_member(uuid) to authenticated, service_role;

create policy "arcade rooms visible" on public.arcade_rooms for select to authenticated using(public.is_arcade_member(id));
create policy "host creates arcade room" on public.arcade_rooms for insert to authenticated with check(host_id=auth.uid() and public.can_host_game(auth.uid(),mode_slug));
create policy "arcade players visible" on public.arcade_room_players for select to authenticated using(public.is_arcade_member(room_id));
create policy "join arcade room" on public.arcade_room_players for insert to authenticated with check(user_id=auth.uid());
create policy "questions visible to room" on public.arcade_questions for select to authenticated using(public.is_arcade_member(room_id));
create policy "host issues questions" on public.arcade_questions for insert to authenticated with check(exists(select 1 from public.arcade_rooms r where r.id=room_id and r.host_id=auth.uid()));
create policy "active player submission only" on public.arcade_submissions for insert to authenticated with check(
  user_id=auth.uid() and exists(select 1 from public.arcade_questions q join public.arcade_rooms r on r.id=q.room_id
    where q.id=question_id and q.active_user_id=auth.uid() and r.status='active' and (q.expires_at is null or now()<=q.expires_at)));
create policy "room submissions visible" on public.arcade_submissions for select to authenticated using(
  exists(select 1 from public.arcade_questions q where q.id=question_id and public.is_arcade_member(q.room_id)));

alter publication supabase_realtime add table public.arcade_rooms;
alter publication supabase_realtime add table public.arcade_room_players;
alter publication supabase_realtime add table public.arcade_questions;
alter publication supabase_realtime add table public.arcade_submissions;

create or replace view public.mastermind_standings with (security_invoker=true) as
select p.room_id,p.user_id,p.display_name,p.points,p.passes,p.correct_answers,
  dense_rank() over(partition by p.room_id order by p.points desc,p.passes asc,p.correct_answers desc) as place
from public.arcade_room_players p join public.arcade_rooms r on r.id=p.room_id where r.mode_slug='sports-mastermind';
grant select on public.mastermind_standings to authenticated;