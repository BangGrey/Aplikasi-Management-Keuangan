import React from 'react';
import {createPortal} from 'react-dom';
import {X,Printer} from 'lucide-react';
import BrandMark from './BrandMark.jsx';
import {rupiah} from './assistant.mjs';
export default function Receipt({transaction:t,onClose}){
 return createPortal(<div className="receipt-overlay" onClick={onClose}><section className="receipt-sheet" role="dialog" aria-modal="true" aria-label="Nota pencatatan" onClick={e=>e.stopPropagation()}><div className="receipt-actions"><button onClick={onClose} aria-label="Tutup nota"><X size={20}/></button></div><div className="receipt-logo"><BrandMark/><strong>keuanganmu</strong></div><h2>Nota pencatatan</h2><p className="receipt-muted">{t.type==='expense'?'Pengeluaran':'Pemasukan'} pribadi</p><dl><div><dt>No. catatan</dt><dd>{t.id}</dd></div><div><dt>Tanggal</dt><dd>{new Date(t.date+'T00:00:00').toLocaleDateString('id-ID',{dateStyle:'long'})}</dd></div><div><dt>Kategori</dt><dd>{t.category}</dd></div></dl><div className="receipt-item"><strong>{t.title}</strong><span>{rupiah(t.amount)}</span></div><div className="receipt-total"><span>Total</span><strong>{rupiah(t.amount)}</strong></div><p className="receipt-muted">Dibuat dari catatan keuangan pribadi di Keuanganmu.<br/>Bukan bukti pembayaran dari penjual.</p><button className="primary receipt-print" onClick={()=>window.print()}><Printer size={16}/> Cetak / Simpan PDF</button></section></div>,document.body);
}
