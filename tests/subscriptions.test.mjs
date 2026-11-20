import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {subscriptionPlans,subscriptionExpiry} from '../src/subscription-plans.mjs';
import {createCheckoutHandler} from '../netlify/functions/checkout.mjs';
import {createWebhookHandler} from '../netlify/functions/midtrans-webhook.mjs';

test('catalog contains the requested prices and renewal previews preserve remaining time and month boundaries',()=>{
 assert.deepEqual(subscriptionPlans.map(p=>[p.id,p.amount,p.months,p.days]),[['monthly',29000,0,30],['quarterly',60000,3,0],['half-yearly',150000,6,0],['yearly',299000,12,0]]);
 const now=new Date('2026-11-16T00:00:00Z');
 assert.equal(subscriptionExpiry('2030-01-31T14:15:16Z',subscriptionPlans[1],now),'2030-04-30T14:15:16.000Z');
 assert.equal(subscriptionExpiry('2032-02-29T14:15:16Z',subscriptionPlans[3],now),'2033-02-28T14:15:16.000Z');
 assert.equal(subscriptionExpiry('2020-01-01',subscriptionPlans[1],now),'2027-02-16T00:00:00.000Z');
});
function checkoutFixture({authenticated=true,insertError=null}={}){
 const orders=[],requests=[];
 const handler=createCheckoutHandler({getAdmin:()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:'user-a',email:'user@example.test'}:null},error:null})},from:()=>({insert:async order=>{orders.push(order);return {error:insertError}}})}),request:async(url,options)=>{requests.push({url,payload:JSON.parse(options.body)});return {ok:true,json:async()=>({redirect_url:'https://app.sandbox.midtrans.com/snap/test'})}},newId:()=> 'test-order',authorization:()=> 'Basic test-only',serverKey:()=> 'SB-Mid-server-test',siteUrl:()=> 'https://keuanganmu.example',isProduction:()=>false});
 return {handler,orders,requests};
}
const event=body=>({httpMethod:'POST',headers:{authorization:'Bearer test-only'},body:JSON.stringify(body)});
test('checkout derives price and duration from the server catalog for every plan, ignoring client-supplied amounts',async()=>{
 for(const plan of subscriptionPlans){
  const {handler,orders,requests}=checkoutFixture();
  assert.equal((await handler(event({planId:plan.id,amount:1,duration_months:999}))).statusCode,200);
  assert.deepEqual(orders[0],{id:'KT-SB-test-order',user_id:'user-a',amount:plan.amount,plan_id:plan.id,duration_months:plan.months,duration_days:plan.days,status:'pending'});
  const snap=requests[0].payload;assert.equal(snap.transaction_details.gross_amount,plan.amount);assert.equal(snap.item_details[0].price,plan.amount);assert.ok(snap.item_details[0].name.includes(plan.label));
 }
 const legacy=checkoutFixture();assert.equal((await legacy.handler({...event({}),body:undefined})).statusCode,200);assert.equal(legacy.orders[0].plan_id,'monthly');
});
test('invalid plans, invalid sessions and failed persistence cannot reach Midtrans checkout',async()=>{
 for(const body of [null,[],{planId:'free'},{planId:'__proto__'},{planId:3},{planId:null}]){
  const f=checkoutFixture();assert.equal((await f.handler(event(body))).statusCode,400);assert.equal(f.orders.length,0);assert.equal(f.requests.length,0);
 }
 const anonymous=checkoutFixture();assert.equal((await anonymous.handler({...event({planId:'yearly'}),headers:{}})).statusCode,401);assert.equal(anonymous.orders.length,0);
 const expired=checkoutFixture({authenticated:false});assert.equal((await expired.handler(event({planId:'yearly'}))).statusCode,401);assert.equal(expired.requests.length,0);
 const unavailable=checkoutFixture({insertError:Error('Migration missing')});assert.equal((await unavailable.handler(event({planId:'yearly'}))).statusCode,500);assert.equal(unavailable.requests.length,0);
});

function webhookFixture(plan,{status='settlement',fraud='accept',verifiedAmount=plan.amount}={}){
 const applied=[],queries=[];
 const body={order_id:'KT-test-order',status_code:'200',gross_amount:plan.amount+'.00'};
 body.signature_key=createHash('sha512').update(`${body.order_id}${body.status_code}${body.gross_amount}test-key`).digest('hex');
 const handler=createWebhookHandler({getAdmin:()=>({from:()=>({select(){return this},eq(){return this},single:async()=>({data:{id:body.order_id,amount:plan.amount},error:null})}),rpc:async(name,args)=>{applied.push({name,args});return {error:null}}}),request:async url=>{queries.push(url);return {ok:true,json:async()=>({status_code:'200',order_id:body.order_id,gross_amount:String(verifiedAmount),transaction_status:status,fraud_status:fraud,currency:'IDR'})}},serverKey:()=> 'test-key',authorization:()=> 'Basic test-only',isProduction:()=>false});
 return {handler,applied,queries,event:{httpMethod:'POST',body:JSON.stringify(body)}};
}
test('signed notifications activate all plan prices only after verified paid status',async()=>{
 for(const plan of subscriptionPlans){const f=webhookFixture(plan);assert.equal((await f.handler(f.event)).statusCode,200);assert.equal(f.applied.length,1);assert.equal(f.applied[0].name,'activate_subscription');assert.ok(f.queries[0].includes('/status'))}
 for(const options of [{status:'pending'},{status:'capture',fraud:'challenge'},{status:'settlement',fraud:'deny'},{status:'deny'}]){const f=webhookFixture(subscriptionPlans[1],options);assert.equal((await f.handler(f.event)).statusCode,200);assert.equal(f.applied.length,0)}
 const mismatch=webhookFixture(subscriptionPlans[3],{verifiedAmount:1});assert.equal((await mismatch.handler(mismatch.event)).statusCode,400);assert.equal(mismatch.applied.length,0);
 const invalid=webhookFixture(subscriptionPlans[1]);assert.equal((await invalid.handler({...invalid.event,body:JSON.stringify({order_id:'KT-test-order',signature_key:'invalid'})})).statusCode,401);assert.equal(invalid.queries.length,0);
 assert.equal((await invalid.handler({...invalid.event,body:'null'})).statusCode,401);
});
