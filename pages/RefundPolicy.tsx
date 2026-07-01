import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface RefundPolicyProps {
  onNavigate: (path: string) => void;
}

const RefundPolicy: React.FC<RefundPolicyProps> = ({ onNavigate }) => {
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
              <ShieldCheck size={32} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Política de Reembolso</h1>
              <p className="text-slate-500 font-medium mt-1">Última atualização: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Condições Gerais</h2>
              <p>
                A Marclyn Saúde preza pela transparência e satisfação de seus usuários. Nossa política de reembolso foi elaborada de acordo com o Código de Defesa do Consumidor (Lei 8.078/1990).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Consultas e Teleconsultas</h2>
              <ul className="list-disc pl-5 space-y-3">
                <li><strong>Cancelamento pelo Paciente:</strong> O reembolso integral será realizado caso o cancelamento seja feito com até 24 horas de antecedência do horário agendado.</li>
                <li><strong>Cancelamento com menos de 24 horas:</strong> Será retida uma taxa administrativa de 30% do valor da consulta.</li>
                <li><strong>Não comparecimento (No-show):</strong> Em caso de não comparecimento do paciente no horário agendado, sem aviso prévio, não haverá reembolso.</li>
                <li><strong>Cancelamento pelo Profissional:</strong> Caso o profissional de saúde precise cancelar a consulta, o paciente terá direito ao reembolso integral ou reagendamento sem custos adicionais.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Problemas Técnicos</h2>
              <p>
                Se a teleconsulta não puder ser realizada devido a falhas técnicas comprovadas na plataforma Marclyn Saúde, o paciente poderá optar pelo reagendamento ou reembolso integral.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Assinaturas e Planos (Profissionais)</h2>
              <p>
                Para profissionais de saúde assinantes da plataforma, o cancelamento pode ser feito a qualquer momento. O reembolso de assinaturas anuais ou semestrais será calculado de forma proporcional ao tempo não utilizado, descontando-se uma taxa de rescisão de 10%.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Prazos e Processamento</h2>
              <p>
                As solicitações de reembolso aprovadas serão processadas em até 7 dias úteis. O prazo para o valor constar na fatura do cartão de crédito ou na conta bancária depende exclusivamente da instituição financeira ou operadora do cartão (podendo levar de 1 a 2 faturas).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Como Solicitar</h2>
              <p>
                Para solicitar um reembolso, entre em contato com nosso suporte através do e-mail <strong>suporte@marclyn.com.br</strong> ou pelo WhatsApp oficial da plataforma, informando o número do agendamento e o motivo da solicitação.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
