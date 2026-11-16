import {test} from 'node:test';
import assert from 'node:assert/strict';
import {basicChatReply} from '../src/basic-chat.mjs';

const options={userName:'user_01',assistantName:'Muchi',language:'id'};

test('basic greetings use the current username and chosen assistant name',()=>{
  for(const text of ['halo','Halo!','HALOO 😊','hallo','haii','hi','hello','hey','Halo, Muchi!','Muchi, halo!']) {
    assert.equal(basicChatReply(text,options),'Halo, user_01! Apa yang bisa Muchi bantu untuk kamu?',text);
  }
  assert.match(basicChatReply('halo',{...options,userName:'user_02',assistantName:'Mochi'}),/user_02.*Mochi/);
  assert.match(basicChatReply('halo',{language:'en'}),/Hello, friend!/);
});

test('time greetings, thanks, identity, help, acknowledgements and farewells are answered in both languages',()=>{
  const examples=[
    ['selamat pagi','Good morning'],['selamat siang','Good afternoon'],['selamat sore','Good evening'],
    ['selamat malam','Good night'],['assalamualaikum','Wa alaikum assalam'],['apa kabar?','doing well'],
    ['Halo Muchi, apa kabar?','doing well'],['makasih banyak ya','welcome'],['terima kasih','welcome'],
    ['siapa namamu?','financial assistant'],['apa yang bisa kamu bantu?','Record an expense'],
    ['oke','Got it'],['sampai jumpa','See you'],['hello Muchi, how are you?','doing well'],
    ['thanks a lot','welcome'],['what can you do?','Record an expense'],['bye bye','See you'],
  ];
  for(const [message,english] of examples){
    const reply=basicChatReply(message,options);assert.ok(reply,message);assert.ok(reply.includes('user_01'),message);assert.ok(reply.includes('Muchi'),message);
    assert.ok(basicChatReply(message,{...options,language:'en'}).includes(english),message);
  }
});

test('basic conversation keeps initial naming and renaming prompts available',()=>{
  assert.match(basicChatReply('halo',{userName:'user_01',language:'id'}),/Kamu ingin menamai saya sebagai apa/);
  assert.match(basicChatReply('terima kasih',{...options,renaming:true}),/mengganti nama saya/);
  for(const message of ['Muchi','aku akan memanggil kamu sebagai Muchi','ganti nama jadi Miko','I will call you Mochi']) {
    assert.equal(basicChatReply(message,options),null,message);
  }
});

test('basic replies never consume financial requests, confirmations, draft details or unrelated messages',()=>{
  for(const message of [
    'beli kopi 5000','halo beli kopi 5000','halo tambahkan pemasukan gaji 5000000','total pengeluaran bulan ini',
    'halo berapa saldo saat ini?','tambahkan tabungan ke Jepang 500000','buat tabungan rumah target 500 juta',
    'target 500 juta','rumah impian tabungan awal 500000','batal','ya','yes','simpan transaksi ini',
    'halo jangan beli kopi 5000','terima kasih dan catat pengeluaran 5000','siapa kamu dan berapa saldo saya?',
    'help me buy coffee 5000','saya membeli mainan hello kitty 5000','What is the weather?', '', 'a'.repeat(501),
  ])assert.equal(basicChatReply(message,options),null,message);
});
