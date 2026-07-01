
import React, { useState, useMemo } from 'react';
import { Clinic, User } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { useSafeAsync } from '../hooks/useSafeAsync';
import ServiceCard from '../components/ServiceCard';
import AppointmentForm from '../components/forms/AppointmentForm';
import { Search, Filter, Stethoscope, Video, TestTube, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const SearchPage: React.FC<{ user: User | null; onNavigate: (path: string) => void; showToast?: (msg: string, type?: any) => void; }> = ({ user, onNavigate, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  const { data: allClinics, loading } = useSafeAsync(mockDb.getClinics);

  // CORE: Filtragem Reativa de Alta Performance
  const filteredClinics = useMemo(() => {
    if (!allClinics) return [];
    let result = allClinics;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(term) || c.specialty.toLowerCase().includes(term) || c.neighborhood.toLowerCase().includes(term));
    }
    if (selectedTypes.length > 0) {
      result = result.filter(c => c.availableServices?.some(s => selectedTypes.includes(s)));
    }

    // Sorting Logic: Plan Priority > Rating > Review Count
    return [...result].sort((a, b) => {
      const planPriority: Record<string, number> = { 'advanced': 4, 'premium': 3, 'medio': 2, 'basic': 1 };
      const priorityA = planPriority[a.planType || 'basic'] || 0;
      const priorityB = planPriority[b.planType || 'basic'] || 0;

      if (priorityA !== priorityB) return priorityB - priorityA;
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });
  }, [allClinics, searchTerm, selectedTypes]);

  const toggleType = (type: string) => setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  return (
    <div className="bg-slate-50 min-h-screen animate-fadeIn">
      {showBookingModal && selectedClinic && user && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <AppointmentForm clinics={allClinics || []} patientId={user.id} preSelectedClinicId={selectedClinic.id} onSuccess={() => { setShowBookingModal(false); onNavigate('/dashboard'); }} onCancel={() => setShowBookingModal(false)} showToast={showToast} />
        </div>
      )}

      <div className="bg-slate-900 text-white pt-12 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => onNavigate('/')} className="flex items-center gap-2 text-white/40 font-black text-[10px] uppercase mb-8 hover:text-white transition-all"><ArrowLeft size={14}/> Início</button>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Encontre seu Especialista</h1>
          <div className="relative max-w-2xl">
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-5 bg-white/10 backdrop-blur-xl border border-white/5 rounded-[2rem] text-white placeholder:text-white/30 focus:bg-white/20 transition-all font-bold outline-none" placeholder="Nome, especialidade ou bairro..." />
            <Search className="absolute left-4 top-5 text-white/40" size={24} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100 sticky top-24">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><Filter size={14} className="text-teal-600" /> Filtrar Por</h3>
              <div className="space-y-3">
                {[ { id: 'teleconsulta', label: 'Teleconsulta', icon: <Video size={14}/> }, { id: 'presencial', label: 'Presencial', icon: <Stethoscope size={14}/> }, { id: 'exame', label: 'Exames', icon: <TestTube size={14}/> } ].map(t => (
                  <button key={t.id} onClick={() => toggleType(t.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${selectedTypes.includes(t.id) ? 'bg-teal-600 text-white border-teal-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-teal-200'}`}>
                    <div className="flex items-center gap-2">{t.icon} {t.label}</div>
                    {selectedTypes.includes(t.id) && <CheckCircle size={14}/>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-teal-600" size={32} /></div>
            ) : filteredClinics.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClinics.map(c => <ServiceCard key={c.id} clinic={c} user={user} onBook={(cl) => { setSelectedClinic(cl); if(!user) onNavigate('/login'); else setShowBookingModal(true); }} onNavigate={onNavigate} showToast={showToast} />)}
              </div>
            ) : (
              <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">Nenhum resultado.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
