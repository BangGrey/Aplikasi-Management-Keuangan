import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';

test('signup and resend use the deployed origin; expired-link recovery needs only email and never creates another account',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://ruangkeuanganmu.netlify.app/beranda'}),previous=new Map();
  for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true})){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const calls=[],notices=[];let done=0,resendError=null,loginError=null,release;
  const db={auth:{
    signUp:async input=>{calls.push(['signup',input]);return {error:null}},
    resend:input=>{calls.push(['resend',input]);return new Promise(resolve=>{release=()=>resolve({error:resendError})})},
    signInWithPassword:async()=>({error:loginError}),
  }};
  const server=await createServer({configFile:false,envFile:false,server:{watch:null}});let root;
  const click=async element=>{assert.ok(element);await act(async()=>element.click())};
  const select=async action=>act(async()=>{
    const input=document.querySelector('select');input.value=action;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  });
  const submit=()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  try{
    await server.pluginContainer.buildStart({});
    const {default:AuthForm}=await server.ssrLoadModule('/src/AuthForm.jsx');
    const {LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');
    const lang=await server.ssrLoadModule('/src/language.mjs');
    const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(AuthForm,{db,onNotice:message=>notices.push(message),onDone:()=>{done++}}))));
    document.querySelector('[name=email]').value=' user@example.com ';
    document.querySelector('[name=username]').value='USER_01';document.querySelector('[name=password]').value='testing-password';
    await act(async()=>submit());
    assert.equal(calls[0][0],'signup');assert.equal(calls[0][1].options.emailRedirectTo,'https://ruangkeuanganmu.netlify.app');
    assert.equal(calls[0][1].options.data.username,'user_01');assert.equal(done,1);
    await click([...document.querySelectorAll('button')].find(button=>button.textContent==='Belum menerima email konfirmasi?'));
    assert.equal(document.querySelector('select').value,'resend');assert.ok(document.querySelector('[name=email]'));
    assert.equal(document.querySelector('[name=username]'),null);assert.equal(document.querySelector('[name=password]'),null);
    document.querySelector('[name=email]').value=' user@example.com ';
    await act(async()=>{submit();submit()});
    assert.equal(calls.length,2,'one email request while a response is pending');
    assert.deepEqual(calls[1],['resend',{type:'signup',email:'user@example.com',options:{emailRedirectTo:'https://ruangkeuanganmu.netlify.app'}}]);
    assert.ok(document.querySelector('button.primary').disabled);
    await act(async()=>release());
    assert.ok(document.querySelector('[role=status]').textContent.includes('Jika email tersebut terdaftar dan belum dikonfirmasi'));
    assert.equal(done,1,'recovery remains visible so the user can read the instructions');
    resendError={code:'over_email_send_rate_limit',status:429,message:'rate limit'};
    await act(async()=>submit());await act(async()=>release());
    assert.match(document.querySelector('[role=alert]').textContent,/Terlalu banyak permintaan email/);
    assert.equal(document.querySelector('[role=status]'),null);
    assert.equal(calls.filter(([kind])=>kind==='signup').length,1);
    await select('login');assert.equal(document.querySelector('[role=alert]'),null);
    document.querySelector('[name=identifier]').value='user@example.com';document.querySelector('[name=password]').value='testing-password';
    loginError={code:'email_not_confirmed',message:'Email not confirmed'};
    await act(async()=>submit());assert.match(document.querySelector('[role=alert]').textContent,/Kirim ulang email konfirmasi/);
    lang.setLanguage('en');await select('resend');
    assert.ok(document.querySelector('button.primary').textContent.includes('Resend confirmation'));
    resendError=null;document.querySelector('[name=email]').value='user@example.com';
    await act(async()=>submit());await act(async()=>release());
    assert.ok(document.querySelector('[role=status]').textContent.includes('awaiting confirmation'));
  }finally{
    if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
    for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
  }
});
