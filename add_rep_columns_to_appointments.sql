-- Adiciona colunas para identificar o representante que é dono do compromisso e quem o criou
-- Execute este script no SQL Editor do Supabase

ALTER TABLE crm_appointments 
ADD COLUMN IF NOT EXISTS rep_nome TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Opcional: Se você quiser garantir que o rep_in_codigo também esteja lá
-- ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS rep_in_codigo INTEGER;
