import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';

test('slideshow rotates, supports manual navigation, pauses for reading and respects reduced motion',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://tabunganmu.example/',pretendToBeVisual:true}),previous=new Map();
 let reduced=false;const media=new dom.window.EventTarget();Object.defineProperty(media,'matches',{get:()=>reduced});dom.window.matchMedia=()=>media;
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true})){
  previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 const server=await createServer({configFile:false,envFile:false,server:{watch:null}});let root;
 const active=()=>document.querySelector('.feature-slide-tabs [aria-selected=true]').id.replace('preview-tab-','');
 const click=async element=>{assert.ok(element);await act(async()=>element.click())};
 const tick=()=>act(async()=>await new Promise(resolve=>setTimeout(resolve,75)));
 try{
  await server.pluginContainer.buildStart({});
  const {default:Slideshow,featureSlides}=await server.ssrLoadModule('/src/FeatureSlideshow.jsx');
  const {default:LanguageSwitch,LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx');
  // Every image served by the carousel exists and is valid SVG in both languages.
  for(const slide of featureSlides)for(const language of ['id','en']){
   const source=await fs.readFile(new URL(`../public/previews/${slide.id}-${language}.svg`,import.meta.url),'utf8');
   const svg=new JSDOM(source,{contentType:'image/svg+xml'});assert.equal(svg.window.document.documentElement.tagName,'svg');assert.ok(source.includes('tabunganmu'));svg.window.close();
  }
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(LanguageSwitch),React.createElement(Slideshow,{intervalMs:50}))));
  assert.equal(active(),'overview');await tick();assert.equal(active(),'transactions');
  await click(document.querySelector('.feature-slide-play'));assert.equal(document.querySelector('.feature-slide-play').getAttribute('aria-pressed'),'true');
  await tick();assert.equal(active(),'transactions');
  await click(document.querySelector('[aria-label="Slide berikutnya"]'));assert.equal(active(),'savings');
  await act(async()=>document.getElementById('preview-tab-savings').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
  assert.equal(active(),'gold');await tick();assert.equal(active(),'gold','keyboard focus must stop automatic rotation');
  await click(document.querySelector('.feature-slide-play'));await tick();assert.equal(active(),'assistant');
  const region=document.querySelector('.feature-slideshow');
  await act(async()=>region.dispatchEvent(new dom.window.MouseEvent('mouseover',{bubbles:true,relatedTarget:null})));
  await tick();assert.equal(active(),'assistant','hovering pauses the slide');
  await act(async()=>region.dispatchEvent(new dom.window.MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body})));
  await tick();assert.equal(active(),'themes');
  Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});await act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));
  await tick();assert.equal(active(),'themes');
  Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});await act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));
  await tick();assert.equal(active(),'overview','rotation wraps around after the last slide');
  reduced=true;await act(async()=>media.dispatchEvent(new dom.window.Event('change')));await tick();assert.equal(active(),'overview');
  assert.equal(document.querySelector('.feature-slide-play').getAttribute('aria-pressed'),'true');
  await click(document.getElementById('preview-tab-assistant'));
  await act(async()=>{const select=document.querySelector('.language-switch select');select.value='en';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))});
  assert.ok(document.querySelector('.feature-slide-image').src.endsWith('/assistant-en.svg'));assert.ok(document.querySelector('.feature-slide-image').alt.includes('personal assistant'));
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
