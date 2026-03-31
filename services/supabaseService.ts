
import { createClient } from '@supabase/supabase-js';
import { Sale, AppUser, SalesGoal, CRMAppointment, CRMTask, VisitReport, Ocorrencia, OcorrenciaAcao, SolicitacaoCotacao, Customer, CRMPipelineStatus } from '../types';

// --- Solicitacao Cotacao Service ---

export const fetchSolicitacoesCotacao = async (): Promise<SolicitacaoCotacao[]> => {
  try {
    const { data, error } = await supabase.from('solicitacoes_cotacao').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    // Update local storage with fresh data
    if (data) {
      localStorage.setItem('AIR_SALES_SOLICITACOES_COTACAO', JSON.stringify(data));
    }
    
    return data || [];
  } catch (err: any) {
    console.warn("Solicitacoes Cotacao: Error fetching from Supabase, falling back to localStorage", err.message);
    const localData = localStorage.getItem('AIR_SALES_SOLICITACOES_COTACAO');
    return localData ? JSON.parse(localData) : [];
  }
};

export const upsertSolicitacaoCotacao = async (solicitacao: SolicitacaoCotacao) => {
  const payload = { ...solicitacao };
  if (!payload.id) payload.id = generateUUID();
  if (!payload.created_at) payload.created_at = new Date().toISOString();
  
  try {
    console.log("Supabase: Attempting upsert to 'solicitacoes_cotacao'", payload);
    const { data, error } = await supabase.from('solicitacoes_cotacao').upsert([payload]).select();
    if (error) {
      console.error("Supabase Error detail:", error);
      throw error;
    }
    
    // Update local storage on success
    const localData = localStorage.getItem('AIR_SALES_SOLICITACOES_COTACAO');
    const solicitacoes: SolicitacaoCotacao[] = localData ? JSON.parse(localData) : [];
    const index = solicitacoes.findIndex(s => s.id === payload.id);
    if (index >= 0) {
      solicitacoes[index] = payload;
    } else {
      solicitacoes.push(payload);
    }
    localStorage.setItem('AIR_SALES_SOLICITACOES_COTACAO', JSON.stringify(solicitacoes));
    
    console.log("Supabase: Upsert successful", data);
    return payload;
  } catch (err: any) {
    console.error("Solicitacoes Cotacao: Critical error saving to Supabase", {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
    
    // Fallback to localStorage
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
    
    // Update local storage on success
    const localData = localStorage.getItem('AIR_SALES_SOLICITACOES_COTACAO');
    if (localData) {
      const solicitacoes: SolicitacaoCotacao[] = JSON.parse(localData);
      const filtered = solicitacoes.filter(s => s.id !== id);
      localStorage.setItem('AIR_SALES_SOLICITACOES_COTACAO', JSON.stringify(filtered));
    }
    
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

// CRM Pipeline / Statuses
export const fetchCRMPipelineStatuses = async (): Promise<CRMPipelineStatus[]> => {
    try {
        const { data, error } = await supabase.from('crm_pipeline').select('*');
        if (error) {
            console.warn("crm_pipeline table might not exist yet:", error.message);
            return [];
        }
        return data || [];
    } catch (e: any) {
        console.warn("fetchCRMPipelineStatuses error:", e.message);
        return [];
    }
};

export const upsertCRMPipelineStatus = async (pipeline: CRMPipelineStatus) => {
    const payload = { ...pipeline };
    payload.updated_at = new Date().toISOString();
    
    try {
        const { error } = await supabase
            .from('crm_pipeline')
            .upsert([payload], { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo' });
            
        if (error) throw error;
        return true;
    } catch (e: any) {
        throw new Error(`Erro ao atualizar status CRM Pipeline: ${e.message}`);
    }
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

    // FIX: Deduplicate exact items before generating sequences, prioritizing the last one (usually latest status)
    const deduplicatedSales = [];
    const seenItems = new Set();
    for (let i = sortedSales.length - 1; i >= 0; i--) {
        const s = sortedSales[i];
        const fil = Math.floor(toNumeric(findValue(s, 'FIL_IN_CODIGO')));
        const ser = String(findValue(s, 'SER_ST_CODIGO') || '').trim();
        const ped = Math.floor(toNumeric(findValue(s, 'PED_IN_CODIGO')));
        const seq = Math.floor(toNumeric(findValue(s, 'ITP_IN_SEQUENCIA')));
        const nf = Math.floor(toNumeric(findValue(s, 'NF_NOT_IN_CODIGO')));
        const prod = String(findValue(s, 'PRO_ST_ALTERNATIVO') || findValue(s, 'ITP_ST_DESCRICAO') || '');
        
        // Chave única para identificar duplicadas no mesmo pedido/item/nota
        const dupKey = `${fil}-${ser}-${ped}-${seq}-${nf}-${prod}`;
        if (!seenItems.has(dupKey)) {
            seenItems.add(dupKey);
            deduplicatedSales.unshift(s); // unshift to preserve the ordered array sequence
        }
    }

    const ordersMap = new Map<number, number>(); 
    const usedSequencesMap = new Map<number, Set<number>>(); // Rastreia sequências usadas por pedido

    const allRows = deduplicatedSales.map(s => {
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
        itn_re_quantidade: toNumeric(findValue(s, 'ITN_RE_QUANTIDADE')),
        itp_re_valortotal: toNumeric(findValue(s, 'ITP_RE_VALORTOTAL')),
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

    // --- REMOVIDO PRESERVAÇÃO ERP vs CRM NA TABELA SALES ---
    // A tabela 'sales' agora reflete estritamente o PowerBI.
    // O espelhamento do CRM é salvo na tabela 'crm_pipeline' para não sujar os dados oficiais.

    const { error } = await supabase.from('sales').upsert(uniqueRows, { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo,itp_in_sequencia' });
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error("Erro no Sync Supabase:", err.message);
    return false;
  }
};

export const updateOrderStatus = async (keys: { fil: number, ser: string, ped: number }, newStatus: string) => {
    // Agora salvamos as movimentações do CRM na tabela crm_pipeline!
    try {
        await upsertCRMPipelineStatus({
            fil_in_codigo: keys.fil,
            ser_st_codigo: keys.ser,
            ped_in_codigo: keys.ped,
            status: newStatus
        });
        return true;
    } catch (e: any) {
        throw new Error(`Erro ao atualizar status do CRM: ${e.message}`);
    }
};

export const updateOrderHotStatus = async (keys: { fil: number, ser: string, ped: number }, isHot: boolean) => {
    try {
        // Primeiro obtemos o status atual do pipeline para não sobrescrever com null, pois é uma PK/upsert.
        // Como o status é o verdadeiro espelho, não podemos perder o que estava lá.
        const { data, error: fetchErr } = await supabase
            .from('crm_pipeline')
            .select('status')
            .eq('fil_in_codigo', keys.fil)
            .eq('ser_st_codigo', keys.ser)
            .eq('ped_in_codigo', keys.ped)
            .single();

        const currentStatus = data?.status || 'EM ABERTO'; // Default seguro se ainda não existir

        await upsertCRMPipelineStatus({
            fil_in_codigo: keys.fil,
            ser_st_codigo: keys.ser,
            ped_in_codigo: keys.ped,
            status: currentStatus,
            is_hot: isHot
        });
        
        return true;
    } catch (e: any) {
        throw new Error(`Erro API: ${e.message}`);
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
      "ITN_RE_QUANTIDADE": row.itn_re_quantidade,
      "ITP_RE_VALORTOTAL": row.itp_re_valortotal,
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
    let allData: CRMAppointment[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('crm_appointments')
        .select('*')
        .order('start_date', { ascending: false })
        .range(from, from + step - 1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    return allData;
  } catch (err: any) {
    console.warn("CRM Appointments: Table might not exist or error fetching.", err.message);
    return [];
  }
};

export const upsertCRMAppointment = async (appt: CRMAppointment) => {
  const payload = { ...appt };
  if (!payload.id) payload.id = generateUUID();
  
  const { error } = await supabase.from('crm_appointments').upsert([payload]);
  if (error) {
    console.error("CRM Appointments: Error saving to Supabase", error);
    throw new Error(error.message || 'Erro ao salvar compromisso no banco de dados.');
  }
  return payload;
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
    let allData: CRMTask[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    return allData;
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

// --- Customers Service ---

export const fetchCustomers = async (repCode?: number): Promise<Customer[]> => {
  try {
    let allData: Customer[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('customers').select('*').order('agn_st_nome', { ascending: true }).range(from, from + step - 1);
      
      if (repCode) {
        query = query.eq('rep_agn_in_codigo', repCode);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    return allData;
  } catch (err: any) {
    console.warn("Customers: Table might not exist or error fetching", err.message);
    return [];
  }
};

export const syncCustomersToSupabase = async (customers: any[]) => {
  if (!customers || customers.length === 0) {
    console.log("[Customer Sync] No customers provided for synchronization.");
    return false;
  }

  console.log(`[Customer Sync] Starting validation for ${customers.length} records...`);

  // Normaliza os dados para o formato do Supabase
  const normalized = customers.map((c, index) => {
    const agn_in_codigo = Math.floor(toNumeric(findValue(c, 'AGN_IN_CODIGO') || findValue(c, 'CLI_IN_CODIGO')));
    const agn_st_nome = String(findValue(c, 'AGN_ST_NOME') || findValue(c, 'CLIENTE_NOME') || 'N/A').trim();
    
    if (agn_in_codigo === 0 && index === 0) {
      console.log("[Customer Sync] Sample record keys:", Object.keys(c));
    }

    if (agn_in_codigo === 0) {
      // console.warn(`[Customer Sync] Record at index ${index} missing valid code:`, c);
    }

    return {
      agn_in_codigo,
      agn_st_nome,
      agn_st_cgc: String(findValue(c, 'AGN_ST_CGC') || '').trim(),
      agn_st_inscrestadual: String(findValue(c, 'AGN_ST_INSCRESTADUAL') || '').trim(),
      agn_st_logradouro: String(findValue(c, 'AGN_ST_LOGRADOURO') || '').trim(),
      agn_st_numero: String(findValue(c, 'AGN_ST_NUMERO') || '').trim(),
      agn_st_bairro: String(findValue(c, 'AGN_ST_BAIRRO') || '').trim(),
      agn_st_municipio: String(findValue(c, 'AGN_ST_MUNICIPIO') || '').trim(),
      uf_st_sigla: String(findValue(c, 'UF_ST_SIGLA') || '').trim(),
      rep_agn_in_codigo: Math.floor(toNumeric(findValue(c, 'REP_AGN_IN_CODIGO') || findValue(c, 'REP_IN_CODIGO'))),
      agn_dt_ultimaatucad: findValue(c, 'AGN_DT_ULTIMAATUCAD') || null
    };
  }).filter(c => c.agn_in_codigo > 0);

  console.log(`[Customer Sync] Validation complete. ${normalized.length} of ${customers.length} records are valid.`);

  if (normalized.length === 0) {
    console.error("[Customer Sync] No valid customer records found after normalization.");
    return false;
  }

  // Divide em chunks de 100 para evitar limites
  const chunkSize = 100;
  let hasError = false;

  for (let i = 0; i < normalized.length; i += chunkSize) {
    const chunk = normalized.slice(i, i + chunkSize);
    console.log(`[Customer Sync] Upserting chunk ${Math.floor(i/chunkSize) + 1}...`);
    
    const { error } = await supabase
      .from('customers')
      .upsert(chunk, { onConflict: 'agn_in_codigo' });
    
    if (error) {
      console.error(`[Customer Sync] Error synchronizing chunk at index ${i}:`, error);
      hasError = true;
    }
  }

  if (!hasError) {
    console.log("[Customer Sync] Synchronization completed successfully.");
    return true;
  } else {
    console.error("[Customer Sync] Synchronization completed with errors.");
    return false;
  }
};
