-- Fanzeno core schema
create extension if not exists pgcrypto;
create extension if not exists unaccent;

create type public.app_role as enum ('player','moderator','content_editor','admin','owner');
create type public.game_status as enum ('waiting','active','completed','abandoned');
create type public.entitlement_key as enum ('ad_free_lifetime');
create type public.match_visibility as enum ('public','friends','private');

create or replace function public.fz_norm(t text) returns text
language sql immutable strict as $$
  select regexp_replace(lower(public.unaccent(t)), '[^a-z0-9]', '', 'g')
$$;

create table public.profiles(
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) between 2 and 30),
  avatar_url text,
  country_code char(2),
  locale text not null default 'en' check (locale in ('en','fr','es','de','pt','it','nl','tr','ar','ur')),
  preferred_sports text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles(
  user_id uuid not null references auth.users on delete cascade,
  role app_role not null default 'player',
  primary key (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_staff_role()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('moderator','content_editor','admin','owner')
  )
$$;

create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "roles self read" on public.user_roles for select using (user_id = auth.uid() or public.has_staff_role());

-- Content catalogue
create table public.sports(
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  accent text not null default '#41E59B',
  enabled boolean not null default true,
  sort_order int not null default 0
);
grant select on public.sports to anon, authenticated;
grant insert, update, delete on public.sports to authenticated;
grant all on public.sports to service_role;
alter table public.sports enable row level security;
create policy "sports read" on public.sports for select using (enabled or public.has_staff_role());
create policy "sports staff write" on public.sports for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());

create table public.athletes(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports on delete cascade,
  name text not null,
  aliases text[] not null default '{}',
  country_code char(2),
  active boolean not null default true,
  unique (sport_id, name)
);
grant select on public.athletes to anon, authenticated;
grant insert, update, delete on public.athletes to authenticated;
grant all on public.athletes to service_role;
alter table public.athletes enable row level security;
create policy "athletes read" on public.athletes for select using (active or public.has_staff_role());
create policy "athletes staff write" on public.athletes for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());

create table public.criteria(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports on delete cascade,
  label text not null,
  label_i18n jsonb not null default '{}',
  criteria_type text not null default 'career',
  enabled boolean not null default true,
  unique (sport_id, label)
);
grant select on public.criteria to anon, authenticated;
grant insert, update, delete on public.criteria to authenticated;
grant all on public.criteria to service_role;
alter table public.criteria enable row level security;
create policy "criteria read" on public.criteria for select using (enabled or public.has_staff_role());
create policy "criteria staff write" on public.criteria for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());

create table public.grids(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports on delete cascade,
  row_criteria uuid[] not null check (cardinality(row_criteria) = 3),
  column_criteria uuid[] not null check (cardinality(column_criteria) = 3),
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  scheduled_for date,
  published_at timestamptz,
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  unique (sport_id, scheduled_for)
);
grant select on public.grids to anon, authenticated;
grant insert, update, delete on public.grids to authenticated;
grant all on public.grids to service_role;
alter table public.grids enable row level security;
create policy "grids read" on public.grids for select using (published_at is not null or public.has_staff_role());
create policy "grids staff write" on public.grids for all to authenticated using (public.has_staff_role()) with check (public.has_staff_role());

-- Answer key: never exposed to anon
create table public.grid_answers(
  grid_id uuid not null references public.grids on delete cascade,
  cell_index smallint not null check (cell_index between 0 and 8),
  athlete_id uuid not null references public.athletes on delete cascade,
  rarity_score numeric(5,2),
  primary key (grid_id, cell_index, athlete_id)
);
grant select, insert, update, delete on public.grid_answers to authenticated;
grant all on public.grid_answers to service_role;
alter table public.grid_answers enable row level security;
create policy "answers staff only" on public.grid_answers for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

-- Play
create table public.rooms(
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[A-Z0-9-]{4,9}$'),
  host_id uuid not null references auth.users on delete cascade,
  grid_id uuid not null references public.grids,
  visibility match_visibility not null default 'private',
  created_at timestamptz not null default now()
);
grant select, insert on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "rooms read" on public.rooms for select to authenticated using (true);
create policy "rooms host create" on public.rooms for insert to authenticated with check (host_id = auth.uid());

create table public.games(
  id uuid primary key default gen_random_uuid(),
  grid_id uuid not null references public.grids,
  room_id uuid references public.rooms on delete set null,
  mode text not null default 'daily' check (mode in ('daily','solo','room')),
  player_one uuid not null references auth.users on delete cascade,
  status game_status not null default 'active',
  score smallint not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index games_one_per_grid_player on public.games(grid_id, player_one, mode) where room_id is null;
grant select on public.games to anon, authenticated;
grant all on public.games to service_role;
alter table public.games enable row level security;
create policy "games readable" on public.games for select using (true);

create table public.game_moves(
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games on delete cascade,
  player_id uuid not null references auth.users on delete cascade,
  cell_index smallint not null check (cell_index between 0 and 8),
  guess text not null,
  athlete_id uuid references public.athletes,
  accepted boolean not null,
  created_at timestamptz not null default now()
);
create unique index game_moves_accepted_cell on public.game_moves(game_id, cell_index) where accepted;
grant select on public.game_moves to authenticated;
grant all on public.game_moves to service_role;
alter table public.game_moves enable row level security;
create policy "moves participant read" on public.game_moves for select to authenticated
  using (player_id = auth.uid() or public.has_staff_role());

create table public.player_ratings(
  user_id uuid not null references auth.users on delete cascade,
  sport_id uuid not null references public.sports on delete cascade,
  season text not null default 'S1',
  rating int not null default 1500 check (rating between 100 and 5000),
  played int not null default 0,
  best_score smallint not null default 0,
  streak int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, sport_id, season)
);
grant select on public.player_ratings to anon, authenticated;
grant all on public.player_ratings to service_role;
alter table public.player_ratings enable row level security;
create policy "ratings public read" on public.player_ratings for select using (true);

create table public.answer_reports(
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users on delete set null,
  grid_id uuid references public.grids on delete cascade,
  cell_index smallint,
  guess text,
  reason text not null,
  status text not null default 'open' check (status in ('open','accepted','rejected')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.answer_reports to authenticated;
grant all on public.answer_reports to service_role;
alter table public.answer_reports enable row level security;
create policy "reports create" on public.answer_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports read" on public.answer_reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_staff_role());
create policy "reports staff update" on public.answer_reports for update to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.entitlements(
  user_id uuid not null references auth.users on delete cascade,
  key entitlement_key not null,
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  primary key (user_id, key)
);
grant select on public.entitlements to authenticated;
grant all on public.entitlements to service_role;
alter table public.entitlements enable row level security;
create policy "own entitlements" on public.entitlements for select to authenticated
  using (user_id = auth.uid() or public.has_staff_role());

-- Answer validation, entirely server-side
create or replace function public.fz_check_answer(p_grid uuid, p_cell smallint, p_guess text)
returns table(accepted boolean, athlete_id uuid, athlete_name text)
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if p_guess is null or char_length(btrim(p_guess)) < 2 then
    return query select false, null::uuid, null::text; return;
  end if;
  select a.id, a.name into v_id, v_name
  from public.grid_answers ga
  join public.athletes a on a.id = ga.athlete_id
  where ga.grid_id = p_grid
    and ga.cell_index = p_cell
    and (
      public.fz_norm(a.name) = public.fz_norm(p_guess)
      or exists (select 1 from unnest(a.aliases) al where public.fz_norm(al) = public.fz_norm(p_guess))
    )
  limit 1;
  if v_id is null then
    return query select false, null::uuid, null::text;
  else
    return query select true, v_id, v_name;
  end if;
end $$;
revoke all on function public.fz_check_answer(uuid, smallint, text) from public;
grant execute on function public.fz_check_answer(uuid, smallint, text) to anon, authenticated;

-- Signed-in play: validates, persists the move and keeps score
create or replace function public.fz_play_move(p_grid uuid, p_cell smallint, p_guess text, p_room uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_game uuid; v_res record; v_score smallint; v_sport uuid; v_mode text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_cell < 0 or p_cell > 8 then raise exception 'invalid cell'; end if;
  v_mode := case when p_room is null then 'daily' else 'room' end;

  select id, score into v_game, v_score from public.games
   where grid_id = p_grid and player_one = v_user and mode = v_mode
     and (p_room is null or room_id = p_room)
   limit 1;
  if v_game is null then
    insert into public.games(grid_id, room_id, mode, player_one)
    values (p_grid, p_room, v_mode, v_user) returning id, score into v_game, v_score;
  end if;

  if exists (select 1 from public.game_moves where game_id = v_game and cell_index = p_cell and accepted) then
    raise exception 'cell already claimed';
  end if;

  select * into v_res from public.fz_check_answer(p_grid, p_cell, p_guess);
  insert into public.game_moves(game_id, player_id, cell_index, guess, athlete_id, accepted)
  values (v_game, v_user, p_cell, btrim(p_guess), v_res.athlete_id, v_res.accepted);

  if v_res.accepted then
    update public.games set score = score + 1 where id = v_game returning score into v_score;
  end if;

  if v_score >= 9 or (select count(*) from public.game_moves where game_id = v_game) >= 9 then
    update public.games set status = 'completed', completed_at = coalesce(completed_at, now()) where id = v_game;
    select sport_id into v_sport from public.grids where id = p_grid;
    insert into public.player_ratings(user_id, sport_id, played, best_score, rating, streak)
    values (v_user, v_sport, 1, v_score, 1500 + v_score * 20, 1)
    on conflict (user_id, sport_id, season) do update
      set played = public.player_ratings.played + 1,
          best_score = greatest(public.player_ratings.best_score, v_score),
          rating = public.player_ratings.rating + (v_score - 5) * 8,
          streak = public.player_ratings.streak + 1,
          updated_at = now();
  end if;

  return jsonb_build_object(
    'accepted', v_res.accepted,
    'athlete_name', v_res.athlete_name,
    'score', v_score,
    'game_id', v_game
  );
end $$;
revoke all on function public.fz_play_move(uuid, smallint, text, uuid) from public, anon;
grant execute on function public.fz_play_move(uuid, smallint, text, uuid) to authenticated;

-- Post-game reveal: sample of valid answers per cell
create or replace function public.fz_reveal(p_grid uuid)
returns table(cell_index smallint, answers text[])
language sql stable security definer set search_path = public as $$
  select ga.cell_index, (array_agg(a.name order by a.name))[1:6]
  from public.grid_answers ga
  join public.athletes a on a.id = ga.athlete_id
  join public.grids g on g.id = ga.grid_id
  where ga.grid_id = p_grid and g.published_at is not null
  group by ga.cell_index
$$;
revoke all on function public.fz_reveal(uuid) from public;
grant execute on function public.fz_reveal(uuid) to anon, authenticated;

-- Room codes
create or replace function public.fz_create_room(p_grid uuid, p_visibility match_visibility default 'private')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_code text; v_id uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  loop
    v_code := 'FZ-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;
  insert into public.rooms(code, host_id, grid_id, visibility)
  values (v_code, v_user, p_grid, p_visibility) returning id into v_id;
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;
revoke all on function public.fz_create_room(uuid, match_visibility) from public, anon;
grant execute on function public.fz_create_room(uuid, match_visibility) to authenticated;