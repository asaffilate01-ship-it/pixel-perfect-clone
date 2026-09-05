-- Million-question content programme.
--
-- One million rows must not be created in a single migration or by paraphrasing the
-- same fact. This adds resumable 10,000-question releases backed by independently
-- sourced fact imports. Existing question audit rules remain the publication gate.

create table if not exists public.question_fact_imports (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  source_key text not null,
  sport_slug text not null,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null check (length(btrim(source_title)) >= 3),
  licence_notes text not null,
  payload jsonb not null,
  payload_hash text not null,
  status text not null default 'staged'
    check (status in ('staged','validated','rejected','imported')),
  validation_issues text[] not null default '{}',
  imported_question_count int not null default 0 check (imported_question_count >= 0),
  fetched_at timestamptz not null,
  validated_at timestamptz,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, source_key),
  unique (payload_hash)
);

create index if not exists question_fact_imports_queue
  on public.question_fact_imports(status, sport_slug, created_at);

grant all on public.question_fact_imports to service_role;
alter table public.question_fact_imports enable row level security;
drop policy if exists "staff inspect question fact imports" on public.question_fact_imports;
create policy "staff inspect question fact imports" on public.question_fact_imports
  for select to authenticated using (public.has_staff_role());
revoke insert, update, delete on public.question_fact_imports from anon, authenticated;

create table if not exists public.question_content_campaigns (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  target_count int not null check (target_count between 1 and 1000000),
  batch_size int not null default 10000 check (batch_size between 100 and 10000),
  status text not null default 'building'
    check (status in ('building','paused','ready','complete')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.question_content_campaign_batches (
  campaign_id uuid not null references public.question_content_campaigns on delete cascade,
  sequence_no int not null check (sequence_no > 0),
  target_count int not null check (target_count between 1 and 10000),
  batch_id uuid references public.question_content_batches on delete set null,
  status text not null default 'planned'
    check (status in ('planned','building','blocked','publishable','published')),
  created_at timestamptz not null default now(),
  primary key (campaign_id, sequence_no),
  unique (batch_id)
);

grant all on public.question_content_campaigns,
  public.question_content_campaign_batches to service_role;
grant select on public.question_content_campaigns,
  public.question_content_campaign_batches to authenticated;
alter table public.question_content_campaigns enable row level security;
alter table public.question_content_campaign_batches enable row level security;
drop policy if exists "staff question campaigns" on public.question_content_campaigns;
create policy "staff question campaigns" on public.question_content_campaigns
  for select to authenticated using (public.has_staff_role());
drop policy if exists "staff question campaign batches" on public.question_content_campaign_batches;
create policy "staff question campaign batches" on public.question_content_campaign_batches
  for select to authenticated using (public.has_staff_role());
revoke insert, update, delete on public.question_content_campaigns,
  public.question_content_campaign_batches from anon, authenticated;

create or replace view public.question_content_campaign_progress as
select c.id, c.label, c.target_count, c.batch_size, c.status,
  count(cb.*)::int as planned_batches,
  count(cb.*) filter (where cb.status = 'published')::int as published_batches,
  coalesce(sum(qb.passed_count) filter (where cb.status = 'published'), 0)::int
    as published_questions,
  greatest(c.target_count -
    coalesce(sum(qb.passed_count) filter (where cb.status = 'published'), 0), 0)::int
    as questions_remaining,
  round(100 * coalesce(sum(qb.passed_count) filter (where cb.status = 'published'), 0)
    / c.target_count::numeric, 2) as completion_percent
from public.question_content_campaigns c
left join public.question_content_campaign_batches cb on cb.campaign_id = c.id
left join public.question_content_batches qb on qb.id = cb.batch_id
group by c.id, c.label, c.target_count, c.batch_size, c.status;

revoke all on public.question_content_campaign_progress from public, anon, authenticated;
grant select on public.question_content_campaign_progress to service_role;

create or replace function public.create_question_content_campaign(
  p_label text,
  p_target_count int default 1000000,
  p_batch_size int default 10000
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_campaign_id uuid;
  batch_total int;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;
  if p_target_count not between 1 and 1000000 then
    raise exception 'Campaign target must be between 1 and 1,000,000';
  end if;
  if p_batch_size not between 100 and 10000 then
    raise exception 'Batch size must be between 100 and 10,000';
  end if;

  insert into public.question_content_campaigns(
    label, target_count, batch_size, created_by
  ) values (p_label, p_target_count, p_batch_size, auth.uid())
  on conflict (label) do update set
    target_count = excluded.target_count,
    batch_size = excluded.batch_size
  returning id into v_campaign_id;

  batch_total := ceil(p_target_count::numeric / p_batch_size)::int;
  insert into public.question_content_campaign_batches(
    campaign_id, sequence_no, target_count
  )
  select v_campaign_id, n,
    least(p_batch_size, p_target_count - ((n - 1) * p_batch_size))
  from generate_series(1, batch_total) n
  on conflict (campaign_id, sequence_no) do nothing;

  return v_campaign_id;
end $$;

create or replace function public.prepare_next_campaign_batch(p_campaign_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  next_batch public.question_content_campaign_batches;
  prepared jsonb;
  prepared_batch_id uuid;
  prepared_status text;
begin
  if auth.role() <> 'service_role' and not public.has_staff_role() then
    raise exception 'Staff access required';
  end if;

  select * into next_batch
  from public.question_content_campaign_batches
  where campaign_id = p_campaign_id and status in ('planned','blocked')
  order by sequence_no
  limit 1 for update skip locked;

  if next_batch.campaign_id is null then
    return jsonb_build_object('campaign_id', p_campaign_id, 'status', 'no_pending_batch');
  end if;

  update public.question_content_campaign_batches set status = 'building'
  where campaign_id = p_campaign_id and sequence_no = next_batch.sequence_no;

  prepared := public.prepare_verified_question_batch(
    'Million programme batch ' || lpad(next_batch.sequence_no::text, 3, '0'),
    next_batch.target_count
  );
  prepared_batch_id := (prepared->>'batch_id')::uuid;
  select status into prepared_status from public.question_content_batches
  where id = prepared_batch_id;

  update public.question_content_campaign_batches
  set batch_id = prepared_batch_id,
    status = case when prepared_status = 'publishable' then 'publishable' else 'blocked' end
  where campaign_id = p_campaign_id and sequence_no = next_batch.sequence_no;

  return prepared || jsonb_build_object(
    'campaign_id', p_campaign_id,
    'sequence_no', next_batch.sequence_no,
    'campaign_batch_status', prepared_status
  );
exception when others then
  update public.question_content_campaign_batches set status = 'blocked'
  where campaign_id = p_campaign_id and sequence_no = next_batch.sequence_no;
  raise;
end $$;

revoke all on function public.create_question_content_campaign(text,int,int) from public, anon;
revoke all on function public.prepare_next_campaign_batch(uuid) from public, anon;
grant execute on function public.create_question_content_campaign(text,int,int),
  public.prepare_next_campaign_batch(uuid) to authenticated, service_role;

-- Register the requested one-million-question target as 100 controlled releases.
select public.create_question_content_campaign(
  'Verified sports question programme — 1,000,000', 1000000, 10000
);
