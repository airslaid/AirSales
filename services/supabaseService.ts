
import { createClient } from '@supabase/supabase-js';
import { Sale, AppUser, SalesGoal } from '../types';

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
  // Remove underline e espaço para encontrar a chave vinda do PBI ou Mock
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

export const syncSalesToSupabase = async (sales: Sale[]) => {
  if (!sales || sales.length === 0) return;
  
  const incomingCount = sales.length;
  
  // VERIFICAÇÃO DE DADOS CRÍTICOS
  const sample = sales[0];
  const hasDeliveryDate = !!(findValue(sample, 'IPE_DT_DATAENTREGA'));
  if (!hasDeliveryDate) {
      console.warn("⚠️ AVISO CRÍTICO: O campo 'IPE_DT_DATAENTREGA' não foi detectado no pacote de dados vindo do Power BI. O Supabase receberá NULL.");
  }

  try {
    const ordersMap = new Map<number, number>(); 

    const allRows = sales.map(s => {
      let rawSer = findValue(s, 'SER_ST_CODIGO') || s['SER_ST_CODIGO'];
      let serCod = String(rawSer || '').trim();
      const pedNum = Math.floor(toNumeric(findValue(s, 'PED_IN_CODIGO')));
      const filId = Math.floor(toNumeric(findValue(s, 'FIL_IN_CODIGO')));
      let itpSeq = Math.floor(toNumeric(findValue(s, 'ITP_IN_SEQUENCIA')));
      
      if (!pedNum || pedNum === 0) return null;

      if (itpSeq === 0) {
          const currentCount = ordersMap.get(pedNum) || 0;
          itpSeq = currentCount + 1;
          ordersMap.set(pedNum, itpSeq);
      } else {
          ordersMap.set(pedNum, Math.max(ordersMap.get(pedNum) || 0, itpSeq));
      }

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
        itp_st_pedidocliente: String(findValue(s, 'ITP_ST_PEDIDOCLIENTE') || '').trim(),
        itp_st_situacao: normalizeStatus(String(findValue(s, 'ITP_ST_SITUACAO') || '').trim()),
        it_st_status: normalizeStatus(String(findValue(s, 'IT_ST_STATUS') || '').trim()),
        nf_not_in_codigo: Math.floor(toNumeric(findValue(s, 'NF_NOT_IN_CODIGO'))),
        not_dt_emissao: findValue(s, 'NOT_DT_EMISSAO') || null,
        
        // Mapeamento com log de segurança
        ipe_dt_dataentrega: findValue(s, 'IPE_DT_DATAENTREGA') || null
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    if (allRows.length === 0) return;

    const uniqueKeyMap = new Map<string, any>();
    allRows.forEach(r => {
        const key = `${r.fil_in_codigo}-${r.ser_st_codigo}-${r.ped_in_codigo}-${r.itp_in_sequencia}`;
        uniqueKeyMap.set(key, r);
    });
    
    const rows = Array.from(uniqueKeyMap.values());

    const { error } = await supabase.from('sales').upsert(rows, { 
      onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo,itp_in_sequencia' 
    });
    
    if (error) {
       const { error: error2 } = await supabase.from('sales').upsert(rows, { ignoreDuplicates: true });
       if (error2) throw error2;
    }

    console.log(`%cSincronização OK! Enviado: ${rows.length}.`, 'color:green;font-weight:bold');
    return true;
  } catch (err: any) {
    console.error("Erro Crítico no Sync Supabase:", err.message);
    return false;
  }
};

export const fetchAllRepresentatives = async (): Promise<{ code: number, name: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('rep_in_codigo, representante_nome')
      .not('rep_in_codigo', 'is', null)
      .limit(5000);

    if (error) throw error;
    const uniqueMap = new Map<number, string>();
    data?.forEach((row: any) => {
      const code = Number(row.rep_in_codigo);
      const name = String(row.representante_nome || '').trim();
      if (!uniqueMap.has(code) && name.length > 0) uniqueMap.set(code, name);
    });
    return Array.from(uniqueMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err: any) {
    console.error("Erro ao buscar lista de representantes:", err.message);
    return [];
  }
};

export const fetchFromSupabase = async (filterCode: string = 'PD', repCode?: number): Promise<Sale[]> => {
  try {
    let query = supabase.from('sales').select('*').eq('ser_st_codigo', filterCode.toUpperCase().trim());
    if (repCode) query = query.eq('rep_in_codigo', repCode);
    
    const { data, error } = await query.order('ped_dt_emissao', { ascending: false }).limit(2000);
    if (error) throw error;

    console.log(`Leitura Supabase [${filterCode}]: ${data?.length || 0} registros.`);
    
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
      "ITP_ST_PEDIDOCLIENTE": row.itp_st_pedidocliente,
      
      // Coluna de data mapeada
      "IPE_DT_DATAENTREGA": row.ipe_dt_dataentrega,
      
      "PAGO_ASSISTENTE": row.pago_assistente || false,
      "PAGO_VENDEDOR": row.pago_vendedor || false,
      "PAGO_SUPERVISOR": row.pago_supervisor || false,
      "PAGO_POSVENDA": row.pago_posvenda || false,
      "PAGO_GERENTE": row.pago_gerente || false
    }));
  } catch (err: any) {
    console.error("Erro Supabase Fetch:", err.message);
    return [];
  }
};

export const updateSaleCommissionStatus = async (
    keys: { fil: number, ser: string, ped: number, seq: number }, 
    isPaid: boolean,
    columnName: string 
) => {
    try {
        const { error } = await supabase
            .from('sales')
            .update({ [columnName.toLowerCase()]: isPaid }) 
            .match({ 
                fil_in_codigo: keys.fil,
                ser_st_codigo: keys.ser,
                ped_in_codigo: keys.ped,
                itp_in_sequencia: keys.seq
            });

        if (error) throw error;
        return true;
    } catch (e: any) {
        console.error("Erro ao atualizar status de comissão:", e.message);
        throw e;
    }
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
