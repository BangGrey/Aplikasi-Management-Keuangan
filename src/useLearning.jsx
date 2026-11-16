import { tr } from "./language.mjs";import { useEffect, useState } from 'react';
import { remember } from './learning.mjs';
function read(key) {try {return JSON.parse(localStorage.getItem(key)) || [];} catch {return [];}}
export default function useLearning(db, session, onCorrect) {
  const key = `kantong-memory-${session?.user.id || 'demo'}`;
  const [memories, setMemories] = useState(() => session ? [] : read(key)),[knowledge, setKnowledge] = useState([]),[error, setError] = useState(''),[ready, setReady] = useState(!session);
  useEffect(() => {let alive = true;if (session) Promise.all([db.from('assistant_memories').select('term,type,category,examples').eq('user_id', session.user.id).limit(1000), db.from('assistant_knowledge').select('term,type,category').limit(1000)]).then((results) => {if (!alive) return;if (results.some((r) => r.error)) setError(tr("Pembelajaran belum tersedia. Jalankan migrasi learning.sql dan periksa koneksi."));else {setMemories(results[0].data);setKnowledge(results[1].data);}setReady(true);}).catch(() => {if (alive) {setError(tr("Memori belum dapat dimuat. Periksa koneksi."));setReady(true);}});return () => {alive = false;};}, []);
  async function learn(transaction, category, sharedTerm) {
    if (error || !ready) throw Error(tr("Pembelajaran belum tersedia."));
    await onCorrect(transaction, category, sharedTerm);
    const next = remember(memories, transaction, category);setMemories(next);if (!session) localStorage.setItem(key, JSON.stringify(next));
  }
  async function forget() {
    if (session) {const results = await Promise.all([db.from('assistant_memories').delete().eq('user_id', session.user.id), db.from('assistant_suggestions').delete().eq('user_id', session.user.id)]);if (results.some((r) => r.error)) throw Error(tr("Belum dapat menghapus semua memori. Coba lagi."));}
    setMemories([]);if (!session) localStorage.removeItem(key);
  }
  return { memories, knowledge, error, ready, learn, forget };
}
