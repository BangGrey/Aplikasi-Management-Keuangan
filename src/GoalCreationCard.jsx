import React from 'react';
import {PiggyBank} from 'lucide-react';
import {useLanguage} from './Language.jsx';
import {tr} from './language.mjs';
import {rupiah} from './assistant.mjs';

export default function GoalCreationCard({message,busy,onConfirm,onCancel}){
 useLanguage();const goal=message.creation;
 if(!goal||message.dismissed||message.creationSaved)return null;
 return <div className="goal-chat-card"><strong><PiggyBank size={16}/>{goal.title}</strong><dl><div><dt>{tr('Target dana')}</dt><dd>{rupiah(goal.target)}</dd></div><div><dt>{tr('Tabungan awal')}</dt><dd>{rupiah(goal.initialSaved)}</dd></div></dl><small>{tr('Tabungan awal hanya mengisi progres target. Pemasukan dan pengeluaran tidak berubah.')}</small><div className="savings-chat-actions"><button type="button" disabled={busy} onClick={()=>onConfirm(goal.id)}>{tr(goal.attempted?'Coba lagi':'Buat tabungan ini')}</button>{!goal.attempted&&<button type="button" className="savings-cancel" disabled={busy} onClick={()=>onCancel(goal.id)}>{tr('Batal')}</button>}</div></div>;
}
