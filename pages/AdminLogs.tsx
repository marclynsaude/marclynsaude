
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { ArrowLeft, Shield, Filter, Download, Activity, User, Clock } from 'lucide-react';

interface AdminLogsProps {
  onNavigate: (path: string) => void;
}

const AdminLogs: React.FC<AdminLogsProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const data = await mockDb.getAuditLogs();
      // Sort by newest
      const sorted = data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(sorted);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-600';
    if (action.includes('delete')) return 'text-red-600';
    if (action.includes('update')) return 'text-blue-600';
    if (action.includes('login')) return 'text-purple-600';
    return 'text-slate-600';
  };

  return (
    <div className="p-4 md:p-8 animate-fadeIn max-w-6xl mx-auto">
      <button onClick={() => onNavigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors">
        <ArrowLeft size={18} /> Voltar ao Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Shield className="text-teal-600" /> Logs de Segurança
           </h2>
           <p className="text-slate-500">Trilha de auditoria para conformidade e segurança (LGPD).</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
             <Filter size={16} /> Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800">
             <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
           <span className="text-slate-400 text-xs font-mono uppercase tracking-widest">Console do Sistema</span>
           <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
           </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-slate-950 text-slate-500 text-xs uppercase sticky top-0">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Usuário / Ator</th>
                <th className="px-6 py-3">Ação</th>
                <th className="px-6 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                 <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando registros...</td></tr>
              ) : logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                       {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 flex items-center gap-2">
                       <User size={14} className="opacity-50" /> {log.userId}
                    </td>
                    <td className={`px-6 py-3 font-bold ${getActionColor(log.action)}`}>
                       {log.action.toUpperCase()}
                    </td>
                    <td className="px-6 py-3 text-slate-400 max-w-md truncate" title={log.details}>
                       {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum log registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-950 text-slate-600 text-xs text-center border-t border-slate-800">
           Exibindo {logs.length} registros. Armazenamento seguro criptografado.
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
