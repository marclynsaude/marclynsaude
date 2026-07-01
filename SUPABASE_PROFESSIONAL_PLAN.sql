
-- Adicionar novas colunas à tabela profiles para o Plano Profissional
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'basic';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 15;

-- Criar tabela de avaliações (reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS na tabela reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Políticas para reviews
CREATE POLICY "Qualquer pessoa pode ver avaliações" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Pacientes autenticados podem criar avaliações" ON reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger para atualizar a média de avaliação e contagem no perfil do profissional
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        rating = (SELECT AVG(rating) FROM reviews WHERE professional_id = NEW.professional_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = NEW.professional_id)
    WHERE id = NEW.professional_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_added
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_professional_rating();
