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
 let root,loseResponse=false;
 const calls=[],applied=new Set();
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
  const {LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  const props={premium:true,active:true,session:{user:{id:'user-a'}},db,onLoadGoals:async()=>goals,onRecord:async()=>{throw Error('Savings must never be recorded as expenses')},onDeposit:async request=>{
   calls.push(request);const goal=goals.find(g=>g.id===request.goalId);assert.ok(goal);
   if(!applied.has(request.id)){goal.saved+=request.amount;applied.add(request.id)}
   if(loseResponse){loseResponse=false;throw Error('Response lost after commit')}
   return {...goal};
  }};
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Assistant,props))));
  await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
  await submit('tambahkan tabungan ke Jepang 500000');
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
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
