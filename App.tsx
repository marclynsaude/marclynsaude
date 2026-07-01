
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import RegisterPatient from './pages/RegisterPatient';
import RegisterPartner from './pages/RegisterPartner';
import PatientDashboard from './pages/PatientDashboard';
import ClinicDashboard from './pages/ClinicDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminApprovals from './pages/AdminApprovals';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminLogs from './pages/AdminLogs';
import AdminSystemSettings from './pages/AdminSystemSettings';
import ProfilePage from './pages/ProfilePage';
import DocumentsPage from './pages/DocumentsPage';
import SettingsPage from './pages/SettingsPage';
import ConsultationPage from './pages/ConsultationPage';
import SchedulePage from './pages/SchedulePage';
import SearchPage from './pages/SearchPage';
import TeleconsultationRoom from './pages/TeleconsultationRoom';
import ProfessionalPublicProfile from './pages/ProfessionalPublicProfile';
import RefundPolicy from './pages/RefundPolicy';
import Terms from './pages/Terms';
import Partners from './pages/Partners';
import { mockDb } from './lib/mockSupabase';
import { supabase } from './lib/supabaseClient';
import { User } from './types';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [currentPath, setCurrentPath] = useState(() => window.location.hash.replace('#', '').split('?')[0] || '/');

  const isSyncingRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const syncProfile = useCallback(async (email: string) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const profile = await mockDb.login(email);
      setUser(profile);
    } catch (e) {
      console.error("[AuthSync] Fail:", e);
    } finally {
      isSyncingRef.current = false;
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleHash = () => setCurrentPath(window.location.hash.replace('#', '').split('?')[0] || '/');
    window.addEventListener('hashchange', handleHash);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) syncProfile(session.user.email);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) syncProfile(session.user.email);
      if (event === 'SIGNED_OUT') { setUser(null); setAuthLoading(false); window.location.hash = '/'; }
    });

    return () => {
      window.removeEventListener('hashchange', handleHash);
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      if (user?.email) {
        syncProfile(user.email);
      }
    };
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile_updated', handleProfileUpdate);
    };
  }, [user?.email, syncProfile]);

  const navigate = useCallback((path: string) => window.location.hash = path, []);
  
  const commonProps = useMemo(() => ({ onNavigate: navigate, showToast }), [navigate, showToast]);

  useEffect(() => {
    if (user && (currentPath === '/login' || currentPath === '/register-patient' || currentPath === '/register-partner')) {
      navigate('/');
    }
  }, [user, currentPath, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  if (authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-4"></div>
      <p className="text-teal-400 font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Marclyn Pro...</p>
    </div>
  );

  const renderContent = () => {
    if (currentPath.startsWith('/teleconsulta/')) return user ? <TeleconsultationRoom user={user} {...commonProps} /> : <Login onLogin={setUser} {...commonProps} />;
    if (currentPath.startsWith('/professional/')) return <ProfessionalPublicProfile user={user} {...commonProps} />;

    switch (currentPath) {
      case '/': return <Home user={user} {...commonProps} />;
      case '/search': return <SearchPage user={user} {...commonProps} />;
      case '/login': return <Login onLogin={setUser} {...commonProps} />;
      case '/register-patient': return <RegisterPatient onLogin={setUser} {...commonProps} />;
      case '/register-partner': return <RegisterPartner {...commonProps} />;
      case '/dashboard':
        if (!user) return <Login onLogin={setUser} {...commonProps} />;
        if (user.role === 'admin') return <AdminDashboard user={user} onNavigate={navigate} />;
        if (user.role === 'clinic' || user.role === 'professional') return <ClinicDashboard user={user} onNavigate={navigate} showToast={showToast} />;
        return <PatientDashboard user={user} showToast={showToast} onNavigate={navigate} />;
      
      // ROTAS ADMINISTRATIVAS CORRIGIDAS
      case '/admin/approvals': 
        return user?.role === 'admin' ? <AdminApprovals onBack={() => navigate('/dashboard')} showToast={showToast} /> : <Home user={user} {...commonProps} />;
      case '/admin/subscriptions':
        return user?.role === 'admin' ? <AdminSubscriptions onNavigate={navigate} showToast={showToast} /> : <Home user={user} {...commonProps} />;
      case '/admin/logs':
        return user?.role === 'admin' ? <AdminLogs onNavigate={navigate} /> : <Home user={user} {...commonProps} />;
      case '/admin/settings':
        return user?.role === 'admin' ? <AdminSystemSettings onNavigate={navigate} showToast={showToast} /> : <Home user={user} {...commonProps} />;

      case '/profile': return user ? <ProfilePage user={user} {...commonProps} /> : <Login onLogin={setUser} {...commonProps} />;
      case '/documents': return user ? <DocumentsPage user={user} {...commonProps} /> : <Login onLogin={setUser} {...commonProps} />;
      case '/consultation': return (user?.role === 'clinic' || user?.role === 'professional') ? <ConsultationPage user={user} {...commonProps} /> : <Home user={user} {...commonProps} />;
      case '/schedule': return (user?.role === 'clinic' || user?.role === 'professional') ? <SchedulePage user={user} {...commonProps} /> : <Home user={user} {...commonProps} />;
      
      case '/refund-policy': return <RefundPolicy onNavigate={navigate} />;
      case '/terms': return <Terms onNavigate={navigate} />;
      case '/partners': return <Partners onNavigate={navigate} />;
      
      default: return <Home user={user} {...commonProps} />;
    }
  };

  return (
    <Layout user={user} onLogout={() => { setUser(null); supabase.auth.signOut(); }} onNavigate={navigate}>
      {renderContent()}
      
      {toast && (
        <div className={`fixed top-6 right-6 z-[110] w-[calc(100vw-3rem)] max-w-md p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slideIn ${toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={24} className="text-teal-400" /> : <AlertTriangle size={24} />}
          <div className="flex-1"><p className="font-bold text-sm uppercase">{toast.type === 'success' ? 'Sucesso' : 'Erro'}</p><p className="text-xs opacity-90">{toast.message}</p></div>
          <button onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}
    </Layout>
  );
};

export default App;
