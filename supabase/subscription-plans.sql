-- Run after schema.sql. Existing 30-day orders retain their price and duration.
-- Apply this migration before deploying the new checkout. Safe to run again.
begin;
alter table public.orders add column if not exists plan_id text not null default 'monthly';
alter table public.orders add column if not exists duration_months smallint not null default 0;
alter table public.orders add column if not exists duration_days smallint not null default 30;
alter table public.orders drop constraint if exists orders_amount_check;
alter table public.orders drop constraint if exists orders_subscription_plan_check;
alter table public.orders add constraint orders_subscription_plan_check check(
 (plan_id='monthly' and amount=29000 and duration_months=0 and duration_days=30) or
 (plan_id='quarterly' and amount=60000 and duration_months=3 and duration_days=0) or
 (plan_id='half-yearly' and amount=150000 and duration_months=6 and duration_days=0) or
 (plan_id='yearly' and amount=299000 and duration_months=12 and duration_days=0)
);

create or replace function public.activate_subscription(payment_order_id text)
returns void language plpgsql security definer set search_path=public as $$
declare payment public.orders%rowtype;
begin
 select * into payment from public.orders where id=payment_order_id for update;
 if not found then raise exception 'Unknown order'; end if;
 if payment.status='paid' then return; end if;
 -- The profile UPDATE serializes renewals from separate orders for the same user.
 -- Active subscriptions extend from paid_until; expired ones restart from now().
 update public.profiles set paid_until=
  (greatest(coalesce(paid_until,now()),now()) at time zone 'UTC'
   +make_interval(months=>payment.duration_months,days=>payment.duration_days)) at time zone 'UTC'
 where id=payment.user_id;
 if not found then raise exception 'Unknown account'; end if;
 update public.orders set status='paid',paid_at=now() where id=payment_order_id;
end;$$;
revoke all on function public.activate_subscription(text) from public,anon,authenticated;
grant execute on function public.activate_subscription(text) to service_role;
commit;
