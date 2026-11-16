-- Run after gold.sql. Safe to run again; previous holdings are preserved.
-- Keep a fully sold holding at zero instead of silently deleting it.
alter table public.gold_holdings drop constraint if exists gold_holdings_grams_check;
alter table public.gold_holdings add constraint gold_holdings_grams_check check(grams>=0 and grams<=1000000);

create table if not exists public.gold_reductions (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 holding_id uuid not null references public.gold_holdings(id) on delete cascade,
 grams numeric(16,4) not null check(grams>0 and grams<=1000000),
 remaining_grams numeric(16,4) not null check(remaining_grams>=0),
 created_at timestamptz not null default now()
);
create index if not exists gold_reductions_owner on public.gold_reductions(user_id,created_at);
alter table public.gold_reductions enable row level security;
revoke all on public.gold_reductions from public,anon,authenticated;
grant select on public.gold_reductions to authenticated;
drop policy if exists own_gold_reductions on public.gold_reductions;
create policy own_gold_reductions on public.gold_reductions for select to authenticated using(user_id=auth.uid());

create or replace function public.reduce_gold(record_id uuid,reduction_id uuid,grams_value numeric)
returns public.gold_holdings language plpgsql security definer set search_path=public as $$
declare holding public.gold_holdings%rowtype; previous public.gold_reductions%rowtype;
begin
 if auth.uid() is null or not public.has_access() then raise exception 'Access expired'; end if;
 if reduction_id is null or grams_value is null or grams_value<=0 or grams_value>1000000 or grams_value*10000<>trunc(grams_value*10000) then raise exception 'Invalid gram amount'; end if;
 select * into holding from public.gold_holdings where id=record_id and user_id=auth.uid() for update;
 if not found then raise exception 'Gold holding not found'; end if;
 select * into previous from public.gold_reductions where id=reduction_id;
 if found then
  if previous.user_id<>auth.uid() or previous.holding_id<>record_id or previous.grams<>grams_value then raise exception 'Conflicting reduction'; end if;
  return holding;
 end if;
 if grams_value>holding.grams then raise exception 'Insufficient gold balance'; end if;
 update public.gold_holdings set grams=grams-grams_value where id=holding.id returning * into holding;
 insert into public.gold_reductions(id,user_id,holding_id,grams,remaining_grams) values(reduction_id,auth.uid(),record_id,grams_value,holding.grams);
 return holding;
end;$$;
revoke all on function public.reduce_gold(uuid,uuid,numeric) from public,anon;
grant execute on function public.reduce_gold(uuid,uuid,numeric) to authenticated;
