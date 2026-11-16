-- Admin only. Run after learning.sql. NEVER grant this function to app users.
create or replace function public.publish_assistant_knowledge(knowledge_term text,knowledge_type text,chosen_category text)
returns void language plpgsql security definer set search_path=public as $$
declare supporters integer; total integer;
begin
 select count(*),count(*) filter(where category=chosen_category) into total,supporters
 from public.assistant_suggestions where term=knowledge_term and type=knowledge_type;
 if supporters<5 or supporters::numeric/greatest(total,1)<0.8 then raise exception 'Need at least 5 different accounts and 80 percent agreement'; end if;
 insert into public.assistant_knowledge(term,type,category) values(knowledge_term,knowledge_type,chosen_category)
 on conflict(term,type) do update set category=excluded.category,version=public.assistant_knowledge.version+1,updated_at=now();
end;$$;
revoke all on function public.publish_assistant_knowledge(text,text,text) from public,anon,authenticated;
grant execute on function public.publish_assistant_knowledge(text,text,text) to service_role;

-- Review aggregate suggestions in SQL Editor; check for personal data and wrong categories.
-- select term,type,category,count(*) as supporting_accounts
-- from public.assistant_suggestions group by term,type,category order by supporting_accounts desc;
-- After manual review, publish one term (example only):
-- select public.publish_assistant_knowledge('ongkir','expense','Transportasi');
-- Roll back a problematic shared rule:
-- delete from public.assistant_knowledge where term='ongkir' and type='expense';
