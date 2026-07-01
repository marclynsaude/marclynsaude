import React, { useEffect, useState, useCallback } from 'react';
import { User, UserRole } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { Check, X, ShieldAlert, Building, User as UserIcon, RefreshCw, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface AdminApprovalsProps {
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const roleLabels: Record<UserRole, string> = {
  patient: 'Paciente',
  clinic: 'Clínica',
  professional: 'Profissional',
  admin: 'Administrador'
};

const AdminApprovals: React.FC<AdminApprovalsProps> = ({ onBack, showToast }) => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        console.log("[ADMIN] Carregando aprovações...");
        const users = await mockDb.getPendingUsers();
        setPendingUsers(users);
        console.log("[ADMIN] Usuários carregados:", users.length);
    } catch (e: any) {
        console.error("[ADMIN] Erro ao buscar aprovações:", e);
        const msg = e.message || "Erro ao conectar com o banco de dados.";
        setError(msg);
        showToast(msg, "error");
    } finally {
        setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (userId: string, action: 'active' | 'rejected') => {
    setProcessingId(userId);
    const userToUpdate = pendingUsers.find(u => u.id === userId);
    const userName = userToUpdate?.name || 'Usuário';
    
    try {
      await mockDb.updateUserStatus(userId, action);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      
      if (action === 'active') {
        showToast(`Acesso aprovado para ${userName}!`);
      } else {
        showToast(`Cadastro de ${userName} rejeitado.`, 'error');
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Erro ao processar ação.", 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-2 transition-colors font-medium text-sm">
            <ArrowLeft size={16} /> Voltar ao Dashboard
          </button>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Aprovações Pendentes</h2>
          <p className="text-slate-500 mt-1">Valide os cadastros de clínicas e profissionais parceiros.</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
             {pendingUsers.length} Pendentes
           </span>
           <button onClick={fetchPending} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {loading && pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
           <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
           <p className="text-slate-400 font-medium">Carregando solicitações...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
             <AlertCircle size={32} />
          </div>
          <h3 className="font-bold text-red-800 text-lg mb-2">Erro de Sincronização</h3>
          <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
          <button onClick={fetchPending} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
            Tentar Novamente
          </button>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
             <Check size={40} className="text-green-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-xl mb-2">Tudo atualizado!</h3>
          <p className="text-slate-500 max-w-md mx-auto">Não há novos cadastros aguardando aprovação no momento.</p>
          <button onClick={onBack} className="mt-8 px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all">
            Voltar para Início
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map(user => (
            <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group animate-slideIn">
              
              <div className="flex items-start gap-5">
                <div className={`p-4 rounded-xl flex items-center justify-center shadow-inner ${user.role === 'clinic' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                  {user.role === 'clinic' ? <Building size={24}/> : <UserIcon size={24}/>}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-teal-700 transition-colors">{user.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded uppercase font-extrabold tracking-widest border border-slate-200">{roleLabels[user.role]}</span>
                  </div>
                  <p className="text-slate-500 text-sm mb-2">{user.email}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200">
                      DOC: <span className="font-bold">{user.document || 'N/A'}</span>
                    </span>
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-100 flex items-center gap-1 font-semibold">
                      <ShieldAlert size={10} /> Aguardando Análise
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
                <button 
                  onClick={() => handleAction(user.id, 'rejected')}
                  disabled={processingId !== null}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 border border-red-100 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 hover:border-red-200 font-bold transition-all disabled:opacity-50 text-sm"
                >
                  {processingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={18} />} Rejeitar
                </button>
                <button 
                  onClick={() => handleAction(user.id, 'active')}
                  disabled={processingId !== null}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-500/20 font-bold transition-all disabled:opacity-50 active:scale-95 text-sm"
                >
                  {processingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={18} />} Aprovar Acesso
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;