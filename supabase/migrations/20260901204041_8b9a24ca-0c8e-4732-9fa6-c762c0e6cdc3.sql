create extension if not exists pg_trgm with schema extensions;

-- Verification metadata
alter table public.athletes
  add column if not exists normalized_name text,
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','disputed','retired')),
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.grid_answers
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','disputed','rejected')),
  add column if not exists evidence_count smallint not null default 0,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.grids add column if not exists validated_at timestamptz;

-- Existing seed content was editorially reviewed: treat as verified
update public.athletes set verification_status = 'verified', verified_at = now() where verification_status = 'pending';
update public.grid_answers set verification_status = 'verified', evidence_count = 1, verified_at = now() where verification_status = 'pending';

-- Aliases
create table public.athlete_aliases (
  id bigint generated always as identity primary key,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  locale text,
  alias_type text not null default 'spelling'
    check (alias_type in ('spelling','nickname','former_name','transliteration')),
  unique (athlete_id, normalized_alias)
);
grant select on public.athlete_aliases to anon, authenticated;
grant insert, update, delete on public.athlete_aliases to authenticated;
grant all on public.athlete_aliases to service_role;
alter table public.athlete_aliases enable row level security;
create policy "aliases read" on public.athlete_aliases for select using (true);
create policy "aliases staff write" on public.athlete_aliases for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

-- Provenance
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text,
  source_type text not null check (source_type in ('official_league','official_team','official_federation','licensed_provider','editorial_review')),
  licence_notes text,
  active boolean not null default true
);
grant select on public.data_sources to anon, authenticated;
grant insert, update, delete on public.data_sources to authenticated;
grant all on public.data_sources to service_role;
alter table public.data_sources enable row level security;
create policy "sources read" on public.data_sources for select using (active or public.has_staff_role());
create policy "sources staff write" on public.data_sources for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.athlete_evidence (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  claim_type text not null,
  claim_key text not null,
  source_id uuid not null references public.data_sources(id),
  source_url text,
  source_record_id text,
  evidence jsonb not null default '{}',
  observed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  unique (athlete_id, claim_type, claim_key, source_id)
);
grant select, insert, update, delete on public.athlete_evidence to authenticated;
grant all on public.athlete_evidence to service_role;
alter table public.athlete_evidence enable row level security;
create policy "evidence staff" on public.athlete_evidence for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

create table public.answer_import_jobs (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references public.sports(id),
  competition_id uuid references public.competitions(id),
  source_id uuid references public.data_sources(id),
  status text not null default 'queued',
  records_seen int not null default 0,
  records_accepted int not null default 0,
  records_rejected int not null default 0,
  error_summary jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.answer_import_jobs to authenticated;
grant all on public.answer_import_jobs to service_role;
alter table public.answer_import_jobs enable row level security;
create policy "import jobs staff" on public.answer_import_jobs for all to authenticated
  using (public.has_staff_role()) with check (public.has_staff_role());

-- Normalised name maintenance (reuses fz_norm: unaccent + lowercase + strip punctuation)
create or replace function public.set_athlete_normalized()
returns trigger language plpgsql set search_path = public as $$
begin
  new.normalized_name := public.fz_norm(new.name);
  return new;
end $$;
create trigger athlete_normalized before insert or update of name on public.athletes
  for each row execute function public.set_athlete_normalized();
update public.athletes set normalized_name = public.fz_norm(name) where normalized_name is null;

create or replace function public.set_alias_normalized()
returns trigger language plpgsql set search_path = public as $$
begin
  new.normalized_alias := public.fz_norm(new.alias);
  return new;
end $$;
create trigger alias_normalized before insert or update of alias on public.athlete_aliases
  for each row execute function public.set_alias_normalized();

-- Backfill alias table from the legacy aliases[] column
insert into public.athlete_aliases (athlete_id, alias, normalized_alias, alias_type)
select a.id, al, public.fz_norm(al), 'spelling'
from public.athletes a, unnest(a.aliases) al
where char_length(public.fz_norm(al)) > 0
on conflict do nothing;

create index athlete_name_trgm on public.athletes using gin (normalized_name extensions.gin_trgm_ops);
create index athlete_alias_trgm on public.athlete_aliases using gin (normalized_alias extensions.gin_trgm_ops);
create index verified_grid_answers on public.grid_answers (grid_id, cell_index) where verification_status = 'verified';

-- Fuzzy athlete search: verified athletes only, returns ids not just strings
create or replace function public.search_athletes(p_query text, p_sport_id uuid default null, p_limit int default 8)
returns table(id uuid, name text, aliases text[], country_code text, verified boolean, score real)
language sql stable security definer set search_path = public, extensions as $$
  with q as (select public.fz_norm(p_query) n),
  matches as (
    select a.id, a.name, a.country_code, true as verified,
      greatest(
        similarity(a.normalized_name, q.n),
        coalesce(max(similarity(aa.normalized_alias, q.n)), 0),
        case when a.normalized_name like q.n || '%' then 1 else 0 end,
        case when bool_or(aa.normalized_alias like q.n || '%') then 0.95 else 0 end
      )::real as score
    from public.athletes a
    cross join q
    left join public.athlete_aliases aa on aa.athlete_id = a.id
    where (p_sport_id is null or a.sport_id = p_sport_id)
      and a.active
      and a.verification_status = 'verified'
      and char_length(q.n) >= 2
      and (a.normalized_name % q.n or a.normalized_name like q.n || '%'
           or aa.normalized_alias % q.n or aa.normalized_alias like q.n || '%')
    group by a.id, a.name, a.country_code, q.n
  )
  select m.id, m.name,
    array(select aa.alias from public.athlete_aliases aa where aa.athlete_id = m.id order by aa.alias limit 5),
    m.country_code::text, m.verified, m.score
  from matches m
  order by m.score desc, m.name
  limit least(greatest(p_limit, 1), 20)
$$;
revoke all on function public.search_athletes(text, uuid, int) from public;
grant execute on function public.search_athletes(text, uuid, int) to anon, authenticated;

-- Answer checks only accept verified data
create or replace function public.fz_check_answer(p_grid uuid, p_cell smallint, p_guess text)
returns table(accepted boolean, athlete_id uuid, athlete_name text)
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_name text; v_norm text;
begin
  if p_guess is null or char_length(btrim(p_guess)) < 2 then
    return query select false, null::uuid, null::text; return;
  end if;
  v_norm := public.fz_norm(p_guess);
  select a.id, a.name into v_id, v_name
  from public.grid_answers ga
  join public.athletes a on a.id = ga.athlete_id
  where ga.grid_id = p_grid
    and ga.cell_index = p_cell
    and ga.verification_status = 'verified'
    and a.verification_status = 'verified'
    and (
      a.normalized_name = v_norm
      or exists (select 1 from unnest(a.aliases) al where public.fz_norm(al) = v_norm)
      or exists (select 1 from public.athlete_aliases aa where aa.athlete_id = a.id and aa.normalized_alias = v_norm)
    )
  limit 1;
  if v_id is null then
    return query select false, null::uuid, null::text;
  else
    return query select true, v_id, v_name;
  end if;
end $$;

create or replace function public.fz_reveal(p_grid uuid)
returns table(cell_index smallint, answers text[])
language sql stable security definer set search_path = public as $$
  select ga.cell_index, (array_agg(a.name order by a.name))[1:6]
  from public.grid_answers ga
  join public.athletes a on a.id = ga.athlete_id
  join public.grids g on g.id = ga.grid_id
  where ga.grid_id = p_grid and g.published_at is not null
    and ga.verification_status = 'verified' and a.verification_status = 'verified'
  group by ga.cell_index
$$;

-- Publish guard
create or replace function public.guard_grid_publish()
returns trigger language plpgsql set search_path = public as $$
declare missing int;
begin
  if new.published_at is not null and old.published_at is null then
    select count(*) into missing from generate_series(0, 8) c
    where not exists (
      select 1 from public.grid_answers ga
      join public.athletes a on a.id = ga.athlete_id
      where ga.grid_id = new.id and ga.cell_index = c
        and ga.verification_status = 'verified' and a.verification_status = 'verified'
    );
    if missing > 0 then
      raise exception 'Grid has % cell(s) without a verified answer', missing;
    end if;
    if cardinality(coalesce(new.competition_ids, '{}')) = 0 then
      raise exception 'Published grids must be tagged to at least one competition';
    end if;
  end if;
  return new;
end $$;
create trigger grid_publish_guard before update of published_at on public.grids
  for each row execute function public.guard_grid_publish();

-- Quality summary (runs as the caller, so staff-only grid_answers RLS still applies)
create or replace view public.grid_quality with (security_invoker = true) as
select g.id, g.sport_id, g.competition_ids, g.scheduled_for, g.published_at,
  count(distinct ga.cell_index) filter (where ga.verification_status = 'verified' and a.verification_status = 'verified') as verified_cells,
  count(*) filter (where ga.verification_status = 'verified') as verified_answers,
  count(*) filter (where ga.verification_status <> 'verified') as unverified_answers
from public.grids g
left join public.grid_answers ga on ga.grid_id = g.id
left join public.athletes a on a.id = ga.athlete_id
group by g.id;
grant select on public.grid_quality to authenticated;

-- Sources
insert into public.data_sources (name, base_url, source_type, licence_notes) values
  ('Premier League official', 'https://www.premierleague.com', 'official_league', 'Verify appearances, clubs and competition records before publication'),
  ('UEFA official', 'https://www.uefa.com', 'official_federation', 'Verify UEFA competition participation and honours'),
  ('Fanzeno editorial review', null, 'editorial_review', 'Second-person review required; never sufficient as the only evidence source');

-- Verified EPL grid
do $$
declare sp uuid; comp uuid; g uuid;
  c_ars uuid; c_che uuid; c_fra uuid; c_bar uuid; c_ucl uuid; c_100 uuid;
  hen uuid; ces uuid; kan uuid; ped uuid;
  function_unused int;
begin
  select id into sp from public.sports where slug = 'football';
  select id into comp from public.competitions where sport_id = sp and slug = 'epl';
  if sp is null then raise exception 'Football catalogue missing'; end if;
  if comp is null then
    insert into public.competitions (sport_id, slug, name, short_name, region, competition_type)
    values (sp, 'epl', 'Premier League', 'EPL', 'England', 'league') returning id into comp;
  end if;

  -- athletes: reuse existing rows by name, create when missing
  select id into hen from public.athletes where sport_id = sp and normalized_name = public.fz_norm('Thierry Henry');
  if hen is null then
    insert into public.athletes (sport_id, name, aliases, country_code, active, verification_status, verified_at)
    values (sp, 'Thierry Henry', array['Henry'], 'FR', true, 'verified', now()) returning id into hen;
  end if;
  select id into ces from public.athletes where sport_id = sp and normalized_name = public.fz_norm('Cesc Fàbregas');
  if ces is null then
    insert into public.athletes (sport_id, name, aliases, country_code, active, verification_status, verified_at)
    values (sp, 'Cesc Fàbregas', array['Cesc Fabregas','Fabregas'], 'ES', true, 'verified', now()) returning id into ces;
  end if;
  select id into kan from public.athletes where sport_id = sp and normalized_name = public.fz_norm('N''Golo Kanté');
  if kan is null then
    insert into public.athletes (sport_id, name, aliases, country_code, active, verification_status, verified_at)
    values (sp, 'N''Golo Kanté', array['N Golo Kante','Kante'], 'FR', true, 'verified', now()) returning id into kan;
  end if;
  select id into ped from public.athletes where sport_id = sp and normalized_name = public.fz_norm('Pedro Rodríguez');
  if ped is null then
    insert into public.athletes (sport_id, name, aliases, country_code, active, verification_status, verified_at)
    values (sp, 'Pedro Rodríguez', array['Pedro','Pedro Rodriguez'], 'ES', true, 'verified', now()) returning id into ped;
  end if;
  update public.athletes set verification_status = 'verified', verified_at = coalesce(verified_at, now()) where id in (hen, ces, kan, ped);

  insert into public.athlete_aliases (athlete_id, alias, normalized_alias, alias_type) values
    (hen, 'Henry', 'henry', 'nickname'), (hen, 'Titi', 'titi', 'nickname'),
    (ces, 'Cesc Fabregas', 'cescfabregas', 'spelling'), (ces, 'Fabregas', 'fabregas', 'spelling'), (ces, 'Cesc', 'cesc', 'nickname'),
    (kan, 'N Golo Kante', 'ngolokante', 'spelling'), (kan, 'Kante', 'kante', 'spelling'), (kan, 'Ngolo Kante', 'ngolokante', 'spelling'),
    (ped, 'Pedro', 'pedro', 'nickname'), (ped, 'Pedro Rodriguez', 'pedrorodriguez', 'spelling')
  on conflict do nothing;

  -- criteria: reuse by label
  select id into c_ars from public.criteria where sport_id = sp and label = 'Played for Arsenal';
  if c_ars is null then insert into public.criteria (sport_id, label, criteria_type) values (sp, 'Played for Arsenal', 'team') returning id into c_ars; end if;
  select id into c_che from public.criteria where sport_id = sp and label = 'Played for Chelsea';
  if c_che is null then insert into public.criteria (sport_id, label, criteria_type) values (sp, 'Played for Chelsea', 'team') returning id into c_che; end if;
  select id into c_fra from public.criteria where sport_id = sp and label = 'Represented France';
  if c_fra is null then insert into public.criteria (sport_id, label, criteria_type) values (sp, 'Represented France', 'country') returning id into c_fra; end if;
  select id into c_bar from public.criteria where sport_id = sp and label = 'Played for Barcelona';
  if c_bar is null then insert into public.criteria (sport_id, label, criteria_type) values (sp, 'Played for Barcelona', 'team') returning id into c_bar; end if;
  select id into c_ucl from public.criteria where sport_id = sp and label = 'Won the Champions League';
  if c_ucl is null then insert into public.criteria (sport_id, label, criteria_type) values (sp, 'Won the Champions League', 'trophy') returning id into c_ucl; end if;
  select id into c_100 from public.criteria where sport_id = sp and label = '100+ Premier League appearances';
  if c_100 is null then insert into public.criteria (sport_id, label, criteria_type) values (sp, '100+ Premier League appearances', 'stat') returning id into c_100; end if;

  insert into public.grids (sport_id, row_criteria, column_criteria, difficulty, competition_ids, era_start, era_end, validated_at, scheduled_for)
  values (sp, array[c_ars, c_che, c_fra], array[c_bar, c_ucl, c_100], 3, array[comp], 1992, 2026, now(),
    (select coalesce(max(scheduled_for), current_date - 1) + 1 from public.grids where sport_id = sp))
  returning id into g;

  insert into public.grid_answers (grid_id, cell_index, athlete_id, rarity_score, verification_status, evidence_count, verified_at) values
    (g,0,hen,18,'verified',2,now()),(g,0,ces,27,'verified',2,now()),
    (g,1,hen,21,'verified',2,now()),
    (g,2,hen,12,'verified',2,now()),(g,2,ces,25,'verified',2,now()),
    (g,3,ces,23,'verified',2,now()),(g,3,ped,31,'verified',2,now()),
    (g,4,kan,17,'verified',2,now()),(g,4,ped,28,'verified',2,now()),
    (g,5,kan,16,'verified',2,now()),(g,5,ces,20,'verified',2,now()),
    (g,6,hen,14,'verified',2,now()),
    (g,7,kan,19,'verified',2,now()),
    (g,8,hen,11,'verified',2,now()),(g,8,kan,18,'verified',2,now());

  update public.grids set published_at = now() where id = g;
end $$;