
import React, { useState, useEffect } from 'react';
import { MapPin, Star, Heart, Stethoscope, Video, TestTube, ChevronRight, Info, ChevronLeft, ShieldCheck, Clock } from 'lucide-react';
import { Clinic, User } from '../types';
import { mockDb } from '../lib/mockSupabase';

interface ServiceCardProps {
  clinic: Clinic;
  onBook: (clinic: Clinic) => void;
  user: User | null;
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ clinic, onBook, user, onNavigate, showToast }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Consolidação de todas as imagens disponíveis
  const getAllImages = () => {
    const list: string[] = [];
    if (clinic.imageUrl) list.push(clinic.imageUrl);
    if (clinic.gallery && clinic.gallery.length > 0) {
      const sortedGallery = [...clinic.gallery].sort((a, b) => a.position - b.position);
      sortedGallery.forEach(img => list.push(img.imageUrl));
    }
    return list;
  };

  const images = getAllImages();

  useEffect(() => {
    if (user && user.favorites) {
      setIsFavorite(user.favorites.includes(clinic.id));
    }
  }, [user, clinic.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      if (showToast) showToast("Faça login para adicionar aos favoritos.", "error");
      onNavigate('/login');
      return;
    }

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

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const formatDisplayPrice = (price: string) => {
    if (price.toLowerCase().includes('consultar')) {
      return <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">{price}</span>;
    }
    
    const numericValue = price.replace(/R\$/gi, '').trim();
    
    return (
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-bold text-slate-900">R$</span>
        <span className="text-lg font-bold text-slate-900 tracking-tight">
          {numericValue}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-3 border border-slate-100 hover:shadow-2xl transition-all duration-500 group flex flex-col h-full animate-fadeIn">
      
      <div className="relative aspect-square overflow-hidden rounded-[2rem] mb-4 shadow-inner bg-slate-100">
        <img 
          src={images[currentImageIndex] || `https://ui-avatars.com/api/?name=${clinic.name}&background=random`} 
          alt={clinic.name}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        
        {/* SETAS DE NAVEGAÇÃO QUASE TRANSPARENTES */}
        {images.length > 1 && (
          <>
            <button 
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 hover:bg-black/30 text-white/40 hover:text-white transition-all z-30 backdrop-blur-sm"
              title="Anterior"
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            <button 
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 hover:bg-black/30 text-white/40 hover:text-white transition-all z-30 backdrop-blur-sm"
              title="Próxima"
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>

            {/* DOTS INDICADORES */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
              {images.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'w-4 bg-teal-500 shadow-sm' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-30">
          {(clinic.planType === 'premium' || clinic.planType === 'advanced') && (
            <div className="bg-amber-400 text-slate-900 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1 animate-pulse">
              <Star size={10} className="fill-slate-900" /> VIP
            </div>
          )}
          {clinic.urgencyTag && (
            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
              <Clock size={10} /> Atendimento Hoje
            </div>
          )}
        </div>

        <button 
          onClick={toggleFavorite}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg hover:bg-white transition-all z-30 group/heart active:scale-90"
        >
          <Heart 
            size={18} 
            className={`transition-all duration-300 ${isFavorite ? 'text-red-500 fill-red-500 scale-110' : 'text-slate-400 group-hover/heart:text-red-500'}`} 
          />
        </button>

        <div className="absolute bottom-4 left-4 flex gap-1.5">
            {clinic.availableServices?.includes('teleconsulta') && (
                <div className="bg-teal-500/90 backdrop-blur text-white p-1.5 rounded-lg shadow-lg">
                    <Video size={14} />
                </div>
            )}
            {clinic.availableServices?.includes('exame') && (
                <div className="bg-purple-50/90 backdrop-blur text-purple-600 p-1.5 rounded-lg shadow-lg border border-purple-100">
                    <TestTube size={14} />
                </div>
            )}
        </div>
      </div>

      <div className="px-2 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-teal-600 transition-colors">
            {clinic.name}
          </h3>
          {clinic.verified && (
            <ShieldCheck size={16} className="text-teal-500 flex-shrink-0" />
          )}
        </div>

        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {clinic.specialty} · {clinic.neighborhood}
            </span>
          </div>
          
          {clinic.rating && (
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-[10px] text-slate-700">{clinic.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 line-clamp-3 mb-5 font-semibold opacity-90 leading-relaxed">
          {clinic.testimonial || 'Atendimento humanizado e infraestrutura completa preparada para oferecer o melhor cuidado à sua saúde.'}
        </p>

        <div className="mt-auto pt-4 border-t border-slate-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              {formatDisplayPrice(clinic.price)}
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">por consulta</span>
            </div>
            
            <button 
              onClick={() => onNavigate(`/professional/${clinic.id}`)}
              className="text-teal-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-1 hover:text-teal-700 transition-colors"
            >
              Saiba Mais <Info size={14} />
            </button>
          </div>

          <button 
            onClick={() => onBook(clinic)}
            className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-600 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
          >
            Agendar Agora <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
