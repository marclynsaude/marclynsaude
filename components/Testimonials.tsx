import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Ricardo S.',
    text: 'Em 2 meses, eliminei 13kg e meus exames normalizaram sem remédios! A praticidade da teleconsulta ajudou muito na minha rotina. Nota 10!'
  },
  {
    id: 2,
    name: 'Beatriz M.',
    text: 'A teleconsulta foi essencial! Viajo muito e consegui ser atendida e enviar exames de onde eu estava. Super aprovo, profissional incrível.'
  },
  {
    id: 3,
    name: 'Mariana L.',
    text: 'Excelente trabalho no tratamento ortodôntico. O resultado superou minhas expectativas, meu sorriso ficou perfeito e recuperei a autoestima.'
  },
  {
    id: 4,
    name: 'Fernanda O.',
    text: 'Atendimento surreal de bom! Equipe educada e a dentista é uma excelente profissional, teve total paciência e me passou muita tranquilidade.'
  },
  {
    id: 5,
    name: 'Carlos A.',
    text: 'Gostei muito do atendimento da psicóloga. Ela é excelente e passa muita confiança. O suporte tem sido fundamental para o meu bem-estar.'
  }
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 mb-8 px-4">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Quote className="text-teal-500" size={24} />
          Depoimentos
        </h2>
        <p className="text-slate-500 text-sm mt-1">O que nossos pacientes dizem sobre nós</p>
      </div>

      <div className="relative bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden max-w-md mx-auto">
        <div className="aspect-square bg-white relative group">
          
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300">
            <div className="flex gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-2xl">★</span>
              ))}
            </div>
            <p className="text-slate-800 text-lg md:text-xl font-medium italic mb-8 leading-relaxed">
              "{testimonials[currentIndex].text}"
            </p>
            <h4 className="text-slate-900 font-bold text-lg">
              {testimonials[currentIndex].name}
            </h4>
          </div>

          <button 
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 transform hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>

          <button 
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 transform hover:scale-110"
          >
            <ChevronRight size={24} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {testimonials.map((_, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-teal-500 w-4' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
