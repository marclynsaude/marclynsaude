
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Clinic, ProfileImage } from '../../types';
import { Camera, Save, Lock, AlertTriangle, Building, Stethoscope, HeartPulse, Clock, Globe, DollarSign, Video, TestTube, MapPin, Star, Eye, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { mockDb } from '../../lib/mockSupabase';
import ServiceCard from '../ServiceCard';
import ImageCropperModal from './ImageCropperModal';

interface ProfileSettingsFormProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const roleLabels: Record<UserRole, string> = {
  patient: 'Paciente',
  clinic: 'Clínica',
  professional: 'Profissional',
  admin: 'Administrador'
};

const ProfileSettingsForm: React.FC<ProfileSettingsFormProps> = ({ user, onUpdate, showToast }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingPos, setUploadingPos] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    neighborhood: user.neighborhood || '',
    city: user.city || 'Salvador',
    avatarUrl: user.avatarUrl,
    bio: user.bio || '',
    about: user.about || '',
    price: user.price || '',
    operatingHours: user.operatingHours || '',
    website: user.website || '',
    specialty: user.specialty || '',
    reg: user.reg || '', 
    document: user.document || '', 
    availableServices: user.availableServices || [],
    healthPlan: user.healthPlan || '',
    emergencyContact: user.emergencyContact || '',
    medicalHistory: user.medicalHistory || '',
    yampiUrl: user.yampiUrl || '',
    gallery: user.gallery || []
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(user.avatarUrl);
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    imageSrc: string;
    type: 'avatar' | 'gallery';
    position?: number;
  }>({ isOpen: false, imageSrc: '', type: 'avatar' });

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Resolução suficiente para web
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Convertemos para WebP com 70% de qualidade para o melhor peso/performance
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
    });
  };

  const previewClinic: Clinic = {
    id: 'preview',
    name: formData.name || 'Nome do Profissional',
    specialty: formData.specialty || 'Sua Especialidade',
    location: formData.city || 'Salvador-BA',
    neighborhood: formData.neighborhood || 'Bairro',
    price: formData.price || 'A consultar',
    imageUrl: previewUrl,
    gallery: formData.gallery,
    rating: 5.0,
    reviewCount: 0,
    testimonial: formData.bio || 'Sua biografia curta aparecerá aqui para os pacientes no card de busca.',
    availableServices: formData.availableServices
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperState({
          isOpen: true,
          imageSrc: reader.result as string,
          type: 'avatar'
        });
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (position: number, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          // Validação básica de tamanho antes mesmo de processar
          if (file.size > 15 * 1024 * 1024) { // 15MB
            if (showToast) showToast("Arquivo muito grande. Máximo 15MB.", "error");
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            setCropperState({
              isOpen: true,
              imageSrc: reader.result as string,
              type: 'gallery',
              position
            });
          };
          reader.readAsDataURL(file);
          if (galleryInputRefs[position-1].current) galleryInputRefs[position-1].current!.value = '';
      }
  };

  const handleCropComplete = async (croppedImageBase64: string) => {
    if (cropperState.type === 'avatar') {
      const res = await fetch(croppedImageBase64);
      const blob = await res.blob();
      const file = new File([blob], 'avatar.webp', { type: 'image/webp' });
      setAvatarFile(file);
      setPreviewUrl(croppedImageBase64);
    } else if (cropperState.type === 'gallery' && cropperState.position) {
      const position = cropperState.position;
      setUploadingPos(position);
      try {
          const compressedBase64 = await compressImage(croppedImageBase64);
          
          await mockDb.updateGalleryImage(user.id, position, compressedBase64);
          
          const newGallery = [...(formData.gallery || [])].filter(img => img.position !== position);
          newGallery.push({ id: `temp-${Date.now()}`, profileId: user.id, imageUrl: compressedBase64, position });
          setFormData(prev => ({ ...prev, gallery: newGallery }));
          
          if (showToast) showToast(`Foto ${position} atualizada com sucesso!`);
      } catch (err: any) {
          console.error("[GALLERY] Erro no upload:", err);
          if (showToast) showToast("Erro ao processar imagem. Tente uma foto menor.", "error");
      } finally {
          setUploadingPos(null);
      }
    }
    setCropperState({ isOpen: false, imageSrc: '', type: 'avatar' });
  };

  const removeGalleryImage = async (position: number) => {
      try {
          await mockDb.deleteGalleryImage(user.id, position);
          setFormData(prev => ({ 
              ...prev, 
              gallery: (prev.gallery || []).filter(img => img.position !== position) 
          }));
          if (showToast) showToast(`Foto ${position} removida.`);
      } catch (e) {
          if (showToast) showToast("Erro ao remover foto.", "error");
      }
  };

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    const current = formData.availableServices || [];
    const updated = current.includes(service) 
      ? current.filter(s => s !== service) 
      : [...current, service];
    handleChange('availableServices', updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedUser = await mockDb.updateProfile(user.id, formData, avatarFile);
      if (updatedUser) {
        onUpdate(updatedUser);
        if (showToast) showToast('Perfil atualizado com sucesso!');
      }
    } catch (error) {
      if (showToast) showToast('Erro ao salvar alterações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isPro = user.role === 'clinic' || user.role === 'professional';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
        <div className="bg-slate-900 p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden shadow-xl bg-slate-800">
               <img 
                 src={previewUrl || `https://ui-avatars.com/api/?name=${user.name}&background=0D9488&color=fff`} 
                 alt="Avatar" 
                 className="w-full h-full object-cover"
               />
            </div>
            <div className="absolute bottom-0 right-0 bg-teal-500 text-white p-2 rounded-full shadow-lg group-hover:bg-teal-600 transition-colors">
              <Camera size={16} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="text-center md:text-left text-white">
            <h3 className="text-xl font-bold">{formData.name || user.name}</h3>
            <p className="text-slate-400 text-sm uppercase tracking-wider">{roleLabels[user.role]}</p>
            <div className="mt-2 text-xs bg-white/10 px-3 py-1 rounded-full border border-white/5 inline-block">
              {user.status === 'active' ? '● Conta Verificada' : '● Aguardando Aprovação'}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          
          {isPro && (
             <section className="space-y-4">
               <h4 className="font-black text-slate-800 text-xs uppercase border-b border-slate-100 pb-2 tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-teal-600" /> Galeria de Fotos Extras (Máx 3)
               </h4>
               <p className="text-xs text-slate-500 font-medium">Estas fotos aparecem no seu perfil público para pacientes. Use fotos do consultório ou certificados.</p>
               <div className="grid grid-cols-3 gap-4 mt-4">
                  {[1, 2, 3].map((pos) => {
                      const img = formData.gallery?.find(g => g.position === pos);
                      const isUploading = uploadingPos === pos;
                      
                      return (
                          <div key={pos} className="aspect-square relative rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden group hover:border-teal-500 transition-all">
                              {isUploading ? (
                                  <div className="flex flex-col items-center gap-2">
                                      <Loader2 size={24} className="animate-spin text-teal-500" />
                                      <span className="text-[8px] font-black uppercase text-teal-600">Enviando...</span>
                                  </div>
                              ) : img ? (
                                  <>
                                      <img src={img.imageUrl} alt={`Extra ${pos}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button 
                                              type="button"
                                              onClick={() => galleryInputRefs[pos-1].current?.click()}
                                              className="p-2 bg-white text-slate-700 rounded-full hover:bg-teal-500 hover:text-white transition-all"
                                          >
                                              <Camera size={16} />
                                          </button>
                                          <button 
                                              type="button"
                                              onClick={() => removeGalleryImage(pos)}
                                              className="p-2 bg-red-50 text-white rounded-full hover:bg-red-500 transition-all"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </>
                              ) : (
                                  <button 
                                      type="button"
                                      onClick={() => galleryInputRefs[pos-1].current?.click()}
                                      className="flex flex-col items-center text-slate-400 hover:text-teal-600 transition-colors w-full h-full"
                                  >
                                      <Plus size={24} />
                                      <span className="text-[10px] font-black uppercase mt-1">Foto {pos}</span>
                                  </button>
                              )}
                              <input 
                                  type="file" 
                                  ref={galleryInputRefs[pos-1]} 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => handleGalleryUpload(pos, e)}
                              />
                          </div>
                      );
                  })}
               </div>
             </section>
          )}

          <section className="space-y-4">
            <h4 className="font-black text-slate-800 text-xs uppercase border-b border-slate-100 pb-2 tracking-widest flex items-center gap-2">
               <Building size={14} className="text-teal-600" /> Informações Básicas
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Nome Comercial / Completo</label>
                <input 
                  type="text" required value={formData.name} 
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Documento (CPF/CNPJ)</label>
                <input 
                  type="text" value={formData.document} 
                  onChange={e => handleChange('document', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Celular / WhatsApp</label>
                <input 
                  type="tel" value={formData.phone} 
                  onChange={e => handleChange('phone', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                  placeholder="(00) 90000-0000"
                />
              </div>
            </div>
          </section>

          {isPro && (
            <section className="space-y-4">
              <h4 className="font-black text-slate-800 text-xs uppercase border-b border-slate-100 pb-2 tracking-widest flex items-center gap-2">
                 <Stethoscope size={14} className="text-teal-600" /> Presença Profissional
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Especialidade Principal</label>
                  <input 
                    type="text" value={formData.specialty} 
                    onChange={e => handleChange('specialty', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Registro (CRM/CRP/CRO)</label>
                  <input 
                    type="text" value={formData.reg} 
                    onChange={e => handleChange('reg', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Bio Curta (Exibida no Card)</label>
                <textarea 
                  rows={2} value={formData.bio} 
                  onChange={e => handleChange('bio', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700 resize-none"
                  placeholder="Ex: Atendimento humanizado focado em emagrecimento saudável."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Sobre / História Completa (Página Pública)</label>
                <textarea 
                  rows={4} value={formData.about} 
                  onChange={e => handleChange('about', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700 resize-none"
                  placeholder="Descreva sua trajetória, formação e diferenciais de forma detalhada..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider flex items-center gap-1"><DollarSign size={10}/> Valor da Consulta</label>
                    <input 
                      type="text" value={formData.price} 
                      onChange={e => handleChange('price', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                      placeholder="Ex: R$ 150,00"
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider flex items-center gap-1"><Globe size={10}/> Site ou Instagram</label>
                    <input 
                      type="text" value={formData.website} 
                      onChange={e => handleChange('website', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                      placeholder="https://..."
                    />
                 </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
             <h4 className="font-black text-slate-800 text-xs uppercase border-b border-slate-100 pb-2 tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-teal-600" /> Endereço e Localização
             </h4>
             <div className="grid md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Cidade</label>
                   <input 
                     type="text" value={formData.city} 
                     onChange={e => handleChange('city', e.target.value)}
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Bairro Principal</label>
                   <input 
                     type="text" value={formData.neighborhood} 
                     onChange={e => handleChange('neighborhood', e.target.value)}
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                   />
                </div>
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">Endereço Completo</label>
                <input 
                  type="text" value={formData.address} 
                  onChange={e => handleChange('address', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-bold text-slate-700"
                  placeholder="Rua, Número, Complemento..."
                />
             </div>
          </section>

          {isPro && (
            <section className="space-y-4">
               <h4 className="font-black text-slate-800 text-xs uppercase border-b border-slate-100 pb-2 tracking-widest flex items-center gap-2">
                  <Video size={14} className="text-teal-600" /> Modalidades de Atendimento
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'presencial', label: 'Presencial', icon: <Stethoscope size={20}/> },
                    { id: 'teleconsulta', label: 'Teleconsulta', icon: <Video size={20}/> },
                    { id: 'exame', label: 'Exames', icon: <TestTube size={20}/> },
                  ].map(s => (
                    <button
                        key={s.id} type="button" onClick={() => toggleService(s.id)}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formData.availableServices?.includes(s.id) ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md transform scale-105' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}
                    >
                        {s.icon}
                        <span className="text-[10px] font-black uppercase tracking-wider">{s.label}</span>
                    </button>
                  ))}
               </div>
            </section>
          )}

          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" disabled={loading}
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-teal-600 shadow-xl shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-3"
            >
              {loading ? 'Sincronizando...' : <><Save size={18} /> Salvar Alterações</>}
            </button>
          </div>
        </div>
      </form>

      {isPro && (
        <aside className="space-y-6 sticky top-28 hidden lg:block animate-slideIn">
           <div className="flex items-center gap-2 mb-2">
              <Eye size={16} className="text-teal-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Visualização em Tempo Real</h3>
           </div>
           
           <div className="transform scale-90 origin-top">
              <ServiceCard 
                 clinic={previewClinic}
                 user={null}
                 onBook={() => {}}
                 onNavigate={() => {}}
                 showToast={() => {}}
              />
           </div>

           <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] shadow-sm">
              <h4 className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-widest mb-3">
                 <AlertTriangle size={14} /> Dicas de Conversão
              </h4>
              <ul className="space-y-3 text-[11px] text-amber-900/70 font-bold leading-relaxed">
                 <li className="flex gap-2">● Use uma foto profissional e bem iluminada.</li>
                 <li className="flex gap-2">● No campo biografia, foque nos benefícios para o paciente.</li>
                 <li className="flex gap-2">● Informe o preço para filtrar pacientes qualificados.</li>
              </ul>
           </div>
        </aside>
      )}

      {cropperState.isOpen && (
        <ImageCropperModal
          imageSrc={cropperState.imageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperState({ isOpen: false, imageSrc: '', type: 'avatar' })}
          aspectRatio={cropperState.type === 'avatar' ? 1 : 4 / 3}
        />
      )}

    </div>
  );
};

export default ProfileSettingsForm;
