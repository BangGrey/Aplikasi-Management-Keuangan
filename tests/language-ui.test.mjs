import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {act} from 'react';

test('language switches throughout the app, persists after reload, and preserves saved transaction values',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{url:'https://keuanganmu.example/'});
 const previous=new Map();
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,fetch:async()=>({ok:true,json:async()=>({quotes:[],history:[]})})})){
  previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 const server=await createServer({configFile:false,envFile:false,server:{watch:null},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'}});
 let app;
 const text=()=>document.body.textContent;
 const click=async(element)=>{assert.ok(element,'Expected a clickable element');await act(async()=>element.click())};
 const nav=label=>[...document.querySelectorAll('nav button')].find(b=>b.textContent.startsWith(label));
 const choose=async(value)=>{await act(async()=>{const select=document.querySelector('.header-right .language-switch select');select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})};
 try{
  await server.pluginContainer.buildStart({});
  await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
  assert.equal(document.documentElement.lang,'id');assert.ok(text().includes('Uang lebih terarah.'));
  assert.ok(!document.querySelector('.sidebar'),'new visitors see the introduction first');
  await click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Jelajahi demo')));
  assert.ok(document.querySelector('.sidebar'));assert.ok(text().includes('Keuangan tenang, hati senang.'));
  await choose('en');assert.equal(document.documentElement.lang,'en');assert.equal(localStorage.getItem('keuanganmu-language'),'en');
  assert.ok(text().includes('Peaceful finances, happy heart.'));assert.ok(text().includes('Total income'));assert.ok(text().includes('income transactions'));assert.ok(!text().includes('transaksi pemasukan'));
  assert.ok(document.querySelector('.brand').textContent.includes('tabunganmu'));
  await click(nav('Income'));assert.ok(text().includes('Income records')||text().includes('income records'));
  await click([...document.querySelectorAll('.heading-actions button')].find(b=>b.textContent.includes('Record transaction')));
  const form=document.querySelector('.modal form');assert.ok(form);
  const category=form.querySelector('[name=category]');assert.equal(category.options[0].value,'Makanan');assert.equal(category.options[0].textContent,'Food & drinks');
  form.querySelector('[name=title]').value='Kopi Saya';form.querySelector('[name=amount]').value='5000';form.querySelector('[name=type]').value='expense';category.value='Makanan';
  await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  const stored=JSON.parse(localStorage.getItem('kantong-demo-transactions')).find(t=>t.title==='Kopi Saya');
  assert.ok(stored);assert.equal(stored.category,'Makanan');assert.equal(stored.type,'expense');assert.equal(stored.amount,5000);
  await click(nav('Savings'));await click([...document.querySelectorAll('.savings-tabs button')].find(b=>b.textContent.includes('Gold savings')));
  assert.ok(text().includes('Record gold'));assert.ok(text().includes('Galeri24 · Galeri24 brand'));
  await click(nav('Themes'));assert.ok(text().includes('Cute characters'));assert.ok(text().includes('As peaceful as a morning garden.'));
  await click(nav('Subscription'));assert.ok(text().includes('Unlimited savings goals'));assert.equal(document.querySelectorAll('.plan-option').length,4);
  await click(nav('Profile'));assert.ok(document.querySelector('.language-full'));assert.ok(text().includes('Display language'));
  await click(document.querySelector('[aria-controls="financial-assistant-panel"]'));
  assert.ok(document.querySelector('#financial-assistant-panel').textContent.includes('Unlock with Premium'));
  await choose('id');assert.ok(text().includes('Bahasa tampilan'));assert.ok(text().includes('Buka dengan Premium'));assert.equal(document.documentElement.lang,'id');
  await choose('en');
  await act(async()=>app.appRoot.unmount());app=null;
  // The saved preference is used before the first render after a reload.
  server.moduleGraph.invalidateAll();
  await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
  assert.equal(document.documentElement.lang,'en');assert.ok(text().includes('Peaceful finances, happy heart.'));assert.ok(document.title.includes('Your money'));
 }finally{
  if(app)await act(async()=>app.appRoot.unmount());
  await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
