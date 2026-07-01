-- ============================================================================
-- MARCLYN SAÚDE PRO - FIX DE GRANTS E PERMISSÕES DO BANCO DE DADOS (SUPABASE)
-- ============================================================================
-- Se você receber o erro "permission denied for table financial_records" ou 
-- "permission denied" em qualquer outra tabela, execute este script completo
-- no Editor SQL (SQL Editor) do Painel do seu Supabase.
--
-- Benefício: Libera acessos de leitura/escrita para a API PostGREST (que os clientes
-- usam via supabase-js) enquanto mantém a proteção lógica através das regras RLS.

BEGIN;

-- 1. PERMISSÕES PARA USUÁRIOS AUTENTICADOS (authenticated)
-- Permite operações nas tabelas que serão devidamente filtradas/protegidas pelas políticas de RLS.
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profile_images TO authenticated;
GRANT ALL ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.medical_records TO authenticated;
GRANT ALL ON TABLE public.time_slots TO authenticated;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.financial_records TO authenticated;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.health_data TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO authenticated;

-- 2. PERMISSÕES PARA PÚBLICO / VISITANTES ANÔNIMOS (anon)
-- Permite leitura básica para busca de especialidades, fotos dos profissionais e comentários públicas.
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profile_images TO anon;
GRANT SELECT ON TABLE public.reviews TO anon;

-- 3. PERMISSÕES PARA PERFIL DE SERVIÇO / ADMINISTRATIVO (service_role)
-- Geração de relatórios, triggers automáticos e rotinas de backend sem restrições.
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profile_images TO service_role;
GRANT ALL ON TABLE public.appointments TO service_role;
GRANT ALL ON TABLE public.medical_records TO service_role;
GRANT ALL ON TABLE public.time_slots TO service_role;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.financial_records TO service_role;
GRANT ALL ON TABLE public.reviews TO service_role;
GRANT ALL ON TABLE public.health_data TO service_role;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- 4. PERMISSÕES DE SEQUÊNCIAS (Evita quebras de autoincremento se instaladas por serial)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

COMMIT;
