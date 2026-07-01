
import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Zap, 
  Check, 
  ArrowRight,
  LayoutDashboard,
  Stethoscope,
  FileText,
  BarChart3
} from 'lucide-react';

interface PartnerInfoSectionProps {
  onNavigate: (path: string) => void;
}

const PartnerInfoSection: React.FC<PartnerInfoSectionProps> = ({ onNavigate }) => {
  const plans = [
    {
      name: "Plano Básico",
      price: "Grátis",
      desc: "Ideal para quem está começando na plataforma.",
      benefits: [
        "Perfil Profissional Completo",
        "Localização e Especialidades",
        "Agendamento via WhatsApp",
        "Selo de Profissional Verificado",
        "Visibilidade na Plataforma"
      ],
      buttonText: "Começar Agora",
      popular: false
    },
    {
      name: "Plano Médio",
      price: "R$ 100/mês",
      desc: "Gestão completa e máxima visibilidade.",
      benefits: [
        "Tudo do Plano Básico",
        "Destaque Prioritário na Busca",
        "Agenda Nativa Integrada",
        "Prontuário Básico Digital",
        "Aba de Encaminhamentos (Exames/Guias)",
        "Dashboard de Métricas Mensais"
      ],
      buttonText: "Ser Parceiro Elite",
      popular: true
    },
    {
      name: "Plano Premium",
      price: "R$ 250/mês",
      desc: "A solução definitiva para clínicas de alta performance.",
      benefits: [
        "Tudo do Plano Médio",
        "Topo das Buscas VIP (Destaque Máximo)",
        "Teleconsulta com Sala Própria",
        "Gestão Financeira e Fluxo de Caixa",
        "Módulo Odontograma e Prontuário Avançado",
        "Telemetria e Integração Wearables",
        "Suporte Prioritário 24/7"
      ],
      buttonText: "Seja Premium VIP",
      popular: false
    }
  ];

  return (
    <section id="parceiro-marclyn" className="my-20 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">
          Seja um Parceiro <span className="text-teal-600">Marclyn Saúde</span>
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto font-medium">
          Escolha o plano que melhor se adapta à sua clínica ou consultório e comece a receber pacientes qualificados hoje mesmo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${plan.popular ? 'border-teal-500 bg-white shadow-2xl shadow-teal-500/10 scale-105 z-10' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
          >
            {plan.popular && (
              <div className="absolute top-6 right-6 bg-teal-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-teal-500/30">
                Mais Popular
              </div>
            )}

            <h3 className="text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-black text-teal-600">{plan.price}</span>
              {plan.price !== 'Grátis' && <span className="text-slate-400 text-xs font-bold uppercase">/mês</span>}
            </div>
            
            <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">{plan.desc}</p>

            <ul className="space-y-4 mb-10">
              {plan.benefits.map((benefit, bIndex) => (
                <li key={bIndex} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                  <div className="mt-0.5 bg-teal-100 text-teal-600 p-0.5 rounded-full">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => onNavigate('/register-partner')}
              className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 group ${plan.popular ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-xl shadow-teal-600/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20'}`}
            >
              {plan.buttonText}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center group hover:border-teal-500/30 transition-all">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600 group-hover:scale-110 transition-transform">
            <LayoutDashboard size={24} />
          </div>
          <h4 className="font-bold text-slate-900 mb-2">Gestão Ágil</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Painel intuitivo para gerenciar sua agenda e pacientes em um só lugar.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center group hover:border-teal-500/30 transition-all">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <h4 className="font-bold text-slate-900 mb-2">Mais Pacientes</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Aumente sua visibilidade e atraia pacientes qualificados para sua especialidade.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 text-center group hover:border-teal-500/30 transition-all">
          <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600 group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>
          <h4 className="font-bold text-slate-900 mb-2">Repasse Rápido</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Receba os valores das suas consultas de forma rápida e segura.</p>
        </div>
      </div>
    </section>
  );
};

export default PartnerInfoSection;
