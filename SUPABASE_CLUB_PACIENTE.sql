
-- ==========================================================
-- MARCLYN SAÚDE PRO - EXTENSÃO CLUB PACIENTE
-- Adiciona suporte a assinaturas de pacientes
-- ==========================================================

-- 1. ADICIONAR COLUNAS À TABELA PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'pending')),
ADD COLUMN IF NOT EXISTS subscription_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.profiles.subscription_plan IS 'Nome do plano do Club Paciente';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Status da assinatura do paciente';
COMMENT ON COLUMN public.profiles.subscription_date IS 'Data de início da assinatura';
COMMENT ON COLUMN public.profiles.subscription_expiry IS 'Data de validade da assinatura';

-- 3. NOTIFICAÇÃO DE SUCESSO
DO $$ 
BEGIN 
    RAISE NOTICE 'Colunas do Club Paciente adicionadas com sucesso.';
END $$;
