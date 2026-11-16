import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateUsername,validatePasswordChange,changePassword} from '../src/profile.mjs';
test('username updates use the authenticated RPC and handle duplicate names',async()=>{
 const calls=[];assert.equal(await updateUsername({rpc:async(...args)=>{calls.push(args);return {data:'user_02',error:null}}},' USER_02 '),'user_02');
 assert.deepEqual(calls,[['set_username',{chosen_username:'user_02'}]]);
 await assert.rejects(()=>updateUsername({rpc:async()=>({error:{code:'23505'}})},'user_02'),/sudah dipakai/);
 await assert.rejects(()=>updateUsername({rpc:async()=>assert.fail('must not save')},'ab'),/3/);
});
test('password changes require current password, different new password, and matching confirmation',()=>{
 assert.doesNotThrow(()=>validatePasswordChange('password-lama','password-baru','password-baru'));
 for(const args of [['','password-baru','password-baru'],['password-lama','short','short'],['password-lama','password-baru','berbeda'],['password-lama','password-lama','password-lama']])assert.throws(()=>validatePasswordChange(...args));
});
function fixture({verifiedId='user-a',verifyError=null,updateError=null}={}){
 const calls=[];
 return {calls,db:{auth:{updateUser:async args=>{calls.push(['update',args]);return {error:updateError}}}},verificationClient:{auth:{signInWithPassword:async args=>{calls.push(['verify',args]);return {data:{user:{id:verifiedId}},error:verifyError}},signOut:async args=>{calls.push(['cleanup',args]);return {error:null}}}}};
}
const input={user:{id:'user-a',email:'user@example.com'},currentPassword:'password-lama',newPassword:'password-baru',confirmation:'password-baru'};
test('password verification must match the account; only isolated verification session is signed out',async()=>{
 const f=fixture();await changePassword({...f,...input});
 assert.deepEqual(f.calls.map(c=>c[0]),['verify','update','cleanup']);
 assert.deepEqual(f.calls[1][1],{password:'password-baru',current_password:'password-lama'});
 assert.deepEqual(f.calls[2][1],{scope:'local'});
 for(const options of [{verifyError:Error('wrong')},{verifiedId:'other-account'}]){
  const denied=fixture(options);await assert.rejects(()=>changePassword({...denied,...input}),/verifikasi/);assert.ok(!denied.calls.some(c=>c[0]==='update'));assert.ok(denied.calls.some(c=>c[0]==='cleanup'));
 }
});
test('secure password verification errors propagate and nonce is passed on retry',async()=>{
 const error=Object.assign(Error('reauth required'),{code:'reauthentication_needed'});const f=fixture({updateError:error});
 await assert.rejects(()=>changePassword({...f,...input}),{code:'reauthentication_needed'});assert.equal(f.calls.at(-1)[0],'cleanup');
 const retry=fixture();await changePassword({...retry,...input,nonce:' 123456 '});assert.equal(retry.calls[1][1].nonce,'123456');
});
