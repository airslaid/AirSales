-- Adiciona a coluna ITP_RE_VALORTOTAL na tabela sales
ALTER TABLE sales ADD COLUMN itp_re_valortotal NUMERIC;

-- Comentário para controle
COMMENT ON COLUMN sales.itp_re_valortotal IS 'Valor Total do Item do Pedido (conforme ERP/PowerBI)';
