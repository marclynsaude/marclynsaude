
import React, { useState } from 'react';
import { mockDb } from '../lib/mockSupabase';
import { ArrowLeft, CheckCircle, Shield, Heart } from 'lucide-react';

interface RegisterPatientProps {
  onNavigate: (path: string) => void;
  onLogin: (user: any) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const RegisterPatient: React.FC<RegisterPatientProps> = ({ onNavigate, onLogin, showToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    patientType: 'normal' as 'normal' | 'club'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast("As senhas não conferem!", 'error');
      return;
    }
    setLoading(true);
    
    try {
      const user = await mockDb.registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'patient',
        document: formData.cpf,
        phone: formData.phone,
        patientType: formData.patientType,
        subscriptionStatus: formData.patientType === 'club' ? 'active' : 'inactive',
        subscriptionPlan: formData.patientType === 'club' ? 'Club Paciente Premium' : undefined
      });
      
      setLoading(false);

      if (user) {
        showToast('Conta criada com sucesso!');
        onLogin(user); // Auto login se o perfil foi encontrado
        onNavigate('/');
      } else {
        // Caso o polling tenha falhado (profile === null), mas a conta existe
        showToast('Conta criada! Por favor, faça login para acessar seu painel.', 'success');
        onNavigate('/login');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Erro ao criar conta. Verifique os dados.';
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 flex flex-col items-center text-center relative">
          <button 
            onClick={() => onNavigate('/')} 
            className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors flex items-center gap-1 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Início</span>
          </button>
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-teal-500/30 text-white">
             <Shield size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Cadastro de Paciente</h2>
          <p className="text-slate-400 text-sm mt-1">Crie sua conta para cuidar da sua saúde</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Tipo de Cadastro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => setFormData({...formData, patientType: 'normal'})}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 group ${formData.patientType === 'normal' ? 'border-teal-500 bg-white shadow-xl scale-105' : 'border-slate-100 bg-white opacity-60 grayscale'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${formData.patientType === 'normal' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                   <CheckCircle size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter text-center ${formData.patientType === 'normal' ? 'text-teal-900' : 'text-slate-400'}`}>Paciente<br/>Particular</span>
              </div>
              <div 
                onClick={() => setFormData({...formData, patientType: 'club'})}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 group ${formData.patientType === 'club' ? 'border-pink-500 bg-white shadow-xl scale-105' : 'border-slate-100 bg-white opacity-60 grayscale'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${formData.patientType === 'club' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>
                   <Heart size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter text-center ${formData.patientType === 'club' ? 'text-pink-900' : 'text-slate-400'}`}>Membro<br/>Club Paciente</span>
              </div>
            </div>
            <p className="text-[10px] text-center mt-4 text-slate-400 font-bold leading-tight">
              {formData.patientType === 'club' ? 'Acesso a descontos exclusivos e rede credenciada premium.' : 'Acesso total à plataforma Marclyn e agendamentos diretos.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
            <input 
              type="text" required 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Digite seu nome"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
              <input 
                type="text" required placeholder="000.000.000-00"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                value={formData.cpf}
                onChange={e => setFormData({...formData, cpf: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Celular</label>
              <input 
                type="tel" required placeholder="(00) 00000-0000"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input 
              type="email" required 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="seu@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
              <input 
                type="password" required 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar</label>
              <input 
                type="password" required 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all mt-6 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
          >
            {loading ? 'Criando conta...' : <>Criar Conta e Acessar <CheckCircle size={18}/></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPatient;
