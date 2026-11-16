import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyMemory,remember} from '../src/learning.mjs';
import {validateIntent} from '../netlify/lib/ai-contract.mjs';
import {createHandler} from '../netlify/functions/assistant-ai.mjs';
const date='2026-11-16';
test('corrections apply next time, personal beats shared, and type/title must match',()=>{
 const t={title:'Ongkir',type:'expense',category:'Lainnya',amount:5000};
 let memories=remember([],t,'Transportasi');
 assert.equal(applyMemory(t,memories).category,'Transportasi');
 memories=remember(memories,t,'Belanja');
 assert.equal(memories.length,1);assert.equal(memories[0].examples,2);
 assert.equal(applyMemory(t,memories,[{term:'ongkir',type:'expense',category:'Transportasi'}]).category,'Belanja');
 assert.equal(applyMemory({...t,type:'income'},memories).category,'Lainnya');
 assert.equal(applyMemory({...t,title:'Ongkir lain'},memories).category,'Lainnya');
 assert.equal(applyMemory(t,[]).category,'Lainnya');
 assert.throws(()=>remember([],t,'made up'));
});
test('model output cannot bypass transaction or date validation',()=>{
 const valid={kind:'transaction',type:'income',title:'Gaji',amount:5000000,category:'Gaji'};
 assert.equal(validateIntent(valid,date).transaction.date,date);
 for(const override of [{amount:0},{amount:-1},{amount:1.5},{amount:1000000000001},{type:'delete'},{category:'bad'},{title:''}])assert.throws(()=>validateIntent({...valid,...override},date));
 assert.throws(()=>validateIntent({kind:'query',query_kind:'balance',from:'2026-11-15',to:'2026-11-01'},date));
 assert.throws(()=>validateIntent({kind:'query',query_kind:'expense',from:null,to:'2026-02-30'},date));
 assert.throws(()=>validateIntent({kind:'delete'},date));
});
function fixture({allowed=true,refuse=false,paidUntil='2026-12-16T12:00:00Z'}={}){
 const calls=[];
 const builder={select(){return this},eq(key,value){calls.push([key,value]);return this},order(){return this},single:async()=>({data:{id:'user-a',paid_until:paidUntil},error:null}),limit:async()=>({data:[],error:null})};
 const handler=createHandler({now:()=>Date.parse(date+'T12:00:00Z'),apiKey:()=> 'test-only',getAdmin:()=>({auth:{getUser:async()=>({data:{user:{id:'user-a'}},error:null})},rpc:async()=>({data:allowed,error:null}),from(table){calls.push(['table',table]);return builder}}),request:async(url,options)=>{
  calls.push(['provider',JSON.parse(options.body)]);
  return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[refuse?{type:'refusal'}:{type:'output_text',text:JSON.stringify({kind:'transaction',type:'expense',title:'Ongkir',amount:5000,category:'Transportasi'})}]}]})};
 }});
 return {handler,calls};
}
const event={httpMethod:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({text:'ongkir tadi lima ribu',today:date})};
test('API uses scoped memory, no financial dataset, and returns proposal only',async()=>{
 const {handler,calls}=fixture();const response=await handler(event);
 assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).kind,'transaction');
 assert.ok(calls.some(([key,value])=>key==='user_id'&&value==='user-a'));
 assert.ok(!calls.some(([key,value])=>key==='table'&&value==='transactions'));
 const payload=calls.find(c=>c[0]==='provider')[1];assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);
});
test('API blocks quota exhaustion and handles refusals without writes',async()=>{
 const limited=fixture({allowed:false});assert.equal((await limited.handler(event)).statusCode,429);assert.ok(!limited.calls.some(c=>c[0]==='provider'));
 const refused=fixture({refuse:true});assert.equal((await refused.handler(event)).statusCode,502);
 assert.equal((await refused.handler({...event,headers:{}})).statusCode,401);
 assert.equal((await refused.handler({...event,body:'!'})).statusCode,400);
});
test('API blocks trial-only and expired subscribers before calling OpenAI',async()=>{
 for(const paidUntil of [null,'2026-11-15T12:00:00Z','2026-11-16T12:00:00Z']){
  const blocked=fixture({paidUntil});assert.equal((await blocked.handler(event)).statusCode,403);assert.ok(!blocked.calls.some(c=>c[0]==='provider'));
 }
});
