import {test} from 'node:test';
import assert from 'node:assert/strict';
import {goalAmount,parseGoalCreation,validateGoalDraft,createSavingsGoal} from '../src/savings-goals.mjs';
import {validateIntent,validateGoalContext} from '../netlify/lib/ai-contract.mjs';

test('creation remembers a house goal and treats follow-up 500000 as initial savings, not the total target',()=>{
 let result=parseGoalCreation('aku ingin membuat tabungan untuk membeli rumah impian');
 assert.deepEqual(result.draft,{title:'Rumah impian',target:null,initialSaved:0});
 result=parseGoalCreation('rumah impian tabungan awal 500000',result.draft);
 assert.deepEqual(result.draft,{title:'Rumah impian',target:null,initialSaved:500000});
 result=parseGoalCreation('target 500 juta',result.draft);
 assert.deepEqual(result.draft,{title:'Rumah impian',target:500000000,initialSaved:500000});
 assert.ok(validateGoalDraft(result.draft));
 assert.equal(parseGoalCreation('berapa saldo saat ini?',result.draft),null);
 assert.equal(parseGoalCreation('beli kopi 5000',result.draft),null);
 assert.equal(parseGoalCreation('tambahkan tabungan Jepang 500000',result.draft),null);
 assert.equal(parseGoalCreation('halo',result.draft),null);
 assert.equal(parseGoalCreation('batal',result.draft).cancel,true);
 assert.equal(parseGoalCreation('tabungan awal 750000',result.draft).draft.initialSaved,750000);
});

test('one-message creation, initial-only starts, English, bare follow-ups and zero initial savings work',()=>{
 assert.deepEqual(parseGoalCreation('buat tabungan rumah impian target 1 miliar, tabungan awal 500rb').draft,{title:'Rumah impian',target:1e9,initialSaved:500000});
 const initial=parseGoalCreation('rumah impian tabungan awal 500000').draft;
 assert.equal(initial.target,null);assert.equal(initial.title,'Rumah impian');
 assert.equal(parseGoalCreation('500 juta',initial).draft.target,500000000);
 assert.deepEqual(parseGoalCreation('create savings for dream house target 500 million, initial savings 0').draft,{title:'Dream house',target:500000000,initialSaved:0});
 assert.deepEqual(parseGoalCreation('buat tabungan').draft,{title:'',target:null,initialSaved:0});
 assert.equal(parseGoalCreation('rumah impian',{title:'',target:null,initialSaved:0}).draft.title,'Rumah impian');
 assert.equal(parseGoalCreation('tambahkan tabungan Jepang 500000'),null);
});

test('creation validates amounts, refuses hypothetical and negative requests, and never guesses an unlabeled amount',()=>{
 for(const [input,expected]of [['500rb',500000],['0,5 juta',500000],['1 miliar',1e9],['Rp500.000',500000],['500,000',500000],['1 billion',1e9],['0',0]])assert.equal(goalAmount(input),expected,input);
 for(const input of ['-1','1.5','1,50','1000000000001','Infinity','500 USD'])assert.equal(goalAmount(input),null,input);
 for(const input of ['jangan buat tabungan rumah target 500 juta','kalau membuat tabungan rumah target 500 juta','buat tabungan rumah target 0','buat tabungan rumah target -1','buat tabungan rumah target 500 juta tabungan awal -5','create savings house target 500 USD','buat tabungan rumah dan mobil target 500 juta','buat tabungan rumah 500000'])assert.ok(parseGoalCreation(input)?.error,input);
 assert.equal(validateGoalDraft({title:'Rumah',target:null,initialSaved:500000}),false);
});

test('AI creation returns validated partial fields and bounded draft context only',()=>{
 assert.deepEqual(validateIntent({kind:'savings_create',title:'Rumah impian',amount:null,initial_saved:500000},'2026-11-16'),{kind:'savings_create',goal:{title:'Rumah impian',target:null,initialSaved:500000}});
 for(const override of [{amount:0},{amount:-1},{amount:1e12+1},{amount:1.5},{initial_saved:-1},{initial_saved:'500000'},{title:'x'.repeat(101)},{type:'expense'}])assert.throws(()=>validateIntent({kind:'savings_create',title:'Rumah',amount:500000000,initial_saved:500000,...override},'2026-11-16'));
 assert.deepEqual(validateGoalContext({title:'Rumah',target:null,initialSaved:500000,extra:'ignored'}),{title:'Rumah',target:null,initialSaved:500000});
 assert.throws(()=>validateGoalContext({title:'Rumah',target:null,initialSaved:-1}));
});

test('creation client uses a fixed id and passes target and initial savings separately',async()=>{
 const calls=[];const db={rpc:(name,args)=>{calls.push({name,args});return {single:async()=>({data:{id:'fixed',saved:500000}})}}};
 const request={id:'fixed',title:'Rumah impian',target:500000000,initialSaved:500000};
 await createSavingsGoal(db,request);await createSavingsGoal(db,request);
 assert.deepEqual(calls[0],{name:'create_assistant_goal',args:{record_id:'fixed',title_value:'Rumah impian',target_value:500000000,initial_saved:500000}});
 assert.deepEqual(calls[0],calls[1]);
 await assert.rejects(()=>createSavingsGoal(db,{...request,target:null}));
});
