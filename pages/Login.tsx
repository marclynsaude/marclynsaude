
import React, { useState } from 'react';
import { User } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertTriangle, Info, Loader2, ChevronDown, ChevronUp, Stethoscope } from 'lucide-react';
import Testimonials from '../components/Testimonials';

interface LoginProps {
  onLogin: (user: User) => void;
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigate, showToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(prev => prev === id ? null : id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await mockDb.signIn(email, password);
      
      if (user) {
        if (user.status === 'pending') {
          const msg = 'Sua conta está em análise. Aguarde a aprovação.';
          setError(msg);
          if (showToast) showToast(msg, 'error');
          setIsLoading(false);
          return;
        }

        if (user.status === 'blocked' || user.status === 'rejected') {
          const msg = 'Acesso negado. Contate o suporte.';
          setError(msg);
          if (showToast) showToast(msg, 'error');
          setIsLoading(false);
          return;
        }

        onLogin(user);
        onNavigate('/');
      } else {
        setError('Conta não encontrada no sistema de perfis.');
      }
    } catch (err: any) {
        console.error(err);
        const errorMsg = err.message || 'Erro ao fazer login.';
        setError(errorMsg);
        if (showToast) showToast(errorMsg, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 bg-slate-50/50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-slideUp">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-teal-600/10 blur-3xl"></div>
          <div className="relative z-10">
            <div className="inline-flex p-4 rounded-2xl bg-teal-500 mb-4 shadow-lg shadow-teal-500/30 text-white">
              <ShieldCheck size={36} strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Área Restrita</h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">Acesse sua conta Marclyn Saúde</p>
          </div>
        </div>

        <div className="p-8">
          <button 
            onClick={() => onNavigate('/')}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all mb-6"
          >
            <ArrowRight size={14} className="rotate-180" /> Voltar ao Início
          </button>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-medium"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Senha</label>
              <div className="relative group">
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={18} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-pulse">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg hover:shadow-xl active:scale-95"
            >
              {isLoading ? <><Loader2 className="animate-spin" size={18}/> Autenticando...</> : <>Entrar no Painel <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] uppercase font-bold tracking-widest">Primeira vez aqui?</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <button 
              onClick={() => onNavigate('/register-patient')}
              className="w-full py-3.5 text-sm border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 font-bold text-slate-600 transition-all shadow-sm"
            >
              Criar minha conta de Paciente
            </button>
          </div>
        </div>
      </div>

      {/* Banner Profissional da Saúde */}
      <div 
        onClick={() => onNavigate('/register-partner')}
        className="w-full max-w-md mt-8 relative group cursor-pointer animate-slideUp transform transition-all duration-500 hover:scale-[1.02]"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-600 rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-500"></div>
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-teal-500/30 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-teal-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 group-hover:scale-150"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 group-hover:scale-150"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-500 p-1 rounded-2xl shadow-lg shadow-teal-500/30 mb-6 transform group-hover:rotate-12 transition-transform duration-500">
              <div className="bg-slate-900 p-4 rounded-xl">
                <Stethoscope className="text-teal-400" size={32} strokeWidth={2.5} />
              </div>
            </div>
            
            <h3 className="text-white font-black text-2xl mb-3 tracking-tight leading-tight">
              Você atua na <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">área da saúde?</span>
            </h3>
            
            <p className="text-slate-300 text-sm leading-relaxed mb-8 font-medium max-w-[280px]">
              Multiplique seus agendamentos e lote sua agenda. Junte-se à rede que mais cresce no Brasil e seja encontrado por milhares de pacientes.
            </p>
            
            <div className="w-full bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-900 font-black py-4 rounded-xl hover:from-teal-300 hover:to-emerald-400 transition-all shadow-[0_0_20px_rgba(45,212,191,0.3)] group-hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
              Quero Lotar Minha Agenda <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      <Testimonials />

      <div className="w-full max-w-4xl mt-12 mb-12 space-y-8 animate-fadeIn px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-center gap-2">
            🏥 Conheça a Marclyn Saúde
          </h2>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {[
            {
              id: 'who',
              title: '1. Quem Somos',
              content: 'A Marclyn saúde é uma plataforma de saúde inovadora que nasceu para transformar a jornada de cuidado com o bem estar. Unimos a excelência do atendimento médico à praticidade da tecnologia, criando uma ponte direta e eficiente entre profissionais da saúde e pacientes.'
            },
            {
              id: 'mission',
              title: '2. Nossa Missão e Propósito',
              content: 'Nosso propósito é democratizar e facilitar o cuidado com a saúde. Acreditamos que a prevenção e o tratamento devem estar ao alcance de todos, eliminando barreiras geográficas e burocráticas através de um ecossistema digital inteligente.'
            },
            {
              id: 'what',
              title: '3. O Que Fazemos',
              content: (
                <>
                  <p className="mb-4">Oferecemos uma solução completa para a sua jornada de saúde em um só lugar.</p>
                  <ul className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: 'Teleconsultas', desc: 'Atendimento médico de qualidade onde você estiver - no conforto de casa ou no trabalho.' },
                      { title: 'Agendamento presencial', desc: 'Facilidade para marcar consultas físicas quando o exame clínico for necessário.' },
                      { title: 'Exames e Procedimentos', desc: 'Emissão de guias e orientações para a realização de exames.' },
                      { title: 'Receita digital', desc: 'Prescrições enviadas diretamente para o seu dispositivo, aceitas em farmácias de todo o país.' }
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 items-start text-sm text-slate-500 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                        <span><strong className="text-slate-900">{item.title}:</strong> {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )
            },
            {
              id: 'why',
              title: '4. Por Que Escolher a Marclyn?',
              content: (
                <>
                  <p className="mb-4">Escolher a Marclyn significa priorizar o que você tem de mais valioso: Seu tempo é sua saúde.</p>
                  <ul className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: 'Acessibilidade', desc: 'Saúde na palma da mão, acessível de qualquer dispositivo.' },
                      { title: 'Conforto', desc: 'Evite deslocamentos desnecessários e filas de espera.' },
                      { title: 'Segurança', desc: 'Plataforma segura que garante o sigilo dos seus dados e histórico médico.' },
                      { title: 'Continuidade', desc: 'Acompanhamento do início ao fim, desde a consulta inicial até a realização de exames e retorno.' }
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 items-start text-sm text-slate-500 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                        <span><strong className="text-slate-900">{item.title}:</strong> {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )
            }
          ].map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
              <button 
                onClick={() => toggleFaq(item.id)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
              >
                <h3 className="font-black text-teal-600 uppercase tracking-widest text-xs">{item.title}</h3>
                {openFaq === item.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>
              {openFaq === item.id && (
                <div className="px-6 pb-6 animate-fadeIn">
                  <div className="text-sm leading-relaxed text-slate-500 font-medium border-t border-slate-50 pt-4">
                    {item.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 mb-12 text-center px-6 max-w-2xl mx-auto">
          <div className="w-16 h-1 bg-teal-500 mx-auto rounded-full mb-6 opacity-20"></div>
          <p className="text-xl md:text-2xl text-slate-600 font-medium leading-relaxed tracking-tight">
            A saúde não pode esperar. Com a <span className="text-teal-600 font-black">Marclyn</span>, ela está a apenas <span className="text-slate-900 font-bold border-b-2 border-teal-200">um clique</span> de distância.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
