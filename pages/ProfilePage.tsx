
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import ProfileSettingsForm from '../components/profile/ProfileSettingsForm';
import { Settings, ArrowLeft } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onNavigate, showToast }) => {
  // Local state to keep UI updated after form changes
  const [currentUser, setCurrentUser] = useState<User>(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    // Update global user state (in a real app this would trigger a refetch or context update)
    // For this mock app, we rely on App.tsx refreshing or reloading from localStorage if needed
    localStorage.setItem('marclyn_session', JSON.stringify(updatedUser));
  };

  return (
    <div className="p-4 md:p-8 animate-fadeIn max-w-5xl mx-auto">
      <button 
        onClick={() => onNavigate?.('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      <div className="mb-8 flex items-center gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
           <Settings className="text-teal-600" size={24} />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Configurações de Perfil</h2>
           <p className="text-slate-500">Gerencie suas informações pessoais e dados da conta</p>
        </div>
      </div>

      <ProfileSettingsForm 
        user={currentUser} 
        onUpdate={handleUpdate}
        showToast={showToast}
      />
    </div>
  );
};

export default ProfilePage;
