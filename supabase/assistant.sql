-- Run after schema.sql. Safe to run again. Existing projects only need this migration.
create table if not exists public.assistant_preferences (
 user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
 name text not null check (char_length(trim(name)) between 1 and 30)
);
alter table public.assistant_preferences enable row level security;
revoke all on public.assistant_preferences from anon,authenticated;
grant select,insert,update on public.assistant_preferences to authenticated;
drop policy if exists read_assistant on public.assistant_preferences;
create policy read_assistant on public.assistant_preferences for select to authenticated using(user_id=auth.uid());
drop policy if exists insert_assistant on public.assistant_preferences;
create policy insert_assistant on public.assistant_preferences for insert to authenticated with check(user_id=auth.uid() and public.has_access());
drop policy if exists update_assistant on public.assistant_preferences;
create policy update_assistant on public.assistant_preferences for update to authenticated using(user_id=auth.uid() and public.has_access()) with check(user_id=auth.uid() and public.has_access());
