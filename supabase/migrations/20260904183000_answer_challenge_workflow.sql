-- Players can flag a rejected answer without gaining points. Staff review can add a
-- missing accepted answer; clients can never approve their own submissions.
create table if not exists public.answer_challenges (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_bank on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  submitted_answer text not null check (char_length(submitted_answer) between 1 and 200),
  normalised_answer text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','duplicate')),
  occurrence_count int not null default 1 check (occurrence_count > 0),
  reviewer_id uuid references auth.users on delete set null,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(question_id,user_id,normalised_answer)
);

create index if not exists answer_challenges_review_queue
  on public.answer_challenges(status,occurrence_count desc,created_at)
  where status='pending';
grant select on public.answer_challenges to authenticated;
grant all on public.answer_challenges to service_role;
alter table public.answer_challenges enable row level security;
drop policy if exists "own answer challenges" on public.answer_challenges;
create policy "own answer challenges" on public.answer_challenges for select to authenticated
  using(user_id=auth.uid() or public.has_staff_role());
revoke insert,update,delete on public.answer_challenges from anon,authenticated;

create or replace function public.resolve_answer_challenge(
  p_challenge_id uuid,
  p_accept boolean,
  p_note text default null
)
returns void language plpgsql security definer set search_path=public as $$
declare challenge public.answer_challenges;
begin
  if not public.has_staff_role() then raise exception 'Staff access required'; end if;
  select * into challenge from public.answer_challenges where id=p_challenge_id for update;
  if challenge.id is null then raise exception 'Challenge not found'; end if;
  if challenge.status<>'pending' then raise exception 'Challenge already reviewed'; end if;

  if p_accept then
    update public.question_bank q set answer_rule=jsonb_set(
      q.answer_rule,'{accepted}',
      coalesce(q.answer_rule->'accepted','[]'::jsonb) || to_jsonb(challenge.submitted_answer),true
    ) where q.id=challenge.question_id
      and not coalesce(q.answer_rule->'accepted','[]'::jsonb) @> to_jsonb(array[challenge.submitted_answer]);
  end if;

  update public.answer_challenges set status=case when p_accept then 'accepted' else 'rejected' end,
    reviewer_id=auth.uid(),reviewer_note=nullif(btrim(p_note),''),reviewed_at=now(),updated_at=now()
  where id=p_challenge_id;
end$$;

revoke all on function public.resolve_answer_challenge(uuid,boolean,text) from public,anon;
grant execute on function public.resolve_answer_challenge(uuid,boolean,text) to authenticated;

create or replace function public.list_answer_challenges(p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_staff_role() then raise exception 'Staff access required'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'question_id',c.question_id,'submitted_answer',c.submitted_answer,
      'status',c.status,'occurrence_count',c.occurrence_count,'created_at',c.created_at,
      'prompt',q.prompt_i18n->>'en','canonical_answer',q.answer_display_i18n->>'en',
      'sport',s.name,'category_key',q.category_key
    ) order by c.occurrence_count desc,c.created_at)
    from (select * from public.answer_challenges where status='pending'
      order by occurrence_count desc,created_at limit least(greatest(p_limit,1),250)) c
    join public.question_bank q on q.id=c.question_id
    join public.sports s on s.id=q.sport_id
  ),'[]'::jsonb);
end$$;

revoke all on function public.list_answer_challenges(int) from public,anon;
grant execute on function public.list_answer_challenges(int) to authenticated;
