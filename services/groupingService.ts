
import { Sale } from '../types';

export interface GroupedSale {
  summary: Sale;
  items: Sale[];
}

export const groupSalesByOrder = (data: Sale[]): GroupedSale[] => {
  const groups = new Map<string, { summary: Sale, items: Sale[] }>();

  data.forEach(item => {
    // Agrupa apenas por Pedido (ignora nota fiscal na chave para evitar duplicidade de linhas por pedido)
    let groupKey = `${item.FIL_IN_CODIGO}-${item.SER_ST_CODIGO}-${item.PED_IN_CODIGO}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { 
        summary: { ...item }, 
        items: [] 
      });
    }
    
    const group = groups.get(groupKey)!;
    group.items.push(item);
  });

  return Array.from(groups.entries()).map(([key, g]) => {
     // O SupabaseService adiciona 1000 à sequência para cada nota fiscal adicional do mesmo item.
     // A sequência original (base) é obtida com o operador modulo 1000.
     // Se o item for de importação manual (FILIAL 900), ele não segue essa regra, então usamos a seq direta.
     const getBaseSeq = (item: Sale) => {
       const seq = Number(item.ITP_IN_SEQUENCIA) || 0;
       return Number(item.FIL_IN_CODIGO) === 900 ? seq : (seq % 1000 || seq);
     };

     // Identifica itens únicos pela sequência base
     const uniqueItemsBySeq = Array.from(
       new Map(g.items.map(item => [`${getBaseSeq(item)}`, item])).values()
     );

     const totalVal = uniqueItemsBySeq.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
     const totalQtd = uniqueItemsBySeq.reduce((acc, curr) => acc + (Number(curr.ITP_RE_QUANTIDADE) || 0), 0);
     const totalValorTotal = uniqueItemsBySeq.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORTOTAL) || 0), 0);
     const totalComissao = g.items.reduce((acc, curr) => acc + (Number(curr.VALOR_COMISSAO) || 0), 0);
     
     // Soma também os valores da nota fiscal para exibição correta nas colunas novas
     const totalNotaMerc = g.items.reduce((acc, curr) => acc + (Number(curr.ITN_RE_VALORMERCADORIA) || 0), 0);
     const totalNotaTotal = g.items.reduce((acc, curr) => acc + (Number(curr.ITN_RE_VALORTOTAL) || 0), 0);
     
     // Coleta todas as notas fiscais únicas para exibição consolidada
     const uniqueNfs = Array.from(new Set(g.items.map(i => i.NF_NOT_IN_CODIGO).filter(Boolean))).sort();
     
     g.summary.ITP_RE_VALORMERCADORIA = totalVal;
     g.summary.ITP_RE_QUANTIDADE = totalQtd;
     g.summary.VALOR_COMISSAO = totalComissao;
     g.summary.ITN_RE_VALORMERCADORIA = totalNotaMerc;
     g.summary.ITN_RE_VALORTOTAL = totalNotaTotal;
     g.summary.ITP_RE_VALORTOTAL = totalValorTotal;
     
     // Atribui a string consolidada ao campo de NF do sumário
     g.summary.NF_NOT_IN_CODIGO = uniqueNfs.length > 0 ? uniqueNfs.join(', ') : '-';

     g.summary.ITP_ST_DESCRICAO = `${uniqueItemsBySeq.length} Itens`;
     g.summary.PRO_ST_ALTERNATIVO = '-';
     g.summary.ITP_RE_VALORUNITARIO = 0;
     g.summary.COMISSAO_PAGA = g.items.every(i => i.COMISSAO_PAGA);
     // Adicionamos le groupKey para uso no UI se necessário
     (g.summary as any).__groupKey = key;

     return g;
  });
};
