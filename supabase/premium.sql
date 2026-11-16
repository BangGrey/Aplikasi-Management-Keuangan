-- Run after schema.sql, assistant.sql and learning.sql (and username.sql if used).
-- Existing data and trial dates are preserved. Safe to run again.
create or replace function public.has_premium() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and paid_until>now());
$$;
revoke all on function public.has_premium() from public,anon;
grant execute on function public.has_premium() to authenticated,service_role;

drop policy if exists read_assistant on public.assistant_preferences;
create policy read_assistant on public.assistant_preferences for select to authenticated using(user_id=auth.uid() and public.has_premium());
drop policy if exists insert_assistant on public.assistant_preferences;
create policy insert_assistant on public.assistant_preferences for insert to authenticated with check(user_id=auth.uid() and public.has_premium());
drop policy if exists update_assistant on public.assistant_preferences;
create policy update_assistant on public.assistant_preferences for update to authenticated using(user_id=auth.uid() and public.has_premium()) with check(user_id=auth.uid() and public.has_premium());
drop policy if exists own_memory on public.assistant_memories;
create policy own_memory on public.assistant_memories for select to authenticated using(user_id=auth.uid() and public.has_premium());
drop policy if exists own_suggestions on public.assistant_suggestions;
create policy own_suggestions on public.assistant_suggestions for select to authenticated using(user_id=auth.uid() and public.has_premium());
drop policy if exists published_knowledge on public.assistant_knowledge;
create policy published_knowledge on public.assistant_knowledge for select to authenticated using(public.has_premium());
-- Deletion policies remain available to owners, so they may remove their data after expiry.

create or replace function public.learn_category(record_id uuid,new_category text,shared_term text default null)
returns void language plpgsql security definer set search_path=public as $$
declare t public.transactions%rowtype; key text;
begin
 if not public.has_premium() then raise exception 'Premium subscription required'; end if;
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
 if not exists(select 1 from public.profiles where id=account_id and paid_until>now()) then return false; end if;
 insert into public.assistant_usage(user_id,day,requests) values(account_id,current_date,1)
 on conflict(user_id,day) do update set requests=public.assistant_usage.requests+1 where public.assistant_usage.requests<50
 returning requests into used;
 return used is not null;
end;$$;
revoke all on function public.consume_ai_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_quota(uuid) to service_role;

-- Server-checked paths for assistant-created transactions and summaries.
-- Manual entry remains governed by the existing has_access()/trial policies.
create or replace function public.save_assistant_transaction(record_id uuid,title_value text,type_value text,amount_value numeric,category_value text,date_value date)
returns public.transactions language plpgsql security definer set search_path=public as $$
declare result public.transactions%rowtype;
begin
 if not public.has_premium() then raise exception 'Premium subscription required'; end if;
 if record_id is null or category_value is null or category_value not in ('Makanan','Belanja','Transportasi','Tagihan','Hiburan','Kesehatan','Gaji','Freelance','Lainnya') then raise exception 'Invalid transaction'; end if;
 -- Insert first with a fixed id; retries serialize on the primary key and never duplicate.
 insert into public.transactions(id,user_id,title,type,amount,category,date)
 values(record_id,auth.uid(),title_value,type_value,amount_value,category_value,date_value)
 on conflict(id) do nothing;
 select * into result from public.transactions where id=record_id and user_id=auth.uid();
 if not found then raise exception 'Transaction unavailable'; end if;
 if result.title is distinct from title_value or result.type is distinct from type_value or result.amount is distinct from amount_value or result.date is distinct from date_value then raise exception 'Conflicting transaction'; end if;
 return result;
end;$$;
revoke all on function public.save_assistant_transaction(uuid,text,text,numeric,text,date) from public,anon;
grant execute on function public.save_assistant_transaction(uuid,text,text,numeric,text,date) to authenticated;

create or replace function public.get_assistant_transactions(period_from date default null,period_to date default current_date,start_row integer default 0)
returns setof public.transactions language plpgsql security definer set search_path=public as $$
begin
 if not public.has_premium() then raise exception 'Premium subscription required'; end if;
 if period_to is null or period_from>period_to or start_row is null or start_row<0 then raise exception 'Invalid period'; end if;
 return query select t.* from public.transactions t where t.user_id=auth.uid() and (period_from is null or t.date>=period_from) and t.date<=period_to order by t.id limit 1000 offset start_row;
end;$$;
revoke all on function public.get_assistant_transactions(date,date,integer) from public,anon;
grant execute on function public.get_assistant_transactions(date,date,integer) to authenticated;
