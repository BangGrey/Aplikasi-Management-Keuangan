import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validUsername,normalizeUsername} from '../src/username.mjs';
import {createLoginHandler} from '../netlify/functions/login-username.mjs';
test('usernames normalize consistently and enforce format',()=>{
 assert.equal(normalizeUsername(' Muchi_01 '),'muchi_01');
 assert.equal(validUsername('Muchi_01'),true);
 for(const value of ['ab','1muchi','muchi name','<script>','a'.repeat(25),'name@example.com',null])assert.equal(validUsername(value),false);
});
function setup({found=true,passwordOK=true,allowed=true,lookupError=false}={}){
 const calls=[];
 const admin={rpc:async(name,args)=>{calls.push({name,args});return {data:allowed,error:null}},from(){return {select(){return this},eq(key,value){calls.push({key,value});return this},maybeSingle:async()=>({data:found?{id:'user-a'}:null,error:lookupError?Error('db'):null})}},auth:{admin:{getUserById:async id=>{calls.push({id});return {data:{user:{email:'private@example.com'}},error:null}}}}};
 const handler=createLoginHandler({getAdmin:()=>admin,hashSecret:()=> 'test-secret',getAuth:()=>({auth:{signInWithPassword:async credentials=>{calls.push({credentials});return {data:{session:passwordOK?{access_token:'access',refresh_token:'refresh'}:null},error:passwordOK?null:Error('bad password')}}}})});
 return {handler,calls};
}
const event={httpMethod:'POST',headers:{'x-nf-client-connection-ip':'192.0.2.1'},body:JSON.stringify({username:'MUCHI_01',password:'test-password'})};
test('username resolution verifies password then returns tokens without lookup email',async()=>{
 const {handler,calls}=setup();const response=await handler(event);
 assert.equal(response.statusCode,200);assert.deepEqual(JSON.parse(response.body),{access_token:'access',refresh_token:'refresh'});
 assert.ok(!response.body.includes('private@example.com'));
 assert.ok(calls.some(c=>c.key==='username'&&c.value==='muchi_01'));
 assert.ok(calls.some(c=>c.credentials?.email==='private@example.com'&&c.credentials.password==='test-password'));
 const hashes=calls.filter(c=>c.name==='consume_login_attempt').map(c=>c.args.bucket_hash_value);
 assert.equal(hashes.length,2);assert.ok(hashes.every(h=>/^[a-f0-9]{64}$/.test(h)));assert.notEqual(hashes[0],hashes[1]);
});
test('unknown username and wrong password have identical public errors',async()=>{
 const missing=await setup({found:false}).handler(event),wrong=await setup({passwordOK:false}).handler(event);
 assert.equal(missing.statusCode,401);assert.equal(missing.body,wrong.body);
 assert.ok(!missing.body.includes('private@example.com'));
});
test('rate limit fails closed before password verification; bad inputs never resolve accounts',async()=>{
 const limited=setup({allowed:false});assert.equal((await limited.handler(event)).statusCode,429);assert.ok(!limited.calls.some(c=>c.credentials));
 const {handler,calls}=setup();assert.equal((await handler({...event,httpMethod:'GET'})).statusCode,405);assert.equal((await handler({...event,body:'!'})).statusCode,400);assert.equal((await handler({...event,body:'null'})).statusCode,401);assert.equal(calls.length,0);
 assert.equal((await setup({lookupError:true}).handler(event)).statusCode,503);
});
