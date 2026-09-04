-- Keep room creation/joining atomic so a failed seat reservation can never
-- leave an unusable room and simultaneous invitees cannot claim one seat.

create or replace function public.create_arcade_room(
  p_user_id uuid,
  p_mode_slug text,
  p_difficulty smallint,
  p_max_players smallint default 4,
  p_sport_id uuid default null,
  p_category_key text default null
) returns public.arcade_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  created_room public.arcade_rooms;
  profile_row public.profiles;
  generated_code text;
begin
  if p_user_id is null then raise exception 'Sign in to host a room'; end if;
  if p_difficulty not between 1 and 4 then raise exception 'Invalid difficulty'; end if;
  if p_max_players not between 2 and 4 then raise exception 'Room size must be 2 to 4'; end if;
  if not public.can_host_game(p_user_id, p_mode_slug) then
    raise exception 'Fanzeno Pro is required to host this game';
  end if;

  select * into profile_row from public.profiles where id = p_user_id;

  for attempt in 1..5 loop
    generated_code := 'FZ-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4));
    begin
      insert into public.arcade_rooms(
        code, host_id, mode_slug, difficulty, visibility, settings
      ) values (
        generated_code, p_user_id, p_mode_slug, p_difficulty, 'private',
        jsonb_build_object('max_players', p_max_players)
      ) returning * into created_room;
      exit;
    exception when unique_violation then
      if attempt = 5 then raise exception 'Could not allocate a room code'; end if;
    end;
  end loop;

  insert into public.arcade_room_players(
    room_id, user_id, seat, display_name, status, sport_id, category_key, settings
  ) values (
    created_room.id, p_user_id, 0, coalesce(profile_row.display_name, 'Host'), 'ready',
    p_sport_id, p_category_key,
    jsonb_build_object(
      'avatar_id', coalesce(profile_row.avatar_preset, 'captain'),
      'sport_id', p_sport_id,
      'category_key', p_category_key
    )
  );

  return created_room;
end;
$$;

create or replace function public.join_arcade_room(
  p_user_id uuid,
  p_code text
) returns public.arcade_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.arcade_rooms;
  profile_row public.profiles;
  max_players int;
  next_seat smallint;
begin
  if p_user_id is null then raise exception 'Sign in to join a room'; end if;

  select * into target_room
  from public.arcade_rooms
  where code = upper(trim(p_code)) and status = 'lobby'
  for update;

  if target_room.id is null then raise exception 'Room not found or already started'; end if;
  if exists(
    select 1 from public.arcade_room_players
    where room_id = target_room.id and user_id = p_user_id
  ) then return target_room; end if;

  max_players := least(4, greatest(2, coalesce((target_room.settings->>'max_players')::int, 4)));
  if (select count(*) from public.arcade_room_players where room_id = target_room.id) >= max_players then
    raise exception 'Room is full';
  end if;

  select candidate::smallint into next_seat
  from generate_series(0, max_players - 1) candidate
  where not exists(
    select 1 from public.arcade_room_players p
    where p.room_id = target_room.id and p.seat = candidate
  )
  order by candidate limit 1;
  if next_seat is null then raise exception 'Room is full'; end if;

  select * into profile_row from public.profiles where id = p_user_id;
  insert into public.arcade_room_players(
    room_id, user_id, seat, display_name, status, settings
  ) values (
    target_room.id, p_user_id, next_seat, coalesce(profile_row.display_name, 'Player'), 'active',
    jsonb_build_object('avatar_id', coalesce(profile_row.avatar_preset, 'captain'))
  );
  return target_room;
end;
$$;

create or replace function public.leave_arcade_room(p_user_id uuid, p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare target_room public.arcade_rooms;
begin
  select * into target_room from public.arcade_rooms where id = p_room_id for update;
  if target_room.id is null then return true; end if;
  if not exists(select 1 from public.arcade_room_players where room_id=p_room_id and user_id=p_user_id) then
    raise exception 'Not a room participant';
  end if;

  if target_room.host_id = p_user_id and target_room.status = 'lobby' then
    delete from public.arcade_rooms where id = p_room_id;
  elsif target_room.host_id = p_user_id then
    update public.arcade_room_players set status='disconnected', last_seen_at=now()
    where room_id=p_room_id and user_id=p_user_id;
  else
    delete from public.arcade_room_players where room_id=p_room_id and user_id=p_user_id;
  end if;
  return true;
end;
$$;

revoke all on function public.create_arcade_room(uuid,text,smallint,smallint,uuid,text) from public, anon, authenticated;
revoke all on function public.join_arcade_room(uuid,text) from public, anon, authenticated;
revoke all on function public.leave_arcade_room(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_arcade_room(uuid,text,smallint,smallint,uuid,text) to service_role;
grant execute on function public.join_arcade_room(uuid,text) to service_role;
grant execute on function public.leave_arcade_room(uuid,uuid) to service_role;