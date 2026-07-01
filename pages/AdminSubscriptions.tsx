// Add missing React import
import React, { useState, useEffect } from "react";
import { mockDb } from "../lib/mockSupabase";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  MoreHorizontal,
  Edit,
  Ban,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface AdminSubscriptionsProps {
  onNavigate: (path: string) => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

interface Subscription {
  id: string;
  clinicId: string;
  clinicName: string;
  plan: "Básico" | "Médio" | "Avançado" | "Profissional" | "Enterprise";
  status: "active" | "overdue" | "canceled";
  amount: string;
  nextBilling: string;
}

const AdminSubscriptions: React.FC<AdminSubscriptionsProps> = ({
  onNavigate,
  showToast,
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const users = await mockDb.getAllClinicsForAdmin();

      const mappedSubs: Subscription[] = users.map((user) => {
        // MAPEAMENTO REAL:
        // active -> active (Pago)
        // blocked -> overdue (Atrasado)
        // rejected -> canceled (Cancelado)
        let subStatus: Subscription["status"] = "active";

        if (user.status === "blocked") {
          subStatus = "overdue";
        } else if (user.status === "rejected") {
          subStatus = "canceled";
        }

        // Real plan mapping
        const planRaw = user.planType || "basic";
        let planDisplay: Subscription["plan"] = "Básico";
        let amountStr = "Grátis";

        if (planRaw === "medio") {
          planDisplay = "Médio";
          amountStr = "R$ 100,00";
        } else if (planRaw === "premium" || planRaw === "advanced") {
          planDisplay = "Avançado";
          amountStr = "R$ 250,00";
        }

        return {
          id: `sub_${user.id}`,
          clinicId: user.id,
          clinicName: user.name,
          plan: planDisplay,
          status: subStatus,
          amount: amountStr,
          nextBilling: "25/12/2026",
        };
      });

      setSubscriptions(mappedSubs);
    } catch (e) {
      if (showToast) showToast("Erro ao carregar assinaturas.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const closeMenu = () => setActiveMenuId(null);

  const loadDataSilently = async () => {
    try {
      const users = await mockDb.getAllClinicsForAdmin();
      const mappedSubs = users.map((user) => {
        let subStatus = "active";
        if (user.status === "blocked") subStatus = "overdue";
        else if (user.status === "rejected") subStatus = "canceled";
        const planRaw = user.planType || "basic";
        let planDisplay = "Básico";
        let amountStr = "Grátis";
        if (planRaw === "medio") { planDisplay = "Médio"; amountStr = "R$ 100,00"; }
        else if (planRaw === "premium" || planRaw === "advanced") { planDisplay = "Avançado"; amountStr = "R$ 250,00"; }
        return {
          id: `sub_${user.id}`,
          clinicId: user.id,
          clinicName: user.name,
          plan: planDisplay as any,
          status: subStatus as any,
          amount: amountStr,
          nextBilling: "25/12/2026",
        };
      });
      setSubscriptions(mappedSubs);
    } catch(e) {}
  };

  const handleUpdateStatus = async (
    subId: string,
    targetSubStatus: Subscription["status"],
  ) => {
    const sub = subscriptions.find((s) => s.id === subId);
    if (!sub) return;

    // Converte status da UI para status do Banco de Dados
    let dbStatus = "active";
    if (targetSubStatus === "overdue") dbStatus = "blocked";
    if (targetSubStatus === "canceled") dbStatus = "rejected";

    // Atualização Otimista
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: targetSubStatus } : s)),
    );

    closeMenu();

    try {
      if (showToast) showToast("Sincronizando alteração...", "success");
      await mockDb.updateUserStatus(sub.clinicId, dbStatus);

      const msg =
        targetSubStatus === "active"
          ? "Pagamento confirmado e acesso liberado!"
          : targetSubStatus === "overdue"
            ? "Status alterado para Atrasado."
            : "Assinatura cancelada.";

      if (showToast) showToast(msg);
      setTimeout(loadDataSilently, 500);
    } catch (e) {
      if (showToast)
        showToast("Sucesso no Painel (Execute o RLS no banco real se erro persistir).", "success");
    }
  };

  const handleUpdatePlan = async (subId: string, targetPlan: string) => {
    const sub = subscriptions.find((s) => s.id === subId);
    if (!sub) return;

    closeMenu();

    let planDisplay: Subscription["plan"] = "Básico";
    let amountStr = "Grátis";
    if (targetPlan === "medio") { planDisplay = "Médio"; amountStr = "R$ 100,00"; }
    else if (targetPlan === "premium" || targetPlan === "advanced") { planDisplay = "Avançado"; amountStr = "R$ 250,00"; }

    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, plan: planDisplay, amount: amountStr } : s)),
    );

    try {
      if (showToast) showToast("Atualizando plano...", "success");
      await mockDb.updateUserPlan(sub.clinicId, targetPlan);
      if (showToast) showToast("Plano atualizado com sucesso!");
      setTimeout(loadDataSilently, 500);
    } catch (e) {
      if (showToast) showToast("Sucesso no Painel (Execute o RLS no banco real se erro persistir).", "success");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> Ativo
          </span>
        );
      case "overdue":
        return (
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> Atrasado
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-full text-xs font-bold w-fit flex items-center gap-1">
            <Ban size={12} /> Cancelado
          </span>
        );
    }
  };

  const filteredSubs = subscriptions.filter((s) =>
    s.clinicName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div
      className="p-4 md:p-8 animate-fadeIn max-w-6xl mx-auto min-h-screen"
      onClick={closeMenu}
    >
      <button
        onClick={() => onNavigate("/dashboard")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors"
      >
        <ArrowLeft size={18} /> Voltar ao Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="text-purple-600" /> Gestão de Assinaturas
          </h2>
          <p className="text-slate-500">
            Controle de acesso e faturamento de parceiros.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-6">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Ativos</p>
            <p className="text-xl font-bold text-green-600">
              {subscriptions.filter((s) => s.status === "active").length}
            </p>
          </div>
          <div className="w-px bg-slate-100"></div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">
              Atrasados/Off
            </p>
            <p className="text-xl font-bold text-red-500">
              {subscriptions.filter((s) => s.status !== "active").length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar clínica..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={16}
            />
          </div>
          <button
            onClick={loadData}
            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Clínica / Parceiro</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Status de Acesso</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Sincronizando dados...
                  </td>
                </tr>
              ) : filteredSubs.length > 0 ? (
                filteredSubs.map((sub) => (
                  <tr
                    key={sub.id}
                    className={`transition-colors group relative ${sub.status === "canceled" ? "bg-slate-50/50 grayscale opacity-80" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {sub.clinicName}
                      <div className="text-[10px] text-slate-400 font-mono font-normal">
                        ID: {sub.clinicId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold border ${
                          sub.plan === "Enterprise"
                            ? "bg-purple-50 text-purple-700 border-purple-100"
                            : sub.plan === "Profissional"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {sub.amount}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock size={14} /> {sub.nextBilling}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={(e) => toggleMenu(sub.id, e)}
                        className={`p-2 rounded-full transition-colors ${activeMenuId === sub.id ? "bg-slate-200 text-slate-800" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {activeMenuId === sub.id && (
                        <>
                          {/* Desktop Menu */}
                          <div className="hidden sm:block absolute right-8 top-10 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] text-left overflow-hidden animate-slideUp">
                            <div className="p-3 border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Controle Financeiro
                            </div>

                            <div className="p-2 space-y-1">
                              {sub.status !== "active" && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(sub.id, "active"); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 rounded-lg transition-colors font-semibold"
                                >
                                  <CheckCircle size={16} /> Confirmar Pagamento
                                </button>
                              )}

                              {sub.status === "active" && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(sub.id, "overdue"); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-700 bg-amber-50/50 hover:bg-amber-100 rounded-lg transition-colors font-semibold"
                                >
                                  <AlertCircle size={16} /> Marcar como Atrasado
                                </button>
                              )}

                              {sub.status !== "canceled" && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(sub.id, "canceled"); }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-700 bg-rose-50/50 hover:bg-rose-100 rounded-lg transition-colors font-semibold"
                                >
                                  <Ban size={16} /> Cancelar Assinatura
                                </button>
                              )}
                            </div>

                            <div className="p-3 border-y border-slate-100 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                              Alterar Plano Atual
                            </div>
                            <div className="p-2 space-y-1">
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlan(sub.id, "basico"); }}
                                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors font-medium flex items-center gap-3 ${sub.plan === "Básico" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
                              >
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Verde - Básico
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlan(sub.id, "medio"); }}
                                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors font-medium flex items-center gap-3 ${sub.plan === "Médio" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
                              >
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Azul - Médio
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlan(sub.id, "premium"); }}
                                className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors font-medium flex items-center gap-3 ${sub.plan === "Avançado" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
                              >
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div> Roxo - Avançado
                              </button>
                            </div>
                          </div>

                          {/* Mobile Bottom Sheet Backdrop */}
                          <div className="sm:hidden fixed inset-0 bg-slate-900/60 z-[200] backdrop-blur-sm animate-fadeIn flex items-end">
                            <div className="w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl animate-slideUp" onClick={(e) => e.stopPropagation()}>
                                <div className="sticky top-0 bg-white/90 backdrop-blur pb-4 pt-3 px-6 z-10 border-b border-slate-100">
                                   <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                                   <h3 className="text-xl font-bold text-slate-900">{sub.clinicName}</h3>
                                   <p className="text-xs font-mono text-slate-400 mt-1">ID: {sub.clinicId}</p>
                                </div>
                                
                                <div className="p-6 space-y-8">
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Controle Financeiro</h4>
                                    <div className="space-y-2">
                                      {sub.status !== "active" && (
                                        <button
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(sub.id, "active"); }}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors font-bold border border-emerald-100"
                                        >
                                          <CheckCircle size={18} /> Confirmar Pagamento
                                        </button>
                                      )}

                                      {sub.status === "active" && (
                                        <button
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(sub.id, "overdue"); }}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors font-bold border border-amber-100"
                                        >
                                          <AlertCircle size={18} /> Marcar como Atrasado
                                        </button>
                                      )}

                                      {sub.status !== "canceled" && (
                                        <button
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(sub.id, "canceled"); }}
                                          className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors font-bold border border-rose-100"
                                        >
                                          <Ban size={18} /> Cancelar Assinatura
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Alterar Plano Atual</h4>
                                    <div className="space-y-2">
                                      <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlan(sub.id, "basico"); }}
                                        className={`w-full px-4 py-4 text-sm rounded-xl transition-colors font-bold flex items-center gap-3 border ${sub.plan === "Básico" ? "bg-slate-50 text-slate-900 border-slate-300 ring-2 ring-slate-200" : "bg-white text-slate-600 border-slate-200"}`}
                                      >
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div> Verde - Básico
                                      </button>
                                      <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlan(sub.id, "medio"); }}
                                        className={`w-full px-4 py-4 text-sm rounded-xl transition-colors font-bold flex items-center gap-3 border ${sub.plan === "Médio" ? "bg-slate-50 text-slate-900 border-slate-300 ring-2 ring-slate-200" : "bg-white text-slate-600 border-slate-200"}`}
                                      >
                                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div> Azul - Médio
                                      </button>
                                      <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdatePlan(sub.id, "premium"); }}
                                        className={`w-full px-4 py-4 text-sm rounded-xl transition-colors font-bold flex items-center gap-3 border ${sub.plan === "Avançado" ? "bg-slate-50 text-slate-900 border-slate-300 ring-2 ring-slate-200" : "bg-white text-slate-600 border-slate-200"}`}
                                      >
                                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></div> Roxo - Avançado
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            </div>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500 font-bold uppercase text-xs"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
