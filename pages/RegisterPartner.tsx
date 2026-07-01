
import React, { useState, useEffect } from 'react';
import { mockDb } from '../lib/mockSupabase';
import { ArrowLeft, Building, User, Check, AlertCircle, ChevronRight, Globe, Phone, FileText, TrendingUp, Zap, Stethoscope, Video, TestTube, Shield, Star, MessageCircle } from 'lucide-react';

interface RegisterPartnerProps {
  onNavigate: (path: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const RegisterPartner: React.FC<RegisterPartnerProps> = ({ onNavigate, showToast }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  
  const [formData, setFormData] = useState({
    type: 'clinic', // or 'professional'
    plan: 'medio', // 'basico', 'medio', 'premium'
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    document: '', // CNPJ or CPF
    reg: '', // CRM or similar
    specialty: '',
    address: '',
    neighborhood: '',
    city: '',
    phone: '',
    website: '',
    bio: '',
    availableServices: [] as string[]
  });

  // Helpers for masks
  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (formData.type === 'clinic') {
      return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5').substring(0, 18);
    } else {
      return numbers.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4').substring(0, 14);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3').substring(0, 15);
  };

  const handleChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === 'document') formattedValue = formatDocument(value);
    if (field === 'phone') formattedValue = formatPhone(value);
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleService = (service: string) => {
    setFormData(prev => {
        const current = prev.availableServices;
        if (current.includes(service)) {
            return { ...prev, availableServices: current.filter(s => s !== service) };
        } else {
            return { ...prev, availableServices: [...current, service] };
        }
    });
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
        isValid = false;
      }
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = 'A senha deve ter no mínimo 6 caracteres';
        isValid = false;
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
        isValid = false;
      }
    }

    if (currentStep === 2) {
      if (!formData.name) {
        newErrors.name = formData.type === 'clinic' ? 'Razão Social é obrigatória' : 'Nome Completo é obrigatório';
        isValid = false;
      }
      
      const docClean = formData.document.replace(/\D/g, '');
      if (formData.type === 'clinic') {
        if (docClean.length !== 14) {
          newErrors.document = 'CNPJ inválido (deve ter 14 números)';
          isValid = false;
        }
      } else {
        if (docClean.length !== 11) {
          newErrors.document = 'CPF inválido (deve ter 11 números)';
          isValid = false;
        }
      }

      if (!formData.phone) {
        newErrors.phone = 'Telefone/WhatsApp é obrigatório';
        isValid = false;
      }
    }

    if (currentStep === 3) {
       if (!formData.reg) {
         newErrors.reg = 'Registro profissional é obrigatório';
         isValid = false;
       }
       if (!formData.specialty) {
         newErrors.specialty = 'Selecione uma especialidade';
         isValid = false;
       }
       if (!formData.address) {
         newErrors.address = 'Endereço é obrigatório';
         isValid = false;
       }
       if (formData.availableServices.length === 0) {
           showToast("Selecione pelo menos um tipo de atendimento.", "error");
           isValid = false;
       }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(step)) {
      setStep(step + 1);
    } else {
      showToast("Por favor, corrija os erros antes de continuar.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);

    try {
      await mockDb.registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.type as any,
        planType: formData.plan,
        document: formData.document,
        phone: formData.phone,
        address: formData.address,
        neighborhood: formData.neighborhood,
        city: formData.city,
        website: formData.website,
        bio: formData.bio,
        reg: formData.reg,
        specialty: formData.specialty,
        availableServices: formData.availableServices
      });
      
      // Mesmo que o polling do perfil retorne null, o Auth foi criado. 
      // Parceiros sempre caem na tela de sucesso "Em Análise".
      setLoading(false);
      setSuccess(true);
      showToast("Cadastro enviado com sucesso!");
    } catch (e: any) {
      const msg = e.message || "Erro ao enviar cadastro.";
      showToast(msg, "error");
      setLoading(false);
    }
  };

  if (success) {
    const chosenPlanName = formData.plan === 'basico' ? 'Básico' : formData.plan === 'medio' ? 'Médio' : 'Avançado';
    const waText = `Olá! Acabei de registrar minha conta de parceiro Marclyn (${formData.name}) sob o email *${formData.email}* e gostaria de concluir a contratação e ativação do meu *Plano ${chosenPlanName}*.`;
    const waUrl = `https://wa.me/5571982700412?text=${encodeURIComponent(waText)}`;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-slate-100 animate-fadeIn space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Check size={40} strokeWidth={3} />
          </div>
          
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cadastro Concluído!</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Plano Escolhido: <span className="text-teal-600 font-black">{chosenPlanName}</span></p>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed font-semibold">
            Para concluir a contratação, efetivar seu plano e ativar seu usuário na plataforma, agora você deve falar com o nosso gerente de contas Marclyn no WhatsApp.
          </p>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-left flex gap-3">
            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <span className="text-slate-600 text-[11px] leading-relaxed font-semibold">
              <strong>Importante:</strong> Seu acesso só será liberado na plataforma após o contato de validação comercial via WhatsApp.
            </span>
          </div>

          <a 
            href={waUrl}
            target="_blank"
            referrerPolicy="no-referrer"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg hover:shadow-green-600/20 flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-widest"
          >
            <MessageCircle size={18} fill="currentColor" /> Concluir no WhatsApp
          </a>

          <button 
            onClick={() => onNavigate('/login')}
            className="w-full border-2 border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-bold py-3.5 rounded-2xl transition-colors text-xs uppercase tracking-widest"
          >
            Ir para Tela de Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-6 flex items-center gap-4 relative">
          <button onClick={() => onNavigate('/')} className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 flex items-center gap-2 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Início</span>
          </button>
          <div className="h-8 w-px bg-white/10 mx-1"></div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Cadastro de Parceiros</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
               <span className={step >= 1 ? 'text-white' : ''}>Conta</span>
               <ChevronRight size={12} className={step >= 2 ? 'text-teal-400' : ''}/>
               <span className={step >= 2 ? 'text-teal-400' : ''}>Dados</span>
               <ChevronRight size={12} className={step >= 3 ? 'text-teal-400' : ''}/>
               <span className={step >= 3 ? 'text-teal-400' : ''}>Perfil</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-slate-100 h-1.5">
          <div 
            className="bg-teal-500 h-1.5 transition-all duration-500 ease-out" 
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        <form className="p-8" onSubmit={step === 3 ? handleSubmit : handleNext}>
          {step === 1 && (
            <div className="space-y-6 animate-slideIn">
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-teal-500/30 relative overflow-hidden group mb-6 transform transition-all duration-500 hover:scale-[1.01]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl -mr-24 -mt-24 transition-transform duration-700 group-hover:scale-150 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl -ml-20 -mb-20 transition-transform duration-700 group-hover:scale-150 pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
                  <div className="bg-gradient-to-br from-teal-400 to-emerald-500 p-1 rounded-2xl shadow-lg shadow-teal-500/30 flex-shrink-0 transform group-hover:rotate-12 transition-transform duration-500">
                    <div className="bg-slate-900 p-4 rounded-xl">
                      <TrendingUp size={32} className="text-teal-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-black text-2xl mb-3 leading-tight tracking-tight">
                      Você atua na <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">área da saúde?</span>
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4 font-medium">
                      Cadastre-se agora, torne-se um parceiro de elite da Marclyn Saúde e veja sua agenda lotar de pacientes qualificados todos os dias.
                    </p>
                    <div className="bg-gradient-to-r from-teal-900/60 to-slate-800/60 rounded-xl p-3 border border-teal-500/20 flex items-start sm:items-center gap-3 shadow-inner">
                      <Zap size={20} className="text-yellow-400 flex-shrink-0" fill="currentColor"/>
                      <span className="text-sm font-medium text-teal-50 leading-snug">
                        Pagamentos rápidos: Repassamos os valores das consultas no <strong className="text-teal-300 font-black uppercase tracking-wider">mesmo dia</strong>.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Planos Profissionais - Design Premium */}
              <div className="space-y-6 mb-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                    <Zap size={16} className="text-teal-500" /> Escolha sua Categoria
                  </h3>
                  <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-tighter">Planos 2026</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { 
                      id: 'basico', 
                      title: 'Plano Básico', 
                      price: 'Grátis', 
                      desc: 'Presença digital essencial', 
                      color: 'slate',
                      features: ['Perfil Profissional', 'Agendamento WhatsApp', '1 Foto na Galeria']
                    },
                    { 
                      id: 'medio', 
                      title: 'Plano Médio', 
                      price: 'R$ 100/mês', 
                      desc: 'Gestão e maior visibilidade', 
                      color: 'teal',
                      popular: true,
                      features: ['Tudo do Básico', 'Agenda Nativa Integrada', 'Destaque nas Buscas', 'Suporte Prioritário']
                    },
                    { 
                      id: 'avancado', 
                      title: 'Plano Avançado', 
                      price: 'R$ 250/mês', 
                      desc: 'Performance máxima e IA', 
                      color: 'amber',
                      features: ['Tudo do Médio', 'Telemetria e Wearables', 'Módulo Odontológico', 'IA de Diagnóstico', 'Taxa Zero em Repasses']
                    }
                  ].map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => setFormData(prev => ({...prev, plan: p.id}))}
                      className={`relative group cursor-pointer transition-all duration-300 rounded-[2rem] p-6 border-2 flex flex-col ${formData.plan === p.id ? `border-${p.color}-500 bg-${p.color}-50/30 shadow-xl scale-[1.02]` : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      {p.popular && (
                        <div className="absolute top-4 right-4 bg-teal-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg animate-pulse">
                          Mais Escolhido
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${formData.plan === p.id ? `bg-${p.color}-500 text-white` : 'bg-slate-100 text-slate-400'}`}>
                          {p.id === 'basico' ? <Shield size={24}/> : p.id === 'medio' ? <Zap size={24}/> : <Star size={24}/>}
                        </div>
                        <div>
                          <h4 className={`font-black uppercase tracking-tight ${formData.plan === p.id ? `text-${p.color}-900` : 'text-slate-800'}`}>{p.title}</h4>
                          <p className="text-xs text-slate-500 font-medium">{p.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1 mb-4">
                        <span className={`text-2xl font-black ${formData.plan === p.id ? `text-${p.color}-600` : 'text-slate-900'}`}>{p.price}</span>
                        {p.id !== 'basico' && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ faturamento</span>}
                      </div>

                      <div className="space-y-2">
                        {p.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${formData.plan === p.id ? `bg-${p.color}-500/20 text-${p.color}-600` : 'bg-slate-100 text-slate-300'}`}>
                              <Check size={10} strokeWidth={4} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-tight ${formData.plan === p.id ? 'text-slate-700' : 'text-slate-400'}`}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="font-bold text-2xl text-slate-800 mt-6">Como você atua?</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`border-2 rounded-xl p-6 cursor-pointer flex flex-col items-center gap-3 transition-all ${formData.type === 'clinic' ? 'border-teal-500 bg-teal-50 shadow-md transform scale-105' : 'border-slate-100 hover:border-slate-300'}`}
                  onClick={() => setFormData(prev => ({...prev, type: 'clinic', document: '', name: ''}))}
                >
                  <Building size={32} className={formData.type === 'clinic' ? 'text-teal-600' : 'text-slate-400'} />
                  <span className={`font-bold text-sm ${formData.type === 'clinic' ? 'text-teal-800' : 'text-slate-500'}`}>Clínica / Hospital</span>
                </div>
                <div 
                  className={`border-2 rounded-xl p-6 cursor-pointer flex flex-col items-center gap-3 transition-all ${formData.type === 'professional' ? 'border-teal-500 bg-teal-50 shadow-md transform scale-105' : 'border-slate-100 hover:border-slate-300'}`}
                  onClick={() => setFormData(prev => ({...prev, type: 'professional', document: '', name: ''}))}
                >
                  <User size={32} className={formData.type === 'professional' ? 'text-teal-600' : 'text-slate-400'} />
                  <span className={`font-bold text-sm ${formData.type === 'professional' ? 'text-teal-800' : 'text-slate-500'}`}>Profissional Liberal</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo</label>
                  <input 
                    type="email" 
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                  />
                  {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
                  <input 
                    type="password"
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all ${errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    value={formData.password}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Senha</label>
                  <input 
                    type="password"
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    value={formData.confirmPassword}
                    onChange={e => handleChange('confirmPassword', e.target.value)}
                    placeholder="Repita a senha"
                  />
                  {errors.confirmPassword && <span className="text-xs text-red-500 mt-1 block">{errors.confirmPassword}</span>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slideIn">
              <h3 className="font-bold text-2xl text-slate-800">
                {formData.type === 'clinic' ? 'Dados da Empresa' : 'Seus Dados'}
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {formData.type === 'clinic' ? 'Razão Social' : 'Nome Completo'}
                </label>
                <input 
                  type="text" 
                  className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all ${errors.name ? 'border-red-300' : 'border-slate-200'}`}
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
                 {errors.name && <span className="text-xs text-red-500 mt-1 block">{errors.name}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {formData.type === 'clinic' ? 'CNPJ' : 'CPF'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={formData.type === 'clinic' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-all ${errors.document ? 'border-red-300' : 'border-slate-200'}`}
                    value={formData.document}
                    onChange={e => handleChange('document', e.target.value)}
                    maxLength={formData.type === 'clinic' ? 18 : 14}
                  />
                  {errors.document && <span className="text-xs text-red-500 mt-1 block">{errors.document}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Phone size={12}/> Celular / WhatsApp
                  </label>
                  <input 
                    type="tel"
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.phone ? 'border-red-300' : 'border-slate-200'}`}
                    value={formData.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="(00) 90000-0000"
                    maxLength={15}
                  />
                  {errors.phone && <span className="text-xs text-red-500 mt-1 block">{errors.phone}</span>}
                </div>
              </div>

              {formData.type === 'clinic' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Globe size={12}/> Website (Opcional)
                  </label>
                  <input 
                    type="text"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    value={formData.website}
                    onChange={e => handleChange('website', e.target.value)}
                    placeholder="www.suaclinica.com.br"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slideIn">
              <h3 className="font-bold text-2xl text-slate-800">
                 {formData.type === 'clinic' ? 'Detalhes Técnicos' : 'Perfil Profissional'}
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Serviços Oferecidos</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => toggleService('presencial')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.availableServices.includes('presencial') ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}
                    >
                        <Stethoscope size={24} />
                        <span className="text-xs font-bold">Consulta Presencial</span>
                    </button>
                     <button
                        type="button"
                        onClick={() => toggleService('teleconsulta')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.availableServices.includes('teleconsulta') ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}
                    >
                        <Video size={24} />
                        <span className="text-xs font-bold">Teleconsulta</span>
                    </button>
                     <button
                        type="button"
                        onClick={() => toggleService('exame')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.availableServices.includes('exame') ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}
                    >
                        <TestTube size={24} />
                        <span className="text-xs font-bold">Exames</span>
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {formData.type === 'clinic' ? 'Responsável Técnico (CRM)' : 'Número do Conselho (CRM/CRP)'}
                  </label>
                  <input 
                    type="text"
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.reg ? 'border-red-300' : 'border-slate-200'}`}
                    value={formData.reg}
                    onChange={e => handleChange('reg', e.target.value)}
                  />
                  {errors.reg && <span className="text-xs text-red-500 mt-1 block">{errors.reg}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Especialidade Principal</label>
                  <select 
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.specialty ? 'border-red-300' : 'border-slate-200'}`}
                    value={formData.specialty}
                    onChange={e => handleChange('specialty', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="cardiologia">Cardiologia</option>
                    <option value="nutricao">Nutrição</option>
                    <option value="fisioterapia">Fisioterapia</option>
                    <option value="clinica_geral">Clínica Geral</option>
                    <option value="odontologia">Odontologia</option>
                    <option value="psicologia">Psicologia</option>
                    <option value="analises_clinicas">Análises Clínicas (Lab)</option>
                  </select>
                  {errors.specialty && <span className="text-xs text-red-500 mt-1 block">{errors.specialty}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                  <input 
                    type="text"
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.neighborhood ? 'border-red-300' : 'border-slate-200'}`}
                    value={formData.neighborhood}
                    onChange={e => handleChange('neighborhood', e.target.value)}
                    placeholder="Ex: Centro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade / UF</label>
                  <input 
                    type="text"
                    className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.city ? 'border-red-300' : 'border-slate-200'}`}
                    value={formData.city}
                    onChange={e => handleChange('city', e.target.value)}
                    placeholder="Salvador - BA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                <input 
                  type="text" placeholder="Rua, Número, Complemento"
                  className={`w-full p-3 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none ${errors.address ? 'border-red-300' : 'border-slate-200'}`}
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                />
                 {errors.address && <span className="text-xs text-red-500 mt-1 block">{errors.address}</span>}
              </div>

              {formData.type === 'professional' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <FileText size={12}/> Mini Bio / Resumo
                  </label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                    rows={3}
                    placeholder="Conte um pouco sobre sua experiência..."
                    value={formData.bio}
                    onChange={e => handleChange('bio', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-10 flex gap-4">
            {step > 1 && (
              <button 
                type="button" 
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Voltar
              </button>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 shadow-lg hover:shadow-xl hover:shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processando...' : (step === 3 ? 'Finalizar Cadastro' : <>Próximo <ChevronRight size={18}/></>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPartner;
