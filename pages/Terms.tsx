import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

interface TermsProps {
  onNavigate: (path: string) => void;
}

const Terms: React.FC<TermsProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm uppercase tracking-wider mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar para o Início
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
            <div className="bg-teal-50 p-4 rounded-2xl">
              <FileText size={32} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Termos de Uso</h1>
              <p className="text-slate-500 font-medium mt-1">Última atualização: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar a plataforma Marclyn Saúde, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Uso da Plataforma</h2>
              <p>
                A Marclyn Saúde é uma plataforma de intermediação que conecta pacientes a profissionais de saúde. Não prestamos serviços médicos diretamente. Os profissionais cadastrados são independentes e responsáveis por seus próprios diagnósticos e tratamentos.
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Você deve ter pelo menos 18 anos para criar uma conta.</li>
                <li>As informações fornecidas no cadastro devem ser precisas e atualizadas.</li>
                <li>Você é responsável por manter a confidencialidade de sua senha.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Privacidade e Dados</h2>
              <p>
                A coleta e uso de informações pessoais são regidos pela nossa Política de Privacidade, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018). Seus dados médicos são tratados com o mais alto nível de sigilo e segurança.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Limitações de Responsabilidade</h2>
              <p>
                A Marclyn Saúde não se responsabiliza por:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Diagnósticos, tratamentos ou prescrições emitidas pelos profissionais.</li>
                <li>Danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma.</li>
                <li>Interrupções temporárias do serviço por motivos de manutenção ou força maior.</li>
              </ul>
              <p className="mt-4 font-bold text-red-500">
                Em caso de emergência médica, procure imediatamente um pronto-socorro ou ligue para o SAMU (192). A plataforma não é destinada a atendimentos de urgência ou emergência.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Modificações dos Termos</h2>
              <p>
                A Marclyn Saúde pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
