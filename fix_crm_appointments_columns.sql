-- ==========================================
-- SCRIPT: Atualizar tabela crm_appointments existente
-- ==========================================
-- Execute ESTE script se a tabela já existe mas ainda dá erro ao salvar.
-- Ele adiciona as colunas que estavam faltando.

ALTER TABLE public.crm_appointments
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS rep_nome TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS req_confirmation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hide_appointment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Garante que políticas de acesso estão corretas
ALTER TABLE public.crm_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on crm_appointments" ON public.crm_appointments;
CREATE POLICY "Allow all on crm_appointments" ON public.crm_appointments FOR ALL USING (true) WITH CHECK (true);
