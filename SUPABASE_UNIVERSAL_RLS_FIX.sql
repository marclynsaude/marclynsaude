-- ============================================================================
-- MARCLYN SAÚDE PRO - UNIVERSAL PRODUCTION SHIELD & RLS RECURSION FIX (v6.0)
-- ============================================================================
-- ATENÇÃO: Rode este script no Editor SQL (SQL Editor) do seu Supabase.
-- Benefícios: 
--   1. Elimina COMPLETAMENTE o erro de Recursão Infinita (infinite recursion).
--   2. Corrige a falta de políticas RLS em tabelas fundamentais (profile_images, etc).
--   3. Otimiza consultas com índices avançados.
--   4. Garante bypass confiável e recuperação de perfil via metadados JWT sem dar erros.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. LIMPEZA COMPLETA DE POLÍTICAS EXISTENTES (Garante consistência)
-- ----------------------------------------------------------------------------
DO $$ 
DECLARE 
    t_name text;
    p_name text;
BEGIN 
    FOR t_name, p_name IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'profile_images', 'appointments', 'medical_records', 'time_slots', 'notifications', 'financial_records', 'reviews', 'health_data', 'audit_logs')
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_name, t_name); 
    END LOOP; 
END $$;

-- ----------------------------------------------------------------------------
-- 2. HABILITAR RLS EM TODAS AS TABELAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. POLÍTICAS DA TABELA 'profiles' (ULTRA-RÁPIDO, ZERO RECURSÃO)
-- ----------------------------------------------------------------------------
-- SELECT: Permite ver se é o dono, admin (via metadata do JWT), ou perfil ativo profissional/clínica (catálogo público)
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (
    auth.uid() = id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (role IN ('clinic', 'professional') AND status = 'active')
);

-- INSERT: Permite criar se for o dono ou admin (fundamental ao registrar ou login recovery)
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (
    auth.uid() = id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- UPDATE: Permite atualizar se for o dono ou administrador
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (
    auth.uid() = id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
) WITH CHECK (
    auth.uid() = id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- DELETE: Permite deletar se for o dono ou administrador
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE USING (
    auth.uid() = id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS DA TABELA 'profile_images' (Controle de Imagens do Perfil)
-- ----------------------------------------------------------------------------
-- SELECT: Público (todos podem carregar as fotos dos profissionais no site)
CREATE POLICY "profile_images_select_policy" ON public.profile_images FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Somente dono do perfil ou admin
CREATE POLICY "profile_images_write_policy" ON public.profile_images FOR ALL USING (
    auth.uid() = profile_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 5. POLÍTICAS DA TABELA 'appointments' (Consultas e Vagas)
-- ----------------------------------------------------------------------------
-- Permite leitura e escrita se for o paciente, a clínica ou admin (usando JWT livre de loops)
CREATE POLICY "appointments_privacy_policy" ON public.appointments FOR ALL USING (
    auth.uid() = patient_id 
    OR auth.uid() = clinic_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS DA TABELA 'medical_records' (Prontuários e Documentos)
-- ----------------------------------------------------------------------------
-- Permite leitura e escrita se for o paciente, o profissional ou admin
CREATE POLICY "medical_records_privacy_policy" ON public.medical_records FOR ALL USING (
    auth.uid() = patient_id 
    OR auth.uid() = professional_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 7. POLÍTICAS DA TABELA 'time_slots' (Horários Disponíveis)
-- ----------------------------------------------------------------------------
-- SELECT: Público (qualquer um deve listar os horários livres para agendar)
CREATE POLICY "time_slots_select_policy" ON public.time_slots FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Somente a clínica/profissional dona do slot ou admin
CREATE POLICY "time_slots_write_policy" ON public.time_slots FOR ALL USING (
    auth.uid() = clinic_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS DA TABELA 'notifications' (Central de Avisos)
-- ----------------------------------------------------------------------------
-- Somente o próprio destinatário ou admin
CREATE POLICY "notifications_privacy_policy" ON public.notifications FOR ALL USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 9. POLÍTICAS DA TABELA 'financial_records' (Fluxo de Caixa)
-- ----------------------------------------------------------------------------
-- Privado para o profissional ou admin
CREATE POLICY "financial_records_privacy_policy" ON public.financial_records FOR ALL USING (
    auth.uid() = professional_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 10. POLÍTICAS DA TABELA 'reviews' (Avaliações / Depoimentos)
-- ----------------------------------------------------------------------------
-- SELECT: Público (todas as avaliações de profissionais são visíveis)
CREATE POLICY "reviews_select_policy" ON public.reviews FOR SELECT USING (true);

-- INSERT: Qualquer paciente logado
CREATE POLICY "reviews_insert_policy" ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = patient_id
);

-- UPDATE/DELETE: Próprio paciente que postou ou admin
CREATE POLICY "reviews_write_policy" ON public.reviews FOR ALL USING (
    auth.uid() = patient_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 11. POLÍTICAS DA TABELA 'health_data' (Acompanhamento do Paciente)
-- ----------------------------------------------------------------------------
-- Somente o próprio paciente ou admin
CREATE POLICY "health_data_privacy_policy" ON public.health_data FOR ALL USING (
    auth.uid() = patient_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 12. POLÍTICAS DA TABELA 'audit_logs' (Logs do Painel Admin)
-- ----------------------------------------------------------------------------
-- Somente dono do log ou admin
CREATE POLICY "audit_logs_privacy_policy" ON public.audit_logs FOR ALL USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ----------------------------------------------------------------------------
-- 13. OTIMIZAÇÃO EXTRA: ATUALIZAÇÕES AUTOMÁTICAS E GATILHOS SEGUROS
-- ----------------------------------------------------------------------------

-- Força remoção dO trigger e função antiga recursivos/confusos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Gatilho de Novo Usuário (Rápido, resiliente e unificado)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (
      id, name, email, role, status, document, phone, patient_type, plan_type, address, neighborhood, city
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Usuário Marclyn'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'role', 'patient'),
      CASE 
        WHEN COALESCE(new.raw_user_meta_data->>'role', 'patient') = 'patient' THEN 'active'
        ELSE 'pending'
      END,
      new.raw_user_meta_data->>'document',
      new.raw_user_meta_data->>'phone',
      COALESCE(new.raw_user_meta_data->>'patient_type', 'normal'),
      CASE 
        WHEN new.raw_user_meta_data->>'plan_type' = 'basic' THEN 'basico'
        ELSE COALESCE(new.raw_user_meta_data->>'plan_type', 'basico')
      END,
      new.raw_user_meta_data->>'address',
      new.raw_user_meta_data->>'neighborhood',
      new.raw_user_meta_data->>'city'
    ) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore all errors to avoid blocking the core Auth signup.
    -- The frontend auto-repair fallback will handle profile creation if needed.
    RETURN new;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicando o Trigger na tabela auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Corrige eventuais cadastros em português/inglês 'basic' -> 'basico' na tabela
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_type_check;
UPDATE public.profiles SET plan_type = 'basico' WHERE plan_type = 'basic';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_type_check CHECK (plan_type IN ('basico', 'medio', 'avancado', 'premium'));

-- ----------------------------------------------------------------------------
-- 14. PERFORMANCE (Índices unificados para login instantâneo)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_p_email_status ON public.profiles(email, status);
CREATE INDEX IF NOT EXISTS idx_p_role ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- 15. PERMISSÕES COMPILADAS
-- ----------------------------------------------------------------------------
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO anon;

GRANT ALL ON public.profile_images TO authenticated;
GRANT ALL ON public.profile_images TO service_role;
GRANT SELECT ON public.profile_images TO anon;

COMMIT;
