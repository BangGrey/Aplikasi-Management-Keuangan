import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('avatar policies isolate private photos and keep profile updates scoped to the authenticated account',async()=>{
 const db=new PGlite(),a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',path=a+'/20000000-0000-4000-8000-000000000001.jpg',next=a+'/20000000-0000-4000-8000-000000000002.jpg',foreign=b+'/20000000-0000-4000-8000-000000000001.jpg';
 const auth=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')};
 const upload=name=>db.query("insert into storage.objects(bucket_id,name) values('keuanganmu-avatars',$1)",[name]);
 const set=path=>db.query('select set_profile_avatar($1)',[path]);
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;
   create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text references storage.buckets(id),name text,primary key(bucket_id,name));alter table storage.objects enable row level security;
   create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
  await db.exec(await fs.readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  const migration=await fs.readFile(new URL('../supabase/profile-avatars.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
  await db.query('insert into auth.users values($1),($2)',[a,b]);
  // Expired users can still manage their profile photos.
  await db.query("update profiles set trial_ends_at=now()-interval '1 day'");
  const bucket=(await db.query('select * from storage.buckets')).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),2097152);assert.ok(!bucket.allowed_mime_types.includes('image/svg+xml'));
  await auth(a);await upload(path);await set(path);
  assert.equal((await db.query('select avatar_path from profiles')).rows[0].avatar_path,path);
  await assert.rejects(()=>set(foreign),/Invalid avatar path/);await assert.rejects(()=>upload(foreign),/row-level security/);
  await assert.rejects(()=>set(a+'/30000000-0000-4000-8000-000000000000.jpg'),/not found/);
  await db.query('delete from storage.objects where name=$1',[path]);assert.equal((await db.query('select * from storage.objects')).rows.length,1,'current photo cannot be deleted before unlinking');
  await upload(next);await set(next);await db.query('delete from storage.objects where name=$1',[path]);assert.equal((await db.query('select * from storage.objects')).rows.length,1);
  await assert.rejects(()=>db.query("update profiles set paid_until=now()+interval '1 year'"),/permission denied/);
  await auth(b);assert.equal((await db.query('select * from storage.objects')).rows.length,0);await assert.rejects(()=>set(next),/Invalid avatar path/);
  await auth(a);await set(null);await db.query('delete from storage.objects where name=$1',[next]);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  await db.exec('reset role;set role anon');await assert.rejects(()=>set(null),/permission denied/);
 }finally{await db.close()}
});
