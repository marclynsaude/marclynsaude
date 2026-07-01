
import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Stethoscope, X, ChevronRight, Video, TestTube, LayoutDashboard, HeartPulse, TrendingUp, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { Clinic, User } from '../types';
import { mockDb } from '../lib/mockSupabase';
import QuickAccessCard from '../components/QuickAccessCard';
import ServiceCard from '../components/ServiceCard';
import AppointmentForm from '../components/forms/AppointmentForm';
import ClubPacienteSection from '../components/ClubPacienteSection';
import Testimonials from '../components/Testimonials';
import { Sparkles } from 'lucide-react';

interface HomeProps {
  user: User | null;
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const Home: React.FC<HomeProps> = ({ user, onNavigate, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const [suggestions, setSuggestions] = useState<Clinic[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const loadClinics = async () => {
      setLoading(true);
      try {
        const data = await mockDb.getClinics();
        setAllClinics(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Home Load Error:", err);
        setAllClinics([]);
      } finally {
        setLoading(false);
      }
    };
    loadClinics();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalize = (text: string) => {
    return (text || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const getMatches = (clinics: Clinic[], term: string) => {
    if (!term || !Array.isArray(clinics)) return [];
    const normalizedTerm = normalize(term);
    const searchTokens = normalizedTerm.split(/\s+/).filter(t => t.length > 0);

    return clinics.filter(clinic => {
      const clinicString = normalize(`${clinic.name || ''} ${clinic.specialty || ''} ${clinic.neighborhood || ''} ${clinic.location || ''}`);
      return searchTokens.every(token => clinicString.includes(token));
    });
  };

  const filteredClinics = Array.isArray(allClinics) && searchTerm 
    ? getMatches(allClinics, searchTerm)
    : allClinics;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length >= 2) {
      const matches = getMatches(allClinics, value);
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (clinic: Clinic) => {
    setSearchTerm(clinic.name);
    setShowSuggestions(false);
    onNavigate(`/professional/${clinic.id}`);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const handleBooking = (clinic: Clinic) => {
    if (!user) {
      if(showToast) showToast('Por favor, faça login ou cadastre-se para agendar.', 'error');
      onNavigate('/login');
      return;
    }
    setSelectedClinic(clinic);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setSelectedClinic(null);
    onNavigate('/dashboard');
  };

  const services = [
    { id: 'teleconsulta', title: 'Marcar Teleconsulta', icon: <Video size={20} /> },
    { id: 'presencial', title: 'Marcar Consulta', icon: <Stethoscope size={20} />, desc: 'Presencial' },
    { id: 'exames', title: 'Marcar Exames', icon: <TestTube size={20} /> },
    { id: 'club-paciente', title: 'Club Paciente', icon: <Sparkles size={20} className="text-teal-600" />, desc: 'Benefícios' },
    { id: 'parceiro-marclyn', title: 'Seja Parceiro', icon: <TrendingUp size={20} className="text-teal-600" />, desc: 'Profissionais' },
    { id: 'agendamentos', title: 'Meus Agendamentos', icon: <Calendar size={20} /> },
  ];

  const getDashboardCardContent = () => {
    if (!user) return { title: 'Acessar Painel do Paciente', desc: 'Ver prontuário, receitas e agendamentos.' };
    if (user.role === 'admin') return { title: 'Painel Administrativo', desc: 'Gestão completa do sistema.' };
    if (user.role === 'clinic') return { title: 'Painel da Clínica', desc: 'Gerencie pacientes e agenda.' };
    if (user.role === 'professional') return { title: 'Painel do Profissional', desc: 'Gerencie sua agenda e atendimentos.' };
    return { title: 'Minha Saúde', desc: 'Ver prontuário, receitas e resultados.' };
  };

  const dashboardInfo = getDashboardCardContent();

  return (
    <div className="bg-[#eef5f6] min-h-screen relative pb-12">
      {showBookingModal && user && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <AppointmentForm 
              clinics={allClinics}
              patientId={user.id}
              preSelectedClinicId={selectedClinic?.id}
              onSuccess={handleBookingSuccess}
              onCancel={() => {
                setShowBookingModal(false);
                setSelectedClinic(null);
              }}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-[340px] bg-[#4d8688] rounded-b-[3rem] z-0 shadow-xl"></div>

      <div className="relative z-30 pt-6 px-4 max-w-2xl mx-auto" ref={searchContainerRef}>
        <div className="relative">
          <input
            type="text"
            placeholder="BUSCAR SERVIÇOS, ESPECIALIDADE, BAIRRO..."
            className="w-full pl-10 pr-10 py-4 rounded-full text-sm font-bold text-white shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-300/50 uppercase placeholder:text-slate-300 transition-all bg-slate-900/60 backdrop-blur-md border border-white/10"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <Search className="absolute left-4 top-4 text-slate-300" size={20} />
          {searchTerm && (
            <button onClick={clearSearch} className="absolute right-4 top-4 text-slate-300 hover:text-white p-0.5 rounded-full hover:bg-white/10">
              <X size={16} />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-100 animate-slideUp">
            <ul className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {suggestions.map(suggestion => (
                <li key={suggestion.id} onClick={() => handleSelectSuggestion(suggestion)} className="p-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-teal-600">
                      <Stethoscope size={16}/>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-sm">{suggestion.name}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{suggestion.specialty}</span>
                        <span>•</span>
                        <span>{suggestion.neighborhood}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-600" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative z-30 mt-8 px-4 max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
             {services.map(s => (
               <QuickAccessCard 
                 key={s.id} 
                 title={s.title} 
                 icon={s.icon} 
                 description={s.desc} 
                 onClick={() => {
                   if (s.id === 'club-paciente') {
                     const el = document.getElementById('club-paciente');
                     if (el) el.scrollIntoView({ behavior: 'smooth' });
                     return;
                   }
                   if (s.id === 'parceiro-marclyn') {
                     onNavigate('/partners');
                     return;
                   }
                   onNavigate(s.id === 'agendamentos' ? (user ? '/dashboard' : '/login') : `/search?type=${s.id}`)
                 }} 
               />
             ))}
          </div>
        </div>

        {/* Minha Saúde (Dashboard Card) */}
        <div className="mb-12">
            <QuickAccessCard 
                title={dashboardInfo.title}
                description={dashboardInfo.desc}
                icon={<LayoutDashboard size={20}/>}
                onClick={() => onNavigate(user ? '/dashboard' : '/login')}
            />
        </div>

        {/* Club Paciente Section */}
        {(!user || (user.role === 'patient' && user.patientType !== 'club')) && (
          <ClubPacienteSection />
        )}
        
        {/* Clínicas e Profissionais */}
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <HeartPulse className="text-teal-600" /> Clínicas e Profissionais
                </h2>
                <button onClick={() => onNavigate('/search')} className="text-teal-600 font-bold text-xs uppercase hover:underline">Ver Todos</button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-white rounded-[2.5rem] h-[450px] animate-pulse border border-slate-100"></div>
                    ))}
                </div>
            ) : filteredClinics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClinics.slice(0, 6).map(clinic => (
                        <ServiceCard 
                          key={clinic.id} 
                          clinic={clinic} 
                          user={user} 
                          onBook={handleBooking} 
                          onNavigate={onNavigate} 
                          showToast={showToast} 
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-[2.5rem] text-center border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold uppercase text-sm">Nenhum resultado para "{searchTerm}"</p>
                    <button onClick={clearSearch} className="mt-4 text-teal-600 font-black uppercase text-xs">Limpar Busca</button>
                </div>
            )}
        </div>

        {/* Depoimentos Section */}
        <div className="my-16">
          <div className="text-center mb-8 animate-fadeIn">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center justify-center gap-2">
              ⭐ O Que Dizem Nossos Clientes e Parceiros
            </h2>
          </div>
          <Testimonials />
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-4xl mx-auto mt-16 mb-16 space-y-8 animate-fadeIn">
          <div className="text-center mb-8">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center justify-center gap-2">
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
                id: 'what',
                title: '2. O Que Fazemos',
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
                title: '3. Por Que Escolher a Marclyn?',
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
    </div>
  );
};

export default Home;
