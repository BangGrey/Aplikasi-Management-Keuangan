import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {getLanguage,getLocale,setLanguage,tr} from '../src/language.mjs';
import {parseName,parseTransaction,parseFinancialQuery,parsePeriod,summarizeTransactions,rupiah} from '../src/assistant.mjs';
import {gramsText} from '../src/gold.mjs';
const now=new Date(2026,10,16,12);
afterEach(()=>setLanguage('id'));

test('language selection translates labels and parameters without interpreting user text',()=>{
 assert.equal(getLanguage(),'id');assert.equal(tr('Pemasukan'),'Pemasukan');
 setLanguage('en');assert.equal(getLocale(),'en-US');
 assert.equal(tr('Pemasukan'),'Income');assert.equal(tr(' Keluar'),' Sign out');
 assert.equal(tr('Aktif sampai {p0}',{p0:'Muchi $& <coffee>'}),'Active until Muchi $& <coffee>');
 assert.equal(tr('Kopi Buatan Saya'),'Kopi Buatan Saya');
 assert.equal(tr('constructor'),'constructor');assert.equal(tr('toString'),'toString');
 assert.equal(gramsText(3.125),'3.125 g');assert.ok(rupiah(5000).includes('5,000'));
 setLanguage('unsupported');assert.equal(getLocale(),'id-ID');
 assert.equal(tr('Pemasukan'),'Pemasukan');assert.equal(gramsText(3.125),'3,125 g');
});

test('English commands create IDR transactions with canonical database categories',()=>{
 setLanguage('en');
 for(const text of ['add expense coffee 5000','record expense coffee IDR 5,000','buy coffee 5 thousand','add expense coffee 5k and create a receipt']){
  assert.deepEqual(parseTransaction(text,now).transaction,{title:'Coffee',type:'expense',amount:5000,category:'Makanan',date:'2026-11-16'},text);
 }
 assert.deepEqual(parseTransaction('record income salary 5 million',now).transaction,{title:'Salary',type:'income',amount:5000000,category:'Gaji',date:'2026-11-16'});
 assert.equal(parseTransaction('add income freelance 250000',now).transaction.category,'Freelance');
 assert.equal(parseName("I'll call you Muchi"),'Muchi');
 assert.equal(parseName('your name is Muchi'),'Muchi');
 // Indonesian commands still work while the interface is English.
 assert.equal(parseTransaction('beli kopi 5000',now).transaction.title,'Kopi');
});

test('English questions use calendar periods and summaries include localized totals',()=>{
 setLanguage('en');
 const balance=parseFinancialQuery('What is my current balance?',now).query;
 assert.equal(balance.kind,'balance');assert.equal(balance.from,null);assert.equal(balance.to,'2026-11-16');
 assert.equal(parseFinancialQuery('Total income this month',now).query.from,'2026-11-01');
 assert.equal(parseFinancialQuery('Total expenses last month',now).query.to,'2026-10-31');
 assert.equal(parseFinancialQuery('Total income and expenses today',now).query.kind,'summary');
 assert.equal(parsePeriod('all time',now).from,null);
 assert.equal(parsePeriod('this week',now).from,'2026-11-16');
 assert.equal(parsePeriod('February 2024',now).to,'2024-02-29');
 assert.equal(parsePeriod('2026-11-01 to 2026-11-15',now).to,'2026-11-15');
 const reply=summarizeTransactions([{type:'income',amount:'10000',date:'2026-11-16'},{type:'expense',amount:'5000',date:'2026-11-16'}],balance);
 assert.ok(reply.includes('Current recorded balance: '+rupiah(5000)));
 assert.ok(reply.includes('all records through today'));assert.ok(!reply.includes('Pemasukan'));
 assert.ok(summarizeTransactions([],balance).includes('No transactions'));
 assert.ok(summarizeTransactions([],{...balance,label:'seluruh catatan sampai 2026-11-16'}).includes('all records through 2026-11-16'));
 assert.ok(summarizeTransactions([],{...balance,label:'januari 2026'}).includes('January 2026'));
});

test('negated, uncertain, multiple, dated and non-IDR commands cannot create transactions',()=>{
 setLanguage('en');
 for(const text of ["don't add expense coffee 5000",'do not record income salary 5 million',"I haven't paid coffee 5000",'if I buy coffee 5000','maybe add expense coffee 5000','what did I pay coffee 5000','add expense coffee 5000 or tea','record expense coffee 0','record expense coffee -5000','record expense coffee USD 5','record income salary $5000','record expense coffee 5000 yesterday','add expense coffee 5000 and tea 3000']){
  assert.ok(parseTransaction(text,now).error,text);
 }
 assert.ok(parseFinancialQuery('add expense coffee 5000 and what is my balance?',now).error);
 assert.ok(parseFinancialQuery('total expenses last 7 days',now).error);
});
