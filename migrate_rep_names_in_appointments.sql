-- Script de Migração: Recupera nomes de representantes para agendamentos antigos
-- Este script não remove dados, apenas preenche as novas colunas usando a tabela de vendas como referência.

-- 1. Preenche o rep_nome buscando o nome correspondente ao código na tabela sales
UPDATE crm_appointments t
SET rep_nome = (
  SELECT representante_nome 
  FROM sales s 
  WHERE s.rep_in_codigo = t.rep_in_codigo 
  LIMIT 1
)
WHERE (rep_nome IS NULL OR rep_nome = '')
AND rep_in_codigo IS NOT NULL;

-- 2. Preenche o created_by_name com o nome do representante (para registros antigos onde não sabemos quem criou)
UPDATE crm_appointments
SET created_by_name = rep_nome
WHERE (created_by_name IS NULL OR created_by_name = '')
AND rep_nome IS NOT NULL;
