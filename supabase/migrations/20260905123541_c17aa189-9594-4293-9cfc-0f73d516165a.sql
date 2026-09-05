-- Fail-closed auditing for large question imports. A batch is publishable only when
-- its requested number of unique questions all pass content, source, answer and
-- difficulty checks. This prevents a numeric target from lowering editorial quality.

create table if not exists public.question_content_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  target_count int not null check (target_count between 1 and 10000),
  candidate_count int not null default 0 check (candidate_count >= 0),
  passed_count int not null default 0 check (passed_count >= 0),
  failed_count int not null default 0 check (failed_count >= 0),
  status text not null default 'building'
    check (status in ('building','auditing','blocked','publishable','published')),
  audit_summary jsonb not null default '{}',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  audited_at timestamptz,
  published_at timestamptz
);

create table if not exists public.question_content_batch_items (
  batch_id uuid not null references public.question_content_batches on delete cascade,
  question_id uuid not null references public.question_bank on delete cascade,
  audit_passed boolean,
  audit_issues text[] not null default '{}',
  audited_at timestamptz,
  primary key (batch_id, question_id)
);

create index if not exists question_batch_items_question
  on public.question_content_batch_items(question_id);

grant all on public.question_content_batches, public.question_content_batch_items to service_role;
grant select on public.question_content_batches, public.question_content_batch_items to authenticated;
alter table public.question_content_batches enable row level security;
alter table public.question_content_batch_items enable row level security;

drop policy if exists "staff question batches" on public.question_content_batches;
create policy "staff question batches" on public.question_content_batches
  for select to authenticated using (public.has_staff_role());
drop policy if exists "staff question batch items" on public.question_content_batch_items;
create policy "staff question batch items" on public.question_content_batch_items
  for select to authenticated using (public.has_staff_role());
revoke insert, update, delete on public.question_content_batches,
  public.question_content_batch_items from anon, authenticated;

create or replace function public.audit_question_content_batch(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  batch public.question_content_batches;
  result jsonb;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;

  select * into batch from public.question_content_batches
  where id = p_batch_id for update;
  if batch.id is null then raise exception 'Unknown question batch'; end if;

  update public.question_content_batches set status = 'auditing' where id = p_batch_id;

  with checks as (
    select bi.question_id,
      array_remove(array[
        case when nullif(btrim(q.prompt_i18n->>'en'), '') is null then 'missing_prompt' end,
        case when char_length(coalesce(q.prompt_i18n->>'en','')) < 18 then 'prompt_too_short' end,
        case when nullif(btrim(q.clue_i18n->>'en'), '') is null then 'missing_clue' end,
        case when nullif(btrim(q.answer_display_i18n->>'en'), '') is null then 'missing_display_answer' end,
        case when jsonb_typeof(q.answer_rule->'accepted') is distinct from 'array'
          or jsonb_array_length(coalesce(q.answer_rule->'accepted','[]'::jsonb)) = 0
          then 'missing_accepted_answers' end,
        case when exists (
          select 1 from jsonb_array_elements_text(coalesce(q.answer_rule->'accepted','[]'::jsonb)) a
          where nullif(btrim(a), '') is null
        ) then 'blank_accepted_answer' end,
        case when q.source_id is null then 'missing_source' end,
        case when q.source_url is null or q.source_url !~ '^https://'
          then 'invalid_source_url' end,
        case when nullif(btrim(q.source_title), '') is null then 'missing_source_title' end,
        case when q.reviewed_at is null then 'not_editorially_reviewed' end,
        case when q.content_hash is null then 'missing_content_hash' end,
        case when q.quality_score < .8 then 'quality_below_threshold' end,
        case when q.ambiguity_score > .1 then 'ambiguity_above_threshold' end,
        case when q.difficulty_percentile not between 0 and 1 then 'invalid_difficulty' end,
        case when q.verification_status <> 'verified' then 'not_verified' end,
        case when not q.active then 'inactive' end,
        case when exists (
          select 1 from public.question_bank other
          where other.id <> q.id and other.active
            and public.fz_norm(other.prompt_i18n->>'en') = public.fz_norm(q.prompt_i18n->>'en')
            and other.created_at <= q.created_at
        ) then 'duplicate_prompt' end
      ], null)::text[] issues
    from public.question_content_batch_items bi
    join public.question_bank q on q.id = bi.question_id
    where bi.batch_id = p_batch_id
  )
  update public.question_content_batch_items bi
  set audit_issues = checks.issues,
    audit_passed = cardinality(checks.issues) = 0,
    audited_at = now()
  from checks
  where bi.batch_id = p_batch_id and bi.question_id = checks.question_id;

  with totals as (
    select count(*)::int candidates,
      count(*) filter (where audit_passed)::int passed,
      count(*) filter (where not audit_passed)::int failed
    from public.question_content_batch_items where batch_id = p_batch_id
  ), bands as (
    select public.question_difficulty_band(q.difficulty_percentile) difficulty,
      count(*) filter (where bi.audit_passed)::int passed
    from public.question_content_batch_items bi
    join public.question_bank q on q.id = bi.question_id
    where bi.batch_id = p_batch_id
    group by public.question_difficulty_band(q.difficulty_percentile)
  ), issues as (
    select issue, count(*)::int occurrences
    from public.question_content_batch_items bi,
      unnest(bi.audit_issues) issue
    where bi.batch_id = p_batch_id
    group by issue order by occurrences desc, issue
  )
  select jsonb_build_object(
    'target', batch.target_count,
    'candidates', totals.candidates,
    'passed', totals.passed,
    'failed', totals.failed,
    'shortfall', greatest(0, batch.target_count - totals.passed),
    'difficulty_bands', coalesce((
      select jsonb_object_agg(difficulty, passed order by difficulty) from bands
    ), '{}'::jsonb),
    'issues', coalesce((
      select jsonb_object_agg(issue, occurrences order by issue) from issues
    ), '{}'::jsonb)
  ) into result from totals;

  update public.question_content_batches
  set candidate_count = (result->>'candidates')::int,
    passed_count = (result->>'passed')::int,
    failed_count = (result->>'failed')::int,
    status = case
      when (result->>'passed')::int = target_count
        and (result->>'failed')::int = 0 then 'publishable'
      else 'blocked'
    end,
    audit_summary = result,
    audited_at = now()
  where id = p_batch_id;

  return result;
end $$;

create or replace function public.prepare_verified_question_batch(
  p_label text,
  p_target int default 1000
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_batch_id uuid;
  generated jsonb;
  audited jsonb;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;
  if p_target not between 1 and 10000 then raise exception 'Invalid target'; end if;

  -- Generate only from verified, evidence-backed relational facts first.
  generated := public.fill_verified_question_pools(greatest(p_target, 1000));
  insert into public.question_content_batches(label, target_count, created_by)
  values (p_label, p_target, auth.uid()) returning id into v_batch_id;

  insert into public.question_content_batch_items(batch_id, question_id)
  select v_batch_id, q.id
  from public.question_bank q
  where q.active and q.verification_status = 'verified'
    and q.quality_score >= .8 and q.ambiguity_score <= .1
    and not exists (
      select 1 from public.question_content_batch_items prior
      join public.question_content_batches pb on pb.id = prior.batch_id
      where prior.question_id = q.id and pb.status in ('publishable','published')
    )
  order by q.created_at desc, q.id
  limit p_target;

  audited := public.audit_question_content_batch(v_batch_id);
  return jsonb_build_object('batch_id', v_batch_id, 'generated', generated, 'audit', audited);
end $$;

revoke all on function public.audit_question_content_batch(uuid) from public, anon;
revoke all on function public.prepare_verified_question_batch(text, int) from public, anon;
grant execute on function public.audit_question_content_batch(uuid),
  public.prepare_verified_question_batch(text, int) to authenticated, service_role;

-- Create and audit the requested batch. It remains blocked unless 1,000 unique,
-- verified questions are actually available; no partial batch is represented as done.
select public.prepare_verified_question_batch('Verified expansion 1 — target 1,000', 1000);