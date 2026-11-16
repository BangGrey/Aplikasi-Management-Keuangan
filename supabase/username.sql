-- Run AFTER schema.sql. Safe to run again. Does not reset trial or existing data.
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_unique on public.profiles(username) where username is not null;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='profiles_username_format' and conrelid='public.profiles'::regclass) then
  alter table public.profiles add constraint profiles_username_format check(username is null or username ~ '^[a-z][a-z0-9_]{2,23}$');
 end if;
end $$;

create or replace function public.on_signup() returns trigger language plpgsql security definer set search_path=public as $$
declare chosen text;
begin
 chosen=nullif(lower(trim(new.raw_user_meta_data->>'username')),'');
 if chosen is not null and chosen !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'Invalid username'; end if;
 insert into public.profiles(id,username) values(new.id,chosen);
 return new;
end;$$;
revoke all on function public.on_signup() from public,anon,authenticated;

-- Existing accounts can set/change their own username after signing in by email.
-- Uses only auth.uid(); never accepts a target account id from the client.
create or replace function public.set_username(chosen_username text) returns text
language plpgsql security definer set search_path=public as $$
declare chosen text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 chosen=lower(trim(chosen_username));
 if chosen is null or chosen !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'Invalid username'; end if;
 update public.profiles set username=chosen where id=auth.uid();
 if not found then raise exception 'Profile not found'; end if;
 return chosen;
end;$$;
revoke all on function public.set_username(text) from public,anon;
grant execute on function public.set_username(text) to authenticated;

create table if not exists public.login_attempts (
 bucket_hash text not null,
 window_start timestamptz not null,
 attempts integer not null default 1,
 primary key(bucket_hash,window_start)
);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from public,anon,authenticated;
create or replace function public.consume_login_attempt(bucket_hash_value text) returns boolean
language plpgsql security definer set search_path=public as $$
declare current_window timestamptz; used integer;
begin
 if bucket_hash_value !~ '^[a-f0-9]{64}$' then raise exception 'Invalid bucket'; end if;
 current_window=to_timestamp(floor(extract(epoch from now())/900)*900);
 insert into public.login_attempts(bucket_hash,window_start) values(bucket_hash_value,current_window)
 on conflict(bucket_hash,window_start) do update set attempts=public.login_attempts.attempts+1 where public.login_attempts.attempts<20
 returning attempts into used;
 return used is not null;
end;$$;
revoke all on function public.consume_login_attempt(text) from public,anon,authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;
-- Optional maintenance in SQL Editor/your scheduled database job:
-- delete from public.login_attempts where window_start < now()-interval '7 days';
