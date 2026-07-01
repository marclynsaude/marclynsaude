-- CORREÇÃO DE EMERGÊNCIA [MARCLYN SAÚDE]
-- Rode este script no Editor SQL do seu Supabase para consertar os perfis e os logs de erro.

-- 1. Garante a criação da tabela "medical_records" em vez da "medical_documents" velha
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('consultation', 'exam_result', 'prescription', 'certificate')),
    diagnosis TEXT,
    prescription TEXT,
    notes TEXT,
    doctor_name TEXT NOT NULL,
    attachments TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ativa RLS para records e cria políticas seguras
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Medical Records Privacy" ON public.medical_records;
CREATE POLICY "Medical Records Privacy" ON public.medical_records FOR ALL USING (auth.uid() = patient_id OR auth.uid() = professional_id);

-- 3. CORRIGIR RESTRIÇÕES E POLÍTICAS DE PERFIS (Isso conserta o loop de perfil não encontrado)
-- Adiciona política INSERT explicitamente para permitir a reconstrução de perfil via código
DROP POLICY IF EXISTS "Allow user to insert their own profile" ON public.profiles;
CREATE POLICY "Allow user to insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. ATUALIZAR TRIGGER PARA ACEITAR OS PADRÕES CORRETAMENTE (Ex: 'basico' em vez de 'basic')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, document, phone, patient_type, plan_type, address, neighborhood, city)
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
      WHEN new.raw_user_meta_data->>'plan_type' = 'basic' THEN 'basico' -- fallback automático
      ELSE COALESCE(new.raw_user_meta_data->>'plan_type', 'basico')
    END,
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'neighborhood',
    new.raw_user_meta_data->>'city'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CORRIGIR PERFIS ANTIGOS QUE POSSUÍAM 'basic' (que travavam a tabela)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_type_check;
UPDATE public.profiles SET plan_type = 'basico' WHERE plan_type = 'basic';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_type_check CHECK (plan_type IN ('basico', 'medio', 'avancado', 'premium'));

COMMIT;
