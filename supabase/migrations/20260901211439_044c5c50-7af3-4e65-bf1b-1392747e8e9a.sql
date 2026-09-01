-- v0.7: endless quiz pipeline
create table public.provider_records(
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources,
  provider_kind text not null,
  provider_record_id text not null,
  sport_id uuid references public.sports,
  competition_id uuid references public.competitions,
  payload jsonb not null,
  payload_hash text not null,
  observed_at timestamptz not null default now(),
  imported_at timestamptz,
  import_error text,
  unique(source_id, provider_kind, provider_record_id)
);
grant select, insert, update, delete on public.provider_records to authenticated;
grant all on public.provider_records to service_role;
alter table public.provider_records enable row level security;
create policy "staff provider records" on public.provider_records for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.ingestion_cursors(
  source_id uuid not null references public.data_sources,
  stream text not null,
  cursor_value text,
  checkpoint jsonb not null default '{}',
  last_success_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(source_id, stream)
);
grant select, insert, update, delete on public.ingestion_cursors to authenticated;
grant all on public.ingestion_cursors to service_role;
alter table public.ingestion_cursors enable row level security;
create policy "staff cursors" on public.ingestion_cursors for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.data_coverage(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports,
  competition_id uuid references public.competitions,
  season_from smallint,
  season_to smallint,
  athletes int not null default 0,
  facts int not null default 0,
  verified_facts int not null default 0,
  status text not null default 'empty' check (status in ('empty','partial','ready','stale')),
  refreshed_at timestamptz
);
create unique index data_coverage_scope on public.data_coverage(sport_id, coalesce(competition_id, '00000000-0000-0000-0000-000000000000'::uuid));
grant select on public.data_coverage to anon, authenticated;
grant insert, update, delete on public.data_coverage to authenticated;
grant all on public.data_coverage to service_role;
alter table public.data_coverage enable row level security;
create policy "coverage read" on public.data_coverage for select using (true);
create policy "staff coverage" on public.data_coverage for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.athlete_criteria(
  athlete_id uuid not null references public.athletes on delete cascade,
  criterion_id uuid not null references public.criteria on delete cascade,
  competition_id uuid references public.competitions on delete cascade,
  valid_from date,
  valid_to date,
  source_id uuid not null references public.data_sources,
  evidence_url text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','disputed','rejected')),
  verified_at timestamptz,
  primary key(athlete_id, criterion_id, source_id)
);
create index athlete_criteria_generator on public.athlete_criteria(criterion_id, competition_id, athlete_id) where verification_status = 'verified';
grant select on public.athlete_criteria to anon, authenticated;
grant insert, update, delete on public.athlete_criteria to authenticated;
grant all on public.athlete_criteria to service_role;
alter table public.athlete_criteria enable row level security;
create policy "verified facts read" on public.athlete_criteria for select
  using (verification_status = 'verified' or public.has_staff_role());
create policy "staff facts" on public.athlete_criteria for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.quiz_generation_jobs(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports,
  competition_id uuid references public.competitions,
  era_from smallint,
  era_to smallint,
  min_answers_per_cell smallint not null default 2,
  requested_count int not null default 1,
  generated_count int not null default 0,
  status text not null default 'queued' check (status in ('queued','running','complete','failed')),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select, insert, update, delete on public.quiz_generation_jobs to authenticated;
grant all on public.quiz_generation_jobs to service_role;
alter table public.quiz_generation_jobs enable row level security;
create policy "staff generation jobs" on public.quiz_generation_jobs for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.grid_exposures(
  profile_id uuid not null references public.profiles on delete cascade,
  grid_id uuid not null references public.grids on delete cascade,
  shown_at timestamptz not null default now(),
  completed_at timestamptz,
  score int,
  primary key(profile_id, grid_id)
);
grant select, insert, update, delete on public.grid_exposures to authenticated;
grant all on public.grid_exposures to service_role;
alter table public.grid_exposures enable row level security;
create policy "own exposures" on public.grid_exposures for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

alter table public.grids add column if not exists generation_fingerprint text;
alter table public.grids add column if not exists generated boolean not null default false;
alter table public.grids add column if not exists answer_count int not null default 0;
create unique index grids_generation_fingerprint on public.grids(generation_fingerprint) where generation_fingerprint is not null;

-- Difficulty scoring
create table public.scoring_rules(
  id uuid primary key default gen_random_uuid(),
  mode_slug text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  base_points int not null,
  multiplier numeric(4,2) not null,
  rarity_bonus_max int not null default 0,
  speed_bonus_max int not null default 0,
  active boolean not null default true,
  unique(mode_slug, difficulty)
);
grant select on public.scoring_rules to anon, authenticated;
grant insert, update, delete on public.scoring_rules to authenticated;
grant all on public.scoring_rules to service_role;
alter table public.scoring_rules enable row level security;
create policy "scoring rules read" on public.scoring_rules for select using (active or public.has_staff_role());
create policy "staff scoring rules" on public.scoring_rules for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());
insert into public.scoring_rules(mode_slug, difficulty, base_points, multiplier, rarity_bonus_max, speed_bonus_max) values
  ('grid-battle',1,100,1,50,25),('grid-battle',2,100,2,100,50),('grid-battle',3,100,3,150,75),('grid-battle',4,100,5,250,100),('grid-battle',5,100,5,250,100),
  ('daily-9',1,100,1,50,0),('daily-9',2,100,2,100,0),('daily-9',3,100,3,150,0),('daily-9',4,100,5,250,0),('daily-9',5,100,5,250,0)
on conflict (mode_slug, difficulty) do nothing;

alter table public.game_moves add column if not exists difficulty_points int not null default 0;
alter table public.game_moves add column if not exists rarity_bonus int not null default 0;
alter table public.game_moves add column if not exists speed_bonus int not null default 0;
alter table public.game_moves add column if not exists total_points int generated always as (difficulty_points + rarity_bonus + speed_bonus) stored;
alter table public.games add column if not exists points int not null default 0;
alter table public.games drop constraint if exists games_mode_check;
alter table public.games add constraint games_mode_check check (mode in ('daily','solo','room','endless','pass','cpu'));

-- Global competition catalogue + honours
alter table public.competitions add column if not exists predecessor_id uuid references public.competitions;
alter table public.competitions add column if not exists lineage_key text;

create table public.honours(
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports,
  slug text not null,
  name text not null,
  honour_type text not null check (honour_type in ('award','team_event','major','international_tournament','olympic')),
  valid_from date,
  valid_to date,
  governing_body text,
  metadata jsonb not null default '{}',
  unique(sport_id, slug)
);
grant select on public.honours to anon, authenticated;
grant insert, update, delete on public.honours to authenticated;
grant all on public.honours to service_role;
alter table public.honours enable row level security;
create policy "honours read" on public.honours for select using (true);
create policy "staff honours" on public.honours for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.athlete_honours(
  athlete_id uuid not null references public.athletes on delete cascade,
  honour_id uuid not null references public.honours on delete cascade,
  year int not null,
  team_name text,
  result text not null default 'winner',
  source_id uuid references public.data_sources,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','disputed','rejected')),
  primary key(athlete_id, honour_id, year, result)
);
create index athlete_honours_verified on public.athlete_honours(honour_id, year, athlete_id) where verification_status = 'verified';
grant select on public.athlete_honours to anon, authenticated;
grant insert, update, delete on public.athlete_honours to authenticated;
grant all on public.athlete_honours to service_role;
alter table public.athlete_honours enable row level security;
create policy "verified athlete honours" on public.athlete_honours for select
  using (verification_status = 'verified' or public.has_staff_role());
create policy "staff athlete honours" on public.athlete_honours for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

do $$
declare f uuid; g uuid; t uuid; fairs uuid; uefa uuid;
begin
  select id into f from public.sports where slug = 'football';
  select id into g from public.sports where slug = 'golf';
  select id into t from public.sports where slug = 'tennis';

  -- lineage keys on existing rows
  update public.competitions set lineage_key = slug where sport_id = f and slug in ('epl','ucl','laliga','bundesliga','seriea','ligue1','worldcup');
  update public.competitions set lineage_key = 'uefa-secondary' where sport_id = f and slug = 'uel';
  update public.competitions set lineage_key = 'golf-major' where sport_id = g and slug in ('masters','open');
  update public.competitions set lineage_key = 'ryder-cup' where sport_id = g and slug = 'rydercup';
  update public.competitions set lineage_key = 'tennis-major' where sport_id = t and slug in ('wimbledon','australianopen','rolandgarros','usopen-tennis');

  insert into public.competitions(sport_id, slug, name, short_name, region, competition_type, country_code, gender, governing_body, valid_from, valid_to, lineage_key, sort_order) values
    (f,'fairs-cup','Inter-Cities Fairs Cup','FAIRS CUP','Europe','cup',null,'men','Fairs Cup Committee','1955-01-01','1971-06-30','uefa-secondary',30),
    (f,'uefa-cup','UEFA Cup','UEFA CUP','Europe','cup',null,'men','UEFA','1971-01-01','2009-06-30','uefa-secondary',31),
    (f,'cup-winners-cup','European Cup Winners'' Cup','CWC','Europe','cup',null,'men','UEFA','1960-01-01','1999-06-30','cup-winners-cup',32),
    (f,'uefa-euros','UEFA European Championship','EUROS','Europe','cup',null,'men','UEFA','1960-01-01',null,'uefa-euros',33),
    (f,'womens-world-cup','FIFA Women''s World Cup','WWC','World','cup',null,'women','FIFA','1991-01-01',null,'womens-world-cup',34),
    (f,'womens-euros','UEFA Women''s Championship','WEURO','Europe','cup',null,'women','UEFA','1984-01-01',null,'womens-euros',35),
    (g,'pga-championship','PGA Championship','PGA CHAMP','USA','event','US','men','PGA of America','1916-01-01',null,'golf-major',6),
    (g,'us-open-golf','U.S. Open','US OPEN','USA','event','US','men','USGA','1895-01-01',null,'golf-major',7)
  on conflict (sport_id, slug) do update set lineage_key = excluded.lineage_key;

  select id into fairs from public.competitions where sport_id = f and slug = 'fairs-cup';
  select id into uefa from public.competitions where sport_id = f and slug = 'uefa-cup';
  update public.competitions set predecessor_id = fairs where id = uefa;
  update public.competitions set predecessor_id = uefa where sport_id = f and slug = 'uel';

  insert into public.honours(sport_id, slug, name, honour_type, valid_from, governing_body) values
    (f,'ballon-dor','Ballon d''Or','award','1956-01-01','France Football'),
    (f,'fifa-world-cup-winner','FIFA World Cup winner','international_tournament','1930-01-01','FIFA'),
    (f,'uefa-euros-winner','UEFA European Championship winner','international_tournament','1960-01-01','UEFA'),
    (g,'ryder-cup-player','Ryder Cup player','team_event','1927-01-01','Ryder Cup Europe/PGA of America'),
    (g,'mens-major-winner','Men''s major winner','major','1860-01-01',null),
    (t,'singles-major-winner','Grand Slam singles champion','major','1877-01-01',null)
  on conflict (sport_id, slug) do nothing;
end $$;

-- Backfill verified facts from every existing verified grid answer so endless generation has data
insert into public.athlete_criteria(athlete_id, criterion_id, competition_id, source_id, verification_status, verified_at)
select distinct ga.athlete_id, c.criterion_id, g.competition_ids[1], s.id, 'verified', now()
from public.grid_answers ga
join public.grids g on g.id = ga.grid_id
cross join lateral (values (g.row_criteria[(ga.cell_index / 3) + 1]), (g.column_criteria[(ga.cell_index % 3) + 1])) as c(criterion_id)
cross join (select id from public.data_sources where source_type = 'editorial_review' order by name limit 1) s
where ga.verification_status = 'verified'
on conflict do nothing;

update public.grids g set answer_count = (select count(*) from public.grid_answers ga where ga.grid_id = g.id);

-- Endless generator: fresh non-repeating grid, every cell has >= p_min_answers verified answers
create or replace function public.generate_endless_grid(
  p_sport_id uuid,
  p_competition_id uuid default null,
  p_difficulty int default 2,
  p_era_from int default 1900,
  p_era_to int default 2100
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  r uuid[]; c uuid[]; gid uuid; fp text; tries int := 0; total_answers int;
  v_min int := case least(greatest(p_difficulty,1),5) when 1 then 4 when 2 then 3 when 3 then 2 else 1 end;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  loop
    tries := tries + 1;
    select array_agg(id) into r from (
      select cr.id from criteria cr
      where cr.sport_id = p_sport_id and cr.enabled
        and exists (select 1 from athlete_criteria ac where ac.criterion_id = cr.id and ac.verification_status = 'verified'
          and (p_competition_id is null or ac.competition_id = p_competition_id)
          and extract(year from coalesce(ac.valid_to, current_date)) >= p_era_from
          and extract(year from coalesce(ac.valid_from, date '1900-01-01')) <= p_era_to)
      order by random() limit 3) q;
    select array_agg(id) into c from (
      select cr.id from criteria cr
      where cr.sport_id = p_sport_id and cr.enabled and not (cr.id = any(coalesce(r, '{}')))
        and exists (select 1 from athlete_criteria ac where ac.criterion_id = cr.id and ac.verification_status = 'verified'
          and (p_competition_id is null or ac.competition_id = p_competition_id))
      order by random() limit 3) q;
    if cardinality(r) = 3 and cardinality(c) = 3 and not exists (
      select 1 from unnest(r) with ordinality rr(id, i) cross join unnest(c) with ordinality cc(id, j)
      where (select count(distinct a.athlete_id) from athlete_criteria a
             join athlete_criteria b on b.athlete_id = a.athlete_id
             where a.criterion_id = rr.id and b.criterion_id = cc.id
               and a.verification_status = 'verified' and b.verification_status = 'verified'
               and (p_competition_id is null or (a.competition_id = p_competition_id and b.competition_id = p_competition_id))) < v_min)
    then
      fp := md5(p_sport_id::text || coalesce(p_competition_id::text, 'all') || array_to_string(r, ',') || array_to_string(c, ','));
      -- prefer a grid this player has not seen yet; give up on novelty after 25 tries
      exit when tries >= 25 or not exists (select 1 from grid_exposures ge join grids gg on gg.id = ge.grid_id where ge.profile_id = v_user and gg.generation_fingerprint = fp);
    end if;
    if tries >= 60 then raise exception 'Not enough verified data for this scope yet'; end if;
  end loop;

  select id into gid from grids where generation_fingerprint = fp;
  if gid is null then
    insert into grids(sport_id, row_criteria, column_criteria, difficulty, validated_at, published_at, competition_ids, generation_fingerprint, generated, created_by)
    values (p_sport_id, r, c, least(greatest(p_difficulty,1),5), now(), now(),
            case when p_competition_id is null then '{}'::uuid[] else array[p_competition_id] end, fp, true, v_user)
    returning id into gid;
    insert into grid_answers(grid_id, cell_index, athlete_id, rarity_score, verification_status, evidence_count, verified_at)
    select distinct gid, ((rr.i - 1) * 3 + (cc.j - 1))::smallint, a.athlete_id, null, 'verified', 2, now()
    from unnest(r) with ordinality rr(id, i) cross join unnest(c) with ordinality cc(id, j)
    join athlete_criteria a on a.criterion_id = rr.id and a.verification_status = 'verified'
    join athlete_criteria b on b.athlete_id = a.athlete_id and b.criterion_id = cc.id and b.verification_status = 'verified'
    where p_competition_id is null or (a.competition_id = p_competition_id and b.competition_id = p_competition_id)
    on conflict do nothing;
    select count(*) into total_answers from grid_answers where grid_id = gid;
    update grids set answer_count = total_answers where id = gid;
  end if;
  insert into grid_exposures(profile_id, grid_id) values (v_user, gid)
    on conflict (profile_id, grid_id) do update set shown_at = now();
  return gid;
end $$;
revoke all on function public.generate_endless_grid(uuid, uuid, int, int, int) from public, anon;
grant execute on function public.generate_endless_grid(uuid, uuid, int, int, int) to authenticated;

-- Move RPC: mode-aware with difficulty scoring
drop function if exists public.fz_play_move(uuid, smallint, text, uuid);
create or replace function public.fz_play_move(p_grid uuid, p_cell smallint, p_guess text, p_room uuid default null, p_mode text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_game uuid; v_res record; v_score smallint; v_sport uuid; v_mode text;
  v_diff smallint; v_rule record; v_pts int := 0; v_rarity int := 0; v_points int := 0; v_rarity_score numeric;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_cell < 0 or p_cell > 8 then raise exception 'invalid cell'; end if;
  v_mode := case when p_room is not null then 'room' when p_mode in ('daily','endless','solo') then p_mode else 'daily' end;

  select id, score, points into v_game, v_score, v_points from public.games
   where grid_id = p_grid and player_one = v_user and mode = v_mode
     and (p_room is null or room_id = p_room)
   limit 1;
  if v_game is null then
    insert into public.games(grid_id, room_id, mode, player_one)
    values (p_grid, p_room, v_mode, v_user) returning id, score, points into v_game, v_score, v_points;
  end if;

  if exists (select 1 from public.game_moves where game_id = v_game and cell_index = p_cell and accepted) then
    raise exception 'cell already claimed';
  end if;

  select * into v_res from public.fz_check_answer(p_grid, p_cell, p_guess);
  select difficulty, sport_id into v_diff, v_sport from public.grids where id = p_grid;
  select * into v_rule from public.scoring_rules
    where mode_slug = case when v_mode = 'room' then 'grid-battle' else 'daily-9' end and difficulty = coalesce(v_diff, 3) and active limit 1;

  if v_res.accepted then
    v_pts := coalesce(round(v_rule.base_points * v_rule.multiplier)::int, 100);
    select rarity_score into v_rarity_score from public.grid_answers where grid_id = p_grid and cell_index = p_cell and athlete_id = v_res.athlete_id;
    v_rarity := coalesce(round(coalesce(v_rule.rarity_bonus_max, 0) * least(greatest(coalesce(v_rarity_score, 0), 0), 100) / 100.0)::int, 0);
  end if;

  insert into public.game_moves(game_id, player_id, cell_index, guess, athlete_id, accepted, difficulty_points, rarity_bonus)
  values (v_game, v_user, p_cell, btrim(p_guess), v_res.athlete_id, v_res.accepted, v_pts, v_rarity);

  if v_res.accepted then
    update public.games set score = score + 1, points = points + v_pts + v_rarity where id = v_game returning score, points into v_score, v_points;
  end if;

  if v_score >= 9 or (select count(*) from public.game_moves where game_id = v_game) >= 9 then
    update public.games set status = 'completed', completed_at = coalesce(completed_at, now()) where id = v_game;
    update public.grid_exposures set completed_at = now(), score = v_points where profile_id = v_user and grid_id = p_grid;
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
    'points', v_points,
    'move_points', v_pts + v_rarity,
    'game_id', v_game
  );
end $$;
revoke all on function public.fz_play_move(uuid, smallint, text, uuid, text) from public, anon;
grant execute on function public.fz_play_move(uuid, smallint, text, uuid, text) to authenticated;