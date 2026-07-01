
import React, { useEffect, useState } from 'react';
import { User, Appointment } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { ShieldAlert, Video, ExternalLink, RefreshCw, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';

interface TeleconsultationRoomProps {
  user: User;
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const TeleconsultationRoom: React.FC<TeleconsultationRoomProps> = ({ user, onNavigate, showToast }) => {
  const [roomId, setRoomId] = useState<string>('');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointment = async (id: string) => {
    try {
        setLoading(true);
        const app = await mockDb.getAppointmentById(id);
        
        if (!app) {
          const msg = 'Consulta não encontrada.';
          if (showToast) showToast(msg, 'error');
          setError(msg);
          setLoading(false);
          return;
        }

        if (user.role === 'admin') {
            const msg = 'Administradores não podem acessar salas de teleconsulta.';
            if (showToast) showToast(msg, 'error');
            setError(msg);
            setLoading(false);
            return;
        }

        // --- FILTRO DE SEGURANÇA (Solicitado) ---
        // Verifica estritamente se o ID do usuário logado corresponde ao paciente OU à clínica do agendamento.
        const isPatient = user.id === app.patientId;
        const isProfessional = user.id === app.clinicId;

        if (!isPatient && !isProfessional) {
           const msg = 'Acesso restrito. Você não tem permissão para entrar nesta sala.';
           if (showToast) showToast(msg, 'error');
           setError(msg);
           setLoading(false);
           return;
        }
        // ----------------------------------------

        if (app.status === 'canceled') {
            const msg = 'Esta consulta foi cancelada.';
            if (showToast) showToast(msg, 'error');
            setError(msg);
            setLoading(false);
            return;
        }

        // Verifica se o médico já liberou o link
        if (!app.meetingUrl) {
            const msg = 'O profissional ainda não disponibilizou o link da videochamada. Aguarde a liberação no seu painel.';
            if (showToast) showToast(msg, 'error');
            setError(msg);
            setLoading(false);
            return;
        }

        setAppointment(app);
        setLoading(false);

      } catch (err) {
        const msg = 'Erro ao validar acesso.';
        if (showToast) showToast(msg, 'error');
        setError(msg);
        setLoading(false);
      }
  };

  useEffect(() => {
    const hash = window.location.hash;
    const parts = hash.split('/teleconsulta/');
    if (parts.length === 2) {
      setRoomId(parts[1]);
      fetchAppointment(parts[1]);
    } else {
      const msg = 'Sala inválida.';
      if (showToast) showToast(msg, 'error');
      setError(msg);
      setLoading(false);
    }
  }, []);

  const handleJoinExternal = () => {
      if (appointment?.meetingUrl) {
          window.open(appointment.meetingUrl, '_blank');
      }
  };

  const handleRefresh = () => {
      if (roomId) fetchAppointment(roomId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold">Validando acesso seguro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
          <p className="text-slate-600 mb-6 font-medium">{error}</p>
          <button 
            onClick={() => onNavigate('/dashboard')}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/20 z-0"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-slideUp">
         
         <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
             <div>
                 <h1 className="text-2xl font-bold text-white mb-1">Sala de Conexão</h1>
                 <p className="text-slate-400 text-sm">Teleconsulta Pronta</p>
             </div>
             <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center animate-pulse">
                 <Video size={24} />
             </div>
         </div>

         <div className="space-y-6">
             {/* Info Section */}
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                 <div className="flex items-center justify-between mb-2">
                     <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Profissional</span>
                 </div>
                 <p className="text-lg font-bold text-white">{appointment?.doctorName}</p>
                 
                 <div className="w-full h-px bg-white/10 my-3"></div>

                 <div className="flex items-center justify-between mb-2">
                     <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Horário Agendado</span>
                 </div>
                 <div className="flex items-center gap-2 text-teal-300 font-mono">
                     <Clock size={16} />
                     {formatDateTime(appointment?.date)}
                 </div>
             </div>

             {/* Status Action */}
             <div className="text-center">
                 <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                     Link Externo Liberado
                 </div>
                 <button 
                    onClick={handleJoinExternal}
                    className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                 >
                     <ExternalLink size={24} /> Abrir Videochamada
                 </button>
                 <p className="text-slate-500 text-xs mt-3">Você será redirecionado para a plataforma de vídeo (Meet/Zoom/Teams).</p>
             </div>
         </div>

         <div className="mt-8 pt-4 border-t border-white/5 text-center">
             <button 
               onClick={() => onNavigate('/dashboard')}
               className="text-slate-500 hover:text-white text-sm font-medium transition-colors"
             >
                 Voltar para o Painel
             </button>
         </div>

      </div>

      <div className="absolute bottom-6 text-slate-600 text-xs font-mono flex items-center gap-2">
          <ShieldAlert size={12} /> Conexão segura e criptografada
      </div>

    </div>
  );
};

export default TeleconsultationRoom;
