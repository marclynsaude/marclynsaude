
import React, { useState } from 'react';
import { User, TimeSlot } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { useSafeAsync } from '../hooks/useSafeAsync';
import { Calendar, Clock, Trash2, Plus, Sparkles, Loader2, CalendarRange, Info, ArrowLeft } from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

const SchedulePage: React.FC<{ user: User; onNavigate: (path: string) => void; showToast?: (msg: string, type?: any) => void; }> = ({ user, onNavigate, showToast }) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'manual'>('batch');
  const [batchData, setBatchData] = useState({ start: '', end: '', startH: '08:00', endH: '18:00', dur: '60' });
  const [adding, setAdding] = useState(false);

  const fetchSlots = React.useCallback(() => mockDb.getAllSlotsForClinic(user.id), [user.id]);
  const { data: slots, loading, execute: refresh } = useSafeAsync(fetchSlots);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchData.start || !batchData.end) return showToast?.("Defina o período.", "error");
    setAdding(true);
    try {
      const slotsToCreate: {date: string, time: string}[] = [];
      const startD = new Date(batchData.start + 'T00:00:00');
      const endD = new Date(batchData.end + 'T00:00:00');
      
      let currentD = new Date(startD);
      while(currentD <= endD) {
        if (currentD.getDay() !== 0 && currentD.getDay() !== 6) { // Ignora fds
          const dateStr = currentD.toISOString().split('T')[0];
          let curH = new Date(`${dateStr}T${batchData.startH}:00`);
          const limH = new Date(`${dateStr}T${batchData.endH}:00`);
          while(curH < limH) {
            slotsToCreate.push({ date: dateStr, time: curH.toTimeString().substring(0,5) });
            curH.setMinutes(curH.getMinutes() + parseInt(batchData.dur));
          }
        }
        currentD.setDate(currentD.getDate() + 1);
      }
      await mockDb.createTimeSlotsBatch(user.id, slotsToCreate);
      showToast?.("Agenda gerada com sucesso!");
      refresh();
    } catch (e) {
      showToast?.("Erro ao gerar agenda.", "error");
    } finally { setAdding(false); }
  };

  const grouped = (slots || []).reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fadeIn">
      <button 
        onClick={() => onNavigate?.('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      <div className="mb-10">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3"><Calendar className="text-teal-600" /> Gestão de Disponibilidade</h2>
        <p className="text-slate-500 text-sm font-medium">Defina quando você está disponível para atender.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden sticky top-24">
            <div className="flex bg-slate-50 border-b border-slate-100">
              <button 
                id="schedule-tab-batch"
                type="button" 
                onClick={() => setActiveTab('batch')} 
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'batch' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'}`}
              >
                Automático
              </button>
              <button 
                id="schedule-tab-manual"
                type="button" 
                onClick={() => setActiveTab('manual')} 
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'}`}
              >
                Manual
              </button>
            </div>
            <div className="p-8">
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Início</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={batchData.start} onChange={e => setBatchData({...batchData, start: e.target.value})} /></div>
                  <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fim</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={batchData.end} onChange={e => setBatchData({...batchData, end: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hora Início</label><input type="time" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={batchData.startH} onChange={e => setBatchData({...batchData, startH: e.target.value})} /></div>
                  <div><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hora Fim</label><input type="time" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={batchData.endH} onChange={e => setBatchData({...batchData, endH: e.target.value})} /></div>
                </div>
                <button type="submit" disabled={adding} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-600 transition-all flex items-center justify-center gap-2">
                  {adding ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Gerar Agenda
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {loading ? (
             <div className="py-20 text-center text-slate-400 font-black uppercase text-xs animate-pulse">Sincronizando grade...</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">Agenda vazia.</div>
          ) : (
            Object.keys(grouped).sort().map(date => (
              <div key={date} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-slideUp">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{formatDate(date)}</h4>
                  <button onClick={async () => { if(window.confirm("Limpar dia?")) { await mockDb.deleteSlotsByDate(user.id, date); refresh(); } }} className="text-[8px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">Limpar Dia</button>
                </div>
                <div className="p-6 grid grid-cols-4 md:grid-cols-6 gap-2">
                  {grouped[date].sort((a,b) => a.time.localeCompare(b.time)).map(s => (
                    <div key={s.id} className={`p-2 rounded-lg border text-center font-mono text-[10px] font-bold ${s.isBooked ? 'bg-red-50 text-red-400 border-red-100 line-through' : 'bg-white text-slate-600 border-slate-100'}`}>{s.time}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
