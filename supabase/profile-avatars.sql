-- Run after schema.sql. Profile photos are available to all signed-in accounts.
-- Supabase Storage is required; this migration creates a private avatar bucket.
begin;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_avatar_path_check;
alter table public.profiles add constraint profiles_avatar_path_check check(avatar_path is null or (
 split_part(avatar_path,'/',1)=id::text and avatar_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'
));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('keuanganmu-avatars','keuanganmu-avatars',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists read_own_keuanganmu_avatar on storage.objects;
create policy read_own_keuanganmu_avatar on storage.objects for select to authenticated
using(bucket_id='keuanganmu-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists insert_own_keuanganmu_avatar on storage.objects;
create policy insert_own_keuanganmu_avatar on storage.objects for insert to authenticated
with check(bucket_id='keuanganmu-avatars' and (storage.foldername(name))[1]=auth.uid()::text and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$');
drop policy if exists delete_unused_keuanganmu_avatar on storage.objects;
create policy delete_unused_keuanganmu_avatar on storage.objects for delete to authenticated
using(bucket_id='keuanganmu-avatars' and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.avatar_path=storage.objects.name));

create or replace function public.set_profile_avatar(chosen_path text default null) returns text
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if chosen_path is not null then
  if split_part(chosen_path,'/',1)<>auth.uid()::text or chosen_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' then raise exception 'Invalid avatar path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='keuanganmu-avatars' and name=chosen_path) then raise exception 'Avatar file not found'; end if;
 end if;
 update public.profiles set avatar_path=chosen_path where id=auth.uid();
 if not found then raise exception 'Profile not found'; end if;
 return chosen_path;
end;$$;
revoke all on function public.set_profile_avatar(text) from public,anon;
grant execute on function public.set_profile_avatar(text) to authenticated;
commit;
