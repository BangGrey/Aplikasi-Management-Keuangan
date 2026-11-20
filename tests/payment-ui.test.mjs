import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act,useState} from 'react';

test('Sandbox return checks the server, shows pending until verified and refreshes the account to paid Premium',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.netlify.app/langganan?payment_order=KT-SB-example&transaction_status=settlement&status_code=200'}),previous=new Map();
 let paid=false,ready=true,refreshed=0,offline=false;const requests=[];
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true,fetch:async(url,options)=>{
  requests.push({url,options});if(offline)throw Error('Internal network error');return {ok:true,json:async()=>url.endsWith('payment-config')?{environment:'sandbox',ready}:{environment:'sandbox',paid,orderId:'KT-SB-example',transactionStatus:paid?'settlement':'pending'}};
 }})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true})}
 const server=await createServer({configFile:false,envFile:false,server:{watch:null}});let root;
 const session={user:{id:'user-a'},access_token:'test'};
 const click=async element=>{assert.ok(element);await act(async()=>element.click())};
 try{
  await server.pluginContainer.buildStart({});const {default:Subscription}=await server.ssrLoadModule('/src/Subscription.jsx');
  const {LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  function Harness(){const [premium,setPremium]=useState(false);return React.createElement(Subscription,{session,premium,profile:{paid_until:premium?'2030-12-01':null},demo:false,busy:false,selected:'quarterly',onSelect(){},onCheckout(){assert.fail('A status check must never create a checkout')},onRefresh:async()=>{refreshed++;setPremium(paid)}})}
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Harness))));
  assert.ok(document.body.textContent.includes('Mode Sandbox'));assert.ok(document.body.textContent.includes('masih menunggu'));assert.equal(refreshed,0);
  assert.ok(!document.body.textContent.includes('Premium sudah diaktifkan'));
  const statusRequest=requests.find(row=>row.url.endsWith('payment-status'));
  assert.deepEqual(JSON.parse(statusRequest.options.body),{orderId:'KT-SB-example'});assert.equal(statusRequest.options.headers.Authorization,'Bearer test');
  paid=true;await click(document.querySelector('.payment-panel .text-button'));
  assert.equal(refreshed,1);assert.ok(document.body.textContent.includes('Premium sudah diaktifkan'));
  assert.ok(document.querySelector('.subscription-pay').textContent.includes('Perpanjang'));
  // Missing or mismatched credentials prevent checkout without exposing secrets.
  await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));ready=false;
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Harness))));
  assert.ok(document.querySelector('.subscription-pay').disabled);assert.ok(document.body.textContent.includes('Pembayaran belum tersedia'));
  offline=true;await click(document.querySelector('.payment-panel .text-button'));
  assert.ok(document.querySelector('[role=alert]').textContent.includes('Pembayaran belum tersedia'));assert.ok(!document.body.textContent.includes('Internal network error'));
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
