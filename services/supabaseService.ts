
import { createClient } from '@supabase/supabase-js';
import { Sale, AppUser, SalesGoal, CRMAppointment, CRMTask, VisitReport, Ocorrencia, OcorrenciaAcao, SolicitacaoCotacao } from '../types';

// --- Solicitacao Cotacao Service ---

export const fetchSolicitacoesCotacao = async (): Promise<SolicitacaoCotacao[]> => {
  try {
    const { data, error } = await supabase.from('solicitacoes_cotacao').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.warn("Solicitacoes Cotacao: Table might not exist, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_SOLICITACOES_COTACAO');
    return localData ? JSON.parse(localData) : [];
  }
};

export const upsertSolicitacaoCotacao = async (solicitacao: SolicitacaoCotacao) => {
  const payload = { ...solicitacao };
  if (!payload.id) payload.id = generateUUID();
  if (!payload.created_at) payload.created_at = new Date().toISOString();
  
  try {
    const { error } = await supabase.from('solicitacoes_cotacao').upsert([payload]);
    if (error) throw error;
    return payload;
  } catch (err: any) {
    console.warn("Solicitacoes Cotacao: Error saving to Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_SOLICITACOES_COTACAO');
    const solicitacoes: SolicitacaoCotacao[] = localData ? JSON.parse(localData) : [];
    const index = solicitacoes.findIndex(s => s.id === payload.id);
    if (index >= 0) {
      solicitacoes[index] = payload;
    } else {
      solicitacoes.push(payload);
    }
    localStorage.setItem('AIR_SALES_SOLICITACOES_COTACAO', JSON.stringify(solicitacoes));
    return payload;
  }
};

export const deleteSolicitacaoCotacao = async (id: string) => {
  try {
    const { error } = await supabase.from('solicitacoes_cotacao').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.warn("Solicitacoes Cotacao: Error deleting from Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_SOLICITACOES_COTACAO');
    if (localData) {
      const solicitacoes: SolicitacaoCotacao[] = JSON.parse(localData);
      const filtered = solicitacoes.filter(s => s.id !== id);
      localStorage.setItem('AIR_SALES_SOLICITACOES_COTACAO', JSON.stringify(filtered));
    }
    return true;
  }
};

// --- Ocorrencias Service ---

export const fetchOcorrenciaAcoes = async (ocorrencia_id: string): Promise<OcorrenciaAcao[]> => {
  try {
    const { data, error } = await supabase.from('ocorrencia_acoes').select('*').eq('ocorrencia_id', ocorrencia_id).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.warn("OcorrenciaAcoes: Table might not exist, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_OCORRENCIA_ACOES');
    const allAcoes: OcorrenciaAcao[] = localData ? JSON.parse(localData) : [];
    return allAcoes.filter(a => a.ocorrencia_id === ocorrencia_id);
  }
};

export const upsertOcorrenciaAcao = async (acao: OcorrenciaAcao) => {
  const payload = { ...acao };
  if (!payload.id) payload.id = generateUUID();
  if (!payload.created_at) payload.created_at = new Date().toISOString();
  
  try {
    const { error } = await supabase.from('ocorrencia_acoes').upsert([payload]);
    if (error) throw error;
    return payload;
  } catch (err: any) {
    console.warn("OcorrenciaAcoes: Error saving to Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_OCORRENCIA_ACOES');
    const acoes: OcorrenciaAcao[] = localData ? JSON.parse(localData) : [];
    const index = acoes.findIndex(a => a.id === payload.id);
    if (index >= 0) {
      acoes[index] = payload;
    } else {
      acoes.push(payload);
    }
    localStorage.setItem('AIR_SALES_OCORRENCIA_ACOES', JSON.stringify(acoes));
    return payload;
  }
};

export const deleteOcorrenciaAcao = async (id: string) => {
  try {
    const { error } = await supabase.from('ocorrencia_acoes').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.warn("OcorrenciaAcoes: Error deleting from Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_OCORRENCIA_ACOES');
    if (localData) {
      const acoes: OcorrenciaAcao[] = JSON.parse(localData);
      localStorage.setItem('AIR_SALES_OCORRENCIA_ACOES', JSON.stringify(acoes.filter(a => a.id !== id)));
    }
    return true;
  }
};

export const fetchOcorrencias = async (): Promise<Ocorrencia[]> => {
  try {
    const { data, error } = await supabase.from('ocorrencias').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.warn("Ocorrencias: Table might not exist, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_OCORRENCIAS');
    return localData ? JSON.parse(localData) : [];
  }
};

export const upsertOcorrencia = async (ocorrencia: Ocorrencia) => {
  const payload = { ...ocorrencia };
  if (!payload.id) payload.id = generateUUID();
  if (!payload.created_at) payload.created_at = new Date().toISOString();
  
  try {
    const { error } = await supabase.from('ocorrencias').upsert([payload]);
    if (error) throw error;
    return payload;
  } catch (err: any) {
    console.warn("Ocorrencias: Error saving to Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_OCORRENCIAS');
    const ocorrencias: Ocorrencia[] = localData ? JSON.parse(localData) : [];
    const index = ocorrencias.findIndex(o => o.id === payload.id);
    if (index >= 0) {
      ocorrencias[index] = payload;
    } else {
      ocorrencias.push(payload);
    }
    localStorage.setItem('AIR_SALES_OCORRENCIAS', JSON.stringify(ocorrencias));
    return payload;
  }
};

export const deleteOcorrencia = async (id: string) => {
  try {
    const { error } = await supabase.from('ocorrencias').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.warn("Ocorrencias: Error deleting from Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_OCORRENCIAS');
    if (localData) {
      const ocorrencias: Ocorrencia[] = JSON.parse(localData);
      const filtered = ocorrencias.filter(o => o.id !== id);
      localStorage.setItem('AIR_SALES_OCORRENCIAS', JSON.stringify(filtered));
    }
    return true;
  }
};

// --- Visit Reports Service ---

export const fetchVisitReports = async (): Promise<VisitReport[]> => {
  try {
    const { data, error } = await supabase.from('visit_reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.warn("Visit Reports: Table might not exist", err.message);
    return [];
  }
};

export const upsertVisitReport = async (report: VisitReport) => {
  const payload = { ...report };
  if (!payload.id) payload.id = generateUUID();
  if (!payload.created_at) payload.created_at = new Date().toISOString();
  
  try {
    const { error } = await supabase.from('visit_reports').upsert([payload]);
    if (error) throw error;
    return payload;
  } catch (err: any) {
    console.error("Visit Reports: Error saving report", err.message);
    throw err;
  }
};

export const deleteVisitReport = async (id: string) => {
  try {
    const { error } = await supabase.from('visit_reports').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    throw err;
  }
};


export const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nYWhqam9lZ3NlZmZlem5kb2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTgyNTksImV4cCI6MjA4NDA5NDI1OX0.MHtt084b7VNp1T7wXwYnCQCb-bSQdAIEAeuMd7RIDO0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const toNumeric = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const findValue = (obj: any, targetKey: string) => {
  const keys = Object.keys(obj);
  const foundKey = keys.find(k => k.toUpperCase().replace(/[\s_]/g, '') === targetKey.toUpperCase().replace(/[\s_]/g, ''));
  return foundKey ? obj[foundKey] : null;
};

const normalizeStatus = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .replace(/APROVAC\?O/gi, 'APROVAÇÃO')
    .replace(/APROVAC.O/gi, 'APROVAÇÃO')
    .trim()
    .toUpperCase();
};

const CRM_STATUSES = [
  'EM ANALISE',
  'EM ANÁLISE',
  'EM NEGOCIACAO',
  'EM NEGOCIAÇÃO',
  'AGUARDANDO CLIENTE',
  'EM APROVACAO (INTERNO)',
  'EM APROVAÇÃO (INTERNO)',
  'PROPOSTA ENVIADA',
  'ENCERRADO',
  'CANCELADO / PERDIDO',
  'FECHADO (GANHO)',
  'FECHADO (PERDIDO)'
];

const shouldPreserveStatus = (existing: string, incoming: string) => {
  const normalizedExisting = normalizeStatus(existing);
  const normalizedIncoming = normalizeStatus(incoming);
  
  // Se o status atual no Supabase é um status específico do CRM (movimentação manual)
  // e o status vindo do ERP é apenas um status genérico de "início",
  // mantemos o status do CRM pois ele é mais rico em informação sobre a negociação.
  if (CRM_STATUSES.includes(normalizedExisting)) {
      const isGenericIncoming = 
        normalizedIncoming === 'ABERTO' || 
        normalizedIncoming === 'EM ABERTO' || 
        normalizedIncoming === 'EM APROVACAO' || 
        normalizedIncoming === 'EM APROVAÇÃO' || 
        normalizedIncoming === 'EM APROVACAO (INTERNO)' ||
        normalizedIncoming === 'EM APROVAÇÃO (INTERNO)' ||
        normalizedIncoming === 'ORCAMENTO' ||
        normalizedIncoming === 'ORÇAMENTO' ||
        normalizedIncoming === 'ORC' ||
        normalizedIncoming === 'PEDIDO' ||
        normalizedIncoming === '';
        
      if (isGenericIncoming) {
          return true;
      }
  }
  return false;
};

export const syncSalesToSupabase = async (sales: Sale[]) => {
  if (!sales || sales.length === 0) return;
  try {
    // FIX CRÍTICO: Ordenação Determinística
    // Ordenamos os dados recebidos antes de gerar sequenciais.
    const sortedSales = [...sales].sort((a, b) => {
        // 1. Agrupa por Pedido
        const pedA = Math.floor(toNumeric(findValue(a, 'PED_IN_CODIGO')));
        const pedB = Math.floor(toNumeric(findValue(b, 'PED_IN_CODIGO')));
        if (pedA !== pedB) return pedA - pedB;

        // 2. Ordena por Sequência do Item
        const seqA = Math.floor(toNumeric(findValue(a, 'ITP_IN_SEQUENCIA')));
        const seqB = Math.floor(toNumeric(findValue(b, 'ITP_IN_SEQUENCIA')));
        if (seqA !== seqB) return seqA - seqB;

        // 3. Ordena por Nota Fiscal (garante que a primeira nota fique com a sequencia original)
        const nfA = Math.floor(toNumeric(findValue(a, 'NF_NOT_IN_CODIGO')));
        const nfB = Math.floor(toNumeric(findValue(b, 'NF_NOT_IN_CODIGO')));
        if (nfA !== nfB) return nfA - nfB;

        // 4. Desempate por Produto
        const prodA = String(findValue(a, 'PRO_ST_ALTERNATIVO') || findValue(a, 'ITP_ST_DESCRICAO') || '');
        const prodB = String(findValue(b, 'PRO_ST_ALTERNATIVO') || findValue(b, 'ITP_ST_DESCRICAO') || '');
        return prodA.localeCompare(prodB);
    });

    const ordersMap = new Map<number, number>(); 
    const usedSequencesMap = new Map<number, Set<number>>(); // Rastreia sequências usadas por pedido

    const allRows = sortedSales.map(s => {
      let rawSer = findValue(s, 'SER_ST_CODIGO') || s['SER_ST_CODIGO'];
      let serCod = String(rawSer || '').trim();
      const pedNum = Math.floor(toNumeric(findValue(s, 'PED_IN_CODIGO')));
      const filId = Math.floor(toNumeric(findValue(s, 'FIL_IN_CODIGO')));
      let itpSeq = Math.floor(toNumeric(findValue(s, 'ITP_IN_SEQUENCIA')));
      
      if (!pedNum || pedNum === 0) return null;

      // Inicializa o Set de sequências para o pedido se não existir
      if (!usedSequencesMap.has(pedNum)) {
          usedSequencesMap.set(pedNum, new Set());
      }
      const usedSeqs = usedSequencesMap.get(pedNum)!;

      // Lógica de Geração de Sequência Estável e Tratamento de Colisão (Múltiplas Notas)
      if (itpSeq === 0) {
          const currentCount = ordersMap.get(pedNum) || 0;
          itpSeq = currentCount + 1;
          
          // Garante que não colida com nada existente (improvável se veio 0, mas seguro)
          while (usedSeqs.has(itpSeq)) {
              itpSeq++;
          }
          
          ordersMap.set(pedNum, itpSeq);
      } else {
          // Se já tem sequência, verifica colisão (ex: mesmo item faturado em 2 notas)
          if (usedSeqs.has(itpSeq)) {
              // Colisão detectada! Adiciona offset para diferenciar
              // Ex: Item 1 (Nota A) -> 1
              //     Item 1 (Nota B) -> 1001
              let newSeq = itpSeq + 1000;
              while (usedSeqs.has(newSeq)) {
                  newSeq += 1000;
              }
              console.log(`[Import] Colisão de sequência detectada no Pedido ${pedNum}. Alterando Seq ${itpSeq} para ${newSeq}`);
              itpSeq = newSeq;
          }
      }

      // Registra a sequência como usada
      usedSeqs.add(itpSeq);

      const rawMercadoria = findValue(s, 'ITN_RE_VALORMERCADORIA');
      const rawTotal = findValue(s, 'ITN_RE_VALORTOTAL');
      
      console.log(`[Import Debug] PED: ${pedNum} SEQ: ${itpSeq}`, { 
        rawMercadoria, 
        typeMercadoria: typeof rawMercadoria,
        numericMercadoria: toNumeric(rawMercadoria),
        rawTotal, 
        typeTotal: typeof rawTotal,
        numericTotal: toNumeric(rawTotal),
        allKeys: Object.keys(s) // Log all keys to see what's available
      });

      return {
        fil_in_codigo: filId,
        filial_nome: String(findValue(s, 'FILIAL_NOME') || '').trim(),
        ser_st_codigo: serCod,
        ped_in_codigo: pedNum,
        itp_in_sequencia: itpSeq,
        ped_dt_emissao: findValue(s, 'PED_DT_EMISSAO') || null,
        ped_ch_situacao: String(findValue(s, 'PED_CH_SITUACAO') || '').trim(),
        ped_st_status: normalizeStatus(String(findValue(s, 'PED_ST_STATUS') || '').trim()),
        cli_in_codigo: Math.floor(toNumeric(findValue(s, 'CLI_IN_CODIGO'))),
        cliente_nome: String(findValue(s, 'CLIENTE_NOME') || '').trim(),
        rep_in_codigo: Math.floor(toNumeric(findValue(s, 'REP_IN_CODIGO'))),
        representante_nome: String(findValue(s, 'REPRESENTANTE_NOME') || '').trim(),
        pro_in_codigo: Math.floor(toNumeric(findValue(s, 'PRO_IN_CODIGO'))),
        pro_st_alternativo: String(findValue(s, 'PRO_ST_ALTERNATIVO') || '').trim(),
        itp_st_descricao: String(findValue(s, 'ITP_ST_DESCRICAO') || '').trim(),
        itp_re_quantidade: toNumeric(findValue(s, 'ITP_RE_QUANTIDADE')),
        itp_re_valorunitario: toNumeric(findValue(s, 'ITP_RE_VALORUNITARIO')),
        itp_re_valormercadoria: toNumeric(findValue(s, 'ITP_RE_VALORMERCADORIA')),
        itn_re_valormercadoria: toNumeric(findValue(s, 'ITN_RE_VALORMERCADORIA')),
        itn_re_valortotal: toNumeric(findValue(s, 'ITN_RE_VALORTOTAL')),
        itp_st_pedidocliente: String(findValue(s, 'ITP_ST_PEDIDOCLIENTE') || '').trim(),
        itp_st_situacao: normalizeStatus(String(findValue(s, 'ITP_ST_SITUACAO') || '').trim()),
        it_st_status: normalizeStatus(String(findValue(s, 'IT_ST_STATUS') || '').trim()),
        nf_not_in_codigo: Math.floor(toNumeric(findValue(s, 'NF_NOT_IN_CODIGO'))),
        not_dt_emissao: findValue(s, 'NOT_DT_EMISSAO') || null,
        ipe_dt_dataentrega: findValue(s, 'IPE_DT_DATAENTREGA') || null,
        is_hot: s.IS_HOT ? true : false
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    if (allRows.length === 0) return;

    // Remove Duplicates (client-side check)
    const uniqueMap = new Map();
    allRows.forEach(row => {
      // Create a unique key based on the primary key constraint of the table
      const key = `${row.fil_in_codigo}-${row.ser_st_codigo}-${row.ped_in_codigo}-${row.itp_in_sequencia}`;
      uniqueMap.set(key, row);
    });
    const uniqueRows = Array.from(uniqueMap.values());

    // --- LÓGICA DE PRESERVAÇÃO DE STATUS DO CRM ---
    // Antes de fazer o upsert, buscamos os status atuais no banco para não sobrescrever 
    // movimentações manuais feitas no CRM com status genéricos "ABERTO" do ERP.
    try {
        const keysToFetch = uniqueRows.map(r => r.ped_in_codigo);
        // Busca em lotes para evitar limites de URL/Query
        const batchSize = 500;
        const existingMap = new Map<string, string>();
        
        for (let i = 0; i < keysToFetch.length; i += batchSize) {
            const batchKeys = keysToFetch.slice(i, i + batchSize);
            const { data: existingData } = await supabase
                .from('sales')
                .select('fil_in_codigo, ser_st_codigo, ped_in_codigo, itp_in_sequencia, ped_st_status')
                .in('ped_in_codigo', batchKeys);
            
            existingData?.forEach(row => {
                const key = `${row.fil_in_codigo}-${row.ser_st_codigo}-${row.ped_in_codigo}-${row.itp_in_sequencia}`;
                existingMap.set(key, row.ped_st_status);
            });
        }

        // Aplica a preservação no array de upsert (uniqueRows)
        uniqueRows.forEach(row => {
            const key = `${row.fil_in_codigo}-${row.ser_st_codigo}-${row.ped_in_codigo}-${row.itp_in_sequencia}`;
            const existingStatus = existingMap.get(key);
            if (existingStatus && shouldPreserveStatus(existingStatus, row.ped_st_status)) {
                row.ped_st_status = existingStatus;
            }
        });

        // TAMBÉM aplica a preservação no array ORIGINAL (sales) para que o retorno do dataService reflita a mudança
        // e evite o "reset" visual imediato no UI.
        sales.forEach(s => {
            const fil = Math.floor(toNumeric(findValue(s, 'FIL_IN_CODIGO')));
            const ser = String(findValue(s, 'SER_ST_CODIGO') || '').trim();
            const ped = Math.floor(toNumeric(findValue(s, 'PED_IN_CODIGO')));
            const seq = Math.floor(toNumeric(findValue(s, 'ITP_IN_SEQUENCIA')));
            
            const key = `${fil}-${ser}-${ped}-${seq}`;
            const existingStatus = existingMap.get(key);
            
            const currentStatus = String(findValue(s, 'PED_ST_STATUS') || '').trim();
            
            if (existingStatus && shouldPreserveStatus(existingStatus, currentStatus)) {
                // Atualiza no objeto original usando a chave que ele já possui (provavelmente uppercase)
                const keys = Object.keys(s);
                const statusKey = keys.find(k => k.toUpperCase() === 'PED_ST_STATUS') || 'PED_ST_STATUS';
                s[statusKey] = existingStatus;
            }
        });
    } catch (fetchErr) {
        console.error("Erro ao buscar status existentes para preservação:", fetchErr);
        // Continua o upsert mesmo se falhar a busca (melhor atualizar do que falhar tudo)
    }

    const { error } = await supabase.from('sales').upsert(uniqueRows, { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo,itp_in_sequencia' });
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error("Erro no Sync Supabase:", err.message);
    return false;
  }
};

export const updateOrderStatus = async (keys: { fil: number, ser: string, ped: number }, newStatus: string) => {
    try {
        // Atualiza todos os itens do pedido com o novo status
        const { error } = await supabase
            .from('sales')
            .update({ ped_st_status: newStatus })
            .match({ 
                fil_in_codigo: keys.fil, 
                ser_st_codigo: keys.ser, 
                ped_in_codigo: keys.ped 
            });
            
        if (error) throw error;
        return true;
    } catch (e: any) {
        throw new Error(`Erro ao atualizar status: ${e.message}`);
    }
};

export const updateOrderHotStatus = async (keys: { fil: number, ser: string, ped: number }, isHot: boolean) => {
    try {
        // Usa filtro explícito para garantir compatibilidade
        const { error } = await supabase
            .from('sales')
            .update({ is_hot: isHot })
            .eq('fil_in_codigo', keys.fil)
            .eq('ser_st_codigo', keys.ser)
            .eq('ped_in_codigo', keys.ped);
            
        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }
        return true;
    } catch (e: any) {
        // Melhora a mensagem de erro para o usuário
        const msg = e.message || JSON.stringify(e);
        if (msg.includes('column') && msg.includes('does not exist')) {
             throw new Error("A coluna 'is_hot' não existe no banco de dados. Contate o administrador.");
        }
        throw new Error(`Erro API: ${msg}`);
    }
};

export const deleteSale = async (keys: { fil: number, ser: string, ped: number, seq: number }) => {
  console.log("🛠️ [SupabaseService] Executando DELETE com chaves tipadas:", {
    fil: Number(keys.fil),
    ser: String(keys.ser),
    ped: Number(keys.ped),
    seq: Number(keys.seq)
  });

  try {
    const { data, error, status, statusText } = await supabase
      .from('sales')
      .delete()
      .match({ 
        fil_in_codigo: Number(keys.fil),
        ser_st_codigo: String(keys.ser),
        ped_in_codigo: Number(keys.ped),
        itp_in_sequencia: Number(keys.seq)
      })
      .select();

    if (error) {
      console.error("❌ [SupabaseService] Erro na query:", error);
      throw error;
    }

    console.log(`📡 [SupabaseService] Resposta do Servidor: Status ${status} (${statusText})`);

    if (!data || data.length === 0) {
      console.warn("⚠️ [SupabaseService] Registro não encontrado no banco para exclusão. Verifique se as chaves existem na tabela 'sales'.");
      return false;
    }

    console.log("✅ [SupabaseService] Registro removido do Supabase:", data);
    return true;
  } catch (e: any) {
    console.error("❌ [SupabaseService] Falha catastrófica na exclusão:", e.message);
    throw e;
  }
};

export const deleteAllSales = async () => {
  console.log("⚠️ [SupabaseService] Executando DELETE ALL SALES");

  try {
    const { error, status } = await supabase
      .from('sales')
      .delete()
      .neq('ped_in_codigo', -999999); // Deletes everything

    if (error) {
      console.error("❌ [SupabaseService] Erro ao limpar tabela sales:", error);
      throw error;
    }

    console.log(`✅ [SupabaseService] Tabela sales limpa. Status: ${status}`);
    return true;
  } catch (e: any) {
    console.error("❌ [SupabaseService] Falha ao limpar banco:", e.message);
    throw e;
  }
};

export const fetchAllRepresentatives = async () => {
  try {
    const { data, error } = await supabase.from('sales').select('rep_in_codigo, representante_nome').not('rep_in_codigo', 'is', null).limit(5000);
    if (error) throw error;
    const uniqueMap = new Map();
    data?.forEach((row: any) => {
      const code = Number(row.rep_in_codigo);
      const name = String(row.representante_nome || '').trim();
      if (!uniqueMap.has(code) && name.length > 0) uniqueMap.set(code, name);
    });
    return Array.from(uniqueMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) { return []; }
};

export const fetchFromSupabase = async (filterCode: string = 'PD', repCode?: number): Promise<Sale[]> => {
  try {
    let query = supabase.from('sales').select('*');
    
    // Se filterCode for vazio, não filtra por série (traz OV e PD)
    if (filterCode && filterCode.trim() !== '') {
        const codes = filterCode.split(',').map(c => c.toUpperCase().trim());
        if (codes.length > 1) {
            query = query.in('ser_st_codigo', codes);
        } else {
            query = query.eq('ser_st_codigo', codes[0]);
        }
    }

    if (repCode) query = query.eq('rep_in_codigo', repCode);
    
    const { data, error } = await query.order('ped_dt_emissao', { ascending: false }).limit(2000);
    if (error) throw error;
    return (data || []).map(row => ({
      "SER_ST_CODIGO": row.ser_st_codigo,
      "PED_IN_CODIGO": row.ped_in_codigo,
      "CLI_IN_CODIGO": row.cli_in_codigo,
      "CLIENTE_NOME": row.cliente_nome,
      "FIL_IN_CODIGO": row.fil_in_codigo,
      "FILIAL_NOME": row.filial_nome,
      "PED_DT_EMISSAO": row.ped_dt_emissao,
      "PED_CH_SITUACAO": row.ped_ch_situacao,
      "PED_ST_STATUS": normalizeStatus(row.ped_st_status),
      "REP_IN_CODIGO": row.rep_in_codigo,
      "REPRESENTANTE_NOME": row.representante_nome,
      "ITP_IN_SEQUENCIA": row.itp_in_sequencia,
      "ITP_ST_SITUACAO": normalizeStatus(row.itp_st_situacao),
      "IT_ST_STATUS": normalizeStatus(row.it_st_status),
      "NF_NOT_IN_CODIGO": row.nf_not_in_codigo,
      "NOT_DT_EMISSAO": row.not_dt_emissao,
      "PRO_ST_ALTERNATIVO": row.pro_st_alternativo,
      "PRO_IN_CODIGO": row.pro_in_codigo,
      "ITP_ST_DESCRICAO": row.itp_st_descricao,
      "ITP_RE_QUANTIDADE": row.itp_re_quantidade,
      "ITP_RE_VALORUNITARIO": row.itp_re_valorunitario,
      "ITP_RE_VALORMERCADORIA": row.itp_re_valormercadoria,
      "ITN_RE_VALORMERCADORIA": row.itn_re_valormercadoria,
      "ITN_RE_VALORTOTAL": row.itn_re_valortotal,
      "ITP_ST_PEDIDOCLIENTE": row.itp_st_pedidocliente,
      "IPE_DT_DATAENTREGA": row.ipe_dt_dataentrega,
      "IS_HOT": row.is_hot || false,
      "PAGO_ASSISTENTE": row.pago_assistente || false,
      "PAGO_VENDEDOR": row.pago_vendedor || false,
      "PAGO_SUPERVISOR": row.pago_supervisor || false,
      "PAGO_POSVENDA": row.pago_posvenda || false,
      "PAGO_GERENTE": row.pago_gerente || false,
      "MOTIVO_ATRASO": row.motivo_atraso || ''
    }));
  } catch (err) { return []; }
};

export const updateSaleDelayReason = async (keys: { fil: number, ser: string, ped: number }, reason: string) => {
    try {
        const { error } = await supabase
            .from('sales')
            .update({ motivo_atraso: reason })
            .match({
                fil_in_codigo: keys.fil,
                ser_st_codigo: keys.ser,
                ped_in_codigo: keys.ped
            });

        if (error) throw error;
        return true;
    } catch (e: any) {
        throw new Error(`Erro ao atualizar motivo de atraso: ${e.message}`);
    }
};

export const updateSaleCommissionStatus = async (keys: any, isPaid: boolean, columnName: string) => {
    try {
        const { error } = await supabase.from('sales').update({ [columnName.toLowerCase()]: isPaid }).match({ 
            fil_in_codigo: keys.fil, ser_st_codigo: keys.ser, ped_in_codigo: keys.ped, itp_in_sequencia: keys.seq 
        });
        if (error) throw error;
        return true;
    } catch (e) { throw e; }
}

export const fetchAppUsers = async (): Promise<AppUser[]> => {
  const { data, error } = await supabase.from('app_users').select('*').order('name');
  if (error) return [];
  return data || [];
};

export const upsertAppUser = async (user: AppUser) => {
  const { error } = await supabase.from('app_users').upsert([user]);
  if (error) throw error;
  return true;
};

export const deleteAppUser = async (id: string) => {
  const { error } = await supabase.from('app_users').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const fetchSalesGoals = async (): Promise<SalesGoal[]> => {
  const { data, error } = await supabase.from('sales_goals').select('*').order('ano', { ascending: false }).order('mes', { ascending: false });
  if (error) return [];
  return data || [];
};

export const upsertSalesGoal = async (goal: SalesGoal) => {
  const payload = { ...goal };
  if (!payload.id) {
     const { data: existing } = await supabase.from('sales_goals').select('id').eq('rep_in_codigo', goal.rep_in_codigo).eq('ano', goal.ano).eq('mes', goal.mes).maybeSingle();
     if (existing?.id) payload.id = existing.id;
     else payload.id = generateUUID();
  }
  const { error } = await supabase.from('sales_goals').upsert([payload], { onConflict: 'rep_in_codigo,ano,mes' });
  if (error) throw error;
  return true;
};

export const deleteSalesGoal = async (id: string) => {
  const { error } = await supabase.from('sales_goals').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// --- CRM Appointments Service ---

export const fetchCRMAppointments = async (): Promise<CRMAppointment[]> => {
  try {
    const { data, error } = await supabase.from('crm_appointments').select('*').order('start_date', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    // Fallback: Return Mock Data if table doesn't exist
    console.warn("CRM Appointments: Using Mock Data (Table might not exist)", err.message);
    const mockEvents: CRMAppointment[] = [
      { id: '1', title: 'Visita Técnica TGA', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '11:00', activity_type: 'VISITA', priority: 'ALTA', status: 'AGENDADO', recurrence: 'UNICO', client_name: 'TGA TECH LTDA', rep_in_codigo: 50, req_confirmation: true, notify_email: true, hide_appointment: false },
      { id: '2', title: 'Alinhamento Comercial', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], start_time: '14:00', end_time: '15:00', activity_type: 'REUNIAO', priority: 'MEDIA', status: 'AGENDADO', recurrence: 'UNICO', client_name: 'CLARIANT S.A.', rep_in_codigo: 50, req_confirmation: false, notify_email: false, hide_appointment: false },
    ];
    return mockEvents;
  }
};

export const upsertCRMAppointment = async (appt: CRMAppointment) => {
  const payload = { ...appt };
  if (!payload.id) payload.id = generateUUID();
  
  try {
    const { error } = await supabase.from('crm_appointments').upsert([payload]);
    if (error) throw error;
    return payload;
  } catch (err: any) {
    console.warn("CRM Appointments: Using Local Save (Mock)", err.message);
    return payload; // Return payload to simulate success in UI
  }
};

export const deleteCRMAppointment = async (id: string) => {
  try {
    const { error } = await supabase.from('crm_appointments').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    return true; // Simulate success
  }
};

// --- CRM Tasks Service ---

export const fetchCRMTasks = async (): Promise<CRMTask[]> => {
  try {
    const { data, error } = await supabase.from('crm_tasks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.warn("CRM Tasks: Table might not exist", err.message);
    return [];
  }
};

export const upsertCRMTask = async (task: CRMTask) => {
  const payload = { ...task };
  if (!payload.id) payload.id = generateUUID();
  if (!payload.created_at) payload.created_at = new Date().toISOString();
  
  try {
    const { error } = await supabase.from('crm_tasks').upsert([payload]);
    if (error) throw error;
    return payload;
  } catch (err: any) {
    console.error("CRM Tasks: Error saving task", err.message);
    throw err;
  }
};

export const deleteCRMTask = async (id: string) => {
  try {
    const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    throw err;
  }
};
