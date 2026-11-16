import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validSignature,handler as webhook} from '../netlify/functions/midtrans-webhook.mjs';
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
