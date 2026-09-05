-- Private selfie intake and server-owned portrait rendering queue.
create table if not exists public.avatar_render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  source_path text not null,
  requested_settings jsonb not null,
  status text not null default 'queued' check(status in ('queued','processing','complete','failed')),
  rendered_path text,
  error_code text,
  source_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists avatar_render_jobs_owner_created
  on public.avatar_render_jobs(user_id,created_at desc);

alter table public.avatar_render_jobs enable row level security;
grant select on public.avatar_render_jobs to authenticated;
grant all on public.avatar_render_jobs to service_role;
create policy "read own avatar jobs" on public.avatar_render_jobs
  for select to authenticated using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatar-sources','avatar-sources',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatar-renders','avatar-renders',true,8388608,array['image/png'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "upload own avatar source" on storage.objects;
create policy "upload own avatar source" on storage.objects for insert to authenticated
with check(bucket_id='avatar-sources' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "read own avatar source" on storage.objects;
create policy "read own avatar source" on storage.objects for select to authenticated
using(bucket_id='avatar-sources' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "delete own avatar source" on storage.objects;
create policy "delete own avatar source" on storage.objects for delete to authenticated
using(bucket_id='avatar-sources' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.request_avatar_render(p_source_path text,p_settings jsonb)
returns uuid language plpgsql security definer set search_path=public,storage as $$
declare job_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.entitlement_verified(auth.uid()) then raise exception 'Pro required'; end if;
  if p_source_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]+[.](jpg|jpeg|png|webp)$') then
    raise exception 'Invalid source path';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='avatar-sources' and name=p_source_path) then
    raise exception 'Source image not found';
  end if;
  if (select count(*) from public.avatar_render_jobs where user_id=auth.uid() and created_at>now()-interval '24 hours') >= 5 then
    raise exception 'Daily portrait limit reached';
  end if;
  insert into public.avatar_render_jobs(user_id,source_path,requested_settings)
  values(auth.uid(),p_source_path,p_settings - 'prompt' - 'instructions') returning id into job_id;
  return job_id;
end $$;
revoke all on function public.request_avatar_render(text,jsonb) from public,anon;
grant execute on function public.request_avatar_render(text,jsonb) to authenticated,service_role;

-- The service-role renderer must delete avatar-sources/source_path after processing,
-- then set profiles.avatar_url to the final moderated portrait URL.
