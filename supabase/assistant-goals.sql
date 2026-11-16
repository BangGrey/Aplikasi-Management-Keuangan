-- Run after schema.sql and premium.sql. Safe to run again; existing goals are kept.
-- Keep the operation record even if the goal is later deleted, so retry never recreates it.
create table if not exists public.assistant_goal_creations (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 1 and 100),
 target numeric(16,0) not null check(target>0 and target<=1000000000000),
 initial_saved numeric(16,0) not null check(initial_saved>=0 and initial_saved<=1000000000000),
 created_at timestamptz not null default now()
);
alter table public.assistant_goal_creations enable row level security;
revoke all on public.assistant_goal_creations from public,anon,authenticated;
grant select on public.assistant_goal_creations to authenticated;
drop policy if exists own_assistant_goal_creations on public.assistant_goal_creations;
create policy own_assistant_goal_creations on public.assistant_goal_creations for select to authenticated using(user_id=auth.uid());

create or replace function public.create_assistant_goal(record_id uuid,title_value text,target_value numeric,initial_saved numeric)
returns public.goals language plpgsql security definer set search_path=public as $$
declare previous public.assistant_goal_creations%rowtype; result public.goals%rowtype; inserted uuid;
begin
 if auth.uid() is null or not public.has_premium() then raise exception 'Premium subscription required'; end if;
 if record_id is null or title_value is null or char_length(trim(title_value)) not between 1 and 100
  or target_value is null or target_value<=0 or target_value>1000000000000 or target_value<>trunc(target_value)
  or initial_saved is null or initial_saved<0 or initial_saved>1000000000000 or initial_saved<>trunc(initial_saved) then raise exception 'Invalid savings goal'; end if;
 insert into public.assistant_goal_creations(id,user_id,title,target,initial_saved)
 values(record_id,auth.uid(),trim(title_value),target_value,initial_saved)
 on conflict(id) do nothing returning id into inserted;
 if inserted is not null then
  insert into public.goals(id,user_id,title,target,saved,emoji)
  values(record_id,auth.uid(),trim(title_value),target_value,initial_saved,case when title_value ~* 'rumah|house|home' then '🏠' else '🌸' end)
  returning * into result;
 else
  select * into previous from public.assistant_goal_creations where id=record_id;
  if not found or previous.user_id<>auth.uid() or previous.title<>trim(title_value) or previous.target<>target_value or previous.initial_saved<>initial_saved then raise exception 'Conflicting savings goal'; end if;
  select * into result from public.goals where id=record_id and user_id=auth.uid();
  if not found then raise exception 'Created goal no longer exists'; end if;
 end if;
 return result;
end;$$;
revoke all on function public.create_assistant_goal(uuid,text,numeric,numeric) from public,anon;
grant execute on function public.create_assistant_goal(uuid,text,numeric,numeric) to authenticated;
