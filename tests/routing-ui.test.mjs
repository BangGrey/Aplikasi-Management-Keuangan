import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {act} from 'react';

test('account deep links resume after login, use clean URLs and return home on logout',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'https://tabunganmu.example/tabungan'});
  const previous=new Map();let notify,resolveSession;
  const profile={id:'user-a',username:'user_01',trial_ends_at:'2020-01-01',paid_until:null};
  const db={
    auth:{getSession:()=>new Promise(resolve=>{resolveSession=resolve}),onAuthStateChange:callback=>{
      notify=callback;return {data:{subscription:{unsubscribe(){}}}};
    }},
    from(table){
      const result={data:table==='profiles'?profile:[],error:null};
      return {select(){return this},eq(){return this},order(){return this},
        single:async()=>result,then:(resolve,reject)=>Promise.resolve(result).then(resolve,reject)};
    },
  };
  for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,__routingDb:db})){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const server=await createServer({configFile:false,envFile:false,server:{watch:null},
    ssr:{noExternal:['@supabase/supabase-js']},
    define:{'import.meta.env.VITE_SUPABASE_URL':'"https://example.supabase.co"','import.meta.env.VITE_SUPABASE_ANON_KEY':'"test"'},
    plugins:[{name:'mock-routing-auth',enforce:'pre',resolveId:id=>id==='@supabase/supabase-js'?'\0routing-auth':null,
      load:id=>id==='\0routing-auth'?'export const createClient=()=>globalThis.__routingDb':null}],
  });
  let app;
  const click=async element=>{assert.ok(element);await act(async()=>element.click())};
  try{
    await server.pluginContainer.buildStart({});
    await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
    assert.ok(document.querySelector('.app-loading'));
    await act(async()=>resolveSession({data:{session:null}}));
    assert.ok(document.querySelector('.landing-page'));assert.ok(!document.querySelector('.sidebar'));
    assert.equal(document.querySelector('.modal select').value,'login');
    assert.equal(window.location.pathname,'/tabungan');
    const session={user:{id:'user-a',email:'user@example.com'},access_token:'test'};
    await act(async()=>notify('SIGNED_IN',session));
    assert.equal(window.location.pathname,'/tabungan');assert.ok(document.querySelector('.savings-tabs'));
    assert.ok(!document.querySelector('.modal'));
    for(const path of ['/pemasukan','/pengeluaran','/tema','/langganan','/profil','/ringkasan']){
      await click(document.querySelector('.sidebar nav a[href="'+path+'"]'));
      assert.equal(window.location.pathname,path);assert.equal(window.location.hash,'');
      assert.equal(document.querySelector('.sidebar [aria-current="page"]').getAttribute('href'),path);
    }
    // A valid saved session restores the requested page on a fresh load.
    await act(async()=>app.appRoot.unmount());app=null;
    window.history.replaceState(null,'','/profil');server.moduleGraph.invalidateAll();
    await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
    await act(async()=>resolveSession({data:{session}}));
    assert.equal(window.location.pathname,'/profil');assert.ok(document.querySelector('.language-full'));
    await act(async()=>notify('SIGNED_OUT',null));
    assert.equal(window.location.pathname,'/beranda');assert.ok(document.querySelector('.landing-page'));
    // Legacy section links still open their section, including after reload.
    await act(async()=>app.appRoot.unmount());app=null;
    window.history.replaceState(null,'','/?ref=old#fitur');server.moduleGraph.invalidateAll();
    const scrolled=[];dom.window.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this.id)};
    await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
    await act(async()=>resolveSession({data:{session:null}}));
    assert.equal(window.location.pathname,'/fitur');assert.equal(window.location.hash,'');
    assert.equal(window.location.search,'?ref=old');assert.equal(scrolled.at(-1),'fitur');
    // Navigation migration must not consume Supabase's token callback fragment.
    await act(async()=>app.appRoot.unmount());app=null;
    const callback='/#access_token=example&refresh_token=example&type=signup';
    window.history.replaceState(null,'',callback);server.moduleGraph.invalidateAll();
    await act(async()=>{app=await server.ssrLoadModule('/src/main.jsx')});
    assert.equal(window.location.pathname+window.location.hash,callback);
    await act(async()=>resolveSession({data:{session}}));
    assert.equal(window.location.pathname,'/ringkasan');assert.equal(window.location.hash,'');
  }finally{
    if(app)await act(async()=>app.appRoot.unmount());await server.close();dom.window.close();
    for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
  }
});
