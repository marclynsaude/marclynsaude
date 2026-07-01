
import React, { useState, useEffect } from 'react';
import { Clinic, TimeSlot } from '../../types';
import { mockDb } from '../../lib/mockSupabase';
import { Calendar, Clock, Stethoscope, ChevronRight, AlertCircle, Video, TestTube, CheckCircle, MessageCircle, ArrowRight, X } from 'lucide-react';
import { formatDate } from '../../utils/dateFormatter';

interface AppointmentFormProps {
  clinics: Clinic[];
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  preSelectedClinicId?: string;
  preSelectedType?: 'presencial' | 'teleconsulta' | 'exame';
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  clinics, 
  patientId, 
  onSuccess, 
  onCancel, 
  showToast,
  preSelectedClinicId,
  preSelectedType
}) => {
  const [selectedClinic, setSelectedClinic] = useState(preSelectedClinicId || '');
  const [selectedType, setSelectedType] = useState<'presencial' | 'teleconsulta' | 'exame' | ''>(preSelectedType || '');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [doctor, setDoctor] = useState('');
  
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (preSelectedClinicId) {
      setSelectedClinic(preSelectedClinicId);
    }
  }, [preSelectedClinicId]);

  useEffect(() => {
    if (preSelectedType) {
      setSelectedType(preSelectedType);
    }
  }, [preSelectedType]);

  useEffect(() => {
    if (selectedClinic) {
      loadSlots(selectedClinic);
      if (!preSelectedType) {
        setSelectedType(''); 
      }
    } else {
      setAvailableSlots([]);
      setAvailableDates([]);
    }
  }, [selectedClinic]);

  const loadSlots = (clinicId: string) => {
    setIsLoadingSlots(true);
    mockDb.getAvailableSlots(clinicId).then(slots => {
      setAvailableSlots(slots);
      const dates = Array.from(new Set(slots.map(s => s.date))).sort() as string[];
      setAvailableDates(dates);
      
      if (selectedDate && !dates.includes(selectedDate)) {
        setSelectedDate('');
        setSelectedTime('');
      } else if (selectedDate) {
        const timesForDate = slots.filter(s => s.date === selectedDate).map(s => s.time);
        if (selectedTime && !timesForDate.includes(selectedTime)) {
          setSelectedTime('');
        }
      }
      
      setIsLoadingSlots(false);
    });
  };

  useEffect(() => {
    if (selectedDate) {
      const times = availableSlots
        .filter(s => s.date === selectedDate)
        .map(s => s.time)
        .sort();
      setAvailableTimes(times);
      setSelectedTime('');
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDate, availableSlots]);

  const getClinicServices = () => {
      const clinic = clinics.find(c => c.id === selectedClinic);
      if (!clinic || !clinic.availableServices || clinic.availableServices.length === 0) {
          return ['presencial'];
      }
      return clinic.availableServices;
  };

  const generateAppointmentWhatsappLink = () => {
    const clinic = clinics.find(c => c.id === selectedClinic);
    if (!clinic || !clinic.phone) return null;

    const cleanPhone = clinic.phone.replace(/\D/g, '');
    const dateFormatted = formatDate(selectedDate);
    
    const message = `Olá, tudo bem? 👋
Acabei de realizar um agendamento pelo site Marclyn.

👨‍⚕️ Profissional/Clínica: ${clinic.name}
📌 Serviço: ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
📅 Data: ${dateFormatted}
⏰ Horário: ${selectedTime}

Poderia confirmar meu agendamento, por favor?
Obrigado!`;

    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedClinic || !selectedDate || !selectedTime || !selectedType) {
      if (showToast) showToast('Por favor, preencha todos os campos.', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const freshAvailableSlots = await mockDb.getAvailableSlots(selectedClinic);
      const isSlotStillAvailable = freshAvailableSlots.some(
        s => s.date === selectedDate && s.time === selectedTime
      );

      if (!isSlotStillAvailable) {
        if (showToast) showToast('Este horário acabou de ser reservado por outro paciente.', 'error');
        loadSlots(selectedClinic);
        setIsSubmitting(false);
        return;
      }

      const clinic = clinics.find(c => c.id === selectedClinic);
      
      await mockDb.createAppointment({
        patientId,
        clinicId: selectedClinic,
        doctorName: doctor || clinic?.name || 'Profissional',
        date: `${selectedDate} ${selectedTime}`,
        type: selectedType, 
        notes: `Agendamento (${selectedType}) via plataforma`
      });
      
      if (showToast) showToast('Agendamento realizado com sucesso!');
      
      // EXIBIR TELA DE SUCESSO E TENTAR ABRIR WHATSAPP
      setIsSuccess(true);
      
      const whatsappLink = generateAppointmentWhatsappLink();
      if (whatsappLink) {
        // Delay sutil para o usuário ver a transição
        setTimeout(() => {
          window.open(whatsappLink, '_blank');
        }, 800);
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Erro ao realizar agendamento.';
      if (showToast) showToast(msg, 'error');
      if (selectedClinic) loadSlots(selectedClinic);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TELA DE SUCESSO COM FALLBACK DO WHATSAPP
  if (isSuccess) {
    const whatsappLink = generateAppointmentWhatsappLink();
    return (
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-teal-100 animate-fadeIn text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 mb-6 shadow-sm border border-teal-100">
           <CheckCircle size={48} strokeWidth={2.5} />
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Agendamento Realizado!</h3>
        <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed max-w-xs">
          Sua consulta está pré-agendada. Agora você precisa confirmar os detalhes com o profissional via WhatsApp.
        </p>

        <div className="w-full bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 text-left">
           <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              <Calendar size={14} /> Resumo do Agendamento
           </div>
           <p className="font-black text-slate-800 text-lg mb-1">{clinics.find(c => c.id === selectedClinic)?.name}</p>
           <p className="text-slate-500 font-bold text-sm flex items-center gap-1.5 capitalize">
             {selectedType} · {formatDate(selectedDate)} às {selectedTime}
           </p>
        </div>

        {whatsappLink ? (
          <div className="w-full space-y-3">
            <button
              onClick={() => window.open(whatsappLink, '_blank')}
              className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-[#128C7E] transition-all shadow-xl shadow-green-500/20 active:scale-95 animate-bounce"
            >
              <MessageCircle size={20} /> Confirmar no WhatsApp
            </button>
            <button
              onClick={onSuccess}
              className="w-full bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
            >
              Ir para o meu Painel <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl flex items-center gap-3 text-left">
               <AlertCircle size={24} className="flex-shrink-0" />
               <p className="text-xs font-bold">O profissional não possui número de WhatsApp cadastrado. Ele entrará em contato via e-mail.</p>
            </div>
            <button
              onClick={onSuccess}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-teal-600 transition-all shadow-xl"
            >
              Acessar Painel <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-teal-100 animate-fadeIn flex flex-col h-full md:h-auto overflow-y-auto max-h-[90vh]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
             <Calendar size={20} />
          </div>
          Novo Agendamento
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
          <X size={20} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Step 1: Select Clinic */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">1. Escolha o Local</label>
          <div className="relative">
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              disabled={!!preSelectedClinicId} 
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none appearance-none transition-all font-medium ${preSelectedClinicId ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
            >
              <option value="">Selecione uma clínica ou profissional...</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.specialty}</option>
              ))}
            </select>
            <Stethoscope className="absolute left-3 top-3.5 text-slate-400" size={18} />
          </div>
        </div>

        {/* Step 1.5: Select Type */}
        {selectedClinic && (
             <div className="animate-slideIn">
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Tipo de Atendimento</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {getClinicServices().includes('presencial') && (
                        <button
                            type="button"
                            onClick={() => setSelectedType('presencial')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedType === 'presencial' ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                        >
                            <Stethoscope size={20} />
                            <span className="text-xs font-bold">Presencial</span>
                        </button>
                    )}
                    {getClinicServices().includes('teleconsulta') && (
                        <button
                            type="button"
                            onClick={() => setSelectedType('teleconsulta')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedType === 'teleconsulta' ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                        >
                            <Video size={20} />
                            <span className="text-xs font-bold">Teleconsulta</span>
                        </button>
                    )}
                    {getClinicServices().includes('exame') && (
                         <button
                            type="button"
                            onClick={() => setSelectedType('exame')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedType === 'exame' ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                        >
                            <TestTube size={20} />
                            <span className="text-xs font-bold">Exames</span>
                        </button>
                    )}
                </div>
             </div>
        )}

        {/* Step 2: Select Date */}
        {selectedClinic && (
          <div className="animate-slideIn">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">2. Data Disponível</label>
            {isLoadingSlots ? (
              <div className="text-slate-400 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin"></div>
                Buscando agenda...
              </div>
            ) : availableDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableDates.map(date => {
                   const [y, m, d] = date.split('-');
                   const displayDate = `${d}/${m}`;
                   const isSelected = selectedDate === date;
                   
                   return (
                     <button
                       key={date}
                       type="button"
                       onClick={() => setSelectedDate(date)}
                       className={`px-4 py-2 rounded-lg border font-bold text-sm transition-all ${isSelected ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                     >
                       {displayDate}
                     </button>
                   );
                })}
              </div>
            ) : (
              <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> Sem datas disponíveis para este local.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Time */}
        {selectedDate && (
          <div className="animate-slideIn">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">3. Horário</label>
            <div className="flex flex-wrap gap-2">
              {availableTimes.map(time => (
                 <button
                   key={time}
                   type="button"
                   onClick={() => setSelectedTime(time)}
                   className={`px-4 py-2 rounded-lg border font-bold text-sm flex items-center gap-2 transition-all ${selectedTime === time ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                 >
                   <Clock size={14} /> {time}
                 </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary & Submit */}
        {selectedTime && (
           <div className="animate-slideIn bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resumo</label>
              <p className="text-slate-800 font-bold flex items-center gap-2">
                 <Calendar size={16} className="text-teal-500"/> 
                 {formatDate(selectedDate)} às {selectedTime}
              </p>
              {selectedType && (
                   <p className="text-slate-600 text-sm mt-1 flex items-center gap-2 font-medium capitalize">
                       {selectedType === 'presencial' ? <Stethoscope size={14}/> : selectedType === 'teleconsulta' ? <Video size={14}/> : <TestTube size={14}/>}
                       {selectedType}
                   </p>
              )}
              <input
                type="text"
                placeholder="Nome do Médico (Opcional)"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="w-full mt-3 px-3 py-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-teal-500 outline-none text-sm"
              />
           </div>
        )}

        <div className="flex gap-3 pt-4 mt-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedTime || !selectedType}
            className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isSubmitting ? 'Agendando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;
