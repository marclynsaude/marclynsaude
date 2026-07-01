
import React, { useState } from 'react';
import { User, Appointment, RecordType, ToothRecord } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { useSafeAsync } from '../hooks/useSafeAsync';
import { User as UserIcon, CheckCircle, ArrowLeft, Clock, Activity, Video, Save, Loader2, Pill, FileBadge, TestTube, Stethoscope, UploadCloud, X } from 'lucide-react';
import { Odontogram } from '../components/Odontogram';
import { formatDateTime } from '../utils/dateFormatter';

const ConsultationPage: React.FC<{ user: User; onNavigate: (path: string) => void; showToast?: (msg: string, type?: any) => void; }> = ({ user, onNavigate, showToast }) => {
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [activeTab, setActiveTab] = useState<RecordType>('consultation');
  
  // States Locais (fora do hook para não disparar refetch ao digitar)
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [history, setHistory] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [odontogramData, setOdontogramData] = useState<ToothRecord[]>([]);

  // Estados específicos para as abas de Receita e Atestado
  const [prescriptionMeds, setPrescriptionMeds] = useState('');
  const [prescriptionDirections, setPrescriptionDirections] = useState('');
  const [prescriptionValidity, setPrescriptionValidity] = useState('30');
  
  const [certificateReason, setCertificateReason] = useState('');
  const [certificateCid, setCertificateCid] = useState('');
  const [certificateDays, setCertificateDays] = useState('3');

  // Controle de anexos de documentos temporários
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRefForDoc = React.useRef<HTMLInputElement>(null);

  const fetchQueue = React.useCallback(() => mockDb.getAppointments(user.id, user.role), [user.id, user.role]);
  const { data: apps, loading, execute: refresh } = useSafeAsync(fetchQueue);

  const handleDocAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setAttachedFile(file);
    setTimeout(() => {
      setAttachedFileName(file.name);
      setUploadingFile(false);
      if (showToast) showToast(`Arquivo "${file.name}" anexado com sucesso! Válido por 48 horas.`);
    }, 1000);
  };

  const handleFinish = async () => {
    if (!selectedApp) return;

    let finalDiagnosis = diagnosis;
    let finalPrescription = notes;
    let isTemp = false;

    if (activeTab === 'consultation') {
      if (!notes.trim()) return showToast?.("Preencha o detalhamento/conduta do atendimento.", "error");
      finalDiagnosis = diagnosis || "Consulta de Rotina";
      finalPrescription = notes;
    } else if (activeTab === 'prescription') {
      if (!prescriptionMeds.trim()) return showToast?.("Preencha os medicamentos da receita.", "error");
      finalDiagnosis = "Prontuário de Prescrição";
      finalPrescription = `Medicamentos:\n${prescriptionMeds}\n\nInstruções de Uso:\n${prescriptionDirections || 'Nenhuma instrução adicional'}\n\nValidade da receita: ${prescriptionValidity} dias`;
      isTemp = true;
    } else if (activeTab === 'certificate') {
      if (!certificateReason.trim()) return showToast?.("Preencha o motivo/justificativa do atestado.", "error");
      finalDiagnosis = "Atestado de Dispensa Médica";
      finalPrescription = `Justificativa Médica:\n${certificateReason}\n\nCID-10: ${certificateCid || 'Não Declarado'}\n\nPrazo Autorizado: ${certificateDays} dias de afastamento`;
      isTemp = true;
    }

    setFinishing(true);
    try {
      // Data limite para 48 horas no futuro
      const expiresAtValue = (isTemp || attachedFileName) ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() : undefined;

      await mockDb.createMedicalRecord({
        patientId: selectedApp.patientId, 
        professionalId: user.id, 
        date: new Date().toISOString().split('T')[0],
        diagnosis: finalDiagnosis, 
        prescription: finalPrescription, 
        doctorName: user.name, 
        type: activeTab,
        history: activeTab === 'consultation' ? history : undefined,
        chiefComplaint: activeTab === 'consultation' ? chiefComplaint : undefined,
        odontogram: activeTab === 'consultation' ? odontogramData : undefined,
        expiresAt: expiresAtValue,
        fileUrl: attachedFileName ? `https://kwwpsotvxyxxjzifibbb.supabase.co/storage/v1/object/public/documents/${attachedFileName}` : undefined,
        title: attachedFileName || (activeTab === 'prescription' ? 'Receita Digital' : activeTab === 'certificate' ? 'Atestado Digital' : 'Atendimento Médico')
      }, attachedFile || undefined);
      await mockDb.updateAppointmentStatus(selectedApp.id, 'done');
      if (showToast) showToast(isTemp || attachedFileName ? "Atendimento finalizado! O documento temporário expira em 48h." : "Atendimento finalizado!");
      setSelectedApp(null);
      // Limpa os estados
      setNotes('');
      setDiagnosis('');
      setHistory('');
      setChiefComplaint('');
      setPrescriptionMeds('');
      setPrescriptionDirections('');
      setCertificateReason('');
      setCertificateCid('');
      setAttachedFileName('');
      setAttachedFile(null);
      refresh();
    } catch (e) {
      console.error("[ConsultationPage] Error completing consultation:", e);
      if (showToast) showToast("Erro ao finalizar atendimento no banco de dados.", "error");
    } finally {
      setFinishing(false);
    }
  };

  if (selectedApp) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fadeIn">
        <button onClick={() => setSelectedApp(null)} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900"><ArrowLeft size={14}/> Voltar para Fila</button>
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Paciente em Atendimento</p>
              <h2 className="text-2xl font-black uppercase tracking-tight">{selectedApp.patientName}</h2>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5 font-black text-[10px] uppercase tracking-widest">{selectedApp.type}</div>
          </div>
          
          <div className="p-8">
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {['consultation', 'prescription', 'certificate'].map((t) => (
                <button 
                  key={t} 
                  id={`tab-button-${t}`}
                  type="button" 
                  onClick={() => {
                    console.log("[ConsultationPage] Switch tab to:", t);
                    setActiveTab(t as any);
                  }} 
                  className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === t ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  {t === 'consultation' ? 'Prontuário' : t === 'prescription' ? 'Receita' : 'Atestado'}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {activeTab === 'consultation' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Queixa Principal</label>
                      <textarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none h-32 resize-none font-medium" placeholder="O que trouxe o paciente hoje?" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Histórico do Paciente</label>
                      <textarea value={history} onChange={e => setHistory(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none h-32 resize-none font-medium" placeholder="Antecedentes, alergias, medicações..." />
                    </div>
                  </div>

                  {/* Odontogram removed as requested */}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Diagnóstico / Conclusão</label>
                    <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold" placeholder="Ex: Hipertensão Estágio 1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Detalhamento / Conduta de Evolução</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none h-48 resize-none font-medium" placeholder="Evolução do paciente e conduta médica..." />
                  </div>
                </div>
              )}

              {activeTab === 'prescription' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-amber-50 border border-amber-200/60 p-5 rounded-2xl text-slate-700">
                    <p className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 flex items-center gap-2 mb-1">
                      ⚠️ AVISO DE DOCUMENTO TEMPORÁRIO (48 HORAS)
                    </p>
                    <p className="text-[11px] font-bold leading-relaxed text-slate-600">
                      Esta receita é de caráter temporário. Ela estará acessível para o paciente em sua área de atendimento e central de resultados por exatamente <strong>48 horas</strong> a partir deste momento. Após esse período, o registro do documento será apagado permanentemente de forma automática para preservar o espaço em banco de dados e garantir a privacidade.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Medicamentos e Dosagens</label>
                    <textarea value={prescriptionMeds} onChange={e => setPrescriptionMeds(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none h-40 resize-none font-medium" placeholder="Ex: Paracetamol 750mg - Tomar 1 comprimido de 6 em 6 horas se dor ou febre." />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Instruções de Uso para o Paciente</label>
                      <textarea value={prescriptionDirections} onChange={e => setPrescriptionDirections(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none h-32 resize-none font-medium" placeholder="Ex: Tomar preferencialmente após as refeições. Não interromper o tratamento antes do prazo médico." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Vigência Clínica da Receita</label>
                      <select value={prescriptionValidity} onChange={e => setPrescriptionValidity(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold">
                        <option value="10">10 dias</option>
                        <option value="30">30 dias</option>
                        <option value="60">60 dias</option>
                        <option value="90">90 dias</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'certificate' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-amber-50 border border-amber-200/60 p-5 rounded-2xl text-slate-700">
                    <p className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 flex items-center gap-2 mb-1">
                      ⚠️ AVISO DE DOCUMENTO TEMPORÁRIO (48 HORAS)
                    </p>
                    <p className="text-[11px] font-bold leading-relaxed text-slate-600">
                      Este atestado médico e seus respectivos anexos expiram e serão permanentemente apagados do banco de dados após <strong>48 horas</strong> da sua emissão. Oriente o paciente a realizar o download do arquivo PDF antes do prazo final.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Justificativa de Afastamento</label>
                    <textarea value={certificateReason} onChange={e => setCertificateReason(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none h-40 resize-none font-medium" placeholder="Ex: Atesto para os devidos fins que o paciente necessita de afastamento das atividades laborais para tratamento de saúde..." />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Código CID-10 (Opcional)</label>
                      <input value={certificateCid} onChange={e => setCertificateCid(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold" placeholder="Ex: A09" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Número de Dias Recomendados</label>
                      <input type="number" value={certificateDays} onChange={e => setCertificateDays(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold" placeholder="Ex: 3" min="1" max="60" />
                    </div>
                  </div>
                </div>
              )}

              {/* ANEXO DE DOCUMENTOS (TEMPORARY 48H FILE UPLOADER) */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-150 relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <UploadCloud size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Anexar Documentos / Exames ao Atendimento</h4>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Os arquivos anexados ficam disponíveis por 48 horas no painel do paciente</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <input type="file" ref={fileInputRefForDoc} onChange={handleDocAttach} className="hidden" />
                  <button type="button" onClick={() => fileInputRefForDoc.current?.click()} className="px-5 py-3 bg-slate-900 text-white hover:bg-teal-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2">
                    {uploadingFile ? <Loader2 className="animate-spin" size={12} /> : <UploadCloud size={12} />} Escolher Arquivo para Enviar
                  </button>
                  {attachedFileName ? (
                    <div className="flex items-center gap-2 bg-teal-100/60 border border-teal-200 px-3 py-1.5 rounded-xl">
                      <span className="font-extrabold text-[10px] uppercase text-teal-800 tracking-tight">Anexo: {attachedFileName}</span>
                      <button type="button" onClick={() => setAttachedFileName('')} className="p-1 text-red-500 hover:bg-white rounded-full transition-colors">
                        <X size={10}/>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nenhum arquivo anexado</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={handleFinish} disabled={finishing} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-600 shadow-xl active:scale-95 disabled:opacity-50 flex items-center gap-3">
                  {finishing ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>} Finalizar Atendimento
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <button 
        onClick={() => onNavigate('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">Fila de Atendimento</h2>
      {loading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse font-black uppercase text-xs">Sincronizando fila...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {apps?.filter(a => a.status !== 'done' && a.status !== 'canceled').map(app => (
            <div key={app.id} onClick={() => { setSelectedApp(app); setNotes(''); setDiagnosis(''); }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors"><UserIcon size={20}/></div>
                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight">{app.patientName}</h4>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> {formatDateTime(app.date)}</p>
                </div>
              </div>
              <div className="text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] uppercase tracking-widest">Atender →</div>
            </div>
          ))}
          {apps?.length === 0 && <div className="col-span-2 py-20 text-center text-slate-400 font-bold uppercase text-xs bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">Não há pacientes na fila.</div>}
        </div>
      )}
    </div>
  );
};

export default ConsultationPage;
