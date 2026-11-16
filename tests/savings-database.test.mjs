import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('PostgreSQL savings RPC enforces ownership, Premium, exact deposits and idempotent retries',async()=>{
 const db=new PGlite();
 const user='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',trial='10000000-0000-4000-8000-000000000003';
 const goal='20000000-0000-4000-8000-000000000001',second='20000000-0000-4000-8000-000000000002',foreign='20000000-0000-4000-8000-000000000003';
 const request='30000000-0000-4000-8000-000000000001';
 const deposit=(id=request,g=goal,amount=500000)=>db.query('select * from public.deposit_assistant_goal($1,$2,$3)',[id,g,amount]);
 const authenticate=async(id)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')};
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to authenticated,anon,service_role;`);
  for(const name of ['schema','assistant','learning','premium','assistant-savings'])await db.exec(await fs.readFile(new URL(`../supabase/${name}.sql`,import.meta.url),'utf8'));
  // Applying the new migration twice preserves data and function permissions.
  await db.exec(await fs.readFile(new URL('../supabase/assistant-savings.sql',import.meta.url),'utf8'));
  for(const id of [user,other,trial])await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query("update profiles set paid_until=now()+interval '30 days' where id=any($1::uuid[])",[[user,other]]);
  await db.query("insert into goals(id,user_id,title,target,saved) values($1,$2,'Liburan ke Jepang',20000000,100000),($3,$2,'Laptop',10000000,0),($4,$5,'Private goal',10000000,0)",[goal,user,second,foreign,other]);
  await authenticate(user);
  assert.equal(Number((await deposit()).rows[0].saved),600000);
  assert.equal(Number((await deposit()).rows[0].saved),600000,'retry must not double the deposit');
  await Promise.all([deposit(),deposit()]);assert.equal(Number((await deposit()).rows[0].saved),600000);
  await assert.rejects(()=>deposit(request,goal,500001),/Conflicting/);
  // A reused id on a different goal cannot update that goal either.
  await assert.rejects(()=>deposit(request,second,500000),/Conflicting/);
  assert.equal(Number((await db.query('select saved from goals where id=$1',[second])).rows[0].saved),0);
  for(const amount of [null,0,-1,0.5,1e12+1])await assert.rejects(()=>deposit('30000000-0000-4000-8000-000000000002',goal,amount),/Invalid/);
  await assert.rejects(()=>deposit('30000000-0000-4000-8000-000000000003',foreign),/Goal not found/);
  assert.equal((await db.query('select * from assistant_goal_deposits')).rows.length,1);
  assert.equal((await db.query('select * from transactions')).rows.length,0,'saving must not create income or expenses');
  await db.query('select deposit_goal($1,$2)',[goal,100000]);
  assert.equal(Number((await deposit('30000000-0000-4000-8000-000000000004',goal,500000)).rows[0].saved),1200000,'manual and assistant deposits both add to the latest balance');
  await assert.rejects(()=>db.query('insert into assistant_goal_deposits(id,user_id,goal_id,amount) values($1,$2,$3,1)',['30000000-0000-4000-8000-000000000005',user,goal]),/permission denied/);
  await authenticate(other);assert.equal((await db.query('select * from assistant_goal_deposits')).rows.length,0);
  await assert.rejects(()=>deposit(request,goal),/Goal not found/);
  await authenticate(trial);await assert.rejects(()=>deposit(),/Premium subscription required/);
  await db.exec('reset role');await db.query("update profiles set paid_until=now()-interval '1 second' where id=$1",[user]);
  await authenticate(user);await assert.rejects(()=>deposit(),/Premium subscription required/);
  await db.exec('reset role; set role anon');await assert.rejects(()=>deposit(),/permission denied/);
 }finally{await db.close()}
});
