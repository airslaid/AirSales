-- ==========================================
-- SCRIPT: Criação Completa da Tabela de Agenda
-- ==========================================
-- Execute este script no SQL Editor do Supabase para garantir que a tabela exista com todas as colunas.

CREATE TABLE IF NOT EXISTS public.crm_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_type TEXT NOT NULL DEFAULT 'REUNIAO',
    priority TEXT NOT NULL DEFAULT 'MEDIA',
    status TEXT NOT NULL DEFAULT 'AGENDADO',
    recurrence TEXT NOT NULL DEFAULT 'UNICO',
    client_id INTEGER,
    client_name TEXT,
    rep_in_codigo INTEGER,
    rep_nome TEXT,
    created_by_name TEXT,
    req_confirmation BOOLEAN DEFAULT FALSE,
    notify_email BOOLEAN DEFAULT FALSE,
    hide_appointment BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.crm_appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Livre para a API anon/service_role por enquanto)
DROP POLICY IF EXISTS "Allow all on crm_appointments" ON public.crm_appointments;
CREATE POLICY "Allow all on crm_appointments" ON public.crm_appointments FOR ALL USING (true) WITH CHECK (true);

-- Indexação para performance
CREATE INDEX IF NOT EXISTS idx_crm_appointments_date ON public.crm_appointments(start_date);
CREATE INDEX IF NOT EXISTS idx_crm_appointments_rep ON public.crm_appointments(rep_in_codigo);
