-- ============================================================================
-- MARCLYN SAÚDE PRO - PRODUCTION ENGINE v5.0 (SUPABASE SCHEMA)
-- Created for: Professional Health Management & Club Paciente
-- ============================================================================

-- 1. CLEANUP & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COMMON FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_profile_metric(profile_id UUID, metric_name TEXT)
RETURNS void AS $$
BEGIN
  IF metric_name = 'visits' THEN
    UPDATE public.profiles SET profile_visits = profile_visits + 1 WHERE id = profile_id;
  ELSIF metric_name = 'whatsapp' THEN
    UPDATE public.profiles SET whatsapp_clicks = whatsapp_clicks + 1 WHERE id = profile_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CORE TABLES

-- Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'clinic', 'professional', 'patient')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'blocked')),
    avatar_url TEXT,
    
    -- Identidade Profissional
    document TEXT, 
    reg TEXT, 
    specialty TEXT,
    plan_type TEXT DEFAULT 'basico' CHECK (plan_type IN ('basico', 'medio', 'avancado', 'premium')),
    verified BOOLEAN DEFAULT false,
    
    -- Contexto do Paciente
    patient_type TEXT DEFAULT 'normal' CHECK (patient_type IN ('normal', 'club')),
    health_plan TEXT,
    emergency_contact TEXT,
    medical_history TEXT,
    
    -- Geografia e Contato
    phone TEXT,
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    
    -- Detalhes do Perfil Profissional
    bio TEXT, 
    about TEXT, 
    consultation_price NUMERIC DEFAULT 0,
    monthly_price NUMERIC DEFAULT 0,
    available_services TEXT[] DEFAULT '{}', 
    operating_hours JSONB,
    
    -- Social & Digital
    instagram TEXT,
    website TEXT,
    whatsapp TEXT,
    yampi_url TEXT, 
    
    -- Assinatura (Subscription)
    subscription_plan TEXT,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'pending')),
    subscription_date TIMESTAMPTZ,
    subscription_expiry TIMESTAMPTZ,
    
    -- Métricas e Interatividade
    favorites UUID[] DEFAULT '{}',
    profile_visits INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    
    -- Sistema
    platform_fee NUMERIC DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galeria de Imagens
CREATE TABLE IF NOT EXISTS public.profile_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'canceled', 'done')),
    type TEXT DEFAULT 'presencial' CHECK (type IN ('teleconsulta', 'presencial', 'exame')),
    notes TEXT,
    room_id TEXT, 
    meeting_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prontuários e Documentos
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('consultation', 'exam_result', 'prescription', 'certificate')),
    title TEXT,
    diagnosis TEXT,
    conduct TEXT,
    prescription TEXT,
    cid TEXT,
    days TEXT,
    file_url TEXT,
    odontogram JSONB, 
    attachments TEXT[] DEFAULT '{}',
    chief_complaint TEXT,
    history TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horários (Slots)
CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financeiro (Revenue Tracking)
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avaliações
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dados de Saúde (IoT/History)
CREATE TABLE IF NOT EXISTS public.health_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    metric TEXT NOT NULL, 
    value TEXT NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SEGURANÇA (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access" ON public.profiles;
CREATE POLICY "Admin Full Access" ON public.profiles FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Profile Self Management" ON public.profiles;
CREATE POLICY "Profile Self Management" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profile Insert Recovery" ON public.profiles;
CREATE POLICY "Profile Insert Recovery" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Appointments Shared Access" ON public.appointments;
CREATE POLICY "Appointments Shared Access" ON public.appointments FOR ALL USING (
  auth.uid() = patient_id OR auth.uid() = clinic_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Medical Records Privacy" ON public.medical_records;
CREATE POLICY "Medical Records Privacy" ON public.medical_records FOR ALL USING (auth.uid() = patient_id OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Financial Privacy" ON public.financial_records;
CREATE POLICY "Financial Privacy" ON public.financial_records FOR ALL USING (auth.uid() = professional_id);

-- 5. AUTOMAÇÃO (Triggers)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_p_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_a_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_a_clinic ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_mr_patient ON public.medical_records(patient_id);

COMMIT;
