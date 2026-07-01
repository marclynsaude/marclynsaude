
-- ==========================================================
-- MARCLYN SAÚDE PRO - FIX DE RECURSÃO INFINITA (RLS)
-- Solução: Uso de função SECURITY DEFINER para checagem de roles
-- ==========================================================

-- 1. Limpeza Total de Políticas da tabela Profiles
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 2. Função Auxiliar para Evitar Recursão (SECURITY DEFINER)
-- Esta função checa o papel do usuário logado sem disparar o RLS novamente.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- 3. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Novas Políticas SEM RECURSÃO

-- POLÍTICA DE SELECT (Leitura)
-- Permite ler se: 
-- 1. É o próprio dono (auth.uid() = id)
-- 2. É um profissional/clínica ativo (Catálogo público)
-- 3. O usuário logado é um admin (via função auxiliar)
CREATE POLICY "profiles_read_policy" ON public.profiles
FOR SELECT USING (
    auth.uid() = id 
    OR (role IN ('clinic', 'professional') AND status = 'active')
    OR (public.get_my_role() = 'admin')
);

-- POLÍTICA DE UPDATE (Escrita)
-- Permite atualizar se:
-- 1. É o próprio dono
-- 2. O usuário logado é um admin
CREATE POLICY "profiles_modify_policy" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id 
    OR (public.get_my_role() = 'admin')
)
WITH CHECK (
    auth.uid() = id 
    OR (public.get_my_role() = 'admin')
);

-- 5. Função de Automação de Perfil (Mantida para garantir o Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, status, document, phone)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', 'Novo Usuário'),
        COALESCE((new.raw_user_meta_data->>'role')::text, 'patient'),
        CASE 
            WHEN (new.raw_user_meta_data->>'role')::text = 'patient' THEN 'active'
            ELSE 'pending'
        END,
        new.raw_user_meta_data->>'document',
        new.raw_user_meta_data->>'phone'
    );
    RETURN new;
END;
$$;

-- 6. Trigger (Re-aplicação para garantir integridade)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Permissões Finais
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
