-- Additional migration; run after schema.sql. May be run after premium.sql.
create table if not exists public.gold_holdings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
 label text not null check(char_length(trim(label)) between 1 and 100),
 grams numeric(16,4) not null check(grams>0 and grams<=1000000),
 source text not null check(source in ('galeri24','antam-galeri24','antam','pegadaian','world','custom')),
 price_mode text not null default 'auto' check(price_mode in ('auto','manual')),
 manual_price numeric(14,2),
 manual_date date,
 cost_basis numeric(16,0) check(cost_basis is null or cost_basis>=0),
 created_at timestamptz not null default now(),
 check(price_mode<>'manual' or manual_price>0 and manual_price<=100000000 and manual_date is not null),
 check(price_mode<>'manual' or manual_price is not null)
);
create index if not exists gold_holdings_owner on public.gold_holdings(user_id);
alter table public.gold_holdings enable row level security;
revoke all on public.gold_holdings from anon,authenticated;
grant select,insert,update,delete on public.gold_holdings to authenticated;
drop policy if exists gold_read on public.gold_holdings;
create policy gold_read on public.gold_holdings for select to authenticated using(user_id=auth.uid());
drop policy if exists gold_insert on public.gold_holdings;
create policy gold_insert on public.gold_holdings for insert to authenticated with check(user_id=auth.uid() and public.has_access());
drop policy if exists gold_update on public.gold_holdings;
create policy gold_update on public.gold_holdings for update to authenticated using(user_id=auth.uid() and public.has_access()) with check(user_id=auth.uid() and public.has_access());
drop policy if exists gold_delete on public.gold_holdings;
create policy gold_delete on public.gold_holdings for delete to authenticated using(user_id=auth.uid() and public.has_access());

create table if not exists public.gold_quotes (
 source text primary key check(source in ('galeri24','antam-galeri24','antam','pegadaian','world')),
 price_per_gram numeric(14,4) check(price_per_gram>0 and price_per_gram<=100000000),
 source_date date,
 observed_at timestamptz,
 last_attempt_at timestamptz not null default now(),
 status text not null check(status in ('ok','unavailable')),
 message text,
 metadata jsonb not null default '{}'
);
create table if not exists public.gold_quote_history (
 source text not null,
 source_date date not null,
 price_per_gram numeric(14,4) not null check(price_per_gram>0 and price_per_gram<=100000000),
 observed_at timestamptz not null,
 primary key(source,source_date)
);
alter table public.gold_quotes enable row level security;
alter table public.gold_quote_history enable row level security;
revoke all on public.gold_quotes,public.gold_quote_history from anon,authenticated;
grant select on public.gold_quotes,public.gold_quote_history to anon,authenticated;
drop policy if exists quote_read on public.gold_quotes;
create policy quote_read on public.gold_quotes for select using(true);
drop policy if exists history_read on public.gold_quote_history;
create policy history_read on public.gold_quote_history for select using(true);
-- Only service_role/SQL Editor may write market quotes; never put that key in Vite.
