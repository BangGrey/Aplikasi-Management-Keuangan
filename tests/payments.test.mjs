import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validSignature,handler as webhook,createWebhookHandler} from '../netlify/functions/midtrans-webhook.mjs';
import {handler as checkout} from '../netlify/functions/checkout.mjs';
test('Midtrans signature accepts authentic payload and rejects altered amounts',()=>{
 const body={order_id:'KT-test',status_code:'200',gross_amount:'29000.00'};
 body.signature_key=createHash('sha512').update('KT-test20029000.00test-key').digest('hex');
 assert.equal(validSignature(body,'test-key'),true);
 assert.equal(validSignature({...body,gross_amount:'1.00'},'test-key'),false);
 assert.equal(validSignature(body,'wrong-key'),false);
 for(const value of ['',null,'garbage','aa'])assert.equal(validSignature({...body,signature_key:value},'test-key'),false);
});
test('functions reject wrong methods and malformed JSON',async()=>{
 assert.equal((await checkout({httpMethod:'GET'})).statusCode,405);
 assert.equal((await webhook({httpMethod:'GET'})).statusCode,405);
 assert.equal((await webhook({httpMethod:'POST',body:'!'})).statusCode,400);
});

test('scoped Server Keys authorize the API while only the dedicated Signature Secret Key authenticates webhook signatures',async()=>{
 const signingKey='dedicated-signature-secret',apiKey='opaque-api-key',calls=[];
 const body={order_id:'KT-SB-test',status_code:'200',gross_amount:'29000.00'};
 const signed=key=>({...body,signature_key:createHash('sha512').update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest('hex')});
 const handler=createWebhookHandler({serverKey:()=>apiKey,signatureSecret:()=>signingKey,isProduction:()=>false,
  getAdmin:()=>{calls.push('db');return {from:()=>({select(){return this},eq(){return this},single:async()=>({data:{id:body.order_id,status:'pending',amount:29000},error:null})}),rpc:async()=>{calls.push('activate');return {error:null}}}},
  authorization:()=> 'Basic '+Buffer.from(apiKey+':').toString('base64'),
  request:async(url,options)=>{calls.push('status');assert.ok(url.includes('api.sandbox.midtrans.com'));assert.equal(options.headers.Authorization,'Basic '+Buffer.from(apiKey+':').toString('base64'));return {ok:true,json:async()=>({order_id:body.order_id,gross_amount:body.gross_amount,currency:'IDR',status_code:'200',transaction_status:'settlement'})}},
 });
 assert.equal((await handler({httpMethod:'POST',body:JSON.stringify(signed(apiKey))})).statusCode,401);assert.deepEqual(calls,[]);
 assert.equal((await handler({httpMethod:'POST',body:JSON.stringify(signed(signingKey))})).statusCode,200);assert.deepEqual(calls,['db','status','activate']);
 const absent=createWebhookHandler({serverKey:()=>'',signatureSecret:()=>''});assert.equal((await absent({httpMethod:'POST',body:JSON.stringify(signed(signingKey))})).statusCode,503);
});
