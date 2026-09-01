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
  v_level int := least(greatest(p_difficulty,1),5);
  v_min int := case v_level when 1 then 4 when 2 then 3 when 3 then 2 else 1 end;
  v_found boolean := false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  loop
    tries := tries + 1;
    -- 1) three random row criteria that have verified facts in scope
    select array_agg(id) into r from (
      select cr.id from criteria cr
      where cr.sport_id = p_sport_id and cr.enabled
        and exists (select 1 from athlete_criteria ac where ac.criterion_id = cr.id and ac.verification_status = 'verified'
          and (p_competition_id is null or ac.competition_id = p_competition_id)
          and extract(year from coalesce(ac.valid_to, current_date)) >= p_era_from
          and extract(year from coalesce(ac.valid_from, date '1900-01-01')) <= p_era_to)
      order by random() limit 3) q;
    -- 2) columns chosen so that every intersection with every row has >= v_min verified athletes
    if cardinality(r) = 3 then
      select array_agg(id) into c from (
        select cr.id from criteria cr
        where cr.sport_id = p_sport_id and cr.enabled and not (cr.id = any(r))
          and not exists (
            select 1 from unnest(r) rr(id)
            where (select count(distinct a.athlete_id) from athlete_criteria a
                   join athlete_criteria b on b.athlete_id = a.athlete_id
                   where a.criterion_id = rr.id and b.criterion_id = cr.id
                     and a.verification_status = 'verified' and b.verification_status = 'verified'
                     and (p_competition_id is null or (a.competition_id = p_competition_id and b.competition_id = p_competition_id))) < v_min)
        order by random() limit 3) q;
      if cardinality(c) = 3 then
        select array_agg(x order by x) into r from unnest(r) x;
        select array_agg(x order by x) into c from unnest(c) x;
        fp := md5(p_sport_id::text || coalesce(p_competition_id::text, 'all') || array_to_string(r, ',') || '|' || array_to_string(c, ','));
        v_found := true;
        -- prefer a grid this player has not seen yet; accept a repeat after 20 tries
        exit when tries >= 20 or not exists (
          select 1 from grid_exposures ge join grids gg on gg.id = ge.grid_id
          where ge.profile_id = v_user and gg.generation_fingerprint = fp);
      end if;
    end if;
    if tries >= 40 then
      if v_found then exit; end if;
      raise exception 'Not enough verified facts for this scope yet — try Easy or widen the competition filter';
    end if;
  end loop;

  select id into gid from grids where generation_fingerprint = fp;
  if gid is null then
    insert into grids(sport_id, row_criteria, column_criteria, difficulty, validated_at, published_at, competition_ids, generation_fingerprint, generated, created_by)
    values (p_sport_id, r, c, v_level, now(), now(),
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