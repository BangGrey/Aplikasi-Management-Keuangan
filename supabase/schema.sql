-- Run once in the Supabase SQL Editor on a new project.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 trial_ends_at timestamptz not null default (now() + interval '7 days'),
 paid_until timestamptz,
 created_at timestamptz not null default now()
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
 title text not null check(length(title) between 1 and 100),
 type text not null check(type in ('income','expense')),
 amount numeric(16,0) not null check(amount > 0 and amount <= 1000000000000),
 category text not null check(length(category) between 1 and 100),
 date date not null default current_date,
 created_at timestamptz not null default now()
);
create index transactions_user_date on public.transactions(user_id,date);
create table public.goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
 title text not null check(length(title) between 1 and 100),
 emoji text not null default '🌸' check(length(emoji)<=16),
 target numeric(16,0) not null check(target>0 and target<=1000000000000),
 saved numeric(16,0) not null default 0 check(saved>=0)
);
create index goals_user on public.goals(user_id);
create table public.orders (
 id text primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 amount numeric(16,0) not null check(amount=29000),
 status text not null default 'pending' check(status in ('pending','paid')),
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
create function public.on_signup() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values(new.id); return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.on_signup();
-- Backfill accounts that already exist.
insert into public.profiles(id) select id from auth.users on conflict do nothing;
create function public.has_access() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and (trial_ends_at>now() or paid_until>now()));
$$;
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.orders enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
-- Expired users retain read access to existing records; new writes require trial or paid access.
create policy read_transactions on public.transactions for select to authenticated using(user_id=auth.uid());
create policy insert_transactions on public.transactions for insert to authenticated with check(user_id=auth.uid() and public.has_access());
create policy update_transactions on public.transactions for update to authenticated using(user_id=auth.uid() and public.has_access()) with check(user_id=auth.uid() and public.has_access());
create policy delete_transactions on public.transactions for delete to authenticated using(user_id=auth.uid() and public.has_access());
create policy read_goals on public.goals for select to authenticated using(user_id=auth.uid());
create policy insert_goals on public.goals for insert to authenticated with check(user_id=auth.uid() and public.has_access());
create policy update_goals on public.goals for update to authenticated using(user_id=auth.uid() and public.has_access()) with check(user_id=auth.uid() and public.has_access());
create policy delete_goals on public.goals for delete to authenticated using(user_id=auth.uid() and public.has_access());
create policy read_orders on public.orders for select to authenticated using(user_id=auth.uid());
-- Explicit grants prevent clients from changing trial dates, paid dates, or orders.
revoke all on public.profiles,public.orders from anon,authenticated;
grant select on public.profiles,public.orders to authenticated;
revoke all on public.transactions,public.goals from anon;
grant select,insert,update,delete on public.transactions,public.goals to authenticated;
create function public.deposit_goal(goal_id uuid,deposit_amount numeric) returns void language plpgsql security invoker set search_path=public as $$
begin
 if not public.has_access() or deposit_amount<=0 or deposit_amount>1000000000000 or deposit_amount<>trunc(deposit_amount) then raise exception 'Invalid deposit or expired access'; end if;
 update public.goals set saved=saved+deposit_amount where id=goal_id and user_id=auth.uid();
 if not found then raise exception 'Goal not found'; end if;
end;$$;
-- Transactional, locked and idempotent: repeated Midtrans notifications never extend twice.
create function public.activate_subscription(payment_order_id text) returns void language plpgsql security definer set search_path=public as $$
declare payment public.orders%rowtype;
begin
 select * into payment from public.orders where id=payment_order_id for update;
 if not found then raise exception 'Unknown order'; end if;
 if payment.status='paid' then return; end if;
 update public.profiles set paid_until=greatest(coalesce(paid_until,now()),now())+interval '30 days' where id=payment.user_id;
 update public.orders set status='paid',paid_at=now() where id=payment_order_id;
end;$$;
revoke all on function public.activate_subscription(text) from public,anon,authenticated;
grant execute on function public.activate_subscription(text) to service_role;
revoke all on function public.deposit_goal(uuid,numeric) from public,anon;
grant execute on function public.deposit_goal(uuid,numeric) to authenticated;
revoke all on function public.on_signup() from public,anon,authenticated;
revoke all on function public.has_access() from public,anon;
grant execute on function public.has_access() to authenticated;
