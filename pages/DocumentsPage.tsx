
import React, { useState, useEffect, useRef } from 'react';
import { User, MedicalRecord, RecordType } from '../types';
import { mockDb } from '../lib/mockSupabase';
import { FileText, Download, Filter, Search, Pill, TestTube, FileBadge, Activity, ArrowLeft, UploadCloud, Check, X, User as UserIcon, Calendar, Eye, Printer, ShieldCheck, RefreshCw, QrCode, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/dateFormatter';

interface DocumentsPageProps {
  user: User;
  onNavigate: (path: string) => void;
  showToast?: (text: string, type?: any) => void;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ user, onNavigate, showToast }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MedicalRecord | null>(null);
  const [docToDelete, setDocToDelete] = useState<MedicalRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecords = () => {
      mockDb.getRecords(user.id, user.role).then(setRecords);
  };

  useEffect(() => {
    loadRecords();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          await mockDb.createMedicalRecord({
              patientId: user.id,
              date: new Date().toISOString().split('T')[0],
              diagnosis: "Documento Enviado pelo Paciente",
              prescription: `Arquivo anexado: ${file.name}.`,
              doctorName: user.name,
              type: 'exam_result',
              title: file.name,
              expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          }, file);
          
          loadRecords();
          setFilter('exam_result');
      } catch (err) {
          console.error(err);
      } finally {
          setIsUploading(false);
      }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await mockDb.deleteMedicalRecord(docToDelete.id);
      if (showToast) {
        showToast("Documento excluído com sucesso do banco de dados!", "success");
      }
      setDocToDelete(null);
      setSelectedDoc(null);
      loadRecords();
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast("Erro ao excluir o documento. Tente novamente.", "error");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = records.filter(rec => {
    if (filter === 'all') return true;
    return rec.type === filter;
  });

  const getIcon = (type?: RecordType) => {
      switch(type) {
          case 'prescription': return <Pill size={24} />;
          case 'exam_result': return <TestTube size={24} />;
          case 'certificate': return <FileBadge size={24} />;
          case 'consultation': return <Activity size={24} />;
          default: return <FileText size={24} />;
      }
  };

  const getColor = (type?: RecordType) => {
      switch(type) {
          case 'prescription': return 'bg-teal-50 text-teal-600';
          case 'exam_result': return 'bg-purple-50 text-purple-600';
          case 'certificate': return 'bg-blue-50 text-blue-600';
          case 'consultation': return 'bg-orange-50 text-orange-600';
          default: return 'bg-slate-50 text-slate-600';
      }
  };

  const getLabel = (type?: RecordType) => {
      switch(type) {
          case 'prescription': return 'Receituário';
          case 'exam_result': return 'Resultado de Exame';
          case 'certificate': return 'Atestado Médico';
          case 'consultation': return 'Prontuário';
          default: return 'Geral';
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleDownloadAttachment = async (url: string, title: string) => {
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fetch file and convert to client blob to bypass cross-origin restrictions on iframe/<a> downloads
      const response = await fetch(url);
      if (!response.ok) throw new Error("CORS or fetch failure");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.warn("[Download] Falha ao baixar diretamente via blob, abrindo nova aba:", error);
      const win = window.open(url, '_blank');
      if (win) win.focus();
    }
  };

  const handleDownloadReport = (doc: MedicalRecord, format: 'html' | 'txt') => {
    const cleanName = (doc.title || doc.diagnosis).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Relatorio_Atendimento_${cleanName}_${doc.date}`;

    if (format === 'txt') {
      const textContent = `
========================================
MARCLYN SAÚDE - PRONTUÁRIO DE ATENDIMENTO
========================================
ID DO REGISTRO: ${doc.id.toUpperCase()}
DATA DE EMISSÃO: ${formatDate(doc.date)}
PACIENTE: ${user.name}
DOCUMENTO DO PACIENTE: ${user.document || 'Não Informado'}
MÉDICO RESPONSÁVEL: ${doc.doctorName}
----------------------------------------
TIPO DE DOCUMENTO: ${getLabel(doc.type)}
DIAGNÓSTICO PRIMÁRIO:
${doc.diagnosis}

PRESCRIÇÃO & CONDUTA CLÍNICA:
${doc.prescription || "Sem demais observações."}
----------------------------------------
MARCLYN SAÚDE PRO - Assinatura Eletrônica Certificada
`;
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${doc.title || doc.diagnosis}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; background: #f8fafc; padding: 40px; margin: 0; }
    .card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
    .title { text-align: center; font-size: 24px; font-weight: 800; text-transform: uppercase; color: #0f766e; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
    .section-title { font-weight: 800; font-size: 13px; text-transform: uppercase; color: #0f766e; border-left: 4px solid #0f766e; padding-left: 10px; margin-bottom: 15px; letter-spacing: 0.5px; }
    .content-box { font-size: 15px; line-height: 1.6; margin-bottom: 30px; white-space: pre-wrap; padding: 15px; background: #fafafa; border-radius: 8px; border-left: 2px solid #cbd5e1; }
    .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { text-align: center; }
    .line { width: 180px; height: 1px; background: #94a3b8; margin: 0 auto 5px auto; }
    .badge { display: inline-block; padding: 4px 8px; font-size: 10px; background: #0f766e; color: white; border-radius: 6px; font-weight: bold; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h2 style="margin: 0; color: #0f766e; font-weight: 900; letter-spacing: -0.5px;">MARCLYN SAÚDE</h2>
        <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: bold; letter-spacing: 1px;">SISTEMA INTELIGENTE DE SAÚDE</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Criação</span><br>
        <strong>${formatDate(doc.date)}</strong>
      </div>
    </div>
    
    <div class="title">
      Relatório Clínico Geral de Atendimento
    </div>

    <div class="info-grid">
      <div>
        <span style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Paciente</span>
        <strong style="font-size: 16px;">${user.name}</strong><br>
        <span style="font-size: 12px; color: #64748b;">CPF: ${user.document || 'Não Cadastrado'}</span>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Profissional Cadastrado</span>
        <strong style="font-size: 16px;">${doc.doctorName}</strong><br>
        <span style="font-size: 12px; color: #64748b;">Assinatura Digital Ativa</span>
      </div>
    </div>

    <div>
      <div class="section-title">Diagnóstico Clínico / Observações</div>
      <div class="content-box"><strong>${doc.diagnosis}</strong></div>
    </div>

    <div>
      <div class="section-title">Detalhamento Técnico / Prescrição do Atendimento</div>
      <div class="content-box" style="font-style: italic;">${doc.prescription || "Sem detalhamento adicional cadastrado."}</div>
    </div>

    ${doc.cid ? `
    <div>
      <div class="section-title">Dados de Licença Médica (CID-10)</div>
      <div class="info-grid" style="grid-template-cols: 1fr 1fr; margin-bottom: 30px;">
        <div>
          <span style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Código CID-10</span>
          <strong>${doc.cid}</strong>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; font-weight: bold;">Período Autorizado</span>
          <strong>${doc.days || '0'} dias</strong>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <div>
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">Hash de Segurança:<br><strong style="color: #475569; font-family: monospace;">${doc.id.toUpperCase()}</strong></p>
      </div>
      <div class="signature">
        <div class="line"></div>
        <strong style="font-size: 13px;">${doc.doctorName}</strong><br>
        <span style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Assinatura Eletrônica Certificada</span>
        <div style="margin-top: 8px;"><span class="badge">Documento Autêntico</span></div>
      </div>
    </div>
  </div>
</body>
</html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadSpecificDoc = (doc: MedicalRecord) => {
    const cleanName = (doc.title || doc.diagnosis).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Documento_Isolado_${getLabel(doc.type).replace(/ /g, '_')}_${doc.date}`;

    let htmlContent = '';
    
    if (doc.type === 'prescription') {
      htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Receituário Digital - ${doc.doctorName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; background: #fafaf9; padding: 40px; margin: 0; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 50px; border-radius: 16px; box-shadow: 0 4px 20px rgb(0 0 0 / 0.05); border: 1px solid #e4e4e7; }
    .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 40px; }
    .title { text-align: center; font-size: 22px; font-weight: 800; text-transform: uppercase; color: #0f766e; margin-bottom: 30px; letter-spacing: 1px; }
    .patient-box { background: #f0fdfa; padding: 20px; border-radius: 8px; border: 1px solid #ccfbf1; margin-bottom: 30px; font-size: 14px; }
    .prescription-body { font-size: 16px; line-height: 1.8; margin-bottom: 40px; white-space: pre-wrap; font-weight: 500; background: #fafafa; padding: 25px; border-radius: 8px; border: 1px dashed #e4e4e7; }
    .footer { margin-top: 60px; border-top: 1px solid #e4e4e7; padding-top: 25px; display: flex; justify-content: space-between; align-items: center; }
    .signature { text-align: center; }
    .line { width: 180px; height: 1px; background: #a1a1aa; margin: 0 auto 5px auto; }
    .badge { display: inline-block; padding: 4px 8px; font-size: 9px; background: #0f766e; color: white; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; color: #0f766e; text-transform: uppercase; font-size: 24px; font-weight: 900;">RECEITUÁRIO MÉDICO</h2>
      <p style="margin: 5px 0 0 0; font-size: 11px; color: #71717a; font-weight: bold; letter-spacing: 1px;">MARCLYN SAÚDE - PLATAFORMA INTEGRADA</p>
    </div>
    
    <div class="patient-box">
      <span style="font-size: 11px; color: #0d9488; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 5px;">Paciente</span>
      <strong style="font-size: 18px; color: #111827;">${user.name}</strong><br>
      <span style="color: #4b5563;">CPF: ${user.document || '---.---.---/--'}</span>
    </div>

    <div class="title">Prescrição Digital de Medicamentos</div>

    <div class="prescription-body">${doc.prescription || "Nenhum detalhe de medicamento informado."}</div>

    <div style="font-size: 11px; color: #71717a; text-align: center; margin-bottom: 40px;">
      Este receituário possui validade em todo o território nacional mediante apresentação impressa ou formato eletrônico original.
    </div>

    <div class="footer">
      <div>
        <p style="font-size: 10px; color: #a1a1aa; margin: 0; font-weight: bold;">EMITIDO EM:<br><span style="color: #27272a; font-size: 12px;">${formatDate(doc.date)}</span></p>
      </div>
      <div class="signature">
        <div class="line"></div>
        <strong style="font-size: 12px; color: #18181b;">${doc.doctorName}</strong><br>
        <span style="font-size: 9px; color: #71717a; font-weight: bold; text-transform: uppercase;">CRM Ativo / CRM-UF</span>
        <div style="margin-top: 5px;"><span class="badge" style="background: #0d9488;">Receituário Original</span></div>
      </div>
    </div>
  </div>
</body>
</html>
      `;
    } else if (doc.type === 'certificate') {
      htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Atestado de Dispensa Médica - ${doc.doctorName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; background: #fafaf9; padding: 40px; margin: 0; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 50px; border-radius: 16px; box-shadow: 0 4px 20px rgb(0 0 0 / 0.05); border: 1px solid #e4e4e7; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 40px; }
    .title { text-align: center; font-size: 22px; font-weight: 800; text-transform: uppercase; color: #2563eb; margin-bottom: 30px; letter-spacing: 1px; }
    .atestando-body { font-size: 16px; line-height: 2; margin-bottom: 40px; padding: 30px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: justify; }
    .cid-box { display: flex; justify-content: space-around; background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe; margin-top: 20px; text-align: center; }
    .footer { margin-top: 60px; border-top: 1px solid #e4e4e7; padding-top: 25px; display: flex; justify-content: space-between; align-items: center; }
    .signature { text-align: center; }
    .line { width: 180px; height: 1px; background: #a1a1aa; margin: 0 auto 5px auto; }
    .badge { display: inline-block; padding: 4px 8px; font-size: 9px; background: #2563eb; color: white; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; color: #2563eb; text-transform: uppercase; font-size: 24px; font-weight: 900;">ATESTADO MÉDICO</h2>
      <p style="margin: 5px 0 0 0; font-size: 11px; color: #71717a; font-weight: bold; tracking: 1px;">MARCLYN SAÚDE - COMPROVAÇÃO DE DISPENSA</p>
    </div>
    
    <div class="title">Atestado de Afastamento Temporário</div>

    <div class="atestando-body">
      Atesto para os devidos fins de direito que o(a) paciente <strong>${user.name}</strong>, inscrito(a) sob o CPF <strong>${user.document || '---.---.---/--'}</strong>, foi atendido(a) nesta unidade assistencial de saúde por mim na data de hoje e necessita de <strong>${doc.days || '0'} dias</strong> de afastamento de suas atividades trabalhistas e acadêmicas, a partir desta data, para tratamento de saúde.
      
      <div class="cid-box">
        <div>
          <span style="font-size: 10px; color: #2563eb; text-transform: uppercase; font-weight: bold; display: block;">CID-10 AUTORIZADO</span>
          <strong style="font-size: 18px; color: #1e3a8a;">${doc.cid || 'Z00.0'}</strong>
        </div>
        <div>
          <span style="font-size: 10px; color: #2563eb; text-transform: uppercase; font-weight: bold; display: block;">PRAZO CONCEDIDO</span>
          <strong style="font-size: 18px; color: #1e3a8a;">${doc.days || '0'} dias</strong>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <p style="font-size: 10px; color: #a1a1aa; margin: 0; font-weight: bold;">DATA DE EMISSÃO:<br><span style="color: #27272a; font-size: 12px;">${formatDate(doc.date)}</span></p>
      </div>
      <div class="signature">
        <div class="line"></div>
        <strong style="font-size: 12px; color: #18181b;">${doc.doctorName}</strong><br>
        <span style="font-size: 9px; color: #71717a; font-weight: bold; text-transform: uppercase;">CRM Ativo / CRM-UF</span>
        <div style="margin-top: 5px;"><span class="badge">Atestado Original</span></div>
      </div>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Documento Clínico - Marclyn Saúde</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; background: #fafaf9; padding: 40px; margin: 0; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 50px; border-radius: 16px; box-shadow: 0 4px 20px rgb(0 0 0 / 0.05); border: 1px solid #e4e4e7; }
    .header { text-align: center; border-bottom: 2px solid #5b21b6; padding-bottom: 20px; margin-bottom: 40px; }
    .title { text-align: center; font-size: 22px; font-weight: 800; text-transform: uppercase; color: #5b21b6; margin-bottom: 30px; letter-spacing: 1px; }
    .doc-body { font-size: 16px; line-height: 1.8; margin-bottom: 40px; white-space: pre-wrap; font-weight: 500; background: #fdfbf7; padding: 25px; border-radius: 8px; border: 1px solid #f5f5f4; }
    .footer { margin-top: 60px; border-top: 1px solid #e4e4e7; padding-top: 25px; display: flex; justify-content: space-between; align-items: center; }
    .signature { text-align: center; }
    .line { width: 180px; height: 1px; background: #a1a1aa; margin: 0 auto 5px auto; }
    .badge { display: inline-block; padding: 4px 8px; font-size: 9px; background: #5b21b6; color: white; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; color: #5b21b6; text-transform: uppercase; font-size: 24px; font-weight: 900;">DOCUMENTO EXTRA</h2>
      <p style="margin: 5px 0 0 0; font-size: 11px; color: #71717a; font-weight: bold; tracking: 1px;">MARCLYN SAÚDE - EXTRATO DE SAÚDE</p>
    </div>
    
    <div style="background: #fafaf9; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 14px; border: 1px solid #e4e4e7;">
      Paciente: <strong>${user.name}</strong><br>
      CPF: <strong>${user.document || '---.---.---/--'}</strong>
    </div>

    <div class="title">${doc.title || 'Extrato de Saúde'}</div>

    <div class="doc-body">
      <strong>Tipo:</strong> ${getLabel(doc.type)}<br>
      <strong>Médico:</strong> ${doc.doctorName}<br>
      <strong>Motivo / Diagnóstico:</strong><br>${doc.diagnosis}<br><br>
      <strong>Instruções / Prescrição:</strong><br>${doc.prescription}
    </div>

    <div class="footer">
      <div>
        <p style="font-size: 10px; color: #a1a1aa; margin: 0; font-weight: bold;">EMISSÃO:<br><span style="color: #27272a; font-size: 12px;">${formatDate(doc.date)}</span></p>
      </div>
      <div class="signature">
        <div class="line"></div>
        <strong style="font-size: 12px; color: #18181b;">${doc.doctorName}</strong><br>
        <span style="font-size: 9px; color: #71717a; font-weight: bold; text-transform: uppercase;">CRM Ativo</span>
        <div style="margin-top: 5px;"><span class="badge">Documento Autêntico</span></div>
      </div>
    </div>
  </div>
</body>
</html>
      `;
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 animate-fadeIn max-w-6xl mx-auto min-h-screen">
      
      {/* INTERNAL DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md no-print" onClick={() => setSelectedDoc(null)}></div>
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slideUp">
                
                {/* Viewer Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center no-print">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getColor(selectedDoc.type)}`}>
                            {getIcon(selectedDoc.type)}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{selectedDoc.title || selectedDoc.diagnosis}</h3>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{getLabel(selectedDoc.type)}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Report Content - This is the PRINTABLE part */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50 scrollbar-hide">
                    <div id="printable-document" className="max-w-2xl mx-auto bg-white p-8 md:p-16 shadow-lg border border-slate-200 rounded-sm relative min-h-[800px] flex flex-col">
                        
                        {/* Medical Header Style */}
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-8 mb-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-600 p-2 rounded-lg">
                                    <Activity size={32} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">MARCLYN SAÚDE</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Plataforma de Saúde Integrada</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-black text-slate-400 uppercase mb-1">Documento Gerado em</div>
                                <div className="font-bold text-slate-900">{formatDate(selectedDoc.date)}</div>
                            </div>
                        </div>

                        {/* Document Title */}
                        <div className="text-center mb-12">
                            <h1 className="text-xl font-black text-slate-900 uppercase underline underline-offset-8 decoration-teal-500">
                                {getLabel(selectedDoc.type)}
                            </h1>
                            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Controle: {selectedDoc.id.toUpperCase()}</p>
                        </div>

                        {/* Patient & Prof Block */}
                        <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                             <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Paciente</span>
                                <span className="font-black text-slate-800 text-lg">{user.name}</span>
                                <span className="block text-xs text-slate-500 font-medium">CPF: {user.document || '---.---.---/--'}</span>
                             </div>
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Profissional Responsável</span>
                                <span className="font-black text-slate-800">{selectedDoc.doctorName}</span>
                                <span className="block text-xs text-slate-500 font-medium">Registro Profissional Ativo</span>
                             </div>
                        </div>

                        {/* Main Medical Content */}
                        <div className="space-y-10 flex-1">
                            {/* Diagnosis Section */}
                            <div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase border-l-4 border-teal-500 pl-3 mb-4 tracking-wider">Diagnóstico / Conclusão Clínica</h4>
                                <p className="text-slate-800 font-bold text-lg leading-relaxed pl-4">
                                    {selectedDoc.diagnosis}
                                </p>
                            </div>

                            {/* Certificate Details */}
                            {selectedDoc.type === 'certificate' && (
                                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                    <div>
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-1">Período de Afastamento</h4>
                                        <p className="font-black text-2xl text-blue-900">{selectedDoc.days || '0'} dias</p>
                                    </div>
                                    <div className="text-right">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-1">CID-10</h4>
                                        <p className="font-black text-2xl text-blue-900">{selectedDoc.cid || 'Z00'}</p>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Report / Prescription */}
                            <div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase border-l-4 border-teal-500 pl-3 mb-4 tracking-wider">Detalhamento do Laudo / Prescrição</h4>
                                <div className="text-slate-700 leading-loose whitespace-pre-wrap font-medium bg-slate-50/30 p-6 rounded-2xl border border-slate-100 italic">
                                    {selectedDoc.prescription || "Nenhuma observação adicional foi registrada para este documento."}
                                </div>
                            </div>
                        </div>

                        {/* Footer / Validation Area */}
                        <div className="mt-16 pt-10 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-4 opacity-60">
                                    <div className="p-2 border border-slate-300 rounded">
                                        <QrCode size={48} className="text-slate-400" />
                                    </div>
                                    <div className="text-[9px] text-slate-400 leading-tight">
                                        Para validar a autenticidade deste<br/>documento, acesse nosso portal de<br/>verificação e informe o código acima.
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{selectedDoc.doctorName}</p>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold">Assinatura Eletrônica Certificada</p>
                                    <div className="mt-2 flex items-center justify-center gap-1.5 text-teal-600 font-black text-[8px] uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                        <ShieldCheck size={10} /> Documento Original
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* CENTRAL DE DOWNLOADS SEGUROS (PORTAL DE ARQUIVOS) */}
                    <div className="max-w-2xl mx-auto mt-8 bg-slate-900 text-white p-8 rounded-3xl border border-slate-850 shadow-2xl flex flex-col gap-6 no-print">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={24} className="text-teal-400" />
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-wider text-slate-100">Gerenciador de Arquivos Seguro</h4>
                                <p className="text-[10px] text-slate-400 font-bold">Controle de downloads individuais, receitas, atestados e anexos criptografados.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            {/* Relatório Geral */}
                            <div className="bg-slate-800/50 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all">
                                <div>
                                    <span className="text-[9px] font-black uppercase text-teal-400 tracking-widest block mb-1">Passo 1 / Registro</span>
                                    <h5 className="font-extrabold text-xs text-slate-200">Relatório Geral</h5>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">
                                        Histórico completo de atendimento, diagnóstico primário e conduta do profissional de saúde.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDownloadReport(selectedDoc, 'html')}
                                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                                        id="btn-dl-report-html"
                                    >
                                        <Download size={12} /> HTML Seguro
                                    </button>
                                    <button 
                                        onClick={() => handleDownloadReport(selectedDoc, 'txt')}
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold text-[9px] uppercase py-2.5 px-3 rounded-lg transition-all"
                                        title="Baixar como texto simples"
                                        id="btn-dl-report-txt"
                                    >
                                        .TXT
                                    </button>
                                </div>
                            </div>

                            {/* Documentos Específicos se existir */}
                            {selectedDoc.type && selectedDoc.type !== 'consultation' && (
                                <div className="bg-slate-800/50 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all animate-fadeIn">
                                    <div>
                                        <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest block mb-1">Passo 2 / Específico</span>
                                        <h5 className="font-extrabold text-xs text-slate-200">{getLabel(selectedDoc.type)} Médico</h5>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">
                                            Apenas a {getLabel(selectedDoc.type).toLowerCase()} estruturada isoladamente para apresentar em farmácias ou RH.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleDownloadSpecificDoc(selectedDoc)}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                                        id="btn-dl-specific-doc"
                                    >
                                        <Download size={12} /> Baixar {getLabel(selectedDoc.type)}
                                    </button>
                                </div>
                            )}

                            {/* Arquivo Anexo do Paciente / Médico */}
                            {selectedDoc.fileUrl && (
                                <div className="bg-slate-800/50 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all animate-fadeIn sm:col-span-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-purple-400 tracking-widest block mb-1">Passo 3 / Anexo Físico</span>
                                            <h5 className="font-extrabold text-xs text-slate-200 truncate max-w-xs md:max-w-md">Arquivo Anexado Original</h5>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1 leading-relaxed">
                                                Visualizar ou baixar o arquivo individual originalmente digitalizado e anexado à consulta clínica.
                                            </p>
                                        </div>
                                        <span className="bg-purple-950/50 border border-purple-800 text-purple-300 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-md">
                                            {selectedDoc.fileUrl.split('.').pop()?.substring(0,4).toUpperCase() || 'ANEXO'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleDownloadAttachment(selectedDoc.fileUrl!, selectedDoc.title || 'Anexo_Marclyn')}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-[9px] uppercase tracking-wider py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                                        id="btn-dl-attachment-individual"
                                    >
                                        <Download size={12} /> Baixar Documento Anexado Individualmente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Viewer Actions */}
                <div className="bg-white p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 no-print shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={() => setSelectedDoc(null)} className="flex-1 sm:flex-initial px-6 py-3 bg-slate-100 rounded-xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-all" id="btn-close-modal">
                            Fechar
                        </button>
                        <button 
                            onClick={() => setDocToDelete(selectedDoc)} 
                            className="px-4 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:text-red-700 active:scale-95"
                            title="Apagar da base de dados"
                        >
                            <Trash2 size={16} /> <span>Excluir</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
                        <button onClick={handlePrint} className="flex-1 sm:flex-initial px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95" id="btn-print-pdf">
                            <Printer size={18} /> Imprimir / PDF
                        </button>
                        <button 
                            onClick={() => handleDownloadSpecificDoc(selectedDoc)}
                            className="flex-1 sm:flex-initial px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                            id="btn-dl-specific-footer"
                        >
                            <Download size={18} /> Baixar PDF/Doc
                        </button>
                        {selectedDoc.fileUrl && (
                            <button 
                                onClick={() => handleDownloadAttachment(selectedDoc.fileUrl!, selectedDoc.title || 'Anexo_Marclyn')}
                                className="flex-1 sm:flex-initial px-6 py-3 bg-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-700 transition-all shadow-lg active:scale-95"
                                id="btn-dl-attachment-footer"
                            >
                                <Download size={18} /> Baixar Anexo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      <button 
        onClick={() => onNavigate('/')} 
        className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-6 hover:text-slate-900 transition-all active:scale-95"
      >
        <ArrowLeft size={14}/> Voltar ao Início
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Central de Documentos</h2>
          <p className="text-slate-500 font-medium">Acesse e faça o download de todos os seus registros médicos.</p>
        </div>
        {user.role === 'patient' && (
            <div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-70"
                >
                    {isUploading ? <RefreshCw className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                    {isUploading ? 'PROCESSANDO...' : 'ENVIAR DOCUMENTO PRÓPRIO'}
                </button>
            </div>
        )}
      </div>

      {/* WARNING BANNER ABOUT 48H DELETION PLACED IN THE MAIN INTERFACE FOR BOTH ROLES */}
      <div className="bg-amber-50 border border-amber-200/60 p-5 rounded-[2rem] text-slate-700 mb-8 animate-fadeIn">
        <p className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 flex items-center gap-2 mb-1.5">
          ⚠️ POLÍTICA DE PRIVACIDADE E ARQUIVOS TEMPORÁRIOS (LGPD)
        </p>
        <p className="text-[11px] font-bold leading-relaxed text-slate-600">
          Como prática de otimização de infraestrutura e conformidade com a LGPD, exames anexados, receitas digitais e atestados médicos de afastamento emitidos permanecem salvos em nosso sistema por exatamente <strong>48 horas</strong> contadas a partir de sua inclusão. Baixe todos os arquivos PDF, receitas e resultados necessários antes do término deste prazo.
        </p>
      </div>

      {/* Modern Filter Pills */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-hide">
           {[
               { id: 'all', label: 'Todos', color: 'bg-slate-900' },
               { id: 'exam_result', label: 'Exames', color: 'bg-purple-600' },
               { id: 'prescription', label: 'Receituários', color: 'bg-teal-600' },
               { id: 'certificate', label: 'Atestados', color: 'bg-blue-600' },
               { id: 'consultation', label: 'Prontuários', color: 'bg-orange-600' },
           ].map(item => (
                <button 
                    key={item.id}
                    onClick={() => setFilter(item.id as any)}
                    className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${filter === item.id ? `${item.color} text-white border-transparent scale-105 shadow-lg` : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                >
                    {item.label}
                </button>
           ))}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(doc => (
            <div 
              key={doc.id} 
              onClick={() => setSelectedDoc(doc)}
              className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all group cursor-pointer animate-slideIn flex flex-col relative overflow-hidden"
            >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl ${getColor(doc.type)} shadow-inner group-hover:scale-110 transition-transform`}>
                    {getIcon(doc.type)}
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDelete(doc);
                      }}
                      className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all active:scale-95 border border-red-100/50"
                      title="Excluir documento da base de dados"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Emissão</span>
                      <span className="text-sm font-black text-slate-900">{formatDate(doc.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                    <span className={`text-[9px] uppercase font-black px-3 py-1 rounded-full border mb-3 inline-block ${getColor(doc.type).replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ')}`}>
                        {getLabel(doc.type)}
                    </span>
                    <h4 className="font-black text-slate-900 text-xl leading-tight group-hover:text-teal-600 transition-colors">
                        {doc.title || doc.diagnosis}
                    </h4>
                    <p className="text-sm text-slate-500 font-bold flex items-center gap-1.5 mt-2">
                        <UserIcon size={14} className="text-teal-500" /> {doc.doctorName}
                    </p>
                    {doc.expiresAt && (
                      <div className="mt-3 bg-red-50 border border-red-100 text-red-600 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xl flex items-center gap-1.5 w-fit">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        {(() => {
                          const diff = new Date(doc.expiresAt).getTime() - Date.now();
                          if (diff <= 0) return "Expirado";
                          const hours = Math.floor(diff / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          return `Expira em: ${hours}h ${minutes}m`;
                        })()}
                      </div>
                    )}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 flex flex-col gap-4">
                    <div className="flex items-center justify-between text-teal-600 font-black text-[10px] uppercase tracking-widest group-hover:text-teal-700 transition-colors">
                        <span className="flex items-center gap-2">
                            <Eye size={16} /> Abrir Documento
                        </span>
                        <div className="p-2.5 bg-slate-50 rounded-full text-slate-300 group-hover:bg-teal-500 group-hover:text-white transition-all">
                            <ArrowLeft size={16} className="rotate-180" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* 1. System Document Download Button */}
                        <button
                            onClick={() => {
                                handleDownloadSpecificDoc(doc);
                            }}
                            className="flex items-center justify-center gap-1 bg-slate-900 text-white hover:bg-slate-800 py-3 px-1 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                            title="Baixar documento/laudo médico"
                        >
                            <Download size={12} /> {doc.type === 'prescription' ? 'Baixar Receita' : doc.type === 'certificate' ? 'Baixar Atestado' : 'Baixar Documento'}
                        </button>

                        {/* 2. Uploaded Attachment Download Button (rendered conditionally or always to keep balanced layout) */}
                        {doc.fileUrl ? (
                            <button
                                onClick={() => {
                                    handleDownloadAttachment(doc.fileUrl!, doc.title || 'Anexo_Marclyn');
                                }}
                                className="flex items-center justify-center gap-1 bg-teal-600 text-white hover:bg-teal-700 py-3 px-1 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                title="Baixar arquivo originalmente anexado"
                            >
                                <Download size={12} /> Baixar Anexo
                            </button>
                        ) : (
                            <div className="flex items-center justify-center py-3 px-1 rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                                Sem Anexo
                            </div>
                        )}
                    </div>
                </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <Search size={64} className="mx-auto mb-6 opacity-10" />
            <p className="font-black text-xl text-slate-800 uppercase tracking-tighter">Nenhum documento encontrado</p>
            <p className="text-slate-500 mt-2 font-medium">Tente alterar o filtro ou envie um novo documento.</p>
            <button 
                onClick={() => setFilter('all')}
                className="mt-8 text-teal-600 font-black uppercase text-xs tracking-widest hover:underline"
            >
                Ver todos os documentos
            </button>
          </div>
        )}
      </div>

      {/* CONFIRM DELETION MODAL */}
      {docToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setDocToDelete(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl overflow-hidden flex flex-col gap-6 animate-scaleIn border border-slate-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Excluir Permanente?</h3>
                <p className="text-slate-450 text-[10px] font-black uppercase tracking-widest mt-1">{getLabel(docToDelete.type)}</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl w-full border border-slate-100 text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Documento</span>
                <span className="font-extrabold text-slate-800 text-xs block truncate mb-2">{docToDelete.title || docToDelete.diagnosis}</span>
                
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 border-t border-slate-200/60 pt-2 uppercase tracking-wide">
                  <span>Emissão: <strong className="text-slate-700">{formatDate(docToDelete.date)}</strong></span>
                  <span className="truncate max-w-[150px]">Atendimento: <strong className="text-slate-700">{docToDelete.doctorName}</strong></span>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Você está prestes a apagar com segurança este documento da nossa base de dados clínica. Esta ação é irreversível e o arquivo não poderá mais ser acessado.
              </p>
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Excluindo...
                  </>
                ) : (
                  'Sim, apagar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
