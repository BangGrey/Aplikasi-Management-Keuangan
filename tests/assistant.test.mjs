import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseName,parseExpense,parseTransaction,parsePeriod,parseFinancialQuery,summarizeTransactions,localDate,rupiah} from '../src/assistant.mjs';
const date=new Date(2026,10,16,12);
test('user names assistant and can rename it',()=>{
 for(const text of ['aku akan memanggil kamu sebagai Muchi','aku akan memanggil kamu Muchi','nama kamu adalah Muchi','ganti nama jadi Muchi'])assert.equal(parseName(text),'Muchi');
 assert.equal(parseName('Muchi',true),'Muchi');
 assert.equal(parseName('beli kopi 5000'),null);
 assert.equal(parseName('<img src=x>',true),null);
 assert.equal(parseName('a'.repeat(31),true),null);
});

test('income uses validated nominal, title, category and date',()=>{
 for(const text of ['catat pemasukan gaji 5 juta','tambahkan pemasukan gaji 5jt','saya terima gaji 5.000.000']){
  assert.deepEqual(parseTransaction(text,date).transaction,{title:'Gaji',type:'income',amount:5000000,category:'Gaji',date:'2026-11-16'});
 }
 const freelance=parseTransaction('tambahkan pemasukan dari freelance 250rb',date).transaction;
 assert.equal(freelance.title,'freelance');assert.equal(freelance.category,'Freelance');assert.equal(freelance.amount,250000);
 assert.equal(parseTransaction('beli kopi 5000',date).transaction.type,'expense');
 for(const text of ['catat pemasukan 5000','catat pemasukan gaji -1','catat pemasukan gaji 0','catat pemasukan gaji 5jt dan bonus 1jt','jangan catat pemasukan gaji 5jt','catat pemasukan gaji 5jt kemarin','catat pemasukan gaji dan pengeluaran 5000'])assert.ok(parseTransaction(text,date).error,text);
});

test('calendar periods handle week starts, month boundaries, leap years and explicit ranges',()=>{
 const check=(text,from,to,now=date)=>{const p=parsePeriod(text,now);assert.equal(p.from,from,text);assert.equal(p.to,to,text)};
 check('hari ini','2026-11-16','2026-11-16');check('kemarin','2026-11-15','2026-11-15');
 check('minggu ini','2026-11-16','2026-11-22');check('minggu lalu','2026-11-09','2026-11-15');
 check('bulan ini','2026-11-01','2026-11-30');check('bulan lalu','2025-12-01','2025-12-31',new Date(2026,0,2));
 check('tahun lalu','2025-01-01','2025-12-31');check('Februari 2024','2024-02-01','2024-02-29');
 check('2026-11-01 sampai 2026-11-15','2026-11-01','2026-11-15');check('2026-11-01','2026-11-01','2026-11-01');
 check('semua transaksi',null,'2026-11-16');
 for(const text of ['periode tertentu','7 hari terakhir','2026-02-30','2026-11-15 sampai 2026-11-01','bulan ini dan bulan lalu','November dan Oktober','tanggal 1 November 2026'])assert.ok(parsePeriod(text,date).error,text);
});

test('questions never create transactions and specify defaults',()=>{
 const saldo=parseFinancialQuery('berapa total saldo saat ini?',date).query;
 assert.equal(saldo.kind,'balance');assert.equal(saldo.from,null);assert.equal(saldo.to,'2026-11-16');
 const income=parseFinancialQuery('pemasukan saat ini',date).query;
 assert.equal(income.kind,'income');assert.equal(income.from,'2026-11-01');
 assert.equal(parseFinancialQuery('total pengeluaran November 2026',date).query.to,'2026-11-30');
 assert.equal(parseFinancialQuery('total pemasukan dan pengeluaran hari ini',date).query.kind,'summary');
 assert.equal(parseFinancialQuery('catat pemasukan gaji 5000',date),null);
 assert.ok(parseFinancialQuery('catat pemasukan 5000 berapa saldo?',date).error);
 assert.ok(parseFinancialQuery('total pengeluaran 7 hari terakhir',date).error);
});

test('summaries include both boundaries, zero totals and negative balances',()=>{
 const rows=[{date:'2026-10-31',type:'income',amount:10000},{date:'2026-11-01',type:'income',amount:'5000'},{date:'2026-11-16',type:'expense',amount:'7000'},{date:'2026-11-17',type:'income',amount:999999}];
 const query=parseFinancialQuery('saldo saat ini',date).query;
 const response=summarizeTransactions(rows,query);
 assert.ok(response.includes(rupiah(8000)));assert.ok(!response.includes(rupiah(999999)));
 const period={...query,from:'2026-11-01'};
 assert.ok(summarizeTransactions(rows,period).includes(rupiah(-2000)));
 assert.ok(summarizeTransactions([],period).includes('Belum ada transaksi'));
 assert.ok(summarizeTransactions(rows,{...period,kind:'income'}).includes(rupiah(5000)));
 assert.ok(summarizeTransactions(rows,{...period,kind:'expense'}).includes(rupiah(7000)));
});
test('expense command produces transaction and automatic category',()=>{
 for(const amount of ['5000','Rp5.000','5rb','5 ribu','5k','Rp 5.000,00']){
  const result=parseExpense(`tambahkan pengeluaran untuk membeli kopi ${amount}`,date);
  assert.deepEqual(result.transaction,{title:'Kopi',type:'expense',amount:5000,category:'Makanan',date:'2026-11-16'});
 }
 assert.equal(parseExpense('bayar internet 1,5 juta',date).transaction.amount,1500000);
 assert.equal(parseExpense('beli kopi 5000 dan buatkan juga notanya',date).transaction.title,'Kopi');
 assert.equal(parseExpense('beli bensin 50rb',date).transaction.category,'Transportasi');
 assert.equal(localDate(date),'2026-11-16');
});
test('ambiguous, invalid and unsupported commands never create records',()=>{
 for(const text of ['kopi','beli kopi','beli kopi 0','beli kopi -5000','beli kopi 5,50','beli kopi 5000 dan roti 10000','beli 2 kopi 5000','beli kopi 5000 kemarin','jangan beli kopi 5000','berapa beli kopi 5000?','contoh beli kopi 5000','tambahkan pemasukan gaji 5000','beli 5000','beli kopi 1000000000001','aku tidak beli kopi 5000','beli kopi 5000 atau teh','mungkin beli kopi 5000']){
  assert.ok(parseExpense(text,date).error,text);
  assert.equal(parseExpense(text,date).transaction,undefined,text);
 }
});
