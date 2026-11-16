import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAvatarFile,prepareAvatar,saveAvatar,removeAvatar,ownAvatarPath,AVATAR_BUCKET} from '../src/avatar.mjs';
const user='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',old=user+'/20000000-0000-4000-8000-000000000001.jpg';
const jpeg=()=>new File([new Uint8Array([255,216,255,224,0,0,0,0])],'photo.jpg',{type:'image/jpeg'});

test('avatar files are limited by size, MIME and actual file signatures before decoding',async()=>{
 await validateAvatarFile(jpeg());
 await validateAvatarFile(new File([new Uint8Array([137,80,78,71,13,10,26,10])],'a.png',{type:'image/png'}));
 for(const file of [new File(['<svg/>'],'a.svg',{type:'image/svg+xml'}),new File(['<script/>'],'a.jpg',{type:'image/jpeg'}),new File([],'empty.jpg',{type:'image/jpeg'}),new File([new Uint8Array(2097153)],'large.jpg',{type:'image/jpeg'})])await assert.rejects(()=>validateAvatarFile(file));
 let closed=false,encoded=false;
 const blob=await prepareAvatar(jpeg(),{decode:async()=>({width:800,height:600,close:()=>{closed=true}}),encode:async()=>{encoded=true;return new Blob(['image'],{type:'image/jpeg'})}});
 assert.equal(blob.type,'image/jpeg');assert.equal(encoded,true);assert.equal(closed,true);
 await assert.rejects(()=>prepareAvatar(jpeg(),{decode:async()=>({width:13000,height:1}),encode:()=>assert.fail()}),/Dimensi/);
});
test('photos upload to the owner folder, commit profile before old cleanup, and keep the file after an uncertain commit',async()=>{
 const calls=[];let rpcError=null;
 const bucket={upload:async(path,blob,options)=>{calls.push(['upload',path,options]);return {error:null}},remove:async paths=>{calls.push(['remove',paths]);return {error:null}}};
 const db={storage:{from:name=>{assert.equal(name,AVATAR_BUCKET);return bucket}},rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {error:rpcError}}};
 const normalized=new Blob(['normalized'],{type:'image/jpeg'});
 const path=await saveAvatar(db,user,normalized,old);assert.ok(ownAvatarPath(path,user));assert.equal(ownAvatarPath(path,other),false);
 assert.deepEqual(calls.map(c=>c[0]),['upload','rpc','remove']);assert.equal(calls[0][2].upsert,false);assert.equal(calls[1][2].chosen_path,path);
 calls.length=0;rpcError=Error('response lost');await assert.rejects(()=>saveAvatar(db,user,normalized,old),/response lost/);assert.ok(!calls.some(c=>c[0]==='remove'));
 calls.length=0;rpcError=null;await removeAvatar(db,user,old);assert.deepEqual(calls.map(c=>c[0]),['rpc','remove']);assert.equal(calls[0][2].chosen_path,null);
});
