-- Run after schema.sql and premium.sql. Safe to run again; existing goals are kept.
-- Each assistant deposit has a durable id so retries cannot add the amount twice.
create table if not exists public.assistant_goal_deposits (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 goal_id uuid not null references public.goals(id) on delete cascade,
 amount numeric(16,0) not null check(amount>0 and amount<=1000000000000),
 created_at timestamptz not null default now()
);
create index if not exists assistant_goal_deposits_owner on public.assistant_goal_deposits(user_id,created_at);
alter table public.assistant_goal_deposits enable row level security;
revoke all on public.assistant_goal_deposits from public,anon,authenticated;
grant select on public.assistant_goal_deposits to authenticated;
drop policy if exists own_assistant_goal_deposits on public.assistant_goal_deposits;
create policy own_assistant_goal_deposits on public.assistant_goal_deposits for select to authenticated using(user_id=auth.uid());

create or replace function public.deposit_assistant_goal(request_id uuid,goal_id uuid,deposit_amount numeric)
returns public.goals language plpgsql security definer set search_path=public as $$
declare goal public.goals%rowtype; previous public.assistant_goal_deposits%rowtype;
begin
 if auth.uid() is null or not public.has_premium() then raise exception 'Premium subscription required'; end if;
 if request_id is null or goal_id is null or deposit_amount is null or deposit_amount<=0 or deposit_amount>1000000000000 or deposit_amount<>trunc(deposit_amount) then raise exception 'Invalid savings deposit'; end if;
 -- Serialize updates to the same goal, including deposits made through the manual form.
 select * into goal from public.goals where id=goal_id and user_id=auth.uid() for update;
 if not found then raise exception 'Goal not found'; end if;
 select * into previous from public.assistant_goal_deposits where id=request_id;
 if found then
  if previous.user_id<>auth.uid() or previous.goal_id<>goal.id or previous.amount<>deposit_amount then raise exception 'Conflicting savings deposit'; end if;
  return goal;
 end if;
 update public.goals set saved=saved+deposit_amount where id=goal.id returning * into goal;
 -- A duplicate id on a different goal aborts the whole call, including the update.
 insert into public.assistant_goal_deposits(id,user_id,goal_id,amount) values(request_id,auth.uid(),goal.id,deposit_amount);
 return goal;
end;$$;
revoke all on function public.deposit_assistant_goal(uuid,uuid,numeric) from public,anon;
grant execute on function public.deposit_assistant_goal(uuid,uuid,numeric) to authenticated;
