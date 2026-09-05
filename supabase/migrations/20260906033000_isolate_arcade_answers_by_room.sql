-- Critical isolation fix: public room discoverability must never imply access to
-- that room's questions, revealed answers or submissions.

create or replace function public.is_arcade_participant(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.arcade_rooms r
      where r.id = p_room and r.host_id = auth.uid()
    )
    or exists (
      select 1 from public.arcade_room_players p
      where p.room_id = p_room and p.user_id = auth.uid()
    )
  )
$$;

revoke all on function public.is_arcade_participant(uuid) from public, anon;
grant execute on function public.is_arcade_participant(uuid) to authenticated, service_role;

drop policy if exists "questions visible to room" on public.arcade_questions;
create policy "questions visible only to participants"
on public.arcade_questions for select to authenticated
using (public.is_arcade_participant(room_id));

drop policy if exists "room submissions visible" on public.arcade_submissions;
create policy "submissions visible only to participants"
on public.arcade_submissions for select to authenticated
using (
  exists (
    select 1 from public.arcade_questions q
    where q.id = question_id
      and public.is_arcade_participant(q.room_id)
  )
);

-- Questions and scored submissions are written only by the trusted server path.
drop policy if exists "host issues questions" on public.arcade_questions;
drop policy if exists "active player submission only" on public.arcade_submissions;
revoke insert, update, delete on public.arcade_questions from authenticated;
revoke insert, update, delete on public.arcade_submissions from authenticated;

-- Never retain an answer payload on an unrevealed room question.
update public.arcade_questions
set answer_display_i18n = '{}'::jsonb
where not revealed_answer and answer_display_i18n <> '{}'::jsonb;

alter table public.arcade_questions
  drop constraint if exists unrevealed_arcade_answer_is_hidden;
alter table public.arcade_questions
  add constraint unrevealed_arcade_answer_is_hidden
  check (revealed_answer or answer_display_i18n = '{}'::jsonb);
