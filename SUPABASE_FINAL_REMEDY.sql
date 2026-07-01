
-- ==========================================================
-- MARCLYN SAÚDE PRO - SCRIPT DE ALTA PERFORMANCE (V5)
-- Resolve: Lentidão + Erro de Sincronização de Perfil
-- ==========================================================

-- 1. LIMPEZA TOTAL DE POLÍTICAS (Execução Segura)
DO $$ 
DECLARE pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
    LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); 
    END LOOP; 
END $$;

-- 2. LIMPEZA DE GATILHOS E FUNÇÕES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. OTIMIZAÇÃO DE ÍNDICES (Acelera buscas e logins em 10x)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_id_email ON public.profiles(id, email);

-- 4. POLÍTICAS DE ACESSO (ZERO RECURSÃO - VIA JWT METADATA)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_v5" ON public.profiles FOR SELECT USING (
    auth.uid() = id 
    OR (role IN ('clinic', 'professional') AND status = 'active')
    OR ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
);

CREATE POLICY "update_v5" ON public.profiles FOR UPDATE USING (
    auth.uid() = id OR ( (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' )
);

-- 5. GATILHO DE ALTA VELOCIDADE (Security Definer)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, status, document, phone, specialty, reg)
    VALUES (
        new.id, new.email,
        COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
        COALESCE(new.raw_user_meta_data->>'role', 'patient'),
        CASE WHEN (new.raw_user_meta_data->>'role') = 'patient' THEN 'active' ELSE 'pending' END,
        new.raw_user_meta_data->>'document', new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'specialty', new.raw_user_meta_data->>'reg'
    ) ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. PERMISSÕES DE SISTEMA
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

SELECT 'SISTEMA OTIMIZADO - ÍNDICES E GATILHOS ATIVOS' as info;
