
import { createClient } from '@supabase/supabase-js';
import { Sale, AppUser, SalesGoal } from '../types';

const SUPABASE_URL = 'https://mgahjjoegseffezndojg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LU7HaVKZciu8MiTVCdgkLA_q_oErIcL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper para gerar UUID caso o banco não tenha Default Value configurado
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

// --- GESTÃO DE VENDAS ---

export const syncSalesToSupabase = async (sales: Sale[]) => {
  if (!sales || sales.length === 0) return;
  try {
    const allRows = sales.map(s => {
      const pedNum = Math.floor(toNumeric(findValue(s, 'PED_IN_CODIGO')));
      const filId = Math.floor(toNumeric(findValue(s, 'FIL_IN_CODIGO')));
      const serCod = String(findValue(s, 'SER_ST_CODIGO') || '').trim();
      if (!pedNum || pedNum === 0) return null;
      return {
        ser_st_codigo: serCod,
        ped_in_codigo: pedNum,
        cli_in_codigo: Math.floor(toNumeric(findValue(s, 'CLI_IN_CODIGO'))),
        cliente_nome: String(findValue(s, 'CLIENTE_NOME') || '').trim(),
        rep_in_codigo: Math.floor(toNumeric(findValue(s, 'REP_IN_CODIGO'))),
        representante_nome: String(findValue(s, 'REPRESENTANTE_NOME') || '').trim(),
        fil_in_codigo: filId,
        ped_dt_emissao: findValue(s, 'PED_DT_EMISSAO') || null,
        ped_ch_situacao: String(findValue(s, 'PED_CH_SITUACAO') || '').trim(),
        ped_re_valortotal: toNumeric(findValue(s, 'PED_RE_VALORTOTAL')),
        ped_re_vlmercadoria: toNumeric(findValue(s, 'PED_RE_VLMERCADORIA')),
        ped_st_status: normalizeStatus(String(findValue(s, 'PED_ST_STATUS') || '').trim()),
        filial_nome: String(findValue(s, 'FILIAL_NOME') || '').trim(),
        id_pedido: pedNum
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);
    const uniqueRowsMap = new Map<string, any>();
    allRows.forEach(row => {
      const compositeKey = `${row.fil_in_codigo}-${row.ser_st_codigo}-${row.ped_in_codigo}`;
      uniqueRowsMap.set(compositeKey, row);
    });
    const rows = Array.from(uniqueRowsMap.values());
    if (rows.length === 0) return;
    const { error } = await supabase.from('sales').upsert(rows, { onConflict: 'fil_in_codigo,ser_st_codigo,ped_in_codigo' });
    if (error) throw error;
    return true;
  } catch (err: any) {
    console.error("Erro Supabase Sync:", err.message);
    return false;
  }
};

export const fetchFromSupabase = async (filterCode: string = 'PD', repCode?: number): Promise<Sale[]> => {
  try {
    let query = supabase.from('sales').select('*').eq('ser_st_codigo', filterCode.toUpperCase().trim());
    if (repCode) query = query.eq('rep_in_codigo', repCode);
    const { data, error } = await query.order('ped_dt_emissao', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
      "SER_ST_CODIGO": row.ser_st_codigo,
      "PED_IN_CODIGO": row.ped_in_codigo,
      "CLI_IN_CODIGO": row.cli_in_codigo,
      "CLIENTE_NOME": row.cliente_nome,
      "REP_IN_CODIGO": row.rep_in_codigo,
      "REPRESENTANTE_NOME": row.representante_nome,
      "FIL_IN_CODIGO": row.fil_in_codigo,
      "PED_DT_EMISSAO": row.ped_dt_emissao,
      "PED_CH_SITUACAO": row.ped_ch_situacao,
      "PED_RE_VALORTOTAL": row.ped_re_valortotal,
      "PED_RE_VLMERCADORIA": row.ped_re_vlmercadoria,
      "PED_ST_STATUS": normalizeStatus(row.ped_st_status),
      "FILIAL_NOME": row.filial_nome,
      "ID_PEDIDO": row.ped_in_codigo,
      "SITUACAO": normalizeStatus(row.ped_st_status || row.ped_ch_situacao)
    }));
  } catch (err: any) {
    console.error("Erro Supabase Fetch:", err.message);
    return [];
  }
};

// --- GESTÃO DE USUÁRIOS ---

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

// --- GESTÃO DE METAS ---

export const fetchSalesGoals = async (): Promise<SalesGoal[]> => {
  const { data, error } = await supabase.from('sales_goals').select('*').order('ano', { ascending: false }).order('mes', { ascending: false });
  if (error) return [];
  return data || [];
};

export const upsertSalesGoal = async (goal: SalesGoal) => {
  // Correção para Erro "null value in column id"
  // 1. Prepara o payload
  const payload = { ...goal };
  
  // 2. Se não temos ID vindo do front (edição), verificamos se já existe no banco
  // Isso evita que tentemos inserir um novo ID randomico para uma meta que já existe (o que causaria update do ID, não recomendado)
  if (!payload.id) {
     const { data: existing } = await supabase
        .from('sales_goals')
        .select('id')
        .eq('rep_in_codigo', goal.rep_in_codigo)
        .eq('ano', goal.ano)
        .eq('mes', goal.mes)
        .maybeSingle();
     
     if (existing?.id) {
        // Se já existe, usamos o ID existente para fazer o Update corretamente
        payload.id = existing.id;
     } else {
        // Se NÃO existe, geramos um UUID para garantir que o insert funcione
        // (Isso corrige o erro da coluna ID sem default value)
        payload.id = generateUUID();
     }
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
