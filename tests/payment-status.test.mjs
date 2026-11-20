import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPaymentConfigHandler} from '../netlify/functions/payment-config.mjs';
import {createPaymentStatusHandler} from '../netlify/functions/payment-status.mjs';
import {createCheckoutHandler} from '../netlify/functions/checkout.mjs';
import {production,authHeader} from '../netlify/lib/common.mjs';

test('payment configuration defaults to Sandbox and never exposes server credentials',async()=>{
 const before=process.env.MIDTRANS_IS_PRODUCTION;
 try{delete process.env.MIDTRANS_IS_PRODUCTION;assert.equal(production(),false)}finally{if(before===undefined)delete process.env.MIDTRANS_IS_PRODUCTION;else process.env.MIDTRANS_IS_PRODUCTION=before}
 for(const [key,mode,ready] of [['',false,false],['  ',false,false],['SB-Mid-server-test',false,true],['Mid-server-new-scoped',false,true],['opaque-key-v2',false,true],['opaque-key-v2',true,true]]){
  const handler=createPaymentConfigHandler({serverKey:()=>key,signatureSecret:()=> 'signing-secret-test',isProduction:()=>mode}),response=await handler({httpMethod:'GET'});
  assert.deepEqual(JSON.parse(response.body),{environment:mode?'production':'sandbox',ready,serverKeyConfigured:ready,signatureSecretConfigured:true,signatureVerification:'signature_secret',configurationIssue:ready?null:'missing_server_key'});
  assert.ok(!response.body.includes('scoped'));assert.ok(!response.body.includes('opaque-key'));assert.ok(!response.body.includes('signing-secret-test'));assert.equal((await handler({httpMethod:'POST'})).statusCode,405);
 }
 const legacy=createPaymentConfigHandler({serverKey:()=> 'legacy-key',signatureSecret:()=>'',isProduction:()=>false});
 assert.equal(JSON.parse((await legacy({httpMethod:'GET'})).body).signatureVerification,'legacy_server_key');
 const original=process.env.MIDTRANS_SERVER_KEY;
 try{process.env.MIDTRANS_SERVER_KEY='  opaque-server-key  ';assert.equal(authHeader(),'Basic '+Buffer.from('opaque-server-key:').toString('base64'))}finally{if(original===undefined)delete process.env.MIDTRANS_SERVER_KEY;else process.env.MIDTRANS_SERVER_KEY=original}
});

function fixture({owner='user-a',authenticated=true,status='settlement',fraud='accept',code='200',amount='60000.00',currency='IDR',savedStatus='pending',orderId='KT-SB-example',mode=false,httpStatus=200,rpcError=null}={}){
 const applied=[],requests=[],filters=[];
 const order={id:orderId,user_id:owner,amount:60000,status:savedStatus};
 const db={auth:{getUser:async()=>({data:{user:authenticated?{id:'user-a'}:null},error:null})},
  from:()=>{let matchOwner;return {select(){return this},eq(key,value){filters.push([key,value]);if(key==='user_id')matchOwner=value;return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:matchOwner===owner?order:null,error:null})}},
  rpc:async(name,args)=>{applied.push({name,args});return {error:rpcError}}};
 const handler=createPaymentStatusHandler({getAdmin:()=>db,isProduction:()=>mode,authorization:()=> 'Basic test',request:async(url,options)=>{
  requests.push({url,options});return {ok:httpStatus===200,status:httpStatus,json:async()=>({order_id:order.id,gross_amount:amount,currency,status_code:code,transaction_status:status,...(fraud===undefined?{}:{fraud_status:fraud})})};
 }});
 return {handler,applied,requests,filters,event:{httpMethod:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({orderId})}};
}

test('status checks activate Premium from trusted Sandbox settlement or accepted capture',async()=>{
 for(const status of ['settlement','capture']){
  const f=fixture({status}),response=await f.handler(f.event);assert.equal(response.statusCode,200);
  assert.equal(JSON.parse(response.body).paid,true);assert.equal(JSON.parse(response.body).environment,'sandbox');
  assert.deepEqual(f.applied,[{name:'activate_subscription',args:{payment_order_id:'KT-SB-example'}}]);
  assert.ok(f.requests[0].url.startsWith('https://api.sandbox.midtrans.com/'));
  assert.ok(f.filters.some(([key,value])=>key==='user_id'&&value==='user-a'));
 }
 const live=fixture({mode:true,orderId:'KT-LIVE-example'});assert.equal((await live.handler(live.event)).statusCode,200);assert.ok(live.requests[0].url.startsWith('https://api.midtrans.com/'));
});

test('pending, fraud challenges, failures and forged return parameters cannot activate Premium',async()=>{
 for(const options of [{status:'pending'},{status:'deny'},{status:'expire'},{status:'cancel'},{status:'refund'},{status:'capture',fraud:'challenge'},{status:'settlement',fraud:'deny'},{code:'201'},{httpStatus:404}]){
  const f=fixture(options),response=await f.handler({...f.event,body:JSON.stringify({orderId:'KT-SB-example',paid:true,transaction_status:'settlement',status_code:'200'})});
  assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).paid,false);assert.equal(f.applied.length,0);
 }
 for(const options of [{amount:'1.00'},{currency:'USD'},{mode:true},{rpcError:Error('database unavailable')}]){
  const f=fixture(options),response=await f.handler(f.event);assert.ok(response.statusCode>=400);
  assert.ok(!response.body.includes('database unavailable'));
 }
});

test('status checks enforce login and ownership, validate requests and reuse already paid records',async()=>{
 const anonymous=fixture();assert.equal((await anonymous.handler({...anonymous.event,headers:{}})).statusCode,401);assert.equal(anonymous.requests.length,0);
 const expired=fixture({authenticated:false});assert.equal((await expired.handler(expired.event)).statusCode,401);
 const other=fixture({owner:'user-b'});assert.equal((await other.handler(other.event)).statusCode,404);assert.equal(other.requests.length,0);
 assert.equal((await other.handler({...other.event,body:'{}'})).statusCode,200);assert.equal(other.requests.length,0);
 for(const body of ['!','null','[]','{"orderId":4}','{"orderId":"../../other"}']){const f=fixture();assert.equal((await f.handler({...f.event,body})).statusCode,400);assert.equal(f.requests.length,0)}
 const paid=fixture({savedStatus:'paid'});assert.equal(JSON.parse((await paid.handler(paid.event)).body).paid,true);assert.equal(paid.requests.length,0);assert.equal(paid.applied.length,0);
 assert.equal((await paid.handler({...paid.event,httpMethod:'GET'})).statusCode,405);
});

test('checkout selects the API host by environment, supports scoped keys and sends callback URLs',async()=>{
 for(const mode of [false,true]){
  const requests=[],orders=[];let key='opaque-scoped-key',reject=false;
  const handler=createCheckoutHandler({getAdmin:()=>({auth:{getUser:async()=>({data:{user:{id:'user-a',email:'user@example.test'}}})},from:()=>({insert:async order=>{orders.push(order);return {error:null}}})}),newId:()=> 'example',siteUrl:()=> 'https://example.netlify.app',isProduction:()=>mode,serverKey:()=>key,authorization:()=> 'Basic test',request:async(url,options)=>{
   requests.push({url,options,payload:JSON.parse(options.body)});if(reject)return {ok:false,status:401};return {ok:true,json:async()=>({redirect_url:`https://app.${mode?'':'sandbox.'}midtrans.com/snap/test`})};
  }});
  const event={httpMethod:'POST',headers:{authorization:'Bearer test'},body:'{"planId":"quarterly"}'};
  const response=await handler(event),data=JSON.parse(response.body);assert.equal(response.statusCode,200);
  assert.equal(data.orderId,`KT-${mode?'LIVE':'SB'}-example`);
  assert.equal(requests[0].options.headers['X-Override-Notification'],'https://example.netlify.app/.netlify/functions/midtrans-webhook');
  assert.equal(requests[0].payload.callbacks.finish,`https://example.netlify.app/langganan?payment_order=${data.orderId}`);
  reject=true;const denied=await handler(event);assert.equal(denied.statusCode,502);assert.equal(JSON.parse(denied.body).code,'midtrans_auth_failed');assert.equal(requests.length,2);key='';assert.equal((await handler(event)).statusCode,503);assert.equal(requests.length,2);
 }
});
