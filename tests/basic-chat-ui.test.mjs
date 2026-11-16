import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';

test('basic chat works before naming, follows renamed assistants and avoids API calls or financial writes',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://tabunganmu.example/'}),previous=new Map();
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  const apiCalls=[],writes=[],names=[];let currentName='';
  for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true,fetch:async(...args)=>{apiCalls.push(args);throw Error('Basic chat must not call OpenAI')}})){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const db={from:()=>({select(){return this},eq(){return this},
    maybeSingle:async()=>({data:{name:currentName},error:null}),limit:async()=>({data:[],error:null}),
    upsert:async value=>{names.push(value.name);currentName=value.name;return {error:null}}})};
  const server=await createServer({configFile:false,envFile:false,server:{watch:null}});let root;
  const click=async element=>{assert.ok(element);await act(async()=>element.click())};
  const submit=async message=>{
    await act(async()=>{
      const input=document.querySelector('.assistant-input input');
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(input,message);
      input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
    });
    await act(async()=>document.querySelector('.assistant-input').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  };
  const reply=()=>[...document.querySelectorAll('.chat-row.assistant p')].at(-1)?.textContent;
  try{
    await server.pluginContainer.buildStart({});
    const {default:Assistant}=await server.ssrLoadModule('/src/Assistant.jsx');
    const {LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');
    const language=await server.ssrLoadModule('/src/language.mjs');
    const {getTheme}=await server.ssrLoadModule('/src/themes.mjs');
    const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
    let props={premium:true,active:true,session:{user:{id:'user-a'}},db,userName:'user_01',theme:getTheme('kitty'),
      onRecord:async record=>{writes.push(record);return record},onRead:async()=>{writes.push('read');return []},
      onLoadGoals:async()=>{writes.push('goals');return []},onDeposit:async()=>writes.push('deposit'),onCreateGoal:async()=>writes.push('create')};
    const render=()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Assistant,props)));
    await act(async()=>render());await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
    await submit('halo');assert.match(reply(),/Halo, user_01!/);assert.match(reply(),/Kamu ingin menamai saya/);
    assert.deepEqual(names,[]);assert.equal(document.querySelector('.assistant-header strong').textContent,'Asisten keuangan');
    await submit('aku akan memanggil kamu Muchi');assert.deepEqual(names,['Muchi']);
    await submit('halo');assert.equal(reply(),'Halo, user_01! Apa yang bisa Muchi bantu untuk kamu?');
    // Even when generative AI is enabled, these messages are answered locally.
    await click(document.querySelector('.learning-settings input[type="checkbox"]'));
    for(const message of ['apa kabar?','makasih','apa yang bisa kamu bantu?','sampai jumpa']){
      await submit(message);assert.ok(reply().includes('Muchi'));
    }
    assert.deepEqual(apiCalls,[]);assert.deepEqual(writes,[]);
    assert.equal(document.querySelector('.chat-receipt'),null);
    await submit('buat tabungan rumah target 500 juta');
    const draft=localStorage.getItem('kantong-assistant-user-a-goal-draft');assert.ok(draft);
    await submit('halo');assert.equal(localStorage.getItem('kantong-assistant-user-a-goal-draft'),draft);
    await submit('batal');assert.equal(localStorage.getItem('kantong-assistant-user-a-goal-draft'),null);
    await click(document.querySelector('[aria-label="Ganti nama asisten"]'));
    await submit('halo');assert.match(reply(),/mengganti nama saya/);assert.deepEqual(names,['Muchi']);
    await submit('Miko');assert.deepEqual(names,['Muchi','Miko']);
    props={...props,userName:'user_02'};await act(async()=>render());
    await submit('halo');assert.equal(reply(),'Halo, user_02! Apa yang bisa Miko bantu untuk kamu?');
    language.setLanguage('en');await submit('hello Miko');assert.equal(reply(),'Hello, user_02! What can Miko help you with?');
    assert.deepEqual(apiCalls,[]);assert.deepEqual(writes,[]);
    // This addition keeps the existing Premium access gate.
    props={...props,premium:false};await act(async()=>render());
    assert.equal(document.querySelector('.assistant-input'),null);
    await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
    assert.ok(document.querySelector('.assistant-locked'));
  }finally{
    if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
    for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
  }
});
