-- games: participants or staff only
drop policy if exists "games readable" on public.games;
create policy "games participants read" on public.games
  for select to authenticated
  using (player_one = auth.uid() or player_two = auth.uid() or public.has_staff_role());

-- rooms: host, participants, public rooms, or staff
drop policy if exists "rooms read" on public.rooms;
create policy "rooms members read" on public.rooms
  for select to authenticated
  using (
    host_id = auth.uid()
    or visibility = 'public'
    or public.has_staff_role()
    or exists (
      select 1 from public.games g
      where g.room_id = rooms.id and (g.player_one = auth.uid() or g.player_two = auth.uid())
    )
  );

-- exact-code lookup for joining a room without exposing the table
create or replace function public.fz_find_room(p_code text)
returns table(id uuid, code text, grid_id uuid, sport_slug text)
language sql stable security definer set search_path = public as $$
  select r.id, r.code, r.grid_id, s.slug
  from public.rooms r
  join public.grids g on g.id = r.grid_id
  join public.sports s on s.id = g.sport_id
  where auth.uid() is not null
    and r.code = upper(btrim(p_code))
  limit 1
$$;
revoke all on function public.fz_find_room(text) from public, anon;
grant execute on function public.fz_find_room(text) to authenticated, service_role;

-- helpers not needed by signed-out visitors
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.entitlement_verified(uuid) from anon;
revoke execute on function public.can_host_game(uuid, text) from anon;
revoke execute on function public.is_arcade_member(uuid) from anon;

-- staff/service-only content tooling
revoke execute on function public.fill_verified_question_pools(integer) from authenticated;
revoke execute on function public.generate_verified_intersection_questions(uuid, text, integer) from authenticated;
revoke execute on function public.generate_verified_honour_questions(uuid, integer) from authenticated;
revoke execute on function public.audit_question_content_batch(uuid) from authenticated;
revoke execute on function public.prepare_verified_question_batch(text, integer) from authenticated;
revoke execute on function public.create_question_content_campaign(text, integer, integer) from authenticated;
revoke execute on function public.prepare_next_campaign_batch(uuid) from authenticated;
revoke execute on function public.publish_question(uuid) from authenticated;
revoke execute on function public.unpublish_question(uuid) from authenticated;

-- fixed search path
alter function public.question_difficulty_band(numeric) set search_path = public;