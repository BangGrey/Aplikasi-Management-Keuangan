import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSavingsDeposit,matchSavingsGoals,depositToSavings} from '../src/savings-assistant.mjs';
import {validateIntent} from '../netlify/lib/ai-contract.mjs';

test('savings deposits parse one IDR amount and a named goal in both languages',()=>{
 for(const text of ['tambahkan tabungan ke Jepang 500000','tambah tabungan liburan ke Jepang Rp500.000','sisihkan 500 ribu untuk tabungan Jepang','isi tabungan Jepang 0,5 juta','add savings to Japan 500,000','deposit 500k into Japan savings','record savings Japan IDR 500000']){
  const result=parseSavingsDeposit(text);assert.equal(result.deposit?.amount,500000,text);
  assert.ok(/Jepang|Japan/.test(result.deposit.target));
 }
 assert.equal(parseSavingsDeposit('tambahkan tabungan ke Jepang 500000').deposit.target,'Jepang');
 assert.equal(parseSavingsDeposit('beli kopi 5000'),null);
 assert.equal(parseSavingsDeposit('berapa saldo saat ini'),null);
});

test('savings questions, withdrawals, hypothetical commands and ambiguous amounts never write',()=>{
 for(const text of ['berapa tabungan Jepang 500000?','jangan tambah tabungan Jepang 500000','kalau tambah tabungan Jepang 500000','saya ingin menabung Jepang 500000','kurangi tabungan Jepang 500000','buat tabungan Jepang 500000','tambahkan tabungan Jepang','tambahkan tabungan 500000','tambah tabungan Jepang -500000','tambah tabungan Jepang 0','tambah tabungan Jepang 500000 dan laptop 100000','tambah tabungan Jepang dan laptop 500000','tambah tabungan Jepang 500000 besok','tambah tabungan emas 3 gram','add savings Japan $5000','add savings Japan USD 5000',"don't add savings Japan 5000",'if I deposit Japan 5000','withdraw Japan savings 5000']){
  assert.ok(parseSavingsDeposit(text)?.error,text);
 }
});

test('goal matching uses complete words and never picks an ambiguous target arbitrarily',()=>{
 const goals=[{id:'j1',title:'Liburan ke Jepang'},{id:'j2',title:'Kuliah di Jepang'},{id:'d',title:'Dana darurat'},{id:'b',title:'Liburan ke Jepang Barat'}];
 assert.deepEqual(matchSavingsGoals('Jepang',goals).map(g=>g.id),['j1','j2','b']);
 assert.deepEqual(matchSavingsGoals('liburan ke Jepang',goals).map(g=>g.id),['j1']);
 assert.deepEqual(matchSavingsGoals('DANA DARURAT',goals).map(g=>g.id),['d']);
 assert.deepEqual(matchSavingsGoals('Jepang',goals.slice(0,1)).map(g=>g.id),['j1']);
 for(const target of ['Jepa','Jepangz','Singapura','ke untuk tabungan'])assert.deepEqual(matchSavingsGoals(target,goals),[]);
 assert.equal(matchSavingsGoals('Jepang',[{id:'a',title:'Jepang'},{id:'b',title:'Jepang'}]).length,2);
});

test('savings intent validation rejects invented kinds, invalid amounts and transaction metadata',()=>{
 assert.deepEqual(validateIntent({kind:'savings_deposit',title:' Jepang ',amount:500000},'2026-11-16'),{kind:'savings_deposit',deposit:{target:'Jepang',amount:500000}});
 for(const overrides of [{amount:0},{amount:-1},{amount:1.5},{amount:1e12+1},{amount:'500000'},{title:''},{title:'x'.repeat(101)},{type:'expense'},{category:'Lainnya'}]){
  assert.throws(()=>validateIntent({kind:'savings_deposit',title:'Jepang',amount:500000,...overrides},'2026-11-16'));
 }
});

test('deposit client calls only the premium savings RPC and preserves retry identifiers',async()=>{
 const calls=[],row={id:'j1',saved:1000000};
 const db={rpc(name,args){calls.push({name,args});return {single:async()=>({data:row,error:null})}}};
 const request={id:'fixed-request',goalId:'j1',amount:500000};
 assert.equal(await depositToSavings(db,request),row);await depositToSavings(db,request);
 assert.deepEqual(calls[0],{name:'deposit_assistant_goal',args:{request_id:'fixed-request',goal_id:'j1',deposit_amount:500000}});
 assert.deepEqual(calls[0],calls[1]);
 await assert.rejects(()=>depositToSavings(db,{...request,amount:NaN}));
 const error=Error('Premium subscription required');
 await assert.rejects(()=>depositToSavings({rpc:()=>({single:async()=>({error})})},request),/Premium/);
});
