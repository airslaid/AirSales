-- 1. Adicionar uma nova coluna `is_hot` à tabela do CRM
ALTER TABLE public.crm_pipeline ADD COLUMN IF NOT EXISTS is_hot BOOLEAN DEFAULT FALSE;

-- 2. Migrar inteligentemente as flags de "Hot Lead" que já existiam na tabela antiga (sales) para a nova (crm_pipeline)
UPDATE public.crm_pipeline c
SET is_hot = s.is_hot
FROM public.sales s
WHERE c.fil_in_codigo = s.fil_in_codigo
  AND c.ser_st_codigo = s.ser_st_codigo
  AND c.ped_in_codigo = s.ped_in_codigo
  AND s.is_hot = TRUE;
