-- Run after premium.sql. Existing signup/trial dates and subscriptions are preserved.
-- The same Premium entitlement applies to paid accounts and active 7-day trials.
begin;
create or replace function public.has_premium() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and (paid_until>now() or trial_ends_at>now()));
$$;
revoke all on function public.has_premium() from public,anon;
grant execute on function public.has_premium() to authenticated,service_role;

create or replace function public.consume_ai_quota(account_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare used integer;
begin
 if not exists(select 1 from public.profiles where id=account_id and (paid_until>now() or trial_ends_at>now())) then return false; end if;
 insert into public.assistant_usage(user_id,day,requests) values(account_id,current_date,1)
 on conflict(user_id,day) do update set requests=public.assistant_usage.requests+1 where public.assistant_usage.requests<50
 returning requests into used;
 return used is not null;
end;$$;
revoke all on function public.consume_ai_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_quota(uuid) to service_role;
commit;
