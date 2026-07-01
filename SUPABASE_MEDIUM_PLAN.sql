
-- MIGRATION: PLANO MÉDIO PROFISSIONAL
-- Adiciona campos para o Plano Médio e tabelas de suporte

-- 1. Atualizar a tabela de perfis (profiles)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS consultation_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS profile_visits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_clicks INTEGER DEFAULT 0;

-- 2. Tabela de Encaminhamentos / Documentos Médicos
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id),
    professional_id UUID REFERENCES profiles(id),
    type VARCHAR(50) NOT NULL, -- 'exame', 'guia', 'receita', 'atestado'
    title VARCHAR(255),
    content TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Habilitar RLS para medical_documents
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profissionais podem gerenciar seus documentos" 
ON medical_documents FOR ALL 
USING (auth.uid() = professional_id);

CREATE POLICY "Pacientes podem ver seus documentos" 
ON medical_documents FOR SELECT 
USING (auth.uid() = patient_id);

-- 4. Função para incrementar métricas (visitas e cliques)
CREATE OR REPLACE FUNCTION increment_profile_metric(profile_id UUID, metric_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF metric_name = 'visits' THEN
        UPDATE profiles SET profile_visits = profile_visits + 1 WHERE id = profile_id;
    ELSIF metric_name = 'whatsapp' THEN
        UPDATE profiles SET whatsapp_clicks = whatsapp_clicks + 1 WHERE id = profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
