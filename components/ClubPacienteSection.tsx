
import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Stethoscope, 
  TestTube, 
  Video, 
  HeartPulse, 
  CalendarCheck, 
  MessageCircle,
  Sparkles,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

const ClubPacienteSection: React.FC = () => {
  const benefits = [
    {
      icon: <Stethoscope className="text-teal-400" size={24} />,
      title: "Consultas",
      desc: "10% de desconto em todas as consultas presenciais."
    },
    {
      icon: <TestTube className="text-teal-400" size={24} />,
      title: "Exames",
      desc: "10% de desconto em exames laboratoriais e de imagem."
    },
    {
      icon: <HeartPulse className="text-teal-400" size={24} />,
      title: "Farmácias",
      desc: "10% de desconto em farmácias parceiras."
    },
    {
      icon: <Video className="text-teal-400" size={24} />,
      title: "Telemedicina 24h",
      desc: "Pronto atendimento por vídeo em caso de urgência."
    },
    {
      icon: <CalendarCheck className="text-teal-400" size={24} />,
      title: "Check-up Anual",
      desc: "Pacote básico de exames laboratoriais gratuito 1x por ano."
    }
  ];

  const whatsappUrl = "https://wa.me/557182700412?text=Olá! Gostaria de saber mais sobre o Club Paciente.";

  return (
    <section id="club-paciente" className="my-16 px-4 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10"
      >
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            {/* Left Column: Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-black uppercase tracking-widest mb-6">
                <Sparkles size={14} />
                Exclusivo
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tighter">
                Club <span className="text-teal-400">Paciente</span>
              </h2>
              
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Tenha acesso a benefícios exclusivos, descontos em consultas e exames, além de pronto atendimento 24h por vídeo chamada.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                {benefits.map((benefit, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4"
                  >
                    <div className="mt-1 bg-white/5 p-2 rounded-xl border border-white/5">
                      {benefit.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm mb-1">{benefit.title}</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">{benefit.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black rounded-2xl transition-all shadow-lg shadow-teal-500/20 group"
                >
                  <MessageCircle size={20} />
                  QUERO SER MEMBRO
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                
                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
                  <ShieldCheck size={18} className="text-teal-500/50" />
                  Sem carência • Cancelamento grátis
                </div>
              </div>
            </div>

            {/* Right Column: Visual/Badge */}
            <div className="hidden lg:flex flex-col items-center justify-center w-72 h-72 relative">
               <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-teal-500/20 rounded-full"
               />
               <div className="w-56 h-56 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex flex-col items-center justify-center text-slate-900 shadow-2xl shadow-teal-500/40 relative z-20">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Descontos de</span>
                  <span className="text-6xl font-black leading-none my-1">10%</span>
                  <span className="text-sm font-bold uppercase">Em Consultas</span>
                  
                  <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-3xl shadow-xl rotate-12 border border-slate-100">
                    <CheckCircle2 size={32} className="text-teal-600" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ClubPacienteSection;
