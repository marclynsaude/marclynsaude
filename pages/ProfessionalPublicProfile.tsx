
import React, { useState, useEffect } from 'react';
import { Clinic, User, ProfileImage } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { ArrowLeft, MapPin, Star, Calendar, MessageCircle, ShieldCheck, Video, Stethoscope, TestTube, Globe, Clock, ChevronRight, HeartPulse, Info, ChevronLeft, Instagram, Phone, ExternalLink, Heart } from 'lucide-react';
import AppointmentForm from '../components/forms/AppointmentForm';
import ReviewSection from '../components/ReviewSection';

interface ProfessionalPublicProfileProps {
  user: User | null;
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const ProfessionalPublicProfile: React.FC<ProfessionalPublicProfileProps> = ({ user, onNavigate, showToast }) => {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (user && user.favorites && clinic) {
      setIsFavorite(user.favorites.includes(clinic.id));
    } else {
      setIsFavorite(false);
    }
  }, [user, clinic]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (showToast) showToast("Faça login para adicionar aos favoritos.", "error");
      onNavigate('/login');
      return;
    }

    if (!clinic) return;

    const previousState = isFavorite;
    setIsFavorite(!previousState);

    try {
      const updatedUser = await mockDb.toggleFavorite(user.id, clinic.id);
      if (updatedUser) {
        localStorage.setItem('marclyn_session', JSON.stringify(updatedUser));
        if (showToast) {
          if (!previousState) {
            showToast(`${clinic.name} adicionado(a) aos favoritos!`, "success");
          } else {
            showToast(`${clinic.name} removido(a) dos favoritos!`, "success");
          }
        }
        window.dispatchEvent(new Event('profile_updated'));
      }
    } catch (error) {
      setIsFavorite(previousState);
      if (showToast) showToast("Erro ao favoritar.", "error");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const hash = window.location.hash;
      const id = hash.split('/professional/')[1];
      
      const clinics = await mockDb.getClinics();
      setAllClinics(clinics);
      const found = clinics.find(c => c.id === id);
      
      if (found) {
        setClinic(found);
        // Increment profile visit metric
        mockDb.incrementMetric(found.id, 'visits').catch(console.error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleWhatsAppClick = () => {
    if (clinic) {
      mockDb.incrementMetric(clinic.id, 'whatsapp').catch(console.error);
      const whatsappNumber = (clinic.whatsapp || clinic.phone || '').replace(/\D/g, '');
      window.open(`https://wa.me/55${whatsappNumber}?text=${encodeURIComponent(`Olá! Gostaria de agendar uma consulta com ${clinic.name}.`)}`, '_blank');
    }
  };

  const formatPrice = (price: string) => {
    if (price.toLowerCase().includes('consultar')) return price;
    const numericValue = price.replace(/R\$/gi, '').trim();
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-white">R$</span>
        <span className="text-4xl font-black text-white tracking-tighter">{numericValue}</span>
      </div>
    );
  };

  const getGallery = () => {
      if (!clinic) return [];
      const images = [];
      if (clinic.imageUrl) images.push(clinic.imageUrl);
      if (clinic.gallery) {
          clinic.gallery.sort((a,b) => a.position - b.position).forEach(img => {
              images.push(img.imageUrl);
          });
      }
      return images;
  };

  const gallery = getGallery();

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Profissional não encontrado</h2>
        <button onClick={() => onNavigate('/')} className="mt-4 text-teal-600 font-bold">Voltar ao Início</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20 animate-fadeIn">
      {showBookingModal && user && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <AppointmentForm 
              clinics={allClinics}
              patientId={user.id}
              preSelectedClinicId={clinic.id}
              onSuccess={() => {
                setShowBookingModal(false);
                onNavigate('/dashboard');
              }}
              onCancel={() => setShowBookingModal(false)}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-slate-900 h-48 relative">
        <button 
          onClick={() => onNavigate('/')}
          className="absolute top-6 left-6 z-20 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
        >
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={toggleFavorite}
          className="absolute top-6 right-6 z-20 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md group/heart active:scale-95"
          title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart size={20} className={`transition-all duration-300 ${isFavorite ? 'text-red-500 fill-red-500 scale-110' : 'text-white hover:text-red-500'}`} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* GALLERY CAROUSEL */}
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white flex-shrink-0 bg-slate-100 relative group">
                <img 
                  src={gallery[activeImageIndex] || `https://ui-avatars.com/api/?name=${clinic.name}&background=random`} 
                  alt={clinic.name}
                  className="w-full h-full object-cover transition-all duration-500"
                />
                
                {gallery.length > 1 && (
                    <>
                        <button 
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                            {gallery.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIndex ? 'bg-teal-500 w-3' : 'bg-white/50'}`} />
                            ))}
                        </div>
                    </>
                )}
              </div>

              <div className="flex-1">
                <div className="flex wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                    {clinic.name}
                  </h1>
                  {clinic.verified && (
                    <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-teal-100 flex items-center gap-1">
                      <ShieldCheck size={14} /> Profissional Verificado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <p className="text-teal-600 font-black uppercase tracking-[0.2em] text-xs">
                    {clinic.specialty}
                  </p>
                  {clinic.reg && (
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest border-l border-slate-200 pl-2">
                      {clinic.reg}
                    </span>
                  )}
                </div>

                <div className="flex wrap gap-4 mb-6">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                    <MapPin size={16} className="text-teal-500" />
                    {clinic.neighborhood}, {clinic.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    {clinic.rating?.toFixed(1)} ({clinic.reviewCount} avaliações)
                  </div>
                </div>

                <div className="flex wrap gap-2">
                  {clinic.availableServices?.map(service => (
                    <span key={service} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      {service === 'teleconsulta' && <Video size={14} />}
                      {service === 'presencial' && <Stethoscope size={14} />}
                      {service === 'exame' && <TestTube size={14} />}
                      {service}
                    </span>
                  ))}
                  {clinic.instagram && (
                    <a 
                      href={`https://instagram.com/${clinic.instagram.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-pink-500/20"
                    >
                      <Instagram size={14} /> Instagram
                    </a>
                  )}
                  {clinic.website && (
                    <a 
                      href={clinic.website.startsWith('http') ? clinic.website : `https://${clinic.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-teal-600 transition-all shadow-lg"
                    >
                      <Globe size={14} /> Website
                    </a>
                  )}
                  {clinic.whatsapp && (
                    <button 
                      onClick={handleWhatsAppClick}
                      className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#128C7E] transition-all shadow-lg shadow-green-500/20"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-slate-50 pt-12">
              <div className="lg:col-span-2 space-y-10">
                <section>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info size={20} className="text-teal-600" /> Sobre o Profissional
                  </h3>
                  <div className="text-slate-600 leading-relaxed font-bold whitespace-pre-wrap text-sm">
                    {clinic.about || clinic.testimonial || "Profissional dedicado ao atendimento humanizado e focado na saúde integral de seus pacientes."}
                  </div>
                </section>

                <section>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Especialidade e Foco</h3>
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 font-black text-slate-800 uppercase tracking-tight text-lg">
                      {clinic.specialty}
                   </div>
                </section>

                <ReviewSection 
                  professionalId={clinic.id} 
                  professionalName={clinic.name} 
                  currentUser={user}
                />
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 block mb-2">Valor do Atendimento</span>
                  <div className="mb-1">
                    {clinic.consultationPrice ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">R$</span>
                        <span className="text-4xl font-black text-white tracking-tighter">{clinic.consultationPrice.toFixed(2)}</span>
                      </div>
                    ) : formatPrice(clinic.price)}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">por consulta</p>
                  
                  {clinic.planType === 'basic' ? (
                    <div className="space-y-3">
                      <button 
                        onClick={handleWhatsAppClick}
                        className="w-full bg-teal-500 hover:bg-teal-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        Agendar pelo WhatsApp <MessageCircle size={16} />
                      </button>
                      <a 
                        href={`tel:${(clinic.phone || '').replace(/\D/g, '')}`} 
                        className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-white/20 flex items-center justify-center gap-2"
                      >
                        Ligar para Profissional <Phone size={16} />
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          if(!user) {
                            showToast?.("Faça login para agendar", "error");
                            onNavigate('/login');
                          } else {
                            setShowBookingModal(true);
                          }
                        }}
                        className="w-full bg-teal-500 hover:bg-teal-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        Agendar Horário <ChevronRight size={16} />
                      </button>
                      {(clinic.planType === 'premium' || clinic.planType === 'advanced') && clinic.availableServices?.includes('teleconsulta') && (
                        <button 
                          onClick={() => {
                            if(!user) {
                              showToast?.("Faça login para acessar a teleconsulta", "error");
                              onNavigate('/login');
                            } else {
                              onNavigate('/teleconsulta/demo-room');
                            }
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 text-white"
                        >
                          Entrar na Teleconsulta <Video size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-teal-600" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Funcionamento</p>
                      <p className="text-sm font-bold text-slate-800">Seg-Sex: 08:00 - 18:00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-teal-600" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendimento</p>
                      <p className="text-sm font-bold text-slate-800">{clinic.location}</p>
                    </div>
                  </div>
                </div>

                {clinic.phone ? (
                  <a 
                    href={`https://wa.me/55${clinic.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre o atendimento de ${clinic.name}.`)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#128C7E] transition-all shadow-xl shadow-green-500/20 active:scale-95 animate-bounce"
                  >
                    <MessageCircle size={18} /> Conversar no WhatsApp
                  </a>
                ) : (
                  <div className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-400 font-black uppercase text-[10px] tracking-widest cursor-not-allowed">
                    <MessageCircle size={18} /> WhatsApp Indisponível
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalPublicProfile;
