import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';

test('assistant deposits to a unique goal, asks on ambiguity, and retries with the same request id',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://keuanganmu.example/'});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const previous=new Map();
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true})){
  previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 const server=await createServer({configFile:false,envFile:false,server:{watch:null}});
 let root,loseResponse=false,loseCreationResponse=false;
 const calls=[],applied=new Set(),creations=[],created=new Map();
 let goals=[{id:'japan',title:'Liburan ke Jepang',saved:1000000,target:20000000}];
 const db={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{name:'Muchi'},error:null}),limit:async()=>({data:[],error:null})})};
 const click=async(button)=>{assert.ok(button);await act(async()=>button.click())};
 const text=()=>document.body.textContent;
 const submit=async(message)=>{
  await act(async()=>{
   const input=document.querySelector('.assistant-input input');
   Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,message);
   input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  });
  await act(async()=>document.querySelector('.assistant-input').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
 };
 try{
  await server.pluginContainer.buildStart({});
  const {default:Assistant}=await server.ssrLoadModule('/src/Assistant.jsx');
  const {getTheme}=await server.ssrLoadModule('/src/themes.mjs');
  const {LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  const props={premium:true,active:true,session:{user:{id:'user-a'}},db,theme:getTheme('spongebob'),userName:'user_01',userAvatar:'https://example.test/avatar.jpg',onLoadGoals:async()=>goals,onRecord:async()=>{throw Error('Savings must never be recorded as expenses')},onCreateGoal:async request=>{
   creations.push(request);
   if(!created.has(request.id)){const goal={id:request.id,title:request.title,target:request.target,saved:request.initialSaved};created.set(request.id,goal);goals.push(goal)}
   if(loseCreationResponse){loseCreationResponse=false;throw Error('Lost creation response')}
   return created.get(request.id);
  },onDeposit:async request=>{
   calls.push(request);const goal=goals.find(g=>g.id===request.goalId);assert.ok(goal);
   if(!applied.has(request.id)){goal.saved+=request.amount;applied.add(request.id)}
   if(loseResponse){loseResponse=false;throw Error('Response lost after commit')}
   return {...goal};
  }};
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Assistant,props))));
  await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
  await submit('tambahkan tabungan ke Jepang 500000');
  assert.ok(document.querySelector('.assistant-header [data-character="sponge"]'));
  assert.ok(document.querySelector('.chat-row.assistant [data-character="sponge"]'));
  assert.equal(document.querySelector('.chat-row.user .chat-message-author').textContent,'user_01');
  assert.ok(document.querySelector('.chat-row.user .user-avatar img').src.includes('/avatar.jpg'));
  assert.equal(calls.length,1);assert.equal(calls[0].goalId,'japan');assert.equal(calls[0].amount,500000);
  assert.equal(goals[0].saved,1500000);assert.ok(text().includes('Total terkumpul sekarang'));assert.ok(text().includes('Tabungan berhasil diperbarui.'));
  goals.push({id:'study',title:'Kuliah di Jepang',saved:0,target:50000000});
  await submit('tambah tabungan Jepang 500rb');assert.equal(calls.length,1);assert.ok(text().includes('Ada beberapa target'));
  const choice=[...document.querySelectorAll('.savings-chat-actions button')].find(b=>b.textContent==='Kuliah di Jepang');
  await act(async()=>{choice.click();choice.click()});
  assert.equal(calls.length,2);assert.equal(calls[1].goalId,'study');assert.equal(goals[1].saved,500000);
  await submit('tambah tabungan Singapura 500000');assert.equal(calls.length,2);assert.ok(text().includes('belum menemukan target'));
  await submit('jangan tambah tabungan Jepang 500000');assert.equal(calls.length,2);
  loseResponse=true;
  await submit('isi tabungan liburan ke Jepang 250000');assert.equal(calls.length,3);assert.equal(goals[0].saved,1750000);
  assert.ok(text().includes('belum dapat dikonfirmasi'));
  await submit('isi tabungan liburan ke Jepang 250000');assert.equal(calls.length,3,'repeating an unresolved request must not create a new deposit');
  await click([...document.querySelectorAll('.savings-chat-actions button')].find(b=>b.textContent.includes('Coba lagi')));
  assert.equal(calls.length,4);assert.equal(calls[2].id,calls[3].id);assert.equal(goals[0].saved,1750000);
  // Saved chat records retain the same operation ids and success status.
  const history=JSON.parse(localStorage.getItem('kantong-assistant-user-a-chat'));
  assert.ok(history.filter(m=>m.savingsSaved).length===3);
  assert.equal(history.find(m=>m.savings?.id===calls[2].id).savingsSaved,true);
  // New assistant replies follow the selected interface language.
  const lang=await server.ssrLoadModule('/src/language.mjs');lang.setLanguage('en');
  await submit('add savings to liburan Jepang 100000');
  assert.equal(calls.length,5);assert.equal(goals[0].saved,1850000);assert.ok(text().includes('I added'));
  await submit('add savings to Singapore 100000');assert.equal(calls.length,5);assert.ok(text().includes('I could not find a savings goal'));
  lang.setLanguage('id');
  await submit('aku ingin membuat tabungan untuk membeli rumah impian');
  assert.equal(creations.length,0);assert.ok(text().includes('Berapa total target dana'));
  await submit('rumah impian tabungan awal 500000');
  let draft=JSON.parse(localStorage.getItem('kantong-assistant-user-a-goal-draft'));
  assert.equal(draft.initialSaved,500000);assert.equal(draft.target,null);assert.equal(draft.title,'Rumah impian');
  // A reload preserves the unfinished conversation and the meaning of the initial amount.
  await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Assistant,props))));
  await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
  await submit('target 500 juta');assert.equal(creations.length,0);assert.ok(document.querySelector('.goal-chat-card'));
  draft=JSON.parse(localStorage.getItem('kantong-assistant-user-a-goal-draft'));
  assert.equal(draft.target,500000000);assert.equal(draft.initialSaved,500000);
  await submit('tabungan awal 750000');await submit('tabungan awal 500000');
  assert.equal(document.querySelectorAll('.goal-chat-card').length,1,'corrections must replace earlier unsubmitted previews');
  const createButton=document.querySelector('.goal-chat-card button');
  await act(async()=>{createButton.click();createButton.click()});
  assert.equal(creations.length,1);assert.equal(creations[0].initialSaved,500000);assert.equal(creations[0].target,500000000);
  assert.ok(text().includes('berhasil dibuat'));assert.equal(localStorage.getItem('kantong-assistant-user-a-goal-draft'),null);
  await submit('buat tabungan dana darurat target 50 juta tabungan awal 100000');
  loseCreationResponse=true;await click(document.querySelector('.goal-chat-card button'));
  const failedId=creations[1].id;assert.ok(text().includes('Pembuatan tabungan belum dapat dikonfirmasi'));
  await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Assistant,props))));
  await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
  await click(document.querySelector('.goal-chat-card button'));
  assert.equal(creations.length,3);assert.equal(creations[2].id,failedId);assert.equal(created.size,2,'reload and retry must not duplicate a goal');
  await submit('buat tabungan laptop target 20 juta');
  await click(document.querySelector('.goal-chat-card .savings-cancel'));
  assert.equal(creations.length,3);assert.equal(document.querySelector('.goal-chat-card'),null);
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
