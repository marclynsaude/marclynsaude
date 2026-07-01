-- ============================================================================
-- MARCLYN SAÚDE PRO - PRODUCTION ENGINE v5.0 (SUPABASE SCHEMA)
-- Created for: Professional Health Management & Club Paciente
-- ============================================================================

-- 1. CLEANUP & EXTENSIONS
-- WARNING: Only run cleanup if necessary or for full reset.
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For performance monitoring

-- 2. COMMON FUNCTIONS
-- Update Timestamp Hook
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profile Metrics Hook (RPC)
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

-- Users Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'clinic', 'professional', 'patient')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'blocked')),
    avatar_url TEXT,
    
    -- Professional Identity
    document TEXT, -- CPF or CNPJ
    reg TEXT, -- Professional Council Number (CRM, CRP, etc)
    specialty TEXT,
    plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'medio', 'premium', 'advanced')),
    verified BOOLEAN DEFAULT false,
    
    -- Patient Context
    patient_type TEXT DEFAULT 'normal' CHECK (patient_type IN ('normal', 'club')),
    health_plan TEXT,
    emergency_contact TEXT,
    medical_history TEXT,
    
    -- Geography & Contact
    phone TEXT,
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    
    -- Professional Profile Details
    bio TEXT, -- Card summary
    about TEXT, -- Full description
    consultation_price NUMERIC DEFAULT 0,
    monthly_price NUMERIC DEFAULT 0,
    available_services TEXT[] DEFAULT '{}', -- ['presencial', 'teleconsulta', 'exames']
    operating_hours JSONB,
    
    -- Social & External
    instagram TEXT,
    website TEXT,
    whatsapp TEXT,
    yampi_url TEXT, -- External store/checkout
    
    -- Subscription Engine
    subscription_plan TEXT,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'pending')),
    subscription_date TIMESTAMPTZ,
    subscription_expiry TIMESTAMPTZ,
    
    -- Interactivity
    favorites UUID[] DEFAULT '{}',
    profile_visits INTEGER DEFAULT 0,
    whatsapp_clicks INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    
    -- System
    platform_fee NUMERIC DEFAULT 15, -- Default 15%
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Gallery
CREATE TABLE IF NOT EXISTS public.profile_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments Management
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'canceled', 'done')),
    type TEXT DEFAULT 'presencial' CHECK (type IN ('teleconsulta', 'presencial', 'exame')),
    notes TEXT,
    room_id TEXT, -- For video calls
    meeting_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Records & Documents
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
    odontogram JSONB, -- Dental map data
    attachments TEXT[] DEFAULT '{}',
    chief_complaint TEXT,
    history TEXT,
    expires_at TIMESTAMPTZ, -- 48h temporal files/documents expiration timeline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUTOMATED CLEANUP ROUTINES AND EXPIRY DEFINITION (MARCLYN SAÚDE PRO - AUTOMATIC 48H EXPIRATION ENGINE)

-- 1.1 Adicionar coluna expires_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'medical_records' 
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.medical_records ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- 1.1.2 Adicionar coluna doctor_name se não existir (para consistência de auditoria e evitar erros de insert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'medical_records' 
      AND column_name = 'doctor_name'
  ) THEN
    ALTER TABLE public.medical_records ADD COLUMN doctor_name TEXT;
  END IF;
END $$;

-- 1.2 Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_medical_records_expires_at 
ON public.medical_records(expires_at) 
WHERE expires_at IS NOT NULL;

-- 1.3 Criar índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_medical_records_type_expiry 
ON public.medical_records(type, expires_at);

-- 2.1 Função que retorna o papel do usuário atual (se ainda não existir)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 3.1 Função do trigger de expiração
CREATE OR REPLACE FUNCTION public.auto_set_medical_records_expiry()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para documentos temporários (receita, atestado, resultado de exame) -> expiração obrigatória de 48 horas
  IF NEW.expires_at IS NULL AND NEW.type IN ('exam_result', 'prescription', 'certificate') THEN
    NEW.expires_at := NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- 3.2 Remover trigger antigo se existir
DROP TRIGGER IF EXISTS set_expiry_on_medical_records ON public.medical_records;

-- 3.3 Criar trigger
CREATE TRIGGER set_expiry_on_medical_records
  BEFORE INSERT ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_medical_records_expiry();

-- 4.1 Função do trigger de limpeza
CREATE OR REPLACE FUNCTION public.clean_expired_medical_records()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar registros expirados de forma segura (for statement-level triggers, return NULL)
  DELETE FROM public.medical_records 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 4.2 Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_clean_expired_medical_records ON public.medical_records;

-- 4.3 Criar trigger (executa APÓS insert/update)
CREATE TRIGGER trigger_clean_expired_medical_records
  AFTER INSERT OR UPDATE ON public.medical_records
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.clean_expired_medical_records();

-- 5.1 pg_cron setup block
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule('auto-purge-48h-records');
  PERFORM cron.schedule(
    'auto-purge-48h-records',
    '0 * * * *',
    'DELETE FROM public.medical_records WHERE expires_at IS NOT NULL AND expires_at < NOW();'
  );
EXCEPTION 
  WHEN OTHERS THEN
    -- Fallback silently if pg_cron is not available or disabled by provider
END;
$$;

-- 6.1 RLS Policies for medical_records
DROP POLICY IF EXISTS "Medical Records Privacy" ON public.medical_records;
DROP POLICY IF EXISTS "Medical records privacy" ON public.medical_records;
DROP POLICY IF EXISTS "System can delete expired records" ON public.medical_records;

CREATE POLICY "Medical Records Privacy" ON public.medical_records
  FOR ALL
  USING (
    auth.uid() = patient_id 
    OR auth.uid() = professional_id 
    OR public.current_user_role() = 'admin'
  )
  WITH CHECK (
    auth.uid() = patient_id 
    OR auth.uid() = professional_id 
    OR public.current_user_role() = 'admin'
  );

CREATE POLICY "System can delete expired records" ON public.medical_records
  FOR DELETE
  USING (
    expires_at IS NOT NULL 
    AND expires_at < NOW()
  );

-- 7.1 Views de Monitoramento
CREATE OR REPLACE VIEW public.vw_medical_records_expiring_soon AS
SELECT 
  mr.id,
  mr.patient_id,
  p.name AS patient_name,
  mr.professional_id,
  prof.name AS professional_name,
  mr.type,
  mr.title,
  mr.date,
  mr.expires_at,
  ROUND(EXTRACT(EPOCH FROM (mr.expires_at - NOW()))/3600, 1) AS hours_remaining,
  CASE 
    WHEN mr.expires_at < NOW() THEN 'EXPIRADO'
    WHEN mr.expires_at < NOW() + INTERVAL '12 hours' THEN 'CRÍTICO'
    WHEN mr.expires_at < NOW() + INTERVAL '24 hours' THEN 'ATENÇÃO'
    ELSE 'OK'
  END AS status
FROM public.medical_records mr
LEFT JOIN public.profiles p ON mr.patient_id = p.id
LEFT JOIN public.profiles prof ON mr.professional_id = prof.id
WHERE mr.expires_at IS NOT NULL;

CREATE OR REPLACE VIEW public.vw_medical_records_stats AS
SELECT 
  COUNT(*) AS total_records,
  COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) AS records_with_expiry,
  COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) AS expired_records,
  COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at > NOW() AND expires_at < NOW() + INTERVAL '48 hours' THEN 1 END) AS expiring_in_48h,
  COUNT(CASE WHEN type = 'prescription' THEN 1 END) AS total_prescriptions,
  COUNT(CASE WHEN type = 'certificate' THEN 1 END) AS total_certificates,
  COUNT(CASE WHEN type = 'exam_result' THEN 1 END) AS total_exams,
  COUNT(CASE WHEN type = 'consultation' THEN 1 END) AS total_consultations
FROM public.medical_records;

-- 8.1 Função de limpeza imediata
CREATE OR REPLACE FUNCTION public.force_clean_expired_records()
RETURNS TABLE(
  deleted_count INTEGER,
  deleted_types TEXT[],
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  r_types TEXT[];
BEGIN
  -- Obter os tipos antes de deletar
  SELECT ARRAY(
    SELECT DISTINCT type 
    FROM public.medical_records 
    WHERE expires_at IS NOT NULL AND expires_at < NOW()
  ) INTO r_types;

  -- Deletar os registros
  DELETE FROM public.medical_records 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;

  deleted_count := v_count;
  deleted_types := r_types;
  
  IF v_count > 0 THEN
    message := 'Limpeza concluída: ' || v_count || ' registro(s) removido(s)';
  ELSE
    message := 'Nenhum registro expirado encontrado';
  END IF;
  
  RETURN NEXT;
END;
$$;


-- Legacy Support Table (if applicable)
CREATE TABLE IF NOT EXISTS public.medical_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    content JSONB,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Slots / Scheduling System
CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clinic_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global Notification Center
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning')),
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Engine (Revenue Tracking)
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    category TEXT,
    statement_id TEXT, -- External ref (Stripe/Pagar.me)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy support for financial (common name)
CREATE TABLE IF NOT EXISTS public.financial AS SELECT * FROM public.financial_records WHERE false;

-- Profile Feedback System
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Professional Health Monitoring (IoT/Realtime)
CREATE TABLE IF NOT EXISTS public.health_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    metric TEXT NOT NULL, -- blood_pressure, glucose, heart_rate, weight, height
    value TEXT NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SECURITY (RLS - Row Level Security)

-- Enable RLS
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

-- Dynamic Policies for Profiles
CREATE POLICY "Public profiles are viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Dynamic Policies for Appointments
CREATE POLICY "Appointments access" ON public.appointments FOR ALL USING (
    auth.uid() = patient_id OR auth.uid() = clinic_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Dynamic Policies for Medical Records
CREATE POLICY "Medical records privacy" ON public.medical_records FOR ALL USING (
    auth.uid() = patient_id OR auth.uid() = professional_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Logic for Financial Records
CREATE POLICY "Professional financial privacy" ON public.financial_records FOR ALL USING (auth.uid() = professional_id);

-- 5. AUTOMATION (Triggers & Functions)

-- New User Profile Generator
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status, document, phone, patient_type, plan_type)
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
    COALESCE(new.raw_user_meta_data->>'plan_type', 'basic')
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    document = EXCLUDED.document,
    phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_medical_records BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_p_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_p_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_a_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_a_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_a_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_mr_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_slots_clinic_date ON public.time_slots(clinic_id, date);

-- 7. INITIAL ADMIN BOOTSTRAP (Optional)
-- INSERT INTO public.audit_logs (action, details) VALUES ('SYSTEM_BOOT', 'Marclyn Pro Engine v5.0 deployed.');

COMMIT;
