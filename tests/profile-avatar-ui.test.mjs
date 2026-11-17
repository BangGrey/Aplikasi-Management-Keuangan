import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import React,{act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('trial profile previews, saves and removes a photo; every character has a rendered avatar',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://keuanganmu.example/'}),previous=new Map();
 let drawArgs;
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(...args){drawArgs=args}});
 dom.window.HTMLCanvasElement.prototype.toBlob=callback=>callback(new Blob([new Uint8Array([255,216,255,224])],{type:'image/jpeg'}));
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true,createImageBitmap:async()=>({width:800,height:600,close(){}})})){
  previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 const server=await createServer({configFile:false,envFile:false,server:{watch:null}});let root;
 const user='10000000-0000-4000-8000-000000000001',profile={id:user,username:'user_01',paid_until:null,trial_ends_at:new Date(Date.now()+7*86400000).toISOString(),avatar_path:null};
 const calls=[],bucket={upload:async(path,blob)=>{calls.push(['upload',path,blob]);return {error:null}},remove:async paths=>{calls.push(['remove',paths]);return {error:null}},createSignedUrl:async(path,seconds)=>{calls.push(['signed',path,seconds]);return {data:{signedUrl:'https://example.test/avatar/'+encodeURIComponent(path)},error:null}}};
 const db={storage:{from:()=>bucket},rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {data:args.chosen_path,error:null}}};
 const click=async element=>{assert.ok(element);await act(async()=>element.click())};
 try{
  await server.pluginContainer.buildStart({});
  const {default:Profile}=await server.ssrLoadModule('/src/Profile.jsx'),{default:ProfileDialog}=await server.ssrLoadModule('/src/ProfileDialog.jsx'),{LanguageProvider}=await server.ssrLoadModule('/src/Language.jsx'),{useAvatar}=await server.ssrLoadModule('/src/Avatar.jsx');
  const {themes}=await server.ssrLoadModule('/src/themes.mjs'),{default:ThemeCharacter}=await server.ssrLoadModule('/src/ThemeCharacter.jsx');
  for(const theme of themes.filter(t=>t.character)){const svg=renderToStaticMarkup(React.createElement(ThemeCharacter,{kind:theme.character}));assert.ok(svg.includes('data-character="'+theme.character+'"'));assert.ok(/<(path|rect|circle|ellipse)/.test(svg),theme.id)}
  const {createRoot}=await import('react-dom/client');root=createRoot(document.getElementById('root'));
  function Harness(){const url=useAvatar(db,user,profile.avatar_path);return React.createElement(ProfileDialog,{onClose(){}},React.createElement(Profile,{compact:true,db,session:{user:{id:user,email:'user@example.test'}},profile,premium:true,avatarUrl:url,onAvatarChanged:path=>{profile.avatar_path=path;render()},onSubscribe(){}}))}
  function render(){root.render(React.createElement(LanguageProvider,null,React.createElement(Harness)))}
  await act(async()=>render());
  assert.ok(document.body.textContent.includes('Trial Premium aktif'));assert.ok(!document.body.textContent.includes('Langganan Premium aktif'));
  assert.ok(document.querySelector('.account-badge').textContent.includes('Trial Premium'));
  assert.ok(document.querySelector('.profile-dialog'));assert.equal(document.querySelectorAll('.profile-settings-group[open]').length,0);
  await click(document.querySelector('.profile-settings-group summary'));assert.ok(document.querySelector('.profile-settings-group').open);
  const file=new File([new Uint8Array([255,216,255,224])],'my-photo.jpg',{type:'image/jpeg'});
  const input=document.querySelector('.avatar-file-input');
  Object.defineProperty(input,'files',{value:[file],configurable:true});await act(async()=>input.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
  assert.ok(document.querySelector('.avatar-editor .user-avatar img').src.startsWith('blob:'));assert.equal(calls.filter(c=>c[0]==='upload').length,0,'preview must not upload before save');
  assert.deepEqual(drawArgs.slice(1),[100,0,600,600,0,0,512,512]);
  await click(document.querySelector('.avatar-editor-actions .primary'));
  assert.ok(profile.avatar_path.startsWith(user+'/'));assert.ok(document.querySelector('.profile-overview img').src.startsWith('https://example.test/avatar/'));
  assert.ok(calls.some(c=>c[0]==='signed'&&c[2]===3600));assert.ok(document.body.textContent.includes('Foto profil berhasil diperbarui.'));
  await click([...document.querySelectorAll('.avatar-editor button')].find(b=>b.textContent.includes('Hapus foto')));
  assert.equal(profile.avatar_path,null);assert.equal(document.querySelector('.profile-overview img'),null);
  assert.ok(calls.some(c=>c[0]==='remove'));
  const bad=new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'});Object.defineProperty(input,'files',{value:[bad],configurable:true});
  await act(async()=>input.dispatchEvent(new dom.window.Event('change',{bubbles:true})));assert.ok(document.querySelector('.avatar-editor [role=alert]').textContent.includes('JPG, PNG, atau WebP'));
 }finally{
  if(root)await act(async()=>root.unmount());await server.close();dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
