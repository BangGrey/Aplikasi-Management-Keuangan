import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';

test('visitors can explore previews, switch language, choose a plan, sign in, register and enter the demo',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://keuanganmu.example/'}),previous=new Map();
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,fetch:async()=>({ok:true,json:async()=>({quotes:[],history:[]})})})){
  previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 const server=await createServer({configFile:false,envFile:false,server:{watch:null},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'}});
 let app,root;
 const click=async element=>{assert.ok(element);await act(async()=>element.click())};
 const text=()=>document.body.textContent;
 try{
  await server.pluginContainer.buildStart({});
  await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
  assert.ok(document.querySelector('.landing-page'));assert.ok(!document.querySelector('.sidebar'));
  assert.ok(document.title.startsWith('Tabunganmu'));
  const support=document.querySelector('.landing-footer .service-email');assert.equal(support.getAttribute('href'),'mailto:tabunganmusupport@gmail.com');
  assert.ok(document.querySelector('.service-copyright').textContent.includes('© '+new Date().getFullYear()+' Tabunganmu.'));
  assert.ok(text().includes('Uang lebih terarah.'));assert.equal(document.querySelectorAll('.landing-faq details').length,6);
  assert.equal(document.querySelectorAll('.feature-slide-tabs [role=tab]').length,6);
  await click(document.getElementById('preview-tab-assistant'));assert.ok(document.querySelector('.feature-slide-image').src.endsWith('/previews/assistant-id.svg'));
  await click(document.getElementById('preview-tab-savings'));assert.ok(document.querySelector('.feature-slide-image').src.endsWith('/previews/savings-id.svg'));
  const language=document.querySelector('.landing-header .language-switch select');
  await act(async()=>{language.value='en';language.dispatchEvent(new dom.window.Event('change',{bubbles:true}))});
  assert.ok(text().includes('Give your money direction.'));assert.ok(text().includes('3 months'));assert.ok(text().includes('150,000'));assert.ok(text().includes('299,000'));
  assert.ok(document.querySelector('.service-copyright').textContent.includes('All rights reserved.'));
  assert.ok(document.querySelector('.feature-slide-image').src.endsWith('/previews/savings-en.svg'));
  await click(document.querySelector('.landing-login'));assert.equal(document.querySelector('.modal [name=identifier]').placeholder,'name@email.com or user_01');assert.equal(document.querySelector('.modal select').value,'login');
  await click(document.querySelector('.modal .close'));
  await click([...document.querySelectorAll('.plan-option')].find(b=>b.textContent.includes('6 months')));
  await click(document.querySelector('.landing-pricing-card>.landing-button'));
  assert.equal(localStorage.getItem('keuanganmu-selected-plan'),'half-yearly');assert.equal(document.querySelector('.modal select').value,'register');assert.ok(document.querySelector('.modal [name=email]'));
  await click(document.querySelector('.modal .close'));
  await click(document.querySelector('.landing-demo'));assert.ok(document.querySelector('.sidebar'));assert.equal(window.location.hash,'#demo');
  assert.equal(document.querySelector('.app-footer .service-email').getAttribute('href'),'mailto:tabunganmusupport@gmail.com');assert.ok(document.querySelector('.brand').textContent.includes('tabunganmu'));
  await act(async()=>{window.location.hash='beranda';window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'))});assert.ok(document.querySelector('.landing-page'));
  // Premium users see renewal actions without signup or first-subscription buttons.
  await act(async()=>app.appRoot.unmount());app=null;
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  const {default:Subscription}=await server.ssrLoadModule('/src/Subscription.jsx');
  const {LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');
  let selected='quarterly',premium=true;const chosen=[];const profile={paid_until:'2030-01-31T14:15:16Z'};
  const render=()=>root.render(React.createElement(LanguageProvider,null,React.createElement(Subscription,{premium,profile,demo:false,busy:false,selected,onSelect:value=>{selected=value;render()},onCheckout:id=>chosen.push(id),onRefresh:()=>{}})));
  await act(async()=>render());
  assert.ok(text().includes('Renew your membership'));assert.ok(text().includes('April 30, 2030'));assert.ok(!text().includes('Subscribe for'));assert.ok(!text().includes('Sign up'));
  await click([...document.querySelectorAll('.plan-option')].find(b=>b.textContent.includes('1 year')));assert.ok(text().includes('January 31, 2031'));
  await click(document.querySelector('.subscription-pay'));assert.deepEqual(chosen,['yearly']);assert.ok(document.querySelector('.subscription-pay').textContent.includes('Renew for 1 year'));
  premium=false;profile.paid_until='2020-01-01T00:00:00Z';await act(async()=>render());
  assert.ok(text().includes('Premium expired on'));assert.ok(document.querySelector('.subscription-pay').textContent.includes('Renew for 1 year'));assert.ok(text().includes('starts when payment is confirmed'));
 }finally{
  if(app)await act(async()=>app.appRoot.unmount());if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
