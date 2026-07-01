import React, { useEffect, useState } from 'react';
import { supabase, IS_DB_CONNECTED } from '../lib/supabaseClient';
import { AlertTriangle, RefreshCw, ShieldAlert, WifiOff, Cloud, CheckCircle, X, Terminal, Database } from 'lucide-react';

const DbStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'demo' | 'error'>('checking');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    if (!IS_DB_CONNECTED) {
        setStatus('demo');
        return;
    }
    performLiveCheck();
  }, []);

  const performLiveCheck = async () => {
    if (!IS_DB_CONNECTED) return;
    setStatus('checking');
    setErrorDetail(null);
    
    try {
      // Handshake: Tentativa de leitura na tabela profiles para validar RLS e existência
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
          console.error("Detailed Supabase Error:", error);
          
          // Extração robusta de erro para evitar o famigerado [object Object]
          let msg = "Falha na conexão com o banco de dados.";
          
          if (typeof error === 'object' && error !== null) {
            // Ordem de prioridade: message > details > code > hint > stringify
            msg = error.message || (error as any).details || (error as any).code || (error as any).hint || JSON.stringify(error);
          } else if (typeof error === 'string') {
            msg = error;
          }

          // Tratamento para JSON.stringify que resulta em "{}" ou objetos vazios renderizados como string
          if (msg === "{}" || msg === "[object Object]") {
            msg = "Acesso Negado (RLS) ou Tabela não encontrada. Verifique o console do desenvolvedor.";
          }
          
          setErrorDetail(msg);
          setStatus('error');
      } else {
          setStatus('connected');
      }
    } catch (e: any) {
      console.error("Supabase Exception Catch:", e);
      setErrorDetail(e.message || "Erro fatal de rede ou CORS.");
      setStatus('error');
    }
  };

  const config = status === 'connected' ? { bg: 'bg-teal-600', icon: <Cloud size={16} />, label: 'MARCLYN CLOUD ATIVO', desc: 'Sincronização em tempo real habilitada' } :
                 status === 'demo' ? { bg: 'bg-slate-800', icon: <WifiOff size={16} />, label: 'MODO DEMONSTRAÇÃO', desc: 'Usando banco de dados local (Mock)' } :
                 status === 'error' ? { bg: 'bg-red-600', icon: <AlertTriangle size={16} />, label: 'ERRO DE INFRAESTRUTURA', desc: 'Clique em Diagnóstico para mais detalhes' } :
                 { bg: 'bg-slate-700', icon: <RefreshCw size={16} className="animate-spin" />, label: 'VERIFICANDO REDE...', desc: 'Testando conexão' };

  return (
    <div className={`transition-all duration-500 ${config.bg} text-white px-4 py-1.5 relative z-[110] border-b border-white/10 shadow-lg`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/10 rounded-lg">{config.icon}</div>
          <div className="flex flex-col">
            <p className="font-black text-[10px] leading-none uppercase tracking-tighter">{config.label}</p>
            <p className="text-[8px] text-white/60 uppercase tracking-widest font-bold mt-1 truncate max-w-[150px] md:max-w-none">
              {status === 'error' ? 'Problema Detectado' : config.desc}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {status === 'connected' && <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-teal-500 rounded text-[9px] font-black border border-teal-400"><CheckCircle size={10} /> PROTEÇÃO SSL ATIVA</div>}
           {status === 'error' && <button onClick={() => setShowSolution(!showSolution)} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-black transition-all flex items-center gap-1"><ShieldAlert size={10} /> DIAGNÓSTICO</button>}
           <button onClick={performLiveCheck} className="p-1 hover:bg-white/10 rounded transition-colors" title="Recarregar Conexão"><RefreshCw size={12} className={status === 'checking' ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {showSolution && status === 'error' && (
        <div className="max-w-2xl mx-auto mt-3 bg-slate-900 rounded-xl p-5 border border-red-500/30 animate-slideUp mb-2 shadow-2xl">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-red-400">
                    <Terminal size={18} />
                    <h3 className="font-bold text-[11px] uppercase tracking-widest">Logs do Supabase</h3>
                </div>
                <button onClick={() => setShowSolution(false)}><X size={16} className="text-white/40 hover:text-white"/></button>
             </div>
             
             <div className="bg-black/50 p-4 rounded-lg mb-4 font-mono text-[10px] text-red-300 break-all border border-white/5 max-h-40 overflow-y-auto">
                {errorDetail}
             </div>

             <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                    <Database size={14} />
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Ações Corretivas:</p>
                </div>
                <div className="grid gap-2">
                    <div className="bg-white/5 p-3 rounded border border-white/10">
                        <p className="text-amber-400 text-[10px] font-bold">1. Execute o Script SQL</p>
                        <p className="text-slate-400 text-[9px] mt-1 leading-relaxed">
                          O erro acima geralmente indica que as tabelas ou políticas RLS não foram criadas. 
                          Abra o <strong>SQL Editor</strong> no seu Dashboard do Supabase e execute o conteúdo do arquivo <code>SUPABASE_SETUP.sql</code>.
                        </p>
                    </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default DbStatus;