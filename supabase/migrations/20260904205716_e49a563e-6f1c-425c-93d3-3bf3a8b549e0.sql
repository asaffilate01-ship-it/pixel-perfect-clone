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
    generated_code := 'FZ-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 4));
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