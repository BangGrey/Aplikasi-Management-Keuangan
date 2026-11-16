import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {subscriptionPlans} from '../src/subscription-plans.mjs';

test('PostgreSQL preserves old orders and extends active memberships by the paid plan exactly once',async()=>{
 const db=new PGlite(),user='10000000-0000-4000-8000-000000000001',expired='10000000-0000-4000-8000-000000000002';
 const activate=async id=>{await db.exec('set role service_role');try{await db.query('select activate_subscription($1)',[id])}finally{await db.exec('reset role')}};
 const paidUntil=async id=>new Date((await db.query('select paid_until from profiles where id=$1',[id])).rows[0].paid_until).toISOString();
 const order=async(id,plan,uid=user)=>db.query('insert into orders(id,user_id,amount,plan_id,duration_months,duration_days) values($1,$2,$3,$4,$5,$6)',[id,uid,plan.amount,plan.id,plan.months,plan.days]);
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;`);
  await db.exec(await fs.readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values($1),($2)',[user,expired]);
  await db.query("update profiles set paid_until='2030-01-31T14:15:16Z' where id=$1",[user]);
  await db.query("insert into orders(id,user_id,amount,status) values('legacy-pending',$1,29000,'pending'),('legacy-paid',$1,29000,'paid')",[user]);
  const migration=await fs.readFile(new URL('../supabase/subscription-plans.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
  const legacy=(await db.query("select * from orders where id='legacy-pending'")).rows[0];assert.equal(legacy.plan_id,'monthly');assert.equal(legacy.duration_days,30);
  await activate('legacy-paid');assert.equal(await paidUntil(user),'2030-01-31T14:15:16.000Z');
  await order('quarter',subscriptionPlans[1]);await activate('quarter');assert.equal(await paidUntil(user),'2030-04-30T14:15:16.000Z');
  await activate('quarter');assert.equal(await paidUntil(user),'2030-04-30T14:15:16.000Z','duplicate webhook cannot add a period twice');
  await order('half',subscriptionPlans[2]);await activate('half');assert.equal(await paidUntil(user),'2030-10-30T14:15:16.000Z');
  await order('year',subscriptionPlans[3]);await activate('year');assert.equal(await paidUntil(user),'2031-10-30T14:15:16.000Z');
  await activate('legacy-pending');assert.equal(await paidUntil(user),'2031-11-29T14:15:16.000Z');
  await db.query("update profiles set paid_until=now()-interval '1 day' where id=$1",[expired]);
  await order('restart',subscriptionPlans[3],expired);await activate('restart');
  assert.equal((await db.query("select paid_until between now()+interval '1 year'-interval '2 seconds' and now()+interval '1 year'+interval '2 seconds' as valid from profiles where id=$1",[expired])).rows[0].valid,true);
  await assert.rejects(()=>db.query("insert into orders(id,user_id,amount,plan_id,duration_months,duration_days) values('tampered',$1,1,'quarterly',3,0)",[user]),/check constraint/);
  await assert.rejects(()=>db.query("insert into orders(id,user_id,amount,plan_id,duration_months,duration_days) values('tampered-duration',$1,60000,'quarterly',12,0)",[user]),/check constraint/);
  await db.exec('set role authenticated');await assert.rejects(()=>db.query("select activate_subscription('year')"),/permission denied/);await assert.rejects(()=>db.query("insert into orders(id,user_id,amount) values('client-order',$1,29000)",[user]),/permission denied/);await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int as paid from orders where status='paid'")).rows[0].paid,6);
 }finally{await db.close()}
});
