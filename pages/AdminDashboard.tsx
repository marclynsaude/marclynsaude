
import React, { useEffect, useState, useCallback } from 'react';
import { User } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { LayoutDashboard, Users, Building, Activity, TrendingUp, UserPlus, ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  onNavigate: (path: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({ users: 0, clinics: 0, appointments: 0, records: 0, pendingUsers: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mockDb.getStats();
      setStats(data);
    } catch (e) {
      console.error("Erro ao carregar estatísticas do Admin", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="p-4 md:p-8 animate-fadeIn">
      <button 
        onClick={() => onNavigate?.('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-200">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Painel Administrativo</h1>
            <p className="text-slate-500 text-sm font-medium">Visão geral do sistema Marclyn Saúde</p>
          </div>
        </div>
        <button 
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Atualizando...' : 'Atualizar Dados'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Total Usuários</span>
            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Users size={16} /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tighter">{loading ? '...' : stats.users}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Clínicas Ativas</span>
            <div className="p-2 bg-teal-50 text-teal-500 rounded-lg"><Building size={16} /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tighter">{loading ? '...' : stats.clinics}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">Agendamentos</span>
            <div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Activity size={16} /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tighter">{loading ? '...' : stats.appointments}</div>
        </div>

        <div className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${stats.pendingUsers > 0 ? 'border-red-200' : 'border-slate-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${stats.pendingUsers > 0 ? 'text-red-500' : 'text-slate-400'}`}>Pendentes</span>
            <div className={`p-2 rounded-lg ${stats.pendingUsers > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}><ShieldAlert size={16} /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
            {loading ? '...' : stats.pendingUsers}
            {stats.pendingUsers > 0 && <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div> Aprovações Necessárias
             </h3>
             <button 
               onClick={() => onNavigate('/admin/approvals')}
               className="text-[10px] font-black text-purple-600 bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors uppercase tracking-widest"
             >
               GERENCIAR
             </button>
          </div>
          
          {stats.pendingUsers > 0 ? (
            <div 
              onClick={() => onNavigate('/admin/approvals')}
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 cursor-pointer hover:bg-yellow-100 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-yellow-200 p-3 rounded-xl text-yellow-700 shadow-sm group-hover:scale-110 transition-transform">
                  <UserPlus size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-800 uppercase text-sm tracking-tight">Novos Cadastros</p>
                  <p className="text-xs text-slate-600 font-medium">Existem {stats.pendingUsers} parceiros aguardando validação.</p>
                </div>
              </div>
              <ChevronRight className="text-slate-400 group-hover:text-yellow-600 transition-colors" />
            </div>
          ) : (
             <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
               <ShieldAlert size={32} className="opacity-20" />
               <p className="font-bold uppercase text-[10px] tracking-widest">Nenhuma pendência no momento</p>
             </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <h3 className="font-black text-teal-400 uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
             <TrendingUp size={14}/> Ações do Sistema
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Gerenciar Assinaturas', path: '/admin/subscriptions' },
              { label: 'Logs de Segurança', path: '/admin/logs' },
              { label: 'Configurações Globais', path: '/admin/settings' }
            ].map((action, i) => (
              <button 
                key={i}
                onClick={() => onNavigate(action.path)}
                className="w-full text-left p-4 hover:bg-white/10 rounded-2xl transition-all flex justify-between items-center group border border-white/5 hover:border-white/10"
              >
                <span className="font-bold text-sm">{action.label}</span>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-teal-500 transition-all">
                  <ChevronRight size={16} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChevronRight = ({ size, className }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export default AdminDashboard;
