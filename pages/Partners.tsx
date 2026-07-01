import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Check, 
  ArrowRight,
  LayoutDashboard,
  TrendingUp,
  Zap,
  Building,
  Users,
  ShieldCheck,
  Stethoscope,
  Clock,
  HeartPulse,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Award,
  Video,
  FileText,
  Smartphone
} from 'lucide-react';

interface PartnersProps {
  onNavigate: (path: string) => void;
}

const Partners: React.FC<PartnersProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(prev => prev === id ? null : id);
  };

  const plans = [
    {
      name: "Plano Básico",
      price: "Grátis",
      desc: "Excelente para profissionais autônomos iniciarem na plataforma.",
      benefits: [
        "Perfil Profissional Completo & Personalizável",
        "Localização por Georeferenciamento",
        "Atendimento & Agendamento Integrado ao WhatsApp",
        "Selo Prata de Profissional Verificado",
        "Acesso à fila básica de busca pública"
      ],
      buttonText: "Começar Gratis",
      popular: false
    },
    {
      name: "Plano Médio",
      price: "R$ 100/mês",
      desc: "Gestão médica completa, agenda nativa e alta divulgação.",
      benefits: [
        "Tudo do Plano Básico incluso",
        "Destaque Prioritário nas buscas da região",
        "Agenda Nativa Integrada com Lembretes Automatizados",
        "Prontuário Médico Digital integrado",
        "Módulo de Encaminhamentos & Emissão de Guias de Exame",
        "Dashboard com Métricas de Atendimento Mensais"
      ],
      buttonText: "Ativar Plano Médio",
      popular: true
    },
    {
      name: "Plano Premium",
      price: "R$ 250/mês",
      desc: "A solução de ponta definitiva para clínicas e grandes profissionais.",
      benefits: [
        "Tudo do Plano Médio incluso",
        "Selo Ouro VIP com Destaque Máximo no topo das buscas",
        "Telemedicina nativa (Sua própria sala de vídeo integrada)",
        "Completa gestão financeira e fluxo de caixa da clínica",
        "Odontograma Avançado para odontologia",
        "Módulo de Telemetria e Integração com Wearables do paciente",
        "Suporte técnico prioritário dedicado 24/7"
      ],
      buttonText: "Seja Premium VIP",
      popular: false
    }
  ];

  const features = [
    {
      icon: <Building className="text-teal-500" size={28} />,
      title: "Visibilidade Regional",
      description: "Posicione seu consultório ou clínica na frente de milhares de pacientes que buscam sua especialidade diariamente em sua região."
    },
    {
      icon: <LayoutDashboard className="text-teal-500" size={28} />,
      title: "Prontuário e Faturamento",
      description: "Prontuário digital seguro, gestão completa de pacientes e acompanhamento detalhado de fluxo de caixa em um único dashboard."
    },
    {
      icon: <Users className="text-teal-500" size={28} />,
      title: "Fidelização e Club Paciente",
      description: "Atraia beneficiários do Club Paciente e garanta consultas recorrentes com agendamentos automatizados."
    },
    {
      icon: <ShieldCheck className="text-teal-500" size={28} />,
      title: "Segurança de Dados LGPD",
      description: "Segurança de nível bancário com criptografia de ponta a ponta e total conformidade com a Lei Geral de Proteção de Dados."
    },
    {
      icon: <Video className="text-teal-500" size={28} />,
      title: "Telemedicina Integrada",
      description: "Sala de transmissão exclusiva de altíssima definição, sem necessidade de aplicativos terceiros. Praticidade absoluta."
    },
    {
      icon: <DollarSign className="text-teal-500" size={28} />,
      title: "Repasses Simplificados",
      description: "Esqueça burocracias. Receba as consultas agendadas diretamente na sua conta com fluxos de transferência automatizados."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Cadastro Rápido",
      desc: "Crie a conta da sua clínica ou perfil individual preenchendo as informações profissionais e de registro conselho (CRM/CRO etc)."
    },
    {
      number: "02",
      title: "Escolha seu Plano",
      desc: "Selecione a modalidade ideal para suas necessidades. Você pode começar gratuitamente ou optar por recursos avançados de faturamento."
    },
    {
      number: "03",
      title: "Defina sua Agenda",
      desc: "Configure seus horários de atendimento (presencial ou online), especialidades e tarifas. Pronto, você já está visível para a rede!"
    }
  ];

  const faqs = [
    {
      id: "cost",
      question: "Existem taxas de cancelamento ou contrato de fidelidade?",
      answer: "Não! Todos os nossos planos funcionam em modelo de assinatura mensal recorrente sem fidelidade. Você pode fazer o upgrade, downgrade ou cancelamento a qualquer momento, sem taxas de multa."
    },
    {
      id: "payout",
      question: "Como funcionam os repasses financeiros das consultas?",
      answer: "Os pagamentos recebidos de forma online na plataforma são processados com total segurança e transferidos diretamente para a conta bancária cadastrada da clínica ou profissional, seguindo o cronograma transparente de repasses sem qualquer taxa oculta."
    },
    {
      id: "migration",
      question: "Posso importar minha lista atual de pacientes?",
      answer: "Sim! Oferecemos ferramentas práticas para auxiliar clínicas parceiras na migração de dados de outros sistemas. Nosso suporte prioritário Premium pode conduzir o processo de forma segura para garantir que você não perca nenhum prontuário histórico."
    },
    {
      id: "club",
      question: "Como funciona a integração com o Club Paciente?",
      answer: "Os parceiros da Marclyn recebem pacientes de forma preferencial ao conceder os descontos exclusivos definidos de 10% aos membros do Club Paciente. Isso garante um fluxo de novos clientes e alta taxa de fidelidade sem que você precise investir em publicidade externa."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm uppercase tracking-wider mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar para o Início
        </button>

        {/* Hero Section */}
        <div className="text-center mb-16 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 rounded-full text-teal-600 font-extrabold text-[10px] uppercase tracking-widest mb-4">
            <Award size={14} /> Junte-se à Marclyn Saúde
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase">
            Impulsione sua Clínica ou <br />
            Consultório com o <span className="text-teal-600">Parceiro Marclyn</span>
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto font-medium mt-4 text-base md:text-lg">
            Tenha em mãos uma plataforma completa de prontuário, agenda integrada, telemedicina e repasse para focar totalmente na saúde dos seus pacientes.
          </p>
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => onNavigate('/register-partner')}
              className="bg-teal-600 hover:bg-teal-500 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl shadow-xl shadow-teal-600/30 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              Criar Conta Profissional Grátis
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Interactive Plans Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Selecione o plano ideal para seu momento
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Precificação simples, transparente e sem pegadinhas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col h-full bg-white ${plan.popular ? 'border-teal-500 shadow-2xl shadow-teal-500/10 md:scale-105 z-10' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-teal-500/30">
                    Mais Recomendado
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4 mt-2">
                    <span className="text-3xl font-black text-teal-600">{plan.price}</span>
                    {plan.price !== 'Grátis' && <span className="text-slate-400 text-xs font-bold uppercase">/mês</span>}
                  </div>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">{plan.desc}</p>
                </div>

                <div className="border-t border-slate-50 my-4"></div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {plan.benefits.map((benefit, bIndex) => (
                    <li key={bIndex} className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold leading-snug">
                      <div className="mt-0.5 bg-teal-50 text-teal-600 p-0.5 rounded-lg flex-shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => onNavigate('/register-partner')}
                  className={`w-full py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 group ${plan.popular ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                >
                  {plan.buttonText}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Core Advantages */}
        <div className="bg-slate-900 text-white rounded-[3rem] p-8 md:p-14 mb-20 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="text-center md:text-left mb-12 max-w-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Totalmente integrado</span>
            <h2 className="text-3xl font-black tracking-tight uppercase mt-2">
              TUDO QUE VOCÊ PRECISA EM UM SÓ ECOSSISTEMA
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-3">
              Modernize seu atendimento, elimine papéis no consultório e otimize a retenção financeira dos seus pacientes de forma automatizada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((item, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-800 p-6 rounded-3xl hover:border-teal-500/20 transition-all flex flex-col gap-4">
                <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center shadow-inner self-start text-teal-500 col-span-1">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white uppercase tracking-tight">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <span className="text-teal-600 font-extrabold uppercase text-[10px] tracking-widest">Sem Burocracias</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase mt-1">Como começar a ser parceiro?</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
                <span className="absolute -top-4 right-6 text-6xl font-black text-teal-500/10 select-none font-mono">
                  {step.number}
                </span>
                <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-black text-xs">
                  {i+1}
                </span>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm uppercase">{step.title}</h5>
                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partners FAQs */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-10">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Dúvidas Frequentes das Clínicas e Médicos</h3>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
                <button 
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{faq.question}</h4>
                  {openFaq === faq.id ? <ChevronUp size={16} className="text-teal-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-teal-500 flex-shrink-0" />}
                </button>
                {openFaq === faq.id && (
                  <div className="px-5 pb-5 animate-fadeIn">
                    <p className="text-xs leading-relaxed text-slate-500 font-semibold border-t border-slate-50 pt-3">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic CTA box */}
        <div className="text-center py-12 px-6 bg-teal-50 rounded-[2.5rem] border border-teal-100 max-w-3xl mx-auto">
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">Pronto para digitalizar seu consultório?</h3>
          <p className="text-slate-600 text-xs font-semibold max-w-md mx-auto leading-relaxed mb-6">
            Não perca tempo com sistemas complexos ou planilhas desorganizadas. Una-se à Marclyn Saúde e potencialize seu faturamento com segurança.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => onNavigate('/register-partner')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-8 py-3.5 rounded-xl transition-all"
            >
              Criar Cadastro
            </button>
            <a 
              href="https://wa.me/5571982700412" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-6 py-3 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all bg-white"
            >
              Falar com Consultor
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Partners;
