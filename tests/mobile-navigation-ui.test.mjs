import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {act} from 'react';

test('mobile menu closes by button, backdrop, Escape and navigation; profile opens over the current page',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://tabunganmu.example/demo/pemasukan'}),previous=new Map();
  Object.defineProperty(dom.window,'innerWidth',{value:390,writable:true});
  dom.window.matchMedia=()=>({get matches(){return dom.window.innerWidth<=650},addEventListener(){},removeEventListener(){}});
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,fetch:async()=>({ok:true,json:async()=>({quotes:[],history:[]})})})){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const server=await createServer({configFile:false,envFile:false,server:{watch:null},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""'}});let app;
  const click=async element=>{assert.ok(element);await act(async()=>element.click())};
  const menu=()=>document.querySelector('.mobile-menu');
  const expectClosed=()=>{
    assert.equal(document.querySelector('.sidebar').getAttribute('aria-hidden'),'true');
    assert.equal(menu().getAttribute('aria-expanded'),'false');assert.notEqual(document.getElementById('root').inert,true);
    assert.notEqual(document.body.style.overflow,'hidden');
  };
  const open=async()=>{menu().focus();await click(menu());assert.ok(document.querySelector('.sidebar.open'));assert.equal(menu().getAttribute('aria-expanded'),'true');assert.equal(document.body.style.overflow,'hidden');assert.equal(document.getElementById('root').inert,true)};
  const historyEvent=action=>new Promise(resolve=>{window.addEventListener('popstate',resolve,{once:true});action()});
  try{
    await server.pluginContainer.buildStart({});await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
    expectClosed();assert.equal(document.querySelectorAll('#app-sidebar').length,1);
    await open();assert.equal(document.activeElement,document.querySelector('.sidebar-close'));
    // Keyboard focus wraps within the opened drawer.
    await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,cancelable:true})));
    assert.equal(document.activeElement,document.querySelector('.sidebar .account'));
    await click(document.querySelector('.sidebar-close'));expectClosed();assert.equal(document.activeElement,menu());
    await open();assert.notEqual(document.querySelector('.sidebar-backdrop').inert,true);
    await click(document.querySelector('.sidebar-backdrop'));expectClosed();
    await open();await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',cancelable:true})));expectClosed();
    await open();await click(document.querySelector('.sidebar nav a[href="/demo/pemasukan"]'));expectClosed();
    // The profile route displays a dialog without changing the financial page or its filters.
    const search=document.querySelector('.search input');
    await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(search,'Kopi');search.dispatchEvent(new dom.window.Event('input',{bubbles:true}))});
    document.documentElement.scrollTop=320;
    await open();await click(document.querySelector('.sidebar nav a[href="/demo/profil"]'));
    assert.ok(document.querySelector('.profile-dialog[aria-modal="true"]'));
    assert.equal(document.querySelector('.page-heading h1').textContent.trim(),'Setiap rezeki, tercatat rapi.');
    assert.equal(window.location.pathname,'/demo/profil');assert.equal(document.querySelector('.search input').value,'Kopi');assert.equal(document.documentElement.scrollTop,320);
    assert.equal(document.getElementById('root').inert,true);assert.equal(document.body.style.overflow,'hidden');
    assert.equal(document.querySelector('.sidebar').getAttribute('aria-hidden'),'true');assert.equal(document.activeElement,document.querySelector('.profile-dialog [data-dialog-close]'));
    await click(document.querySelector('.profile-dialog-header'));assert.ok(document.querySelector('.profile-dialog'),'clicking inside does not dismiss');
    await act(async()=>historyEvent(()=>document.querySelector('.profile-dialog [data-dialog-close]').click()));
    assert.equal(window.location.pathname,'/demo/pemasukan');assert.equal(document.querySelector('.profile-dialog'),null);expectClosed();
    assert.equal(document.querySelector('.search input').value,'Kopi');assert.equal(document.documentElement.scrollTop,320);
    // Forward restores the profile and the same background; Escape closes just the active dialog.
    await act(async()=>historyEvent(()=>window.history.forward()));assert.ok(document.querySelector('.profile-dialog'));
    await act(async()=>historyEvent(()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',cancelable:true}))));
    assert.equal(document.querySelector('.profile-dialog'),null);expectClosed();
    await open();await click(document.querySelector('.sidebar nav a[href="/demo/profil"]'));
    await act(async()=>historyEvent(()=>document.querySelector('.profile-backdrop').click()));assert.equal(document.querySelector('.profile-dialog'),null);expectClosed();
    // Resizing to desktop restores the fixed sidebar and releases the mobile scroll lock.
    await open();await act(async()=>{window.innerWidth=1024;window.dispatchEvent(new dom.window.Event('resize'))});
    assert.equal(document.querySelector('.sidebar').getAttribute('role'),null);assert.equal(document.querySelector('.sidebar-backdrop'),null);
    assert.equal(document.querySelectorAll('#app-sidebar').length,1);assert.notEqual(document.body.style.overflow,'hidden');assert.notEqual(document.getElementById('root').inert,true);
    // A bookmarked profile URL has a sensible close action even without a previous app entry.
    await act(async()=>app.appRoot.unmount());app=null;window.history.replaceState(null,'','/demo/profil');server.moduleGraph.invalidateAll();
    await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});assert.ok(document.querySelector('.profile-dialog'));
    await click(document.querySelector('.profile-dialog [data-dialog-close]'));assert.equal(window.location.pathname,'/demo');assert.equal(document.querySelector('.profile-dialog'),null);
  }finally{
    if(app)await act(async()=>app.appRoot.unmount());await server.close();dom.window.close();
    for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
  }
});
