
import React, { useState, useEffect } from 'react';
import { Review, User as UserType } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { Star, User, MessageSquare, Calendar, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReviewSectionProps {
  professionalId: string;
  professionalName: string;
  currentUser: UserType | null;
  onReviewAdded?: () => void;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ professionalId, professionalName, currentUser, onReviewAdded }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    try {
      const data = await mockDb.getReviews(professionalId);
      setReviews(data);
    } catch (error) {
      console.error("Erro ao carregar avaliações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [professionalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setSubmitting(true);
    try {
      await mockDb.addReview({
        professionalId,
        patientName: currentUser.name,
        rating,
        comment
      });
      setComment('');
      setRating(5);
      setShowModal(false);
      await loadReviews();
      if (onReviewAdded) onReviewAdded();
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <section className="mt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare size={24} className="text-teal-600" /> Avaliações dos Pacientes
          </h3>
          <p className="text-slate-500 font-bold text-sm mt-1">O que dizem sobre {professionalName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
            <Star size={20} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xl font-black text-slate-900">{averageRating}</span>
            <span className="text-slate-400 font-bold text-sm">({reviews.length})</span>
          </div>
          {currentUser?.role === 'patient' && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-2xl shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
            >
              <Plus size={18} /> Avaliar
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-widest">Deixar Avaliação</h4>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sua Nota</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star 
                            size={32} 
                            className={star <= rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seu Comentário</label>
                    <textarea
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Conte como foi sua experiência..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-slate-800 font-bold text-sm focus:border-teal-500 focus:ring-0 transition-all min-h-[120px] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {submitting ? "Enviando..." : "Enviar Avaliação"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {reviews.length === 0 ? (
        <div className="bg-slate-50 rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Star size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold">Este profissional ainda não possui avaliações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <motion.div 
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{review.patientName}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={12} 
                          className={i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200"} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  <Calendar size={12} />
                  {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed italic">
                "{review.comment}"
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewSection;
