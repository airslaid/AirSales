-- ==========================================
-- SCRIPT: Criação da Tabela CRM Pipeline
-- ==========================================
-- Rode isso na aba SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.crm_pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fil_in_codigo INTEGER NOT NULL,
    ser_st_codigo TEXT NOT NULL,
    ped_in_codigo INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexação e constraint para evitar múltiplas entradas iguais
CREATE UNIQUE INDEX IF NOT EXISTS crm_pipeline_unique_idx
ON public.crm_pipeline (fil_in_codigo, ser_st_codigo, ped_in_codigo);

-- Configurando Row Level Security (RLS) para livre acesso no Frontend (anon key)
ALTER TABLE public.crm_pipeline ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Allow select on crm_pipeline"
ON public.crm_pipeline FOR SELECT USING (true);

CREATE POLICY "Allow insert on crm_pipeline"
ON public.crm_pipeline FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update on crm_pipeline"
ON public.crm_pipeline FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on crm_pipeline"
ON public.crm_pipeline FOR DELETE USING (true);
