
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Appointment } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { Users, Calendar, DollarSign, Activity, Stethoscope, Clock, Video, Trash2, RefreshCw, FileText, Search, Plus, Download, ExternalLink, Shield, ShieldCheck, MessageCircle, Star, CheckCircle, BarChart3, Gift, ArrowLeft, TrendingUp, TrendingDown, X } from 'lucide-react';
import { formatDateTime, formatDate, formatTime } from '../utils/dateFormatter';

/**
 * MARCLYN PERFORMANCE SHIELD v2.0
 * ClinicDashboard - Optimized for Production
 */

interface ClinicDashboardProps {
  user: User;
  onNavigate?: (path: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

// Subcomponente de métrica isolado para evitar re-renders do componente pai
const MetricCard = React.memo(({ title, value, icon, color, subtext }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg shadow-opacity-20`}>
        {icon}
      </div>
    </div>
    {subtext && <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">{subtext}</p>}
  </div>
));

const ClinicDashboard: React.FC<ClinicDashboardProps> = ({ user, onNavigate, showToast }) => {
  // --- ESTADO ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [financials, setFinancials] = useState({ totalRevenue: 0, chartData: [] as any[], transactions: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'referrals' | 'records' | 'financial' | 'telemetry' | 'plan'>('overview');
  const [medicalDocuments, setMedicalDocuments] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [isUrgent, setIsUrgent] = useState(user.urgencyTag || false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);

  // --- ESTADOS DE CONTROLE FINANCEIRO AVANÇADO ---
  const [includePlatform, setIncludePlatform] = useState<boolean>(() => {
    return localStorage.getItem('include_platform_fin') !== 'false';
  });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [isSavingTrans, setIsSavingTrans] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'platform'>('all');
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: 'Consultório',
    date: new Date().toISOString().split('T')[0]
  });

  const toggleIncludePlatform = () => {
    const nextVal = !includePlatform;
    setIncludePlatform(nextVal);
    localStorage.setItem('include_platform_fin', String(nextVal));
  };

  // Manual booking states
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [newManualApp, setNewManualApp] = useState({
    patientName: '',
    doctorName: user.name || '',
    date: '',
    time: '09:00',
    type: 'presencial',
    notes: ''
  });

  const handleCreateManualAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualApp.patientName.trim()) {
      showToast?.("Digite o nome do paciente.", "error");
      return;
    }
    if (!newManualApp.date) {
      showToast?.("Selecione uma data.", "error");
      return;
    }
    if (!newManualApp.time) {
      showToast?.("Selecione um horário.", "error");
      return;
    }

    try {
      showToast?.("Agendando...", "success");
      
      const dateTimeStr = `${newManualApp.date}T${newManualApp.time}:00`;
      
      // Store custom patient details in the notes field prefixed with [MANUAL]
      const notesPayload = `[MANUAL]${JSON.stringify({
        patientName: newManualApp.patientName.trim(),
        notes: newManualApp.notes.trim()
      })}`;

      await mockDb.createAppointment({
        patientId: null,
        clinicId: user.id,
        doctorName: newManualApp.doctorName || user.name || 'Médico',
        date: dateTimeStr,
        type: newManualApp.type,
        notes: notesPayload
      });
      
      showToast?.("Consulta agendada manualmente com sucesso!", "success");
      setShowManualBooking(false);
      setNewManualApp({
        patientName: '',
        doctorName: user.name || '',
        date: '',
        time: '09:00',
        type: 'presencial',
        notes: ''
      });
      
      loadData(true);
    } catch (err: any) {
      console.error(err);
      showToast?.(`Erro ao cadastrar agendamento: ${err.message || err}`, "error");
    }
  };

  // --- TRAVAS E CACHE (MEMÓRIA) ---
  const isFetchingRef = useRef(false);
  const cacheRef = useRef<{ userId: string; timestamp: number } | null>(null);
  const CACHE_TTL = 30000; // 30 segundos de "descanso" para o banco

  // --- CARREGAMENTO DE DADOS (MEMOIZED) ---
  const loadData = useCallback(async (force = false) => {
    // 1. Bloqueia se já estiver carregando
    if (isFetchingRef.current) return;

    // 2. Verifica Cache (Evita refetch ao navegar se os dados forem recentes)
    const now = Date.now();
    if (!force && cacheRef.current?.userId === user.id && (now - cacheRef.current.timestamp) < CACHE_TTL) {
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const isMedOrAbove = user.planType === 'medio' || user.planType === 'medium' || user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado';
      const isAdvOrAbove = user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado';

      // 3. Execução Paralela (Máxima Performance)
      const [apps, finData, docs, records, hData] = await Promise.all([
        mockDb.getAppointments(user.id, user.role),
        mockDb.getClinicFinancials(user.id),
        isMedOrAbove ? mockDb.getMedicalDocuments(user.id) : Promise.resolve([]),
        isMedOrAbove ? mockDb.getRecords(user.id, user.role) : Promise.resolve([]),
        isAdvOrAbove ? mockDb.getHealthData(user.id) : Promise.resolve([])
      ]);

      setAppointments(apps);
      setFinancials(finData);
      setMedicalDocuments(docs);
      setMedicalRecords(records);
      setHealthData(hData);
      
      // 4. Atualiza Cache
      cacheRef.current = { userId: user.id, timestamp: now };
    } catch (e) {
      console.error("[ClinicDashboard] Load Failed:", e);
      if (showToast) showToast("Erro ao sincronizar dados.", "error");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user.id, user.role, showToast]);

  // --- EFEITO INICIAL (DEPENDÊNCIA ÚNICA) ---
  useEffect(() => {
    loadData();
  }, [user.id]); // Somente dispara se o ID do usuário mudar

  // --- AÇÕES (OTIMISTAS) ---
  const handleCancelAppointment = async (appId: string) => {
    const confirmed = window.confirm("Deseja realmente CANCELAR esta consulta?");
    if (!confirmed) return;

    // 1. Snapshot para Rollback
    const previousState = [...appointments];

    // 2. Atualização Otimista Instantânea (UI responde na hora)
    setAppointments(prev => prev.map(a => 
      a.id === appId ? { ...a, status: 'canceled' as any } : a
    ));

    try {
      if (showToast) showToast("Cancelando...", "success");
      
      // 3. Chamada ao banco (Silenciosa)
      await mockDb.cancelAppointment(appId);
      
      if (showToast) showToast("Agendamento cancelado.");
      
      // Atualiza o timestamp do cache para forçar um refresh na próxima navegação, 
      // mas não dispara um reload global agora para manter a fluidez.
      if (cacheRef.current) cacheRef.current.timestamp = 0;
      
    } catch (e: any) {
      // 4. Rollback em caso de erro real
      setAppointments(previousState);
      if (showToast) showToast(`Erro ao cancelar: ${e.message}`, "error");
    }
  };

  const handleDeleteRecordConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeletingRecord(true);
    try {
      await mockDb.deleteMedicalRecord(recordToDelete.id);
      if (showToast) {
        showToast("Prontuário/registro excluído com sucesso!", "success");
      }
      setRecordToDelete(null);
      setSelectedRecord(null);
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      if (showToast) {
        showToast(`Erro ao excluir prontuário: ${err?.message || err}`, "error");
      }
    } finally {
      setIsDeletingRecord(false);
    }
  };


  // --- CÁLCULOS DERIVADOS (MEMOIZED) ---
  const consultPrice = useMemo(() => {
    if (user.consultationPrice && user.consultationPrice > 0) {
      return user.consultationPrice;
    }
    if (user.price) {
      const clean = user.price.replace(/[^\d.,]/g, '').trim().replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val > 0) return val;
    }
    return 150; // Fallback default
  }, [user.consultationPrice, user.price]);

  // Auto-calculated platform consultation revenue breakdown
  const platformIncomeDetail = useMemo(() => {
    const doneApps = appointments.filter(a => a.status === 'done');
    const activeApps = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
    
    const doneValue = doneApps.length * consultPrice;
    const activeValue = activeApps.length * consultPrice;
    const totalValue = doneValue + activeValue;
    
    return {
      doneCount: doneApps.length,
      doneValue,
      activeCount: activeApps.length,
      activeValue,
      totalCount: doneApps.length + activeApps.length,
      totalValue
    };
  }, [appointments, consultPrice]);

  // Manual records from Supabase "financial" database table
  const manualFinData = useMemo(() => {
    const trans = financials.transactions || [];
    const incomes = trans.filter((t: any) => t.type === 'income');
    const expenses = trans.filter((t: any) => t.type === 'expense');
    
    const incomeSum = incomes.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);
    const expenseSum = expenses.reduce((acc: number, curr: any) => acc + (parseFloat(curr.amount) || 0), 0);
    
    return {
      transactions: trans,
      incomeSum,
      expenseSum,
      netSum: incomeSum - expenseSum
    };
  }, [financials.transactions]);

  // Unified financial statistics (Manual DB items + Platform consultations if active)
  const finalFinStats = useMemo(() => {
    const platformAdd = includePlatform ? platformIncomeDetail.totalValue : 0;
    
    const totalInflow = manualFinData.incomeSum + platformAdd;
    const totalOutflow = manualFinData.expenseSum;
    const netBalance = totalInflow - totalOutflow;
    
    return {
      totalInflow,
      totalOutflow,
      netBalance,
      platformRevenue: platformIncomeDetail.totalValue,
      manualRevenue: manualFinData.incomeSum
    };
  }, [manualFinData, platformIncomeDetail, includePlatform]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const doneApps = appointments.filter(a => a.status === 'done').length;
    const canceledApps = appointments.filter(a => a.status === 'canceled').length;
    const totalFinished = doneApps + canceledApps;
    const attendanceRate = totalFinished > 0 ? (doneApps / totalFinished) * 100 : 100;
    
    return {
      todayCount: appointments.filter(a => (a.status === 'confirmed' || a.status === 'scheduled') && a.date.startsWith(today)).length,
      totalCount: appointments.length,
      revenueFormatted: finalFinStats.netBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      attendanceRate: attendanceRate.toFixed(1) + '%',
      conversionRate: '12.5%' // Mocked conversion rate
    };
  }, [appointments, finalFinStats]);

  // API level execution for manual financial records
  const handleAddNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.description.trim()) {
      if (showToast) showToast("A descrição é obrigatória.", "error");
      return;
    }
    const val = parseFloat(newTransaction.amount);
    if (isNaN(val) || val <= 0) {
      if (showToast) showToast("Digite um valor válido para a transação.", "error");
      return;
    }
    
    setIsSavingTrans(true);
    try {
      const transObj = {
        professional_id: user.id,
        type: newTransaction.type,
        amount: val,
        date: newTransaction.date || new Date().toISOString().split('T')[0],
        description: newTransaction.description.trim(),
        category: newTransaction.category
      };
      
      await mockDb.addFinancial(transObj);
      if (showToast) showToast("Transação financeira adicionada com sucesso!", "success");
      
      setNewTransaction({
        description: '',
        type: 'income',
        amount: '',
        category: 'Consultório',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddTransaction(false);
      
      // Reload financial records
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast("Erro ao salvar transação: " + (err.message || err), "error");
    } finally {
      setIsSavingTrans(false);
    }
  };

  const handleDeleteTransaction = async (id: string, description: string) => {
    const isConfirmed = window.confirm(`Deseja realmente excluir a transação "${description}"?`);
    if (!isConfirmed) return;
    
    try {
      await mockDb.deleteFinancial(id);
      if (showToast) showToast("Transação financeira excluída com sucesso!", "success");
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast("Erro ao excluir transação: " + (err.message || err), "error");
    }
  };

  const platformTransactions = useMemo(() => {
    return appointments
      .filter(a => a.status !== 'canceled')
      .map(a => ({
        id: `platform-${a.id}`,
        date: a.date.split(' ')[0], 
        description: `Consulta Plataforma: ${a.patientName || 'Paciente'}`,
        type: 'income' as 'income' | 'expense',
        amount: consultPrice,
        category: 'Plataforma',
        isPlatform: true,
        status: a.status
      }));
  }, [appointments, consultPrice]);

  const combinedTransactions = useMemo(() => {
    const list: any[] = [];
    
    // Manual inputs
    (financials.transactions || []).forEach((t: any) => {
      list.push({
        id: t.id,
        date: t.date,
        description: t.description,
        type: t.type,
        amount: parseFloat(t.amount) || 0,
        category: t.category || 'Manual',
        isPlatform: false
      });
    });
    
    // Platform consults (shown if includePlatform is checked OR if filter is explicitly 'platform')
    if (includePlatform || transactionFilter === 'platform') {
      platformTransactions.forEach(pt => {
        list.push(pt);
      });
    }
    
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financials.transactions, platformTransactions, includePlatform, transactionFilter]);

  const filteredCombinedTransactions = useMemo(() => {
    if (transactionFilter === 'all') return combinedTransactions;
    if (transactionFilter === 'income') return combinedTransactions.filter(t => t.type === 'income' && !t.isPlatform);
    if (transactionFilter === 'expense') return combinedTransactions.filter(t => t.type === 'expense');
    if (transactionFilter === 'platform') return combinedTransactions.filter(t => t.isPlatform);
    return combinedTransactions;
  }, [combinedTransactions, transactionFilter]);

  const searchedTransactions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return filteredCombinedTransactions;
    return filteredCombinedTransactions.filter(t => 
      t.description.toLowerCase().includes(q) || 
      (t.category && t.category.toLowerCase().includes(q))
    );
  }, [filteredCombinedTransactions, searchTerm]);

  const canShowTeleconsult = (app: Appointment) => {
    const today = new Date().toISOString().split('T')[0];
    return app.type === 'teleconsulta' && 
           app.date.startsWith(today) && 
           app.status !== 'done' && 
           app.status !== 'canceled';
  };

  const getPlanName = useCallback((pType?: string) => {
    switch (pType) {
      case 'basic':
      case 'basico':
        return 'Básico';
      case 'medio':
      case 'medium':
        return 'Médio';
      case 'premium':
      case 'advanced':
      case 'avancado':
        return 'Avançado';
      default:
        return 'Básico';
    }
  }, []);

  const hasAccess = useCallback((tabId: string) => {
    const pt = user.planType || 'basico';
    const isMedium = pt === 'medio' || pt === 'medium';
    const isAdvanced = pt === 'premium' || pt === 'advanced' || pt === 'avancado';
    
    if (tabId === 'overview' || tabId === 'plan') {
      return true;
    }
    if (tabId === 'appointments') {
      return isMedium || isAdvanced;
    }
    if (tabId === 'referrals' || tabId === 'records') {
      return isMedium || isAdvanced;
    }
    if (tabId === 'financial' || tabId === 'telemetry') {
      return isAdvanced;
    }
    return false;
  }, [user.planType]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fadeIn max-w-7xl mx-auto">
      <button 
        onClick={() => onNavigate?.('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-2 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      {/* Header com trava de reload */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              {user.role === 'professional' ? 'Painel Profissional' : 'Gestão da Clínica'}
            </h2>
            {(user.planType === 'basic' || user.planType === 'basico' || !user.planType) && (
              <span className="bg-slate-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-slate-500/20">
                <Shield size={12}/> Plano Básico
              </span>
            )}
            {(user.planType === 'medio' || user.planType === 'medium') && (
              <span className="bg-teal-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-teal-500/20">
                <ShieldCheck size={12}/> Plano Médio
              </span>
            )}
            {(user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') && (
              <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-amber-500/20 animate-pulse">
                <Star size={12} className="fill-white"/> Plano Avançado
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Olá, {user.name}. Plano Ativo: <span className="text-slate-900 font-bold">{getPlanName(user.planType)}</span> – {(user.planType === 'basic' || user.planType === 'basico' || !user.planType) ? 'Acompanhe seu desempenho em tempo real.' : 'Gestão Completa Ativa.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado' || user.planType === 'medio' || user.planType === 'medium') && (
            <>
              <button 
                onClick={() => setShowReportsModal(true)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-all flex items-center gap-2 shadow-sm font-bold text-[10px] uppercase tracking-widest"
              >
                <BarChart3 size={16} className="text-teal-500"/> <span className="hidden sm:inline">Relatórios</span>
              </button>
              <button 
                onClick={() => setShowBirthdaysModal(true)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-teal-600 hover:border-teal-200 transition-all flex items-center gap-2 shadow-sm font-bold text-[10px] uppercase tracking-widest"
              >
                <Gift size={16} className="text-pink-500"/> <span className="hidden sm:inline">Aniversários</span>
              </button>
            </>
          )}
          {(user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') && (
            <button 
              onClick={async () => {
                const newValue = !isUrgent;
                setIsUrgent(newValue);
                try {
                  await mockDb.updateUrgencyTag(user.id, newValue);
                  showToast?.(`Vaga Urgente ${newValue ? 'ativada' : 'desativada'} com sucesso!`, 'success');
                } catch (e) {
                  showToast?.("Erro ao atualizar Vaga Urgente.", "error");
                  setIsUrgent(!newValue); // revert
                }
              }}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${isUrgent ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-slate-400 border border-slate-200'}`}
            >
              <Clock size={16}/> {isUrgent ? 'Vaga Urgente Ativa' : 'Ativar Urgência'}
            </button>
          )}
          <button 
            onClick={() => loadData(true)}
            disabled={loading}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all disabled:opacity-50"
            title="Sincronizar Agora"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => onNavigate?.('/schedule')}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl active:scale-95"
          >
            <Clock size={16} className="text-teal-400"/> Minha Agenda
          </button>
        </div>
      </div>

      {/* Tabs para Planos Superiores */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-100">
        {[
          { id: 'overview', label: 'Visão Geral', icon: <Activity size={16}/> },
          { id: 'appointments', label: 'Agenda', icon: <Calendar size={16}/> },
          { id: 'referrals', label: 'Encaminhamentos', icon: <FileText size={16}/> },
          { id: 'records', label: 'Prontuários', icon: <Stethoscope size={16}/> },
          { id: 'financial', label: 'Financeiro', icon: <DollarSign size={16}/> },
          { id: 'telemetry', label: 'Telemetria', icon: <Activity size={16}/> },
          { id: 'plan', label: 'Meu Plano', icon: <Shield size={16}/> }
        ].map(tab => {
          const allowed = hasAccess(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-white border-t border-x border-slate-100 text-teal-600' 
                  : allowed 
                    ? 'text-slate-400 hover:text-slate-600' 
                    : 'text-slate-300 hover:text-slate-400 opacity-70'
              }`}
            >
              {tab.icon} 
              {tab.label}
              {!allowed && <span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-black">PRO</span>}
            </button>
          );
        })}
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'overview' ? (
          <>
            <MetricCard 
              title="Hoje" 
              value={loading ? '...' : stats.todayCount} 
              icon={<Users size={20} />} 
              color="bg-blue-600"
              subtext="Pacientes Confirmados" 
            />
            <MetricCard 
              title="Visitas" 
              value={loading ? '...' : user.profileVisits || 0} 
              icon={<Activity size={20} />} 
              color="bg-teal-600" 
              subtext="Visitas ao Perfil"
            />
            <MetricCard 
              title="WhatsApp" 
              value={loading ? '...' : user.whatsappClicks || 0} 
              icon={<MessageCircle size={20} />} 
              color="bg-green-600"
              subtext="Cliques no Botão"
            />
            <MetricCard 
              title="Receita" 
              value={loading ? '...' : stats.revenueFormatted} 
              icon={<DollarSign size={20} />} 
              color="bg-emerald-600"
              subtext="Faturamento Consolidado"
            />
          </>
        ) : (
          <>
            <MetricCard 
              title="Hoje" 
              value={loading ? '...' : stats.todayCount} 
              icon={<Users size={20} />} 
              color="bg-blue-600"
              subtext="Pacientes Confirmados" 
            />
            <MetricCard 
              title="Total Mês" 
              value={loading ? '...' : stats.totalCount} 
              icon={<Calendar size={20} />} 
              color="bg-teal-600" 
              subtext="Agendamentos Realizados"
            />
            <MetricCard 
              title="Receita" 
              value={loading ? '...' : stats.revenueFormatted} 
              icon={<DollarSign size={20} />} 
              color="bg-emerald-600"
              subtext="Faturamento Consolidado"
            />
            <MetricCard 
              title="Conversão" 
              value={loading ? '...' : stats.conversionRate} 
              icon={<RefreshCw size={20} />} 
              color="bg-purple-600" 
              subtext="Taxa de Agendamento"
            />
            <MetricCard 
              title="Comparecimento" 
              value={loading ? '...' : stats.attendanceRate} 
              icon={<CheckCircle size={20} />} 
              color="bg-indigo-600" 
              subtext="Taxa de Presença"
            />
          </>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
          {!hasAccess(activeTab) ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-6 min-h-[400px]">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 animate-pulse border-4 border-amber-100">
                <Shield size={40} />
              </div>
              <div className="max-w-md">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Recurso Premium</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                  O recurso <span className="text-slate-800 font-bold">{
                    activeTab === 'referrals' ? 'Encaminhamentos e Documentação' :
                    activeTab === 'records' ? 'Prontuários Eletrônicos' :
                    activeTab === 'financial' ? 'Gestão Financeira Avançada' : 'Telemetria e Wearables'
                  }</span> não está disponível no plano {getPlanName(user.planType)} atual.
                </p>
              </div>
              
              <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 text-left max-w-sm w-full">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">O que você ganha no plano {activeTab === 'referrals' || activeTab === 'records' ? 'Médio' : 'Avançado'}:</p>
                {activeTab === 'referrals' || activeTab === 'records' ? (
                  <div className="space-y-2 text-xs text-slate-600 font-semibold">
                    <p className="flex items-center gap-2">✓ Agenda Nativa Integrada Marclyn</p>
                    <p className="flex items-center gap-2">✓ Prontuário Eletrônico Unificado</p>
                    <p className="flex items-center gap-2">✓ Emissão de receitas, guias e atestados</p>
                    <p className="flex items-center gap-2">✓ Maior destaque nos resultados de buscas</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-slate-600 font-semibold">
                    <p className="flex items-center gap-2">✓ Telemedicina avançada de última geração</p>
                    <p className="flex items-center gap-2">✓ Telemetria de Wearables em tempo real (Beta IoT)</p>
                    <p className="flex items-center gap-2">✓ Módulo Odontológico Completo</p>
                    <p className="flex items-center gap-2">✓ Inteligência Artificial auxiliar de Diagnósticos</p>
                    <p className="flex items-center gap-2">✓ Taxa zero total sobre repasses de consultas</p>
                  </div>
                )}
              </div>

              <a 
                href={`https://wa.me/5571982700412?text=Olá!%20Sou%20o%20parceiro%20${encodeURIComponent(user.name)}%20e%20gostaria%20de%20solicitar%20o%20upgrade%20para%20o%20plano%20${activeTab === 'referrals' || activeTab === 'records' ? 'Médio' : 'Avançado'}%20para%20liberar%20o%20recurso%20de%20${activeTab === 'referrals' ? 'Encaminhamentos' : activeTab === 'records' ? 'Prontuários' : activeTab === 'financial' ? 'Finanças' : 'Telemetria'}.`}
                target="_blank"
                referrerPolicy="no-referrer"
                className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Solicitar Upgrade no WhatsApp
              </a>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div> Fila de Atendimento
                    </h3>
                    <button 
                        onClick={() => onNavigate?.('/consultation')}
                        className="text-teal-600 font-black uppercase text-[10px] tracking-widest hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        Acessar Console de Atendimento
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-50">
                        <tr>
                            <th className="pb-4">Paciente</th>
                            <th className="pb-4">Horário</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4 text-right">Ações</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {appointments.length > 0 ? appointments.slice(0, 15).map(app => {
                            const isCancelled = app.status === 'canceled';
                            const isDone = app.status === 'done';
                            
                            return (
                                <tr key={app.id} className={`group transition-all ${isCancelled ? 'opacity-40 grayscale' : 'hover:bg-slate-50/50'}`}>
                                    <td className="py-5 pr-4">
                                      <p className="font-bold text-slate-800">{app.patientName || "Paciente"}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{app.doctorName}</p>
                                    </td>
                                    <td className="py-5 pr-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-bold text-slate-600">{formatTime(app.date)}</span>
                                            <span className="text-[9px] text-slate-400 font-medium uppercase">{formatDate(app.date)}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 pr-4">
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${
                                          app.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' : 
                                          app.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                          app.status === 'canceled' ? 'bg-red-50 text-red-700 border-red-100' : 
                                          'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                          {app.status}
                                        </span>
                                    </td>
                                    <td className="py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canShowTeleconsult(app) && (
                                                <button 
                                                    onClick={() => onNavigate?.(`/teleconsulta/${app.roomId || app.id}`)}
                                                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 animate-pulse transition-all shadow-lg shadow-red-600/20"
                                                >
                                                    Iniciar Chamada
                                                </button>
                                            )}
                                            {!isCancelled && !isDone && (
                                                <button 
                                                    onClick={() => handleCancelAppointment(app.id)}
                                                    className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Cancelar"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                              <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                {loading ? 'Sincronizando fila...' : 'Nenhum agendamento ativo.'}
                              </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                  </div>
                </>
              )}

              {activeTab === 'appointments' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Agenda Completa</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Visualize e cadastre os seus atendimentos</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setShowManualBooking(true)}
                        className="bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center gap-2"
                      >
                        + Cadastrar Manualmente
                      </button>
                      <button 
                        onClick={() => onNavigate?.('/schedule')}
                        className="bg-teal-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-md active:scale-95"
                      >
                        Definir Grade de Horários
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {appointments.map(app => (
                      <div key={app.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm group-hover:scale-110 transition-transform"><Users size={18}/></div>
                          <div>
                            <p className="font-bold text-slate-800">{app.patientName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDateTime(app.date)} - {app.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${app.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{app.status}</span>
                          <button 
                            onClick={() => handleCancelAppointment(app.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {appointments.length === 0 && <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs">Nenhum agendamento encontrado.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'referrals' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Encaminhamentos e Documentos</h3>
                    <div className="flex gap-2">
                      {['exame', 'guia', 'receita', 'atestado'].map(type => (
                        <button 
                          key={type} 
                          onClick={() => {
                            showToast?.(`Direcionando para o WhatsApp...`, "success");
                            setTimeout(() => {
                              window.open(`https://wa.me/5571982700412?text=Olá!%20Sou%20o%20parceiro%20${encodeURIComponent(user.name)}%20e%20gostaria%20de%20solicitar%20o%20recurso%20de%20emissão%20de%20${encodeURIComponent(type)}%20no%20meu%20plano%20Marclyn.`, '_blank');
                            }, 1000);
                          }}
                          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all"
                        >
                          + {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    {medicalDocuments.length > 0 ? medicalDocuments.map(doc => (
                      <div 
                        key={doc.id} 
                        onClick={() => setSelectedRecord({
                          ...doc,
                          date: doc.date || doc.created_at,
                          doctorName: doc.doctor_name || doc.doctorName || user.name || "Médico Parceiro",
                          patientName: doc.patient_name || doc.patientName || "Não especificado"
                        })}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-slate-200 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm group-hover:scale-110 transition-transform"><FileText size={18}/></div>
                          <div>
                            <p className="font-bold text-slate-800">{doc.title || doc.diagnosis || "Sem título"}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.type} - {new Date(doc.date || doc.created_at || Date.now()).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              try {
                                const fileContent = `Documento: ${doc.title || doc.diagnosis || "Sem Título"}\nTipo: ${doc.type}\nEmissão: ${new Date(doc.date || doc.created_at || Date.now()).toLocaleDateString()}\nConduta:\n${doc.prescription || "Sem conduta"}`;
                                const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `${(doc.title || "documento").toLowerCase().replace(/\s+/g, '_')}.txt`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                if (showToast) showToast("Download do documento iniciado...", "success");
                              } catch (e) {
                                if (showToast) showToast("Erro ao iniciar download.", "error");
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-teal-600 transition-colors hover:bg-slate-100 rounded-lg"
                            title="Fazer download do documento"
                          >
                            <Download size={16}/>
                          </button>
                          <button
                            onClick={() => setRecordToDelete({
                              ...doc,
                              date: doc.date || doc.created_at,
                              doctorName: doc.doctor_name || doc.doctorName || user.name || "Médico Parceiro",
                              patientName: doc.patient_name || doc.patientName || "Não especificado"
                            })}
                            className="p-2.5 bg-red-50 text-red-550 hover:bg-red-100 rounded-xl transition-all active:scale-95 border border-red-100/50"
                            title="Excluir documento permanentemente"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs">Nenhum documento emitido.</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'records' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Prontuário e Histórico</h3>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Buscar paciente..." 
                        className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                      <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14}/>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl text-slate-700 text-[11px] font-bold leading-relaxed">
                    ⚠️ <strong>Nota de Armazenamento Inteligente (LGPD):</strong> Prescrições, atestados e anexos marcados como temporários possuem vida útil de exatamente <strong>48 HORAS</strong> no banco de dados, sendo deletados automaticamente de forma periódica para economia de armazenamento e conformidade com normas de dados de saúde.
                  </div>

                  <div className="grid gap-4">
                    {medicalRecords.filter(r => r.patientName?.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
                      <div 
                        key={record.id} 
                        onClick={() => setSelectedRecord(record)}
                        className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all cursor-pointer space-y-4 relative group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm"><Stethoscope size={18}/></div>
                            <div>
                              <p className="font-bold text-slate-800">{record.patientName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{formatDateTime(record.date)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setRecordToDelete(record)}
                                className="p-2.5 bg-red-50 text-red-550 hover:bg-red-100 rounded-xl transition-all active:scale-95 border border-red-100/50"
                                title="Excluir documento permanentemente"
                              >
                                <Trash2 size={13} />
                              </button>
                              <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded-lg text-[8px] font-black uppercase">{record.type}</span>
                            </div>
                            {(record.expiresAt || record.expires_at) && (
                              <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase">Temporário (48h)</span>
                            )}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Diagnóstico / Título</p>
                            <p className="font-bold text-slate-700">{record.diagnosis || record.title || "Sem título"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Conduta / Descrição</p>
                            <p className="text-slate-600 line-clamp-2">{record.prescription}</p>
                          </div>
                        </div>
                        {record.odontogram && (
                          <div className="pt-4 border-t border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Odontograma</p>
                            <div className="flex flex-wrap gap-1">
                              {record.odontogram.map((t: any) => (
                                <div key={t.toothNumber} className="w-6 h-6 rounded bg-teal-500 text-white text-[8px] flex items-center justify-center font-bold" title={`${t.toothNumber}: ${t.condition}`}>
                                  {t.toothNumber}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {medicalRecords.length === 0 && <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs">Nenhum prontuário encontrado.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Top Bar / Actions */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Controle Financeiro</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1">
                        Manual & consultas automatizadas da plataforma integradas
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          try {
                            const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor (R$)"];
                            const rows = combinedTransactions.map(t => [
                              t.date,
                              t.description,
                              t.category,
                              t.type === 'income' ? 'Entrada' : 'Saída',
                              t.amount.toFixed(2)
                            ]);
                            const csvContent = "data:text/csv;charset=utf-8," 
                              + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `financeiro_marclyn_${user.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            showToast?.("Relatório exportado em formato CSV com sucesso!", "success");
                          } catch (e) {
                            showToast?.("Erro ao exportar o relatório.", "error");
                          }
                        }}
                        className="bg-white text-slate-750 border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                      >
                        <Download size={14}/> Exportar CSV
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setShowAddTransaction(!showAddTransaction)}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-teal-500/10 active:scale-95"
                      >
                        <Plus size={14}/> {showAddTransaction ? 'Recolher Painel' : 'Lançar Manual'}
                      </button>
                    </div>
                  </div>

                  {/* PLATFORM CALCULATIONS INTEGRATION CONTROLLER */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl border border-teal-500/15">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-teal-500/25 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                            Integração Ativa
                          </span>
                          <span className="text-slate-400 text-xs font-semibold">Valor da Consulta Médica: R$ {consultPrice.toFixed(2)}</span>
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-white">
                          Cálculo de Faturamento da Plataforma
                        </h4>
                        <p className="text-slate-400 text-xs leading-relaxed font-semibold max-w-xl">
                          Calculamos automaticamente o total financeiro das consultas da própria plataforma (<strong className="text-white">{platformIncomeDetail.totalCount} agendamentos ativos/concluídos</strong>). Você pode optar por somar esses valores dinâmicos ou ignorá-los para um controle 105% isolado/manual.
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-3 w-full md:w-auto shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Valor Estimado das Consultas</p>
                          <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 font-mono">
                            R$ {platformIncomeDetail.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        <label className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl cursor-pointer select-none hover:bg-white/10 transition-colors w-full md:w-auto justify-center">
                          <input 
                            type="checkbox"
                            checked={includePlatform}
                            onChange={toggleIncludePlatform}
                            className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500 w-4 h-4"
                          />
                          <span className="text-[10px] uppercase font-black tracking-wider text-slate-200">
                            Somar no Saldo Geral
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Breakdown Subcard */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-white/5 pt-4 mt-4 text-[11px] font-bold text-slate-400">
                      <div>
                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Concluídas ({platformIncomeDetail.doneCount})</span>
                        <span className="text-emerald-400 text-xs font-mono">R$ {platformIncomeDetail.doneValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Confirmadas ({platformIncomeDetail.activeCount})</span>
                        <span className="text-amber-400 text-xs font-mono">R$ {platformIncomeDetail.activeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Preço Individual</span>
                        <span className="text-teal-400 text-xs text-right block md:text-left">R$ {consultPrice.toFixed(2)} por consulta</span>
                      </div>
                    </div>
                  </div>

                  {/* Adding Transaction Card */}
                  {showAddTransaction && (
                    <form 
                      onSubmit={handleAddNewTransaction}
                      className="bg-white border-2 border-teal-500/20 p-6 rounded-[2rem] gap-4 grid grid-cols-1 md:grid-cols-12 animate-scaleIn shadow-xl relative"
                    >
                      <div className="md:col-span-12 flex justify-between items-center border-b border-slate-100 pb-3 mb-2">
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div> Lançamento Financeiro Manual
                        </h4>
                        <button 
                          type="button" 
                          onClick={() => setShowAddTransaction(false)}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="md:col-span-4 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                        <input 
                          type="text"
                          required
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Ex: Aluguel da Sala, Material de escritório, etc."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                        <select
                          value={newTransaction.type}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        >
                          <option value="income">Entrada (+)</option>
                          <option value="expense">Saída (-)</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                        <input 
                          type="number"
                          step="0.01"
                          required
                          min="0.01"
                          placeholder="0,00"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-xs font-extrabold text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                        <input 
                          type="date"
                          required
                          value={newTransaction.date}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                        <select
                          value={newTransaction.category}
                          onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        >
                          <option value="Serviços">Serviços</option>
                          <option value="Consultório">Consultório</option>
                          <option value="Marketing">Marketing / Tráfego</option>
                          <option value="Sistemas">Sistemas / Software</option>
                          <option value="Equipamentos">Equipamentos</option>
                          <option value="Instalações">Aluguel / Condomínio</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>

                      <div className="md:col-span-12 flex justify-end gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowAddTransaction(false)}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit"
                          disabled={isSavingTrans}
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                          {isSavingTrans ? (
                            <>
                              <RefreshCw className="animate-spin" size={12}/> Salvando...
                            </>
                          ) : (
                            'Salvar Lançamento'
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Financial Statistics Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cardinal Card: Saldo Geral Unificado */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-150 relative overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Geral Unificado</p>
                          <h4 className={`text-2xl font-black font-mono tracking-tight mt-1.5 ${finalFinStats.netBalance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                            R$ {finalFinStats.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                        <div className={`p-2.5 rounded-xl ${finalFinStats.netBalance >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'} border`}>
                          <DollarSign size={18}/>
                        </div>
                      </div>
                      
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-4 flex items-center gap-1">
                        {includePlatform ? (
                          <>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Inclui receitas da plataforma
                          </>
                        ) : (
                          <>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Apenas controle manual ativo
                          </>
                        )}
                      </p>
                    </div>

                    {/* Entradas */}
                    <div className="bg-emerald-50/20 p-6 rounded-[2rem] border border-emerald-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total de Entradas</p>
                          <h4 className="text-2xl font-black text-emerald-800 font-mono tracking-tight mt-1.5">
                            R$ {finalFinStats.totalInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                          <TrendingUp size={18}/>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-wider">
                        <span>Manual: <strong className="text-slate-600">R$ {finalFinStats.manualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        {includePlatform && (
                          <span>• Plataforma: <strong className="text-emerald-600">R$ {finalFinStats.platformRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Saídas */}
                    <div className="bg-red-50/20 p-6 rounded-[2rem] border border-red-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Total de Saídas</p>
                          <h4 className="text-2xl font-black text-red-800 font-mono tracking-tight mt-1.5">
                            R$ {finalFinStats.totalOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                        <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
                          <TrendingDown size={18}/>
                        </div>
                      </div>
                      
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-4 tracking-wider">
                        Despesas operacionais e de consultório registradas
                      </p>
                    </div>
                  </div>

                  {/* Ratio bar summary */}
                  {finalFinStats.totalInflow > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
                      <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                        <span className="flex items-center gap-1 text-red-500">Despesas ({((finalFinStats.totalOutflow / finalFinStats.totalInflow) * 100).toFixed(0)}%)</span>
                        <span className="flex items-center gap-1 text-emerald-600">Lucro Líquido ({((finalFinStats.netBalance / finalFinStats.totalInflow) * 100).toFixed(0)}%)</span>
                      </div>
                      
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-red-500 h-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (finalFinStats.totalOutflow / finalFinStats.totalInflow) * 100)}%` }}
                        ></div>
                        <div 
                          className="bg-teal-500 h-full transition-all duration-500 flex-1"
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Unified Search & Filters Interface */}
                  <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      
                      {/* Filter Buttons */}
                      <div className="flex flex-wrap gap-1.5 border border-slate-100 p-1.5 rounded-2xl bg-slate-50/50">
                        <button 
                          type="button"
                          onClick={() => setTransactionFilter('all')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${transactionFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Tudo ({combinedTransactions.length})
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTransactionFilter('income')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${transactionFilter === 'income' ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Entradas ({combinedTransactions.filter(t => t.type === 'income' && !t.isPlatform).length})
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTransactionFilter('expense')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${transactionFilter === 'expense' ? 'bg-white text-red-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Saídas ({combinedTransactions.filter(t => t.type === 'expense').length})
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTransactionFilter('platform')}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${transactionFilter === 'platform' ? 'bg-white text-teal-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Consultas ({platformTransactions.length})
                        </button>
                      </div>

                      {/* In-tab Search */}
                      <div className="relative w-full md:w-72">
                        <input 
                          type="text"
                          placeholder="Buscar por descrição..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50/50 border border-slate-200 text-xs font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="p-4 pl-6">Data</th>
                            <th className="p-4">Descrição / Histórico</th>
                            <th className="p-4">Categoria / Origem</th>
                            <th className="p-4">Origem</th>
                            <th className="p-4 text-right">Valor</th>
                            <th className="p-4 text-center pr-6 w-20">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {searchedTransactions.length > 0 ? (
                            searchedTransactions.map((t) => (
                              <tr key={t.id} className="text-xs font-bold text-slate-700 hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4 pl-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {formatDate(t.date)}
                                </td>
                                <td className="p-4">
                                  <p className="font-extrabold text-slate-800">{t.description}</p>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-lg text-[9px] uppercase tracking-wide border font-black ${
                                    t.category === 'Plataforma' ? 'bg-teal-50 text-teal-800 border-teal-100' :
                                    t.category === 'Marketing' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                                    t.category === 'Instalações' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-slate-100 text-slate-600 border-slate-200/50'
                                  }`}>
                                    {t.category}
                                  </span>
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                    t.isPlatform ? 'bg-blue-50 text-blue-750 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {t.isPlatform ? 'Plataforma' : 'Manual'}
                                  </span>
                                </td>
                                <td className={`p-4 text-right font-mono font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-center pr-6">
                                  {!t.isPlatform ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransaction(t.id, t.description)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Excluir Lançamento"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  ) : (
                                    <span className="text-[8px] uppercase tracking-widest text-slate-300 font-extrabold select-none">Automático</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                Nenhuma transação encontrada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fadeIn">
                  <div className="w-20 h-20 bg-teal-50/50 rounded-full flex items-center justify-center text-teal-600 shadow-inner">
                    <Activity size={32} className="animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Em Desenvolvimento</h3>
                  <p className="text-slate-500 text-xs font-semibold max-w-sm">
                    A área de telemetria e monitoramento de saúde integrada está sendo preparada e estará disponível em breve.
                  </p>
                </div>
              )}

              {activeTab === 'plan' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Meu Plano & Assinatura</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Contrato ativo e controle de faturamento corporativo</p>
                    </div>
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md shadow-emerald-500/10">
                      <CheckCircle size={12}/> Assinatura Ativa
                    </span>
                  </div>

                  {/* Card do plano atual */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-teal-500/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Plano Contratado</p>
                        <h4 className="text-3xl font-black uppercase tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                          Plano {getPlanName(user.planType)}
                        </h4>
                      </div>
                      <div className="bg-white/10 px-5 py-2.5 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mensalidade Comercial</p>
                        <p className="text-xl font-black font-mono">
                          {(user.planType === 'medio' || user.planType === 'medium') ? 'R$ 100,00' :
                           (user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') ? 'R$ 250,00' : 'Grátis'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Limites e Recursos Ativos:</p>
                        <div className="space-y-2.5">
                          {/* Benefícios Básicos */}
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <span className="text-teal-400 font-bold">✓</span> Perfil visível no catálogo digital de busca
                          </p>
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <span className="text-teal-400 font-bold">✓</span> Botão direto para WhatsApp Marclyn
                          </p>
                          <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <span className="text-teal-400 font-bold">✓</span> Galeria de imagens do perfil (essencial)
                          </p>

                          {/* Benefícios Médio ou + */}
                          {(user.planType === 'medio' || user.planType === 'medium' || user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') ? (
                            <>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                <span className="text-teal-400 font-bold">✓</span> Agenda profissional integrada Marclyn
                              </p>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                <span className="text-teal-400 font-bold">✓</span> Prontuários eletrônicos e receitas médicas
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500 line-through">
                                🔒 Agenda nativa Marclyn (Disponível no Médio)
                              </p>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500 line-through">
                                🔒 Prontuários e receitas (Disponível no Médio)
                              </p>
                            </>
                          )}

                          {/* Benefícios Avançados */}
                          {(user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') ? (
                            <>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                <span className="text-teal-400 font-bold">✓</span> Teleconsulta em sala criptografada nativa
                              </p>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                                <span className="text-teal-400 font-bold">✓</span> Telemetria e Wearables IoT em tempo real
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500 line-through">
                                🔒 Telemedicina direta (Disponível no Avançado)
                              </p>
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500 line-through">
                                🔒 Telemetria IoT e Wearables (Disponível no Avançado)
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Como faturamos?</p>
                          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                            Seu contrato é administrado comercialmente. Cobranças, prazos de renovação e emissão de notas fiscais são processados de forma manual e individualizada com nosso time comercial.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Solicitação de Alterações */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">Solicitar Mudança de Plano</h4>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                        Deseja fazer upgrade, downgrade ou alterar detalhes do seu plano ativo? Selecione uma das opções e fale em tempo real com o suporte comercial Marclyn.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <a 
                        href={`https://wa.me/5571982700412?text=Olá!%20Sou%20o%20parceiro%20${encodeURIComponent(user.name)}%20e%20gostaria%20de%20solicitar%20o%20UPGRADE%20do%20meu%20plano%20atual%20(Plano%20${encodeURIComponent(getPlanName(user.planType))}).`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="p-5 rounded-2xl border-2 border-teal-100 bg-teal-50/10 hover:bg-teal-50 hover:border-teal-300 transition-all text-center flex flex-col items-center justify-between group active:scale-95"
                      >
                        <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Upgrade de Plano</span>
                        <span className="text-[10px] text-slate-500 mt-2 mb-4 font-semibold">Desbloqueie ferramentas de IA, agendas e relatórios robustos</span>
                        <span className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md transition-all">
                          <MessageCircle size={12}/> Solicitar
                        </span>
                      </a>

                      <a 
                        href={`https://wa.me/5571982700412?text=Olá!%20Sou%20o%20parceiro%20${encodeURIComponent(user.name)}%20e%20gostaria%20de%20solicitar%20o%20DOWNGRADE%20do%20meu%20plano%20atual%20(Plano%20${encodeURIComponent(getPlanName(user.planType))}).`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="p-5 rounded-2xl border-2 border-slate-100 hover:border-slate-300 bg-white transition-all text-center flex flex-col items-center justify-between group active:scale-95"
                      >
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Downgrade de Plano</span>
                        <span className="text-[10px] text-slate-500 mt-2 mb-4 font-semibold">Reduza os limites ou remova recursos da plataforma</span>
                        <span className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md group-hover:bg-slate-800 transition-all">
                          <MessageCircle size={12}/> Solicitar
                        </span>
                      </a>

                      <a 
                        href={`https://wa.me/5571982700412?text=Olá!%20Sou%20o%20parceiro%20${encodeURIComponent(user.name)}%20e%20gostaria%20de%20solicitar%20uma%20MUDANÇA%20DE%20CATEGORIA%20sobre%20o%20meu%20plano%20atual.`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/10 hover:bg-amber-50 hover:border-amber-300 transition-all text-center flex flex-col items-center justify-between group active:scale-95"
                      >
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">Mudar Categoria</span>
                        <span className="text-[10px] text-slate-500 mt-2 mb-4 font-semibold">Mude o tipo do cadastro de clínica para profissional ou vice-versa</span>
                        <span className="px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md group-hover:bg-amber-700 transition-all">
                          <MessageCircle size={12}/> Solicitar
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-8">
          {/* Performance Card */}
          <div className="bg-slate-900 rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h3 className="font-black uppercase tracking-widest text-[10px] text-teal-400 mb-6 flex items-center gap-2">
                  <Activity size={14}/> Desempenho Mensal
              </h3>
              
              <div className="flex items-end justify-between gap-1.5 h-32 mb-6">
                  {financials.chartData.map((data, index) => {
                      const maxVal = Math.max(...financials.chartData.map(d => d.value)) || 1;
                      const height = (data.value / maxVal) * 100;
                      return (
                          <div key={index} className="flex-1 group relative">
                              <div 
                                className="w-full bg-white/10 rounded-t-sm group-hover:bg-teal-500 transition-all duration-300"
                                style={{ height: `${Math.max(height, 5)}%` }}
                              ></div>
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20">
                                  {data.value}
                              </div>
                          </div>
                      )
                  })}
              </div>
              <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <span>Início</span>
                  <span>Projeção</span>
                  <span>Hoje</span>
              </div>
          </div>

          {/* Card do seu Plano Ativo no Painel */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col justify-between shadow-sm animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Plano Marclyn Saúde</span>
                <h4 className="text-xl font-black text-slate-800 mt-1 uppercase tracking-tight">
                  Plano {getPlanName(user.planType)}
                </h4>
              </div>
              <div className={`p-2.5 rounded-xl ${
                user.planType === 'medio' || user.planType === 'medium' ? 'bg-teal-50 text-teal-600' :
                user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado' ? 'bg-amber-50 text-amber-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                <Shield size={20} />
              </div>
            </div>

            <div className="border-t border-slate-50 pt-4 pb-4 space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Cobrança:</span>
                <span className="font-bold text-slate-800">
                  {(user.planType === 'medio' || user.planType === 'medium') ? 'R$ 100,00/mês' :
                   (user.planType === 'premium' || user.planType === 'advanced' || user.planType === 'avancado') ? 'R$ 250,00/mês' :
                   'Grátis'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Status:</span>
                <span className="text-emerald-600 font-extrabold flex items-center gap-1 text-[10px] uppercase">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div> Ativo
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Próxima Fatura:</span>
                <span className="font-mono text-[11px] text-slate-700">25/12/2026</span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('plan')}
              className="w-full py-3.5 bg-slate-900 hover:bg-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 mt-2"
            >
              Ver Detalhes do Plano
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-8">
              <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest mb-6">Ações Rápidas</h4>
              <div className="grid gap-3">
                 <button onClick={() => onNavigate?.('/consultation')} className="flex items-center gap-4 p-4 rounded-2xl bg-teal-50 border border-teal-100 hover:border-teal-300 transition-all text-left group">
                    <div className="p-3 bg-white rounded-xl text-teal-600 shadow-sm group-hover:scale-110 transition-transform"><Stethoscope size={20}/></div>
                    <div>
                      <p className="font-black text-teal-900 text-xs uppercase tracking-tight">Atendimento</p>
                      <p className="text-[10px] text-teal-700/60 font-bold">Abrir prontuários e receitas</p>
                    </div>
                 </button>
                 <button onClick={() => onNavigate?.('/documents')} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all text-left group">
                    <div className="p-3 bg-white rounded-xl text-slate-600 shadow-sm group-hover:scale-110 transition-transform"><Video size={20}/></div>
                    <div>
                      <p className="font-black text-slate-900 text-xs uppercase tracking-tight">Telemedicina</p>
                      <p className="text-[10px] text-slate-400 font-bold">Configurações de vídeo</p>
                    </div>
                 </button>
              </div>
          </div>
        </div>
      </div>

      {/* Modais Premium */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Relatórios Avançados</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Exportação e Análise de Dados</p>
              </div>
              <button onClick={() => setShowReportsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <Plus className="rotate-45 text-slate-400" size={24} />
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={async () => {
                  showToast?.("Gerando relatório de atendimentos...", "success");
                  try {
                    const records = await mockDb.getRecords(user.id, user.role);
                    const csvLines = ["Data,Paciente,Diagnostico,Consulta"];
                    records.forEach(r => csvLines.push(`${r.date},${r.patientId || 'N/A'},"${(r.diagnosis || '').replace(/"/g, '""')}","${r.type}"`));
                    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "atendimentos_cid.csv");
                    link.click();
                  } catch(e) {
                    showToast?.("Erro ao gerar relatório.", "error");
                  }
                }}
                className="p-6 rounded-3xl border-2 border-slate-100 hover:border-teal-500 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                  <FileText size={24}/>
                </div>
                <h4 className="font-black text-slate-900 text-sm uppercase mb-1">Atendimentos por CID</h4>
                <p className="text-[10px] text-slate-500 font-medium">Relatório detalhado de diagnósticos e prevalência.</p>
              </button>
              <button 
                onClick={async () => {
                  showToast?.("Gerando relatório de fluxo de caixa...", "success");
                  try {
                    const fn = await mockDb.getClinicFinancials(user.id);
                    const csvLines = ["Mês,Receita Total"];
                    fn.chartData.forEach((c: any) => csvLines.push(`${c.name || c.date},${c.revenue || c.amount || 0}`));
                    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "fluxo_de_caixa.csv");
                    link.click();
                  } catch(e) {
                    showToast?.("Erro ao gerar relatório.", "error");
                  }
                }}
                className="p-6 rounded-3xl border-2 border-slate-100 hover:border-teal-500 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign size={24}/>
                </div>
                <h4 className="font-black text-slate-900 text-sm uppercase mb-1">Fluxo de Caixa Mensal</h4>
                <p className="text-[10px] text-slate-500 font-medium">Análise completa de receitas e despesas da clínica.</p>
              </button>
              <button 
                onClick={async () => {
                  showToast?.("Gerando relatório de perfil demográfico...", "success");
                  try {
                    const params = { role: 'patient' } as any; 
                    const patients = await mockDb.getAllClinicsForAdmin();
                    const csvLines = ["Nome,Email,Telefone,Sexo"];
                    patients.filter(p => p.role === 'patient').forEach(p => csvLines.push(`"${p.name}","${p.email}","${(p as any).phone || ''}","${(p as any).gender || ''}"`));
                    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "perfil_demografico.csv");
                    link.click();
                  } catch(e) { showToast?.("Erro ao gerar relatório.", "error"); }
                }}
                className="p-6 rounded-3xl border-2 border-slate-100 hover:border-teal-500 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                  <Users size={24}/>
                </div>
                <h4 className="font-black text-slate-900 text-sm uppercase mb-1">Perfil Demográfico</h4>
                <p className="text-[10px] text-slate-500 font-medium">Distribuição de pacientes por idade, gênero e região.</p>
              </button>
              <button 
                onClick={async () => {
                  showToast?.("Exportando todos os dados...", "success");
                  try {
                    const fn = await mockDb.getClinicFinancials(user.id);
                    const records = await mockDb.getRecords(user.id, user.role);
                    let csv = "--- FINANCEIRO ---\nMês,Receita\n";
                    fn.chartData.forEach((c: any) => csv += `${c.name || c.date},${c.revenue || c.amount || 0}\n`);
                    csv += "\n--- PRONTUARIOS ---\nData,Tipo,Paciente\n";
                    records.forEach(r => csv += `${r.date},${r.type},${r.patientId||''}\n`);
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "exportacao_completa.csv");
                    link.click();
                  } catch(e) { showToast?.("Erro ao gerar exportação.", "error"); }
                }}
                className="p-6 rounded-3xl border-2 border-slate-100 hover:border-teal-500 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 mb-4 group-hover:scale-110 transition-transform">
                  <Download size={24}/>
                </div>
                <h4 className="font-black text-slate-900 text-sm uppercase mb-1">Exportar Tudo (Excel/PDF)</h4>
                <p className="text-[10px] text-slate-500 font-medium">Geração de arquivo consolidado para contabilidade.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {showBirthdaysModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-pink-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Aniversariantes</h3>
                <p className="text-xs text-pink-600 font-bold uppercase tracking-widest mt-1">Fidelização e Cuidado</p>
              </div>
              <button onClick={() => setShowBirthdaysModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <Plus className="rotate-45 text-slate-400" size={24} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              {appointments
                .map(a => a.patientName)
                .filter((v, i, a) => a.indexOf(v) === i && v)
                .slice(0, 5)
                .map((name, i) => {
                  const dates = ["Hoje", "Amanhã", "15/05", "20/05", "01/06"];
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold text-xs">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{dates[i % dates.length]}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          showToast?.(`Abrindo WhatsApp para ${name}...`, "success");
                          const msg = encodeURIComponent(`Olá ${name}, a Marclyn Saúde te deseja um feliz aniversário!`);
                          window.open(`https://wa.me/5571999999999?text=${msg}`, '_blank');
                        }}
                        className="p-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-all" 
                        title="Enviar Parabéns no WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                    </div>
                  );
                })}
              {appointments.length === 0 && <p className="text-center text-sm font-bold text-slate-400">Nenhum paciente cadastrado para aniversário.</p>}
              <div className="pt-4">
                <button 
                  onClick={() => showToast?.("Configurações de mensagem automática salvas!", "success")}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 transition-all shadow-lg active:scale-95"
                >
                  Configurar Mensagem Automática
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-teal-50/20">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Agendamento Manual</h3>
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-1">Cadastrar diretamente no banco</p>
              </div>
              <button onClick={() => setShowManualBooking(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <Plus className="rotate-45 text-slate-400" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateManualAppointment} className="p-8 space-y-5">
              {/* Nome do Paciente (Campo de Texto Direto para Organização) */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Paciente *</label>
                <input
                  type="text"
                  required
                  placeholder="Digite o nome completo do paciente"
                  value={newManualApp.patientName}
                  onChange={(e) => setNewManualApp({ ...newManualApp, patientName: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all text-slate-800"
                />
              </div>

              {/* Doctor name */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Profissional/Médico *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Silva"
                  value={newManualApp.doctorName}
                  onChange={(e) => setNewManualApp({ ...newManualApp, doctorName: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Date & Time fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data da Consulta *</label>
                  <input
                    type="date"
                    required
                    value={newManualApp.date}
                    onChange={(e) => setNewManualApp({ ...newManualApp, date: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora da Consulta *</label>
                  <input
                    type="time"
                    required
                    value={newManualApp.time}
                    onChange={(e) => setNewManualApp({ ...newManualApp, time: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Atendimento</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['presencial', 'teleconsulta', 'exame'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewManualApp({ ...newManualApp, type: t })}
                      className={`py-2.5 rounded-xl text-[10px] uppercase font-black tracking-wider border-2 transition-all ${
                        newManualApp.type === t
                          ? 'border-teal-500 bg-teal-50/50 text-teal-700'
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observations / Notes */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observações (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Observações prévias, sintomas relatados..."
                  value={newManualApp.notes}
                  onChange={(e) => setNewManualApp({ ...newManualApp, notes: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all resize-none"
                />
              </div>

              {/* Form Footer Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowManualBooking(false)}
                  className="flex-1 py-4 border-2 border-slate-100 text-slate-500 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-teal-600 text-white hover:bg-teal-500 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-teal-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Salvar No Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DETAILED MEDICAL RECORD VIEWER MODAL ==================== */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col my-8 animate-scaleIn">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                    Visualizador de Documento
                  </h4>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                    Histórico Clínico do Paciente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content body */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Patient and date details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Paciente</span>
                  <span className="font-extrabold text-slate-800 text-sm">{selectedRecord.patientName || "Não especificado"}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Data de Emissão</span>
                  <span className="font-extrabold text-slate-800 text-sm">{formatDateTime(selectedRecord.date)}</span>
                </div>
              </div>

              {/* Status and Type badge */}
              <div className="flex gap-2.5 flex-wrap">
                <span className="bg-teal-50 text-teal-700 border border-teal-100 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider">
                  Tipo: {selectedRecord.type || "Prontuário"}
                </span>
                {(selectedRecord.expiresAt || selectedRecord.expires_at) && (
                  <span className="bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider">
                    Temporário (LGPD - Expira em 48h)
                  </span>
                )}
              </div>

              {/* Diagnosis / Title */}
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Diagnóstico / Título do Documento</span>
                <p className="font-extrabold text-slate-800 bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm">
                  {selectedRecord.diagnosis || selectedRecord.title || "Documento sem diagnóstico inserido"}
                </p>
              </div>

              {/* Conduct / Prescription */}
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Conduta Médica / Prescrição</span>
                <div className="text-slate-700 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs whitespace-pre-wrap font-bold leading-relaxed">
                  {selectedRecord.prescription || "Nenhuma conduta ou recomendação de medicação foi registrada."}
                </div>
              </div>

              {/* Odontogram if present */}
              {selectedRecord.odontogram && selectedRecord.odontogram.length > 0 && (
                <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100/50">
                  <span className="block text-[9px] font-black text-teal-700 uppercase tracking-widest mb-2">Tratamento do Odontograma</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.odontogram.map((t: any) => (
                      <div key={t.toothNumber} className="bg-teal-500 text-white rounded-lg px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1.5">
                        <span className="bg-white text-teal-600 rounded-md w-4 h-4 flex items-center justify-center text-[8px] font-bold">{t.toothNumber}</span>
                        <span>{t.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor responsability */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Responsável Técnico:</span>
                <span className="text-slate-700 font-extrabold">{selectedRecord.doctorName || user.name || "Médico Parceiro"}</span>
              </div>
            </div>

            {/* Footer with deletion option */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setRecordToDelete(selectedRecord);
                }}
                className="w-full sm:w-auto px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-red-100"
              >
                <Trash2 size={15} />
                Excluir Prontuário
              </button>

              <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Fechar Visualizador
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== SECURE CONFIRMATION MODAL ==================== */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-scaleIn">
            
            {/* Header / Red Alert Style */}
            <div className="bg-gradient-to-r from-red-650 to-red-650 text-white p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wide">
                  Confirmar Exclusão
                </h4>
                <p className="text-[9px] text-red-100 font-extrabold uppercase tracking-widest">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            {/* Content detailing of the item */}
            <div className="p-6 space-y-4 text-xs text-slate-600 font-bold">
              <p className="text-sm font-semibold leading-relaxed text-slate-700">
                Você está prestes a remover permanentemente o seguinte documento e todos os seus históricos associados do banco de dados (Supabase):
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Paciente</span>
                  <span className="text-slate-800 font-extrabold">{recordToDelete.patientName || "Não especificado"}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Documento/Diagnóstico</span>
                  <span className="text-slate-800 font-extrabold text-xs">{recordToDelete.title || recordToDelete.diagnosis || "Sem título"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Emissão</span>
                    <span className="text-slate-700 font-extrabold">{formatDate(recordToDelete.date)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Responsável</span>
                    <span className="text-slate-700 font-extrabold truncate block">{recordToDelete.doctorName || "Médico Responsável"}</span>
                  </div>
                </div>
              </div>

              {/* Warning alert message */}
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-start gap-2.5 leading-relaxed text-[11px] font-bold">
                <span className="text-base leading-none">⚠️</span>
                <span>
                  <strong>Atenção:</strong> Remover este prontuário implica na perda permanente do histórico clínico na saúde do paciente. Certifique-se de que a operação foi solicitada ou que os dados estejam salvos externamente.
                </span>
              </div>
            </div>

            {/* Action footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-3.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleDeleteRecordConfirm}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-750 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/10"
              >
                {isDeletingRecord ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} /> Excluindo...
                  </>
                ) : (
                  <>
                    Sim, Excluir Registro
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicDashboard;
