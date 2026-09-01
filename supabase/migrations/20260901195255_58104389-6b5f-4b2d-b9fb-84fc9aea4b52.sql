create schema if not exists extensions;
drop function if exists public.fz_norm(text) cascade;
alter extension unaccent set schema extensions;

create or replace function public.fz_norm(t text) returns text
language sql immutable strict set search_path = public, extensions as $$
  select regexp_replace(lower(extensions.unaccent(t)), '[^a-z0-9]', '', 'g')
$$;
revoke all on function public.fz_norm(text) from public, anon, authenticated;
grant execute on function public.fz_norm(text) to service_role;

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