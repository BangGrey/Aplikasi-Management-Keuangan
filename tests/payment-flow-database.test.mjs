import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createCheckoutHandler} from '../netlify/functions/checkout.mjs';
import {createPaymentStatusHandler} from '../netlify/functions/payment-status.mjs';
import {createWebhookHandler} from '../netlify/functions/midtrans-webhook.mjs';
import {hasPaidSubscription} from '../src/premium.mjs';

test('Sandbox checkout and verified settlement update real PostgreSQL orders and Premium exactly once, even before a delayed webhook',async()=>{
 const database=new PGlite(),user='10000000-0000-4000-8000-000000000001',serverKey='SB-Mid-server-test';
 let settled=false,orderId;const requests=[];
 const profile=async()=>(await database.query('select * from profiles where id=$1',[user])).rows[0];
 const db={auth:{getUser:async()=>({data:{user:{id:user,email:'user@example.test'}},error:null})},
  from(){const filters=[];return {
   select(){return this},eq(key,value){filters.push([key,value]);return this},
   insert:async order=>{await database.query('insert into orders(id,user_id,amount,plan_id,duration_months,duration_days,status) values($1,$2,$3,$4,$5,$6,$7)',[order.id,order.user_id,order.amount,order.plan_id,order.duration_months,order.duration_days,order.status]);return {error:null}},
   async single(){return this.maybeSingle()},async maybeSingle(){
    const result=await database.query('select * from orders where '+filters.map(([key],i)=>`${key}=$${i+1}`).join(' and '),filters.map(([,value])=>value));return {data:result.rows[0]||null,error:null};
   },
  }},
  rpc:async(name,args)=>{assert.equal(name,'activate_subscription');await database.exec('set role service_role');try{await database.query('select activate_subscription($1)',[args.payment_order_id]);return {error:null}}finally{await database.exec('reset role')}},
 };
 const request=async(url,options)=>{
  requests.push(url);
  if(url.endsWith('/snap/v1/transactions')){orderId=JSON.parse(options.body).transaction_details.order_id;return {ok:true,json:async()=>({redirect_url:'https://app.sandbox.midtrans.com/snap/test'})}}
  return {ok:true,status:200,json:async()=>({order_id:orderId,status_code:settled?'200':'201',gross_amount:'60000.00',currency:'IDR',transaction_status:settled?'settlement':'pending',fraud_status:'accept'})};
 };
 const shared={getAdmin:()=>db,request,isProduction:()=>false,authorization:()=> 'Basic test'};
 try{
  await database.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;`);
  await database.exec(await fs.readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  await database.exec(await fs.readFile(new URL('../supabase/subscription-plans.sql',import.meta.url),'utf8'));
  await database.query('insert into auth.users values($1)',[user]);
  const checkout=createCheckoutHandler({...shared,serverKey:()=>serverKey,siteUrl:()=> 'https://example.netlify.app',newId:()=> 'test-order'});
  const response=await checkout({httpMethod:'POST',headers:{authorization:'Bearer test'},body:'{"planId":"quarterly"}'});
  assert.equal(response.statusCode,200);assert.equal(orderId,'KT-SB-test-order');assert.equal((await profile()).paid_until,null);
  const status=createPaymentStatusHandler(shared),event={httpMethod:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({orderId,paid:true,transaction_status:'settlement'})};
  assert.equal(JSON.parse((await status(event)).body).paid,false);assert.equal((await profile()).paid_until,null);
  settled=true;assert.equal(JSON.parse((await status(event)).body).paid,true);
  const paidProfile=await profile(),paidUntil=new Date(paidProfile.paid_until).toISOString();
  assert.equal(hasPaidSubscription(paidProfile,{user:{id:user}}),true);
  assert.equal((await database.query("select paid_until between now()+interval '3 months'-interval '2 seconds' and now()+interval '3 months'+interval '2 seconds' as valid from profiles where id=$1",[user])).rows[0].valid,true);
  assert.equal((await database.query('select status from orders where id=$1',[orderId])).rows[0].status,'paid');
  const body={order_id:orderId,status_code:'200',gross_amount:'60000.00'};body.signature_key=createHash('sha512').update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`).digest('hex');
  const webhook=createWebhookHandler({...shared,serverKey:()=>serverKey});
  assert.equal((await webhook({httpMethod:'POST',body:JSON.stringify(body)})).statusCode,200);
  await status(event);assert.equal(new Date((await profile()).paid_until).toISOString(),paidUntil);
  assert.ok(requests.every(url=>url.includes('.sandbox.midtrans.com/')));
 }finally{await database.close()}
});
