-- Run after schema.sql and assistant.sql. No model weights are trained by this migration.
create table if not exists public.assistant_memories (
 user_id uuid not null references public.profiles(id) on delete cascade,
 term text not null check(char_length(term) between 1 and 100),
 type text not null check(type in ('income','expense')),
 category text not null check(category in ('Makanan','Belanja','Transportasi','Tagihan','Hiburan','Kesehatan','Gaji','Freelance','Lainnya')),
 examples integer not null default 1,
 primary key(user_id,term,type)
);
create table if not exists public.assistant_suggestions (
 user_id uuid not null references public.profiles(id) on delete cascade,
 term text not null check(char_length(term) between 2 and 60 and term ~ '^[[:alpha:] -]+$'),
 type text not null check(type in ('income','expense')),
 category text not null check(category in ('Makanan','Belanja','Transportasi','Tagihan','Hiburan','Kesehatan','Gaji','Freelance','Lainnya')),
 created_at timestamptz not null default now(),
 primary key(user_id,term,type)
);
create table if not exists public.assistant_knowledge (
 term text not null check(char_length(term) between 2 and 60),
 type text not null check(type in ('income','expense')),
 category text not null check(category in ('Makanan','Belanja','Transportasi','Tagihan','Hiburan','Kesehatan','Gaji','Freelance','Lainnya')),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(term,type)
);
create table if not exists public.assistant_usage (
 user_id uuid not null references public.profiles(id) on delete cascade,
 day date not null default current_date,
 requests integer not null default 1,
 primary key(user_id,day)
);
alter table public.assistant_memories enable row level security;
alter table public.assistant_suggestions enable row level security;
alter table public.assistant_knowledge enable row level security;
alter table public.assistant_usage enable row level security;
revoke all on public.assistant_memories,public.assistant_suggestions,public.assistant_knowledge,public.assistant_usage from anon,authenticated;
grant select,delete on public.assistant_memories,public.assistant_suggestions to authenticated;
grant select on public.assistant_knowledge to authenticated;
drop policy if exists own_memory on public.assistant_memories;
create policy own_memory on public.assistant_memories for select to authenticated using(user_id=auth.uid());
drop policy if exists delete_memory on public.assistant_memories;
create policy delete_memory on public.assistant_memories for delete to authenticated using(user_id=auth.uid());
drop policy if exists own_suggestions on public.assistant_suggestions;
create policy own_suggestions on public.assistant_suggestions for select to authenticated using(user_id=auth.uid());
drop policy if exists delete_suggestions on public.assistant_suggestions;
create policy delete_suggestions on public.assistant_suggestions for delete to authenticated using(user_id=auth.uid());
drop policy if exists published_knowledge on public.assistant_knowledge;
create policy published_knowledge on public.assistant_knowledge for select to authenticated using(true);

-- Correction, personal memory and optional suggestion commit atomically.
create or replace function public.learn_category(record_id uuid,new_category text,shared_term text default null)
returns void language plpgsql security definer set search_path=public as $$
declare t public.transactions%rowtype; key text;
begin
 if not public.has_access() then raise exception 'Access expired'; end if;
 if new_category is null or new_category not in ('Makanan','Belanja','Transportasi','Tagihan','Hiburan','Kesehatan','Gaji','Freelance','Lainnya') then raise exception 'Invalid category'; end if;
 select * into t from public.transactions where id=record_id and user_id=auth.uid() for update;
 if not found then raise exception 'Transaction not found'; end if;
 key=lower(regexp_replace(trim(t.title),'\s+',' ','g'));
 update public.transactions set category=new_category where id=record_id;
 insert into public.assistant_memories(user_id,term,type,category) values(auth.uid(),key,t.type,new_category)
 on conflict(user_id,term,type) do update set category=excluded.category,examples=public.assistant_memories.examples+1;
 if shared_term is not null then
  shared_term=lower(regexp_replace(trim(shared_term),'\s+',' ','g'));
  if char_length(shared_term) not between 2 and 60 or shared_term !~ '^[[:alpha:] -]+$' then raise exception 'Use a generic term without numbers'; end if;
  insert into public.assistant_suggestions(user_id,term,type,category) values(auth.uid(),shared_term,t.type,new_category)
  on conflict(user_id,term,type) do update set category=excluded.category,created_at=now();
 end if;
end;$$;
revoke all on function public.learn_category(uuid,text,text) from public,anon;
grant execute on function public.learn_category(uuid,text,text) to authenticated;

-- Durable per-account cap across all Netlify function instances.
create or replace function public.consume_ai_quota(account_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare used integer;
begin
 if not exists(select 1 from public.profiles where id=account_id and (trial_ends_at>now() or paid_until>now())) then return false; end if;
 insert into public.assistant_usage(user_id,day,requests) values(account_id,current_date,1)
 on conflict(user_id,day) do update set requests=public.assistant_usage.requests+1 where public.assistant_usage.requests<50
 returning requests into used;
 return used is not null;
end;$$;
revoke all on function public.consume_ai_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_quota(uuid) to service_role;
