
import React, { useState, useMemo, useEffect } from 'react';
import { User, Appointment, Clinic, MedicalRecord, RecordType } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { useSafeAsync } from '../hooks/useSafeAsync';
import QuickAccessCard from '../components/QuickAccessCard';
import ServiceCard from '../components/ServiceCard';
import AppointmentForm from '../components/forms/AppointmentForm';
import { Calendar, Clock, Plus, Filter, CheckCircle, Star, Send, X, Video, Stethoscope, TestTube, ClipboardCheck, Settings, Link, Copy, Heart, Trash2, History, Sparkles, ArrowLeft, QrCode, Printer, Download, ShieldCheck, FileText, FileBadge, Pill, Activity } from 'lucide-react';
import { formatDateTime, formatDate } from '../utils/dateFormatter';

const CountdownAlert: React.FC<{ appointment: Appointment & { parsedDate: Date }; onNavigate?: (path: string) => void; }> = ({ appointment, onNavigate }) => {
  const targetTime = useMemo(() => appointment.parsedDate.getTime(), [appointment.parsedDate]);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  if (!timeLeft) return null;

  return (
    <div id="next-appointment-countdown" className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-teal-500/10 mb-8 relative overflow-hidden animate-fadeIn">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full -mr-16 -mt-16"></div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row w-full md:w-auto">
          <div className="bg-white/20 p-3 rounded-2xl border border-white/30 animate-pulse">
            <Clock className="text-white" size={24} />
          </div>
          <div>
            <span className="bg-white/25 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">Sua Próxima Consulta</span>
            <h3 className="text-lg font-black uppercase tracking-tight mt-1.5">Com {appointment.doctorName || 'Profissional'}</h3>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-0.5">
              {appointment.type === 'teleconsulta' ? 'Teleconsulta Online' : 'Consulta Presencial'} • {formatDateTime(appointment.date)}
            </p>
          </div>
        </div>
        
        {/* Countdown Grid */}
        <div className="flex items-center justify-center gap-2 bg-slate-900/40 p-4 rounded-2xl border border-white/10 backdrop-blur-sm w-full md:w-auto">
          {timeLeft.days > 0 && (
            <>
              <div className="text-center min-w-[45px]">
                <p className="text-lg font-black leading-none font-mono">{String(timeLeft.days).padStart(2, '0')}</p>
                <p className="text-[8px] font-bold uppercase text-teal-200 mt-1">Dias</p>
              </div>
              <span className="text-white/40 font-mono text-xs font-black animate-pulse">:</span>
            </>
          )}
          <div className="text-center min-w-[45px]">
            <p className="text-lg font-black leading-none font-mono">{String(timeLeft.hours).padStart(2, '0')}</p>
            <p className="text-[8px] font-bold uppercase text-teal-200 mt-1 font-sans">Hrs</p>
          </div>
          <span className="text-white/40 font-mono text-xs font-black animate-pulse">:</span>
          <div className="text-center min-w-[45px]">
            <p className="text-lg font-black leading-none font-mono">{String(timeLeft.minutes).padStart(2, '0')}</p>
            <p className="text-[8px] font-bold uppercase text-teal-200 mt-1 font-sans">Min</p>
          </div>
          <span className="text-white/40 font-mono text-xs font-black animate-pulse">:</span>
          <div className="text-center min-w-[45px]">
            <p className="text-lg font-black leading-none font-mono text-emerald-200">{String(timeLeft.seconds).padStart(2, '0')}</p>
            <p className="text-[8px] font-bold uppercase text-teal-200 mt-1 font-sans">Seg</p>
          </div>
        </div>

        {appointment.type === 'teleconsulta' && (
          <button 
            type="button"
            onClick={() => onNavigate?.(`/teleconsulta/${appointment.id}`)}
            className="w-full md:w-auto px-6 py-3.5 bg-white text-teal-700 font-extrabold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Video size={14} /> Entrar na Sala
          </button>
        )}
      </div>
    </div>
  );
};

const PatientDashboard: React.FC<{ user: User; showToast?: (msg: string, type?: any) => void; onNavigate?: (path: string) => void; }> = ({ user, showToast, onNavigate }) => {
  const [viewPeriod, setViewPeriod] = useState<'upcoming' | 'history'>('upcoming');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<MedicalRecord | null>(null);

  // ENGINE: Carregamento Paralelo Único
  const fetchAllData = React.useCallback(async () => {
    const [apps, clin, favs, recs] = await Promise.all([
      mockDb.getAppointments(user.id, user.role),
      mockDb.getClinics(),
      mockDb.getFavorites(user.id),
      mockDb.getRecords(user.id, user.role)
    ]);
    return { appointments: apps, clinics: clin, favorites: favs, records: recs };
  }, [user.id, user.role, user.favorites?.join(',')]);

  const { data, loading, execute: refresh } = useSafeAsync(fetchAllData);

  const appointments = data?.appointments || [];
  const clinics = data?.clinics || [];
  const favorites = data?.favorites || [];
  const records = data?.records || [];

  // LOGIC: Próximo Agendamento para Contagem Regressiva
  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = appointments.filter(app => {
      if (app.status !== 'confirmed' && app.status !== 'scheduled') return false;
      let dStr = app.date;
      if (!dStr.includes('T')) {
        dStr = dStr.replace(' ', 'T');
      }
      const parsedDate = new Date(dStr);
      return !isNaN(parsedDate.getTime()) && parsedDate >= now;
    }).map(app => {
      let dStr = app.date;
      if (!dStr.includes('T')) {
        dStr = dStr.replace(' ', 'T');
      }
      return { ...app, parsedDate: new Date(dStr) };
    });

    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())[0];
  }, [appointments]);

  // LOGIC: Filtros Memoizados (Zero Lag)
  const filteredList = useMemo(() => {
    return appointments.filter(app => {
      const isUpcoming = new Date(app.date.replace(' ', 'T')) >= new Date() || app.date.startsWith(new Date().toISOString().split('T')[0]);
      if (viewPeriod === 'upcoming' && !isUpcoming) return false;
      if (viewPeriod === 'history' && isUpcoming && app.status !== 'done' && app.status !== 'canceled') return false;
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      return true;
    }).sort((a,b) => viewPeriod === 'upcoming' ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, viewPeriod, statusFilter]);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancelar agendamento?")) return;
    try {
      if (showToast) showToast("Cancelando...", "success");
      await mockDb.cancelAppointment(id);
      refresh();
      if (showToast) showToast("Cancelado com sucesso.");
    } catch (e) {
      if (showToast) showToast("Erro ao cancelar.", "error");
    }
  };

  const services = [
    { id: 'teleconsulta', title: 'Teleconsulta', icon: <Video size={20} />, path: '/search?type=teleconsulta' },
    { id: 'presencial', title: 'Consulta', icon: <Stethoscope size={20} />, path: '/search?type=presencial' },
    { id: 'exames', title: 'Exames', icon: <TestTube size={20} />, path: '/search?type=exame' },
    { id: 'resultados', title: 'Resultados', icon: <ClipboardCheck size={20} />, path: '/documents' },
    { id: 'perfil', title: 'Minha Conta', icon: <Settings size={20} />, path: '/profile' },
  ];

  const handleDownloadReport = (doc: MedicalRecord, format: 'html' | 'txt') => {
    const cleanName = (doc.title || doc.diagnosis).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Relatorio_Atendimento_${cleanName}_${doc.date}`;

    if (format === 'txt') {
      const textContent = `
========================================
MARCLYN SAÚDE - PRONTUÁRIO DE ATENDIMENTO
========================================
ID DO REGISTRO: ${doc.id.toUpperCase()}
DATA DE EMISSÃO: ${formatDate(doc.date)}
PACIENTE: ${user.name}
DOCUMENTO DO PACIENTE: ${user.document || 'Não Informado'}
MÉDICO RESPONSÁVEL: ${doc.doctorName}
-----------------------------------------
TIPO DE DOCUMENTO: Prontuário / Resumo
DIAGNÓSTICO PRIMÁRIO:
${doc.diagnosis}

PRESCRIÇÃO & CONDUTA CLÍNICA:
${doc.conduct || ''}
${doc.prescription || "Sem demais observações."}
-----------------------------------------
MARCLYN SAÚDE PRO - Assinatura Eletrônica Certificada
`;
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${doc.title || 'Relatório de Atendimento'}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .title { text-align: center; text-transform: uppercase; margin-bottom: 30px; }
            .block { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; border-left: 4px solid #14b8a6; padding-left: 10px; text-transform: uppercase; margin-bottom: 15px; font-size: 14px; }
            .signature { margin-top: 50px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin: 0; color: #0d9488;">MARCLYN SAÚDE</h2>
              <p style="margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Plataforma de Saúde Integrada</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Emissão</span><br>
              <strong>${formatDate(doc.date)}</strong>
            </div>
          </div>
          <div class="title">
            <h1 style="margin: 0;">Prontuário / Resumo de Atendimento</h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 5px;">Controle: ${doc.id.toUpperCase()}</p>
          </div>
          <div class="block">
            <p style="margin: 0 0 8px 0;"><strong>Paciente:</strong> ${user.name}</p>
            <p style="margin: 0 0 8px 0;"><strong>CPF:</strong> ${user.document || 'Não Informado'}</p>
            <p style="margin: 0;"><strong>Profissional:</strong> ${doc.doctorName}</p>
          </div>
          <div class="section">
            <div class="section-title">Diagnóstico Primário</div>
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #0f172a;">${doc.diagnosis}</p>
          </div>
          <div class="section">
            <div class="section-title">Conduta Clínica</div>
            <p style="margin: 0; font-style: italic;">${doc.conduct || 'Nenhuma conduta registrada.'}</p>
          </div>
          <div class="section">
            <div class="section-title">Prescrição e Recomendações</div>
            <p style="margin: 0; white-space: pre-wrap;">${doc.prescription}</p>
          </div>
          <div class="signature">
            <div style="width: 200px; border-bottom: 1px solid #94a3b8; display: inline-block; margin-bottom: 5px;"></div>
            <p style="margin: 0; font-weight: bold; font-size: 12px; text-transform: uppercase;">${doc.doctorName}</p>
            <p style="margin: 0; font-size: 10px; color: #64748b;">Assinatura Eletrônica Certificada</p>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return { label: 'Concluída', style: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
      case 'canceled':
        return { label: 'Cancelada', style: 'bg-rose-50 text-rose-700 border-rose-100' };
      case 'confirmed':
      case 'scheduled':
        return { label: 'Confirmada', style: 'bg-teal-50 text-teal-700 border-teal-100' };
      case 'pending':
      default:
        return { label: 'Pendente', style: 'bg-yellow-50 text-yellow-700 border-yellow-100' };
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fadeIn">
      <button 
        onClick={() => onNavigate?.('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      {showBookingModal && selectedClinic && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <AppointmentForm clinics={clinics} patientId={user.id} preSelectedClinicId={selectedClinic.id} onSuccess={() => { setShowBookingModal(false); refresh(); }} onCancel={() => setShowBookingModal(false)} showToast={showToast} />
        </div>
      )}

      <div className="mb-10">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Olá, {user.name.split(' ')[0]}</h2>
        <p className="text-slate-500 text-sm font-medium">Sua saúde em dia. O que faremos hoje?</p>
      </div>

      {/* Club Paciente Status Card */}
      <div className="mb-10">
        {user.patientType === 'club' || user.subscriptionStatus === 'active' ? (
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white border border-white/10 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[50px] rounded-full -mr-16 -mt-16"></div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-teal-500/20 p-3 rounded-2xl border border-teal-500/30">
                  <Sparkles className="text-teal-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Membro Club Paciente</h3>
                  <p className="text-teal-400 text-xs font-bold uppercase tracking-widest">Plano Ativo • {user.subscriptionPlan || 'Premium'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Consultas</p>
                  <p className="text-sm font-black text-teal-400">-10%</p>
                </div>
                <div className="text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Exames</p>
                  <p className="text-sm font-black text-teal-400">-10%</p>
                </div>
                <div className="text-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Farmácias</p>
                  <p className="text-sm font-black text-teal-400">-10%</p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate?.('/search')} 
                className="w-full md:w-auto px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Ver Benefícios
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-pink-500 to-pink-700 rounded-[2rem] p-6 text-white shadow-xl shadow-pink-500/20 relative overflow-hidden group cursor-pointer" onClick={() => {
            onNavigate?.('/');
            setTimeout(() => {
              const el = document.getElementById('club-paciente');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
              <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                <div className="bg-white/20 p-3 rounded-2xl border border-white/30">
                  <Heart className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Vire Membro do Club Paciente</h3>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Descontos exclusivos e pronto atendimento 24h</p>
                </div>
              </div>
              <button className="w-full md:w-auto px-8 py-3 bg-white text-pink-700 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-95">
                Assinar Club Paciente
              </button>
            </div>
          </div>
        )}
      </div>

      {nextAppointment && (
        <CountdownAlert appointment={nextAppointment} onNavigate={onNavigate} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        {services.map(s => (
          <QuickAccessCard key={s.id} title={s.title} icon={s.icon} onClick={() => onNavigate?.(s.path)} />
        ))}
      </div>

      {favorites.length > 0 && (
        <div className="mb-12">
          <h3 className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Heart size={14} className="fill-teal-600" /> Clínicas e Profissionais Favoritos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favorites.map(c => <ServiceCard key={c.id} clinic={c} user={user} onBook={(cl) => { setSelectedClinic(cl); setShowBookingModal(true); }} onNavigate={onNavigate!} showToast={showToast} />)}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-t border-slate-100 pt-8">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Meus Agendamentos</h3>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setViewPeriod('upcoming')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewPeriod === 'upcoming' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>Próximos</button>
          <button onClick={() => setViewPeriod('history')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewPeriod === 'history' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>Histórico</button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-black uppercase text-xs animate-pulse">Sincronizando agenda...</div>
        ) : filteredList.length > 0 ? (
          filteredList.map(app => {
            const badge = getStatusBadge(app.status);
            return (
              <div key={app.id} className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-md transition-all ${app.status === 'canceled' ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-inner">
                    {app.type === 'teleconsulta' ? <Video size={24}/> : <Calendar size={24}/>}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase tracking-tight">{app.doctorName || 'Profissional'}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{formatDateTime(app.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${badge.style}`}>{badge.label}</span>
                  {app.status === 'done' && (
                    <button
                      onClick={() => {
                        const matchingRecord = records.find(r => {
                          const appDateOnly = app.date.split(' ')[0].split('T')[0];
                          const recDateOnly = r.date.split('T')[0].split(' ')[0];
                          return appDateOnly === recDateOnly && 
                                 ((r.doctorName || '').toLowerCase().includes((app.doctorName || '').toLowerCase()) || 
                                  (app.doctorName || '').toLowerCase().includes((r.doctorName || '').toLowerCase()));
                        });
                        
                        const docToView = matchingRecord || {
                          id: `rec-fallback-${app.id}`,
                          patientId: user.id,
                          date: app.date.split(' ')[0].split('T')[0],
                          doctorName: app.doctorName || 'Médico Parceiro',
                          diagnosis: app.type === 'teleconsulta' ? "Teleconsulta Online Realizada" : "Consulta Presencial Realizada",
                          conduct: "Atendimento clínico realizado. Paciente cooperativo(a), queixas anotadas e conduta estabelecida.",
                          prescription: "Fazer bochechos frequentes com água morna. Manter repouso moderado, hidratação adequada de 2L a 3L de líquidos por dia e boa alimentação. Em caso de dor mais intensa ou febre persistente, retornar ao atendimento para nova avaliação.",
                          type: 'consultation' as RecordType,
                          title: `Resumo - Consulta com ${app.doctorName || 'Médico'}`
                        };
                        setSelectedDoc(docToView);
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-teal-600 hover:border-teal-600 transition-colors flex items-center gap-1.5 active:scale-95 shadow-lg select-none"
                    >
                      <FileText size={12} /> Ver Resumo
                    </button>
                  )}
                  {app.status !== 'canceled' && app.status !== 'done' && (
                    <button 
                      onClick={() => handleCancel(app.id)} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors active:scale-90"
                    >
                      <Trash2 size={18}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs">Nenhum registro encontrado.</div>
        )}
      </div>

      {/* INTERNAL DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md no-print" onClick={() => setSelectedDoc(null)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slideUp">
                
                {/* Viewer Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center no-print">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-snug">{selectedDoc.title || selectedDoc.diagnosis}</h3>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Resumo de Consulta de Saúde</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Report Content - This is the PRINTABLE part */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50 scrollbar-hide">
                    <div id="printable-document" className="max-w-2xl mx-auto bg-white p-8 md:p-16 shadow-lg border border-slate-200 rounded-sm relative min-h-[600px] flex flex-col">
                        
                        {/* Medical Header Style */}
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-8 mb-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-600 p-2 rounded-lg">
                                    <Activity size={32} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">MARCLYN SAÚDE</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Plataforma de Saúde Integrada</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-black text-slate-400 uppercase mb-1">Documento Gerado em</div>
                                <div className="font-bold text-slate-900">{formatDate(selectedDoc.date)}</div>
                            </div>
                        </div>

                        {/* Document Title */}
                        <div className="text-center mb-12">
                            <h1 className="text-xl font-black text-slate-900 uppercase underline underline-offset-8 decoration-teal-500">
                                Prontuário / Resumo de Atendimento
                            </h1>
                            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Controle: {selectedDoc.id.toUpperCase()}</p>
                        </div>

                        {/* Patient & Prof Block */}
                        <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                             <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Paciente</span>
                                <span className="font-black text-slate-800 text-lg">{user.name}</span>
                                <span className="block text-xs text-slate-500 font-medium">CPF: {user.document || '---.---.---/--'}</span>
                             </div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Profissional Responsável</span>
                                <span className="font-black text-slate-800">{selectedDoc.doctorName}</span>
                                <span className="block text-xs text-slate-500 font-medium">Registro Profissional Ativo</span>
                             </div>
                        </div>

                        {/* Main Medical Content */}
                        <div className="space-y-10 flex-1">
                            {/* Diagnosis Section */}
                            <div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase border-l-4 border-teal-500 pl-3 mb-4 tracking-wider">Diagnóstico / Conclusão Clínica</h4>
                                <p className="text-slate-800 font-bold text-base leading-relaxed pl-4">
                                    {selectedDoc.diagnosis}
                                </p>
                            </div>

                            {/* Detailed Report / Prescription */}
                            <div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase border-l-4 border-teal-500 pl-3 mb-4 tracking-wider">Conduta Clínica & Recomendações</h4>
                                <div className="text-slate-700 leading-loose whitespace-pre-wrap font-medium bg-slate-50/40 p-6 rounded-2xl border border-slate-100">
                                    <p className="mb-4 text-xs font-semibold text-slate-750"><strong>Conduta:</strong> {selectedDoc.conduct || "Atendimento clínico padrão realizado sem intercorrências."}</p>
                                    <p className="text-xs font-semibold text-slate-750"><strong>Prescrição / Orientações:</strong> {selectedDoc.prescription || "Nenhum medicamento prescrito. Paciente orientado(a) a manter hábitos saudáveis."}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer / Validation Area */}
                        <div className="mt-16 pt-10 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-4 opacity-60">
                                    <div className="p-2 border border-slate-300 rounded">
                                        <QrCode size={48} className="text-slate-400" />
                                    </div>
                                    <div className="text-[9px] text-slate-400 leading-tight">
                                        Para validar a autenticidade deste<br/>documento, acesse nosso portal de<br/>verificação e informe o código acima.
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{selectedDoc.doctorName}</p>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold">Assinatura Eletrônica Certificada</p>
                                    <div className="mt-2 flex items-center justify-center gap-1.5 text-teal-600 font-black text-[8px] uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                        <ShieldCheck size={10} /> Documento Original
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* DOWNLOAD SECTION */}
                    <div className="max-w-2xl mx-auto mt-8 bg-slate-900 text-white p-8 rounded-3xl border border-slate-850 shadow-2xl flex flex-col gap-6 no-print">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={24} className="text-teal-400" />
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-wider text-slate-100">Gerenciador de Arquivos Seguro</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Controle de downloads e exportações de relatórios médicos criptografados.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                            <button 
                                onClick={() => handleDownloadReport(selectedDoc, 'html')}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                            >
                                <Download size={12} /> HTML Seguro
                            </button>
                            <button 
                                onClick={() => handleDownloadReport(selectedDoc, 'txt')}
                                className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1"
                            >
                                <Download size={12} /> Texto (.txt)
                            </button>
                            <button 
                                onClick={() => window.print()}
                                className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-bold text-[9px] uppercase py-2.5 px-3 rounded-lg border border-teal-500/20 transition-all flex items-center justify-center gap-1"
                            >
                                <Printer size={12} /> Imprimir Doc
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
