import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readRoute,pagePath,isPlainNavigation,profileBackground} from '../src/routes.mjs';

const route = path => readRoute(new URL(path,'https://tabunganmu.example'));

test('public, account and demo pages resolve to clean, shareable paths',()=>{
  assert.equal(route('/').url,'/beranda');
  for(const section of ['beranda','fitur','cara-mulai','paket','pertanyaan']) {
    assert.equal(route('/'+section).section,section);
    assert.equal(route('/'+section).kind,'public');
  }
  for(const page of ['Ringkasan','Pemasukan','Pengeluaran','Tabungan','Tema tampilan','Langganan','Profil']) {
    assert.equal(route(pagePath(page)).page,page);
    assert.equal(route(pagePath(page)).kind,'app');
    assert.equal(route(pagePath(page,true)).page,page);
    assert.equal(route(pagePath(page,true)).kind,'demo');
  }
  assert.equal(route('/demo/tabungan/').url,'/demo/tabungan');
});

test('old navigation links migrate without losing query parameters',()=>{
  for(const section of ['beranda','fitur','cara-mulai','paket','pertanyaan']) {
    assert.equal(route('/?ref=welcome#'+section).url,'/'+section+'?ref=welcome');
  }
  assert.equal(route('/#app').url,'/ringkasan');
  assert.equal(route('/#demo').url,'/demo');
  assert.equal(route('/#kenalan').url,'/beranda');
});

test('Supabase token, PKCE and error callback values survive route resolution',()=>{
  for(const callback of [
    '?code=confirmation-code',
    '#access_token=example&refresh_token=example&type=signup',
    '#error=access_denied&error_description=Email+link+expired',
  ]) {
    assert.equal(route('/'+callback).url,'/beranda'+callback);
    assert.equal(route('/profil'+callback).url,'/profil'+callback);
  }
});

test('links keep normal new-tab and modified-click browser behavior',()=>{
  const click={button:0};assert.equal(isPlainNavigation(click),true);
  for(const modifier of ['metaKey','ctrlKey','shiftKey','altKey','defaultPrevented']) {
    assert.equal(isPlainNavigation({...click,[modifier]:true}),false);
  }
  assert.equal(isPlainNavigation({button:1}),false);
});

test('profile dialogs preserve a valid background page and safely handle direct links',()=>{
  const profile=route('/profil');
  assert.equal(profileBackground(profile).path,'/ringkasan');
  assert.equal(profileBackground({...profile,state:{profileBackgroundPath:'/pengeluaran'}}).path,'/pengeluaran');
  for(const invalid of ['/profil','/demo/tabungan','https://example.com','/fitur']){
    assert.equal(profileBackground({...profile,state:{profileBackgroundPath:invalid}}).path,'/ringkasan');
  }
  assert.equal(profileBackground({...route('/demo/profil'),state:{profileBackgroundPath:'/demo/tabungan'}}).path,'/demo/tabungan');
});
