
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Home, Calendar, User as UserIcon, LogOut, FileText, ShieldCheck, Clock, File, Settings, LayoutDashboard, HeartPulse, Bell, ExternalLink, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';
import { User, Notification, UserRole } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { formatDatesInText } from '../utils/dateFormatter';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

const roleLabels: Record<UserRole, string> = {
  patient: 'Paciente',
  clinic: 'Clínica',
  professional: 'Profissional',
  admin: 'Administrador'
};

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoValid, setLogoValid] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  
  const logoUrl = "/logo.png";

  useEffect(() => {
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => setLogoValid(true);
  }, []);

  // MOTOR REAL-TIME DE NOTIFICAÇÕES (Sem Polling)
  useEffect(() => {
      if (user) {
          // 1. Carga Inicial
          mockDb.getNotifications(user.id).then(setNotifications);

          // 2. Canal Real-time
          const channel = mockDb.subscribeToNotifications(user.id, (payload) => {
              // Quando o banco faz INSERT, este código roda instantaneamente
              const newNotif: Notification = {
                  id: payload.new.id,
                  userId: payload.new.user_id,
                  message: payload.new.message,
                  read: payload.new.read,
                  createdAt: payload.new.created_at,
                  link: payload.new.appointment_id ? '/dashboard' : undefined,
                  type: payload.new.type
              };
              
              setNotifications(prev => [newNotif, ...prev]);
              
              // Opcional: Feedback tátil/sonoro ou Toast aqui se desejar
              console.log("[NOTIF] Nova notificação recebida em tempo real!");
          });

          return () => { channel.unsubscribe(); };
      }
  }, [user?.id]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNav = (path: string) => {
    onNavigate(path);
    setIsSidebarOpen(false);
  };

  const handleNotifClick = async (notif: Notification) => {
      if (!notif.read) {
          await mockDb.markNotificationAsRead(notif.id);
          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      }
      if (notif.link) handleNav(notif.link);
      setShowNotifMenu(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 relative">
      <header className="bg-slate-900 text-white sticky top-0 z-[80] shadow-xl h-20">
        <div className="w-full max-w-5xl mx-auto px-4 h-full flex items-center justify-between gap-2">
          
          <div className="w-10"></div>

          <div 
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-105 transition-transform duration-300 z-50" 
            onClick={() => handleNav('/')}
          >
              {logoValid ? (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full shadow-2xl border-[3px] md:border-4 border-slate-900 flex items-center justify-center overflow-hidden">
                  <img 
                    src={logoUrl}
                    alt="Marclyn Saúde" 
                    className="w-full h-full object-contain scale-[1.7]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="bg-teal-500 p-1 rounded-lg"><HeartPulse size={24} className="text-white" /></div>
                  <div className="flex flex-col">
                    <span className="text-sm md:text-xl font-black text-white leading-none">MARCLYN</span>
                    <span className="text-[8px] md:text-[10px] font-black text-teal-400 uppercase">SAÚDE</span>
                  </div>
                </div>
              )}
          </div>

          <div className="flex items-center gap-1 md:gap-4 z-10">
              {user && (
                  <div className="relative">
                      <button 
                          onClick={() => setShowNotifMenu(!showNotifMenu)}
                          className="p-1.5 md:p-2 hover:bg-slate-800 rounded-full relative group transition-all"
                      >
                          <Bell size={22} className={unreadCount > 0 ? "text-teal-400" : "text-slate-300"} />
                          {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-slate-900 flex items-center justify-center animate-bounce">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                      </button>

                      {showNotifMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)}></div>
                            <div className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 top-[88px] md:top-14 w-auto md:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-[2rem] shadow-2xl border border-slate-200 z-50 text-slate-900 overflow-hidden animate-slideUp">
                                <div className="p-5 bg-slate-50 border-b border-slate-100 font-black text-[10px] text-slate-500 uppercase flex justify-between items-center tracking-widest">
                                    <span>Notificações</span>
                                    {unreadCount > 0 && <span className="bg-teal-100 text-teal-600 px-3 py-1 rounded-full">{unreadCount} Novas</span>}
                                </div>
                                <div className="max-h-[min(380px,65vh)] overflow-y-auto scrollbar-hide">
                                    {notifications.length > 0 ? (
                                        notifications.map(notif => (
                                            <div key={notif.id} onClick={() => handleNotifClick(notif)} className={`p-5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors relative ${!notif.read ? 'bg-teal-50/20' : ''}`}>
                                                {!notif.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>}
                                                <p className={`text-xs md:text-sm leading-relaxed ${!notif.read ? 'font-black text-slate-900' : 'text-slate-500 font-medium'}`}>{formatDatesInText(notif.message)}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">
                                                        {new Date(notif.createdAt).toLocaleDateString()} · {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                    {notif.link && <ExternalLink size={12} className="text-teal-500" />}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center text-slate-300 flex flex-col items-center gap-3">
                                            <Bell size={40} className="opacity-20" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Sua central está limpa</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-slate-50 text-center">
                                    <button 
                                        onClick={() => setShowNotifMenu(false)}
                                        className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-teal-600 transition-colors"
                                    >
                                        Fechar Central
                                    </button>
                                </div>
                            </div>
                          </>
                      )}
                  </div>
              )}

              <button onClick={toggleSidebar} className="p-1.5 md:p-2 hover:bg-slate-800 rounded-full transition-colors">
                {isSidebarOpen ? <X size={24} className="text-slate-300" /> : <Menu size={26} className="text-white" />}
              </button>
          </div>
        </div>
      </header>
      
      {/* ... (restante do componente) */}

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 z-[90] backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />}

      <div className={`fixed top-0 right-0 h-full w-72 md:w-80 bg-slate-900 text-white z-[100] transform transition-transform duration-500 shadow-2xl flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full overflow-y-auto scrollbar-hide">
          <div className="flex justify-end mb-6"><button onClick={toggleSidebar} className="p-2 hover:bg-slate-800 rounded-full"><X size={24} /></button></div>
          
          {user ? (
            <div className="flex items-center gap-4 mb-8 p-4 bg-slate-800/50 border border-slate-700 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center font-black overflow-hidden border-2 border-white/10">
                 {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-sm truncate uppercase">{user.name}</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">{roleLabels[user.role]}</p>
                  </div>
                  {(user.role === 'clinic' || user.role === 'professional') && (
                    <span className="px-2 py-0.5 self-start bg-slate-700 text-teal-300 rounded-[5px] text-[8px] font-black uppercase tracking-widest border border-slate-600 font-mono mt-0.5">
                      Plano {(user.planType === 'medio' || user.planType === 'medium') ? 'Médio' : (user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') ? 'Avançado' : 'Básico'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => handleNav('/login')} className="w-full py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-black uppercase text-xs tracking-widest mb-8">Entrar / Cadastrar</button>
          )}

          <nav className="flex-1 space-y-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 mt-2 px-2">Principal</div>
            <button onClick={() => onNavigate('/')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><Home size={20} className="text-slate-400" /> Início</button>
            {(!user || (user.role === 'patient' && user.patientType !== 'club')) && !window.location.hash.includes('/professional/') && (
              <button onClick={() => {
                handleNav('/');
                setTimeout(() => {
                  const el = document.getElementById('club-paciente');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><Sparkles size={20} className="text-teal-400" /> Club Paciente</button>
            )}
            {!user && !window.location.hash.includes('/professional/') && (
              <button onClick={() => handleNav('/partners')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><TrendingUp size={20} className="text-teal-400" /> Parceiro Marclyn</button>
            )}
            {user && (
              <>
                <button onClick={() => handleNav('/dashboard')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><LayoutDashboard size={20} className="text-teal-400" /> Painel</button>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 mt-6 px-2">AÇÕES</div>
                {(user.role === 'clinic' || user.role === 'professional') && (
                   <><button onClick={() => handleNav('/consultation')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><UserIcon size={20} className="text-slate-400" /> Atendimento</button>
                     <button onClick={() => handleNav('/schedule')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><Clock size={20} className="text-slate-400" /> Agenda</button>
                     <button onClick={() => handleNav('/documents')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><File size={20} className="text-slate-400" /> Histórico</button></>
                )}
                {user.role === 'patient' && <button onClick={() => handleNav('/documents')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><File size={20} className="text-slate-400" /> Meus Documentos</button>}
                <button onClick={() => handleNav('/profile')} className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm group"><Settings size={20} className="text-slate-400" /> Perfil</button>
              </>
            )}
            <a href="https://wa.me/5571982700412" target="_blank" rel="noopener" className="flex items-center gap-3 w-full p-3.5 hover:bg-slate-800 rounded-xl text-left font-bold text-sm"><MessageCircle size={20} className="text-slate-400" /> Suporte</a>
          </nav>

          {user && <button onClick={onLogout} className="flex items-center gap-3 w-full p-3.5 text-red-400 font-black text-xs uppercase tracking-widest mt-6 border-t border-slate-800"><LogOut size={20} /> Encerrar Sessão</button>}
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto">{children}</main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4"><div className="bg-teal-500/10 p-2 rounded-lg"><HeartPulse size={20} className="text-teal-500" /></div><span className="font-black tracking-[0.2em] text-lg text-white">MARCLYN</span></div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-6 opacity-60">Plataforma de Gestão de Saúde</p>
          
          <div className="flex justify-center gap-6 mt-8 mb-4">
            <button onClick={() => onNavigate('/refund-policy')} className="text-xs font-black text-white bg-teal-600 px-6 py-2.5 rounded-full hover:bg-teal-500 transition-all uppercase tracking-widest shadow-lg shadow-teal-500/20 active:scale-95">
              Política de Reembolso
            </button>
            <button onClick={() => onNavigate('/terms')} className="text-xs font-bold text-slate-500 hover:text-teal-400 transition-colors uppercase tracking-wider px-4 py-2">
              Termos de Uso
            </button>
          </div>

          <p className="text-[9px] text-slate-600 mt-8 font-bold uppercase tracking-widest">© {new Date().getFullYear()} Marclyn Saúde.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
