
import React, { useState } from 'react';
import { ArrowLeft, Globe, CreditCard, Lock, Save, Server, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react';

interface AdminSystemSettingsProps {
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const AdminSystemSettings: React.FC<AdminSystemSettingsProps> = ({ onNavigate, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  const [config, setConfig] = useState({
    platformName: 'Marclyn Saúde',
    supportEmail: 'suporte@marclyn.com',
    yampiUrl: 'https://checkout.yampi.com.br/marclyn-saude-oficial',
    commissionRate: '15',
    maxUploadSize: '10'
  });

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      if (showToast) showToast('Configurações globais atualizadas com sucesso!');
    }, 1500);
  };

  return (
    <div className="p-4 md:p-8 animate-fadeIn max-w-4xl mx-auto">
      <button onClick={() => onNavigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors">
        <ArrowLeft size={18} /> Voltar ao Dashboard
      </button>

      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             <Server className="text-teal-600" /> Configurações Globais
           </h2>
           <p className="text-slate-500">Parâmetros que afetam toda a plataforma.</p>
        </div>
        <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70"
        >
            {loading ? 'Salvando...' : <><Save size={18}/> Salvar Alterações</>}
        </button>
      </div>

      <div className="grid gap-6">
        
        {/* General Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Globe size={18} className="text-blue-500" /> Geral
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Plataforma</label>
                    <input 
                        type="text" 
                        value={config.platformName}
                        onChange={e => setConfig({...config, platformName: e.target.value})}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium focus:ring-2 focus:ring-teal-500 outline-none" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de Suporte</label>
                    <input 
                        type="text" 
                        value={config.supportEmail}
                        onChange={e => setConfig({...config, supportEmail: e.target.value})}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium focus:ring-2 focus:ring-teal-500 outline-none" 
                    />
                </div>
            </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <CreditCard size={18} className="text-purple-500" /> Financeiro (Gateway)
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL de Checkout Padrão (Yampi/Stripe)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={config.yampiUrl}
                            onChange={e => setConfig({...config, yampiUrl: e.target.value})}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-mono text-sm text-slate-600 focus:ring-2 focus:ring-purple-500 outline-none" 
                        />
                        <button className="bg-slate-100 px-3 py-2 rounded font-bold text-slate-600 text-xs uppercase hover:bg-slate-200">Testar</button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Esta URL será usada quando clínicas clicarem em "Assinar Plano".</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <DollarSign size={12}/> Taxa de Comissão (%)
                    </label>
                    <input 
                        type="number" 
                        value={config.commissionRate}
                        onChange={e => setConfig({...config, commissionRate: e.target.value})}
                        className="w-24 p-2 bg-slate-50 border border-slate-200 rounded font-medium focus:ring-2 focus:ring-purple-500 outline-none" 
                    />
                </div>
            </div>
        </div>

        {/* System Control */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Lock size={18} className="text-red-500" /> Controle de Sistema
            </h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                    <p className="font-bold text-slate-800">Modo de Manutenção</p>
                    <p className="text-xs text-slate-500">Bloqueia o acesso para todos os usuários exceto Admins.</p>
                </div>
                <button 
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`transition-colors ${maintenanceMode ? 'text-teal-600' : 'text-slate-300'}`}
                >
                    {maintenanceMode ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSystemSettings;
