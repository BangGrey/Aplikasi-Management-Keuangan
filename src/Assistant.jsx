import { useLanguage } from "./Language.jsx";import { tr, getLanguage } from "./language.mjs";import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AssistantCompanion, { useAssistantPanel } from './AssistantCompanion.jsx';
import { Bot, Send, X, ReceiptText, Settings2, Crown, PiggyBank } from 'lucide-react';
import { parseName, parseTransaction, parseFinancialQuery, summarizeTransactions, rupiah, localDate } from './assistant.mjs';
import { applyMemory } from './learning.mjs';
import useLearning from './useLearning.jsx';
import TeachForm from './TeachForm.jsx';
import { CharacterSticker } from './CharacterDecorations.jsx';
import { parseSavingsDeposit, matchSavingsGoals } from './savings-assistant.mjs';
import './savings-assistant.css';
const introduction = 'Halo! Saya asisten keuangan kamu. Kamu ingin menamai saya sebagai apa?';
function stored(key, fallback) {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}}
export default function PremiumAssistant(props) {useLanguage();
  return props.premium ? <Assistant {...props} active={true} /> : <LockedAssistant onSubscribe={props.onSubscribe} theme={props.theme} />;
}
function LockedAssistant({ onSubscribe, theme }) {useLanguage();
  const [opened, setOpened] = useState(false);
  useAssistantPanel(opened, setOpened);
  return <><AssistantCompanion theme={theme} opened={opened} premium={false} onToggle={() => setOpened(!opened)} />{opened && createPortal(<section id="financial-assistant-panel" className="assistant-chat companion-panel assistant-locked" aria-label={tr("Asisten khusus premium")}><button className="close" aria-label={tr("Tutup")} onClick={() => setOpened(false)}><X size={20} /></button><span className="premium-lock-icon"><Crown size={32} /></span><h2>{tr("Teman keuangan")}<br />{tr("khusus Premium.")}</h2><p>{tr("Catat lewat chat, tanyakan saldo, dan ajari asisten kebiasaanmu dengan langganan berbayar aktif.")}</p><p>{tr("Asisten belum tersedia untuk akun gratis, demo, atau trial.")}</p><button className="primary" onClick={() => {setOpened(false);onSubscribe();}}>{tr("Buka dengan Premium")}</button></section>, document.body)}</>;
}
function Assistant({ db, session, active, onRecord, onRead, onCorrect, onReceipt, onSubscribe, onLoadGoals, onDeposit, theme }) {useLanguage();
  const key = `kantong-assistant-${session?.user.id || 'demo'}`;
  const [opened, setOpened] = useState(false),[name, setName] = useState(''),[messages, setMessages] = useState(() => stored(key + '-chat', [])),[input, setInput] = useState(''),[busy, setBusy] = useState(false),[loading, setLoading] = useState(true),[renaming, setRenaming] = useState(false),[loadError, setLoadError] = useState('');
  useAssistantPanel(opened, setOpened);
  const lock = useRef(false),pending = useRef(null),end = useRef(null);
  const learning = useLearning(db, session, onCorrect);
  const [aiEnabled, setAiEnabled] = useState(() => stored(key + '-ai-enabled', false));
  useEffect(() => {localStorage.setItem(key + '-ai-enabled', JSON.stringify(aiEnabled));}, [aiEnabled, key]);
  useEffect(() => {let alive = true;(async () => {try {let value = stored(key + '-name', '');if (session) {const { data, error } = await db.from('assistant_preferences').select('name').eq('user_id', session.user.id).maybeSingle();if (error) throw error;value = data?.name || '';}if (alive) setName(value);} catch {if (alive) setLoadError('Nama asisten belum bisa dimuat. Periksa koneksi dan jalankan migrasi assistant.sql.');} finally {if (alive) setLoading(false);}})();return () => {alive = false;};}, []);
  useEffect(() => {localStorage.setItem(key + '-chat', JSON.stringify(messages.slice(-60)));}, [messages, key]);
  useEffect(() => {end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });}, [messages, busy, opened]);
  const say = (text) => setMessages((m) => [...m, { role: 'assistant', text:tr(text) }]);
  async function askAI(text) {
    if (!session) {say(tr("AI lanjutan tersedia setelah masuk ke akun. Mode demo tetap mendukung perintah sederhana dan memori kategori lokal."));return;}
    const response = await fetch('/.netlify/functions/assistant-ai', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ text, today: localDate(), language:getLanguage() }) });
    const result = await response.json();if (!response.ok) {say(result.error || tr("AI belum tersedia."));return;}
    if (result.kind === 'query') {say(summarizeTransactions(await onRead(result.query), result.query));return;}
    if (result.kind === 'savings_deposit') {await startSavings(result.deposit,text,true);return;}
    if (result.kind === 'transaction') {
      const proposal = applyMemory({ ...result.transaction, id: crypto.randomUUID() }, learning.memories, learning.knowledge);
      setMessages((m) => [...m, { role: 'assistant', text: tr('Saya memahami {type} {title}: {amount} ({category}). Periksa sebelum disimpan.', {type:tr(proposal.type==='income'?'Pemasukan':'Pengeluaran').toLowerCase(),title:proposal.title,amount:rupiah(proposal.amount),category:tr(proposal.category)}), proposal }]);return;
    }
    say(result.message);
  }
  async function commitSavings(request,goal) {
    setMessages(rows=>rows.map(m=>m.savings?.id===request.id?{...m,savings:{...m.savings,selectedGoalId:goal.id,attempted:true},text:tr('Sedang menambahkan tabungan…')}:m));
    try {
      const saved=await onDeposit({id:request.id,goalId:goal.id,amount:request.amount});
      setMessages(rows=>rows.map(m=>m.savings?.id===request.id?{...m,savingsSaved:true,text:tr('Saya menambahkan {amount} ke tabungan “{title}”. Total terkumpul sekarang {saved} dari target {target}.',{amount:rupiah(request.amount),title:saved.title,saved:rupiah(saved.saved),target:rupiah(saved.target)})}:m));
    }catch(error){
      setMessages(rows=>rows.map(m=>m.savings?.id===request.id?{...m,text:tr(error.message==='Goal not found'?'Target tabungan sudah tidak tersedia. Periksa halaman Tabungan.':'Penambahan tabungan belum dapat dikonfirmasi. Periksa koneksi dan konfigurasi, lalu gunakan tombol Coba lagi pada pesan ini agar tidak tercatat dua kali.'),dismissed:error.message==='Goal not found'}:m));
    }
  }
  async function startSavings(deposit,sourceText,confirmFirst=false) {
    if(messages.some(m=>m.savings?.sourceText===sourceText&&!m.savingsSaved&&!m.dismissed)){say(tr('Permintaan tabungan ini masih menunggu. Gunakan pilihan target atau tombol Coba lagi pada pesan sebelumnya.'));return;}
    const matches=matchSavingsGoals(deposit.target,await onLoadGoals());
    if(!matches.length){say(tr('Saya belum menemukan target tabungan yang cocok dengan “{target}”. Sebutkan nama yang lebih lengkap atau buat target terlebih dahulu di menu Tabungan.',{target:deposit.target}));return;}
    const request={...deposit,id:crypto.randomUUID(),sourceText,candidates:matches.map(g=>({id:g.id,title:g.title}))};
    setMessages(rows=>[...rows,{role:'assistant',text:tr(matches.length>1?'Ada beberapa target yang cocok. Pilih tabungan untuk menerima {amount}.':'Tambahkan {amount} ke target berikut?',{amount:rupiah(deposit.amount)}),savings:request}]);
    if(matches.length===1&&!confirmFirst)await commitSavings(request,matches[0]);
  }
  async function acceptSavings(id,goalId) {
    const message=messages.find(m=>m.savings?.id===id),request=message?.savings;
    if(lock.current||!active||!request||message.savingsSaved||message.dismissed||request.attempted&&request.selectedGoalId!==goalId)return;
    const goal=request.candidates.find(g=>g.id===goalId);if(!goal)return;
    lock.current=true;setBusy(true);try{await commitSavings(request,goal)}finally{lock.current=false;setBusy(false)}
  }
  async function accept(index) {
    if (lock.current || !active) return;const proposal = messages[index]?.proposal;if (!proposal || messages[index].transaction || messages[index].dismissed) return;
    lock.current = true;setBusy(true);try {const saved = await onRecord(proposal);setMessages((m) => m.map((r, i) => i === index ? { role: 'assistant', text: tr('{title} sudah dicatat: {amount}.', {title:saved.title,amount:rupiah(saved.amount)}), transaction: saved } : r));} catch {say(tr("Belum berhasil menyimpan. Silakan coba lagi."));} finally {lock.current = false;setBusy(false);}
  }
  async function teach(transaction, category, term) {
    if (lock.current || !active) return false;lock.current = true;setBusy(true);
    try {await learning.learn(transaction, category, term);setMessages((m) => m.map((r) => r.transaction?.id === transaction.id ? { ...r, transaction: { ...r.transaction, category } } : r));say(tr("Saya ingat: {p0} termasuk {p1}. Koreksi catatan ini juga sudah disimpan.{p2}", { p0: transaction.title, p1: tr(category), p2: term ? ' '+tr('Saran bersama menunggu tinjauan admin.') : '' }));return true;} catch {say(tr("Koreksi belum tersimpan. Periksa koneksi dan migrasi learning.sql."));return false;} finally {lock.current = false;setBusy(false);}
  }
  async function forget() {if (lock.current || !confirm(tr("Hapus seluruh memori kategori pribadi dan saran yang belum diterbitkan? Catatan keuangan tetap tersimpan."))) return;lock.current = true;setBusy(true);try {await learning.forget();say(tr("Memori kategori pribadi dan saran antrean sudah dihapus. Pengetahuan bersama yang sudah ditinjau tidak dihapus."));} catch (e) {say(e.message);} finally {lock.current = false;setBusy(false);}}
  async function send(e) {e.preventDefault();const text = input.trim();if (!text || lock.current || loading || loadError) return;lock.current = true;setBusy(true);setInput('');setMessages((m) => [...m, { role: 'user', text }]);
    try {
      if (!active) {say(tr("Trial kamu sudah berakhir. Berlangganan untuk menamai asisten dan mencatat transaksi baru."));return;}
      const candidate = parseName(text, !name || renaming);
      if (!name || renaming || candidate) {if (!candidate) {say(tr("Pilih nama 1–30 karakter berupa huruf, misalnya “Muchi”."));return;}if (session) {const { error } = await db.from('assistant_preferences').upsert({ user_id: session.user.id, name: candidate });if (error) throw error;} else localStorage.setItem(key + '-name', JSON.stringify(candidate));setName(candidate);setRenaming(false);say(tr("Baiklah, mulai sekarang saya akan bernama {p0}. Ada yang bisa dibantu? Coba “tambahkan pengeluaran untuk membeli kopi 5000”.", { p0: candidate }));return;}
      const savings=parseSavingsDeposit(text);
      if(savings){if(savings.error)say(savings.error);else await startSavings(savings.deposit,text);return;}
      const question = parseFinancialQuery(text);
      if (question) {if (question.error) {if (aiEnabled) await askAI(text);else say(question.error);return;}const rows = await onRead(question.query);say(summarizeTransactions(rows, question.query));return;}
      const result = parseTransaction(text);if (result.error) {if (aiEnabled) await askAI(text);else say(result.error);return;}
      // Reuse the same transaction id after a lost response, so retries cannot insert twice.
      if (pending.current?.text !== text) pending.current = { text, id: crypto.randomUUID() };
      if (!learning.ready) {say(tr("Memori masih dimuat. Coba lagi sebentar."));return;}
      const saved = await onRecord(applyMemory({ ...result.transaction, id: pending.current.id }, learning.memories, learning.knowledge));
      pending.current = null;
      setMessages((m) => [...m, { role: 'assistant', text: tr('{type} sudah saya catat: {title}, {amount} ({category}). Nota pencatatannya siap di bawah ini.', {type:tr(saved.type==='income'?'Pemasukan':'Pengeluaran').toLowerCase(),title:saved.title,amount:rupiah(saved.amount),category:tr(saved.category)}), transaction: saved }]);
    } catch {say(tr("Permintaan belum berhasil diproses. Periksa koneksi atau status langganan, lalu coba lagi. Saya tidak menerbitkan nota atau angka ringkasan sebelum data berhasil diproses."));} finally {lock.current = false;setBusy(false);}
  }
  return <><AssistantCompanion theme={theme} name={name} busy={busy} opened={opened} premium={true} onToggle={() => setOpened(!opened)} />{opened && createPortal(<section id="financial-assistant-panel" className="assistant-chat companion-panel" aria-label={tr("Chat asisten keuangan")}><div className="assistant-header"><span className="assistant-avatar"><CharacterSticker theme={theme} place="chat-avatar" /><Bot size={22} /></span><div><strong>{name || tr("Asisten keuangan")}</strong><small>{tr("Asisten keuangan · memori pribadi")}</small></div><button aria-label={tr("Ganti nama asisten")} disabled={busy || loading || !!loadError} onClick={() => {setRenaming(true);say(tr("Tentu! Kamu ingin mengganti nama saya menjadi apa?"));}}><Settings2 size={17} /></button><button aria-label={tr("Tutup chat")} onClick={() => setOpened(false)}><X size={19} /></button></div><details className="learning-settings"><summary>{tr("Memori & AI lanjutan · ")}{learning.memories.length}{tr(" pola pribadi")}</summary><p>{tr("Asisten belajar kategori dari koreksi. Penggunaan saja tidak melatih ulang model.")}</p><label><input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} disabled={busy} />{tr("Aktifkan OpenAI untuk pesan yang belum dipahami")}</label><p>{tr("Jika aktif, pesan tersebut dan memori kategori dikirim ke OpenAI. Daftar transaksi dan riwayat chat tidak dikirim. Maksimal 50 permintaan/hari per akun.")}</p>{learning.error && <p role="alert">{tr(learning.error)}</p>}<div className="memory-list">{learning.memories.map((m) => <div key={m.type + m.term}><span>{m.term} · {m.type === 'income' ? tr("masuk") : tr("keluar")}</span><strong>{tr(m.category)}</strong></div>)}</div><button disabled={busy || !learning.ready} onClick={forget}>{tr("Hapus memori & saran pribadi")}</button></details><div className="assistant-messages" role="log" aria-live="polite"><div className="chat-message assistant">{tr(introduction)}</div>{messages.map((m, i) => <div className={'chat-message ' + m.role} key={i}><p>{m.text}</p>{m.savingsSaved && <span className="savings-chat-status"><PiggyBank size={15}/>{tr("Tabungan berhasil diperbarui.")}</span>}{m.savingsSaved && <small className="savings-chat-note">{tr("Setoran ini hanya memperbarui progres tabungan; pemasukan dan pengeluaran tidak berubah.")}</small>}{m.savings && !m.savingsSaved && !m.dismissed && <div className="savings-chat-actions">{m.savings.candidates.map(goal=><button type="button" key={goal.id} disabled={busy||!active||m.savings.attempted&&m.savings.selectedGoalId!==goal.id} onClick={()=>acceptSavings(m.savings.id,goal.id)}><PiggyBank size={15}/>{m.savings.attempted?tr("Coba lagi")+" - ":""}{goal.title}</button>)}{!m.savings.attempted && <button type="button" className="savings-cancel" disabled={busy} onClick={()=>setMessages(rows=>rows.map(row=>row.savings?.id===m.savings.id?{...row,dismissed:true,text:tr("Penambahan tabungan dibatalkan.")}:row))}>{tr("Batal")}</button>}</div>}{m.transaction && <button className="chat-receipt" onClick={() => onReceipt(m.transaction)}><ReceiptText size={17} /><span>{tr("Nota · ")}{rupiah(m.transaction.amount)}</span></button>}{m.transaction && <TeachForm transaction={m.transaction} onTeach={teach} disabled={busy || !active || !learning.ready || !!learning.error} demo={!session} />} {m.proposal && !m.transaction && <div className="proposal-actions"><button disabled={busy || !active || m.dismissed} onClick={() => accept(i)}>{tr("Simpan transaksi ini")}</button><button disabled={busy || m.dismissed} onClick={() => setMessages((rows) => rows.map((r, j) => i === j ? { ...r, dismissed: true } : r))}>{m.dismissed ? tr("Dibatalkan") : tr("Batal")}</button></div>}</div>)}{loading && <p className="chat-hint">{tr("Memuat asisten…")}</p>}{loadError && <p role="alert" className="chat-hint">{tr(loadError)}</p>}{busy && <p className="chat-hint">{tr("Memproses permintaan…")}</p>}<div ref={end} /></div>{!active && <button className="chat-upgrade" onClick={onSubscribe}>{tr("Lihat paket langganan →")}</button>}<p className="chat-hint">{tr("Catat satu transaksi hari ini, atau tanyakan saldo dan total per periode. Riwayat chat tersimpan di browser ini.")}</p><div className="assistant-suggestions">{['Catat pemasukan gaji 5 juta', 'Berapa saldo saat ini?', 'Total pemasukan bulan ini', 'Total pengeluaran bulan lalu', 'Tambahkan tabungan ke Jepang 500000'].map((example) => <button type="button" key={tr(example)} disabled={busy || loading || !name || renaming} onClick={() => setInput(tr(example))}>{tr(example)}</button>)}</div><form className="assistant-input" onSubmit={send}><input aria-label={tr("Pesan ke asisten")} placeholder={!name || renaming ? tr("Aku akan memanggil kamu Muchi") : tr("Contoh: beli kopi 5000")} value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} disabled={busy || loading || !!loadError} /><button aria-label={tr("Kirim pesan")} disabled={busy || loading || !!loadError || !input.trim()}><Send size={18} /></button></form></section>, document.body)}</>;
}
