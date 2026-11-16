import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasPaidSubscription} from '../src/premium.mjs';
import {accessibleTheme,themes} from '../src/themes.mjs';
const now=Date.parse('2026-11-16T12:00:00Z'),session={user:{id:'account-a'}};
test('premium requires a matching authenticated account with unexpired paid time',()=>{
 const paid={id:'account-a',paid_until:'2026-12-16T00:00:00Z'};
 assert.equal(hasPaidSubscription(paid,session,now),true);
 for(const profile of [null,{id:'account-a',trial_ends_at:'2027-01-01T00:00:00Z'}, {...paid,id:'other'}, {...paid,paid_until:null},{...paid,paid_until:'invalid'},{...paid,paid_until:'2026-11-16T12:00:00Z'}])assert.equal(hasPaidSubscription(profile,session,now),false);
 assert.equal(hasPaidSubscription(paid,null,now),false);
});
test('saved character preference cannot activate premium themes for free accounts',()=>{
 for(const theme of themes){
  assert.equal(accessibleTheme(theme.id,true).id,theme.id);
  if(theme.character){assert.equal(accessibleTheme(theme.id,false).id,'sage');assert.equal(accessibleTheme(theme.id,false,'pink').id,'pink');assert.equal(accessibleTheme(theme.id,false,'kuromi').id,'sage')}
  else assert.equal(accessibleTheme(theme.id,false).id,theme.id);
 }
});
