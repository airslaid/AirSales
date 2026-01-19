
import { Sale, DataSource } from '../types';
import { POWERBI_CONFIG, getSalesDaxQuery } from '../config';
import { syncSalesToSupabase, fetchFromSupabase } from './supabaseService';

// --- MOCK DATA GENERATION ---
const REGIONS = ['AIR SLAID', 'BIG TELAS', 'OUTRA'];
const PRODUCTS = [
  { code: '1001', alt: '1001.00.00', name: 'MALHA DE ACO INOX 304', price: 4500 },
  { code: '1002', alt: '1002.00.00', name: 'TELA DE NYLON 180 MESH', price: 1200 },
  { code: '2005', alt: '2005.10.00', name: 'DISCO DE FILTRAGEM 50MM', price: 350 },
  { code: '3001', alt: '3001.05.00', name: 'ELEMENTO FILTRANTE PLISSADO', price: 180 },
  { code: '4005', alt: '4005.20.00', name: 'TECIDO TECNICO POLYESTER', price: 890 },
];
const REPS = ['COMEX', 'MATHEUS LOPES BENEVENUTO', 'BRUNA CAROLINE DA SILVA', 'FRANCIS REIS TEIXEIRA'];
const CLIENT_NAMES = ['TGA TECH GESTAO AMBIENTAL LTDA', 'CLARIANT- PERU S.A.', 'QUIMICA GAMMA S.A.', 'ITACAMBA CEMENTOS S.A', 'GELNEX INDUSTRIA E COMERCIO LTDA'];
const STATUSES = ['FATURADO', 'EM ABERTO', 'CANCELADO', 'EM APROVAÇÃO'] as const;

export const generateMockSales = (orderCount: number, filterCode: string = 'PD'): Sale[] => {
  const data: Sale[] = [];
  
  for (let i = 0; i < orderCount; i++) {
    const orderId = 150 + i;
    const date = new Date(2025, 0, 1 + Math.floor(Math.random() * 60)); // Jan/Fev 2025
    const client = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)];
    const rep = REPS[Math.floor(Math.random() * REPS.length)];
    const filial = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    
    // 1 a 3 itens por pedido
    const itemCount = Math.floor(Math.random() * 3) + 1;

    for (let j = 1; j <= itemCount; j++) {
        const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
        const qty = Math.floor(Math.random() * 10) + 1;
        const totalVal = product.price * qty;

        data.push({
          "SER_ST_CODIGO": filterCode, 
          "PED_IN_CODIGO": orderId,
          "ITP_IN_SEQUENCIA": j,
          
          "CLI_IN_CODIGO": 1000 + i,
          "CLIENTE_NOME": client,
          
          "FIL_IN_CODIGO": filial === 'AIR SLAID' ? 100 : 200,
          "FILIAL_NOME": filial,
          
          "PED_DT_EMISSAO": date.toISOString().split('T')[0],
          "PED_CH_SITUACAO": status.charAt(0),
          "PED_ST_STATUS": status,
          
          "REP_IN_CODIGO": 50 + REPS.indexOf(rep),
          "REPRESENTANTE_NOME": rep,
          
          // Dados do Item
          "IT_ST_STATUS": status,
          "PRO_IN_CODIGO": parseInt(product.code),
          "PRO_ST_ALTERNATIVO": product.alt,
          "ITP_ST_DESCRICAO": product.name,
          "ITP_RE_QUANTIDADE": qty,
          "ITP_RE_VALORUNITARIO": product.price,
          "ITP_RE_VALORMERCADORIA": totalVal,
          "ITP_ST_PEDIDOCLIENTE": `OC-${orderId}`,
          
          "NF_NOT_IN_CODIGO": status === 'FATURADO' ? 5000 + orderId : null,
          "NOT_DT_EMISSAO": status === 'FATURADO' ? date.toISOString().split('T')[0] : null,
          
          "ID_PEDIDO": orderId,
          "SITUACAO": status
        });
    }
  }
  return data;
};

export const fetchRealPowerBIData = async (accessToken: string, tableName: string, filterCode?: string): Promise<Sale[]> => {
  if (!POWERBI_CONFIG.datasetId) throw new Error("ID do Dataset não configurado");
  
  const cleanToken = accessToken.replace(/^Bearer\s+/i, "").trim();
  
  let baseUrl = "https://api.powerbi.com/v1.0/myorg";
  
  if (POWERBI_CONFIG.workspaceId && POWERBI_CONFIG.workspaceId.length > 10) {
     baseUrl = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}`;
  } else {
     console.warn("Workspace ID não configurado. Tentando endpoint '/myorg'.");
  }

  const url = `${baseUrl}/datasets/${POWERBI_CONFIG.datasetId}/executeQueries`;
  
  // REMOÇÃO DE FILTRO: Passamos undefined ou string vazia para o gerador de DAX
  // para garantir que ele não aplique cláusula FILTER.
  const daxQuery = getSalesDaxQuery(tableName, undefined);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanToken}`
      },
      body: JSON.stringify({ 
        queries: [{ query: daxQuery }],
        serializerSettings: { includeNulls: true }
      })
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("Erro 404: Dataset ou Workspace não encontrado. Verifique permissões.");
      if (response.status === 403) throw new Error("Erro 403: Permissão negada. Service Principal sem acesso.");
      throw new Error(`Erro API Power BI: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.error) {
       throw new Error(`Erro Query DAX: ${JSON.stringify(json.error)}`);
    }

    if (json.results?.[0]?.tables?.[0]?.rows) {
      // 1. ANÁLISE CRUA (DIAGNÓSTICO)
      const rawRows = json.results[0].tables[0].rows;
      const rawAnalysis: Record<string, number> = {};
      
      // Itera para logar o que realmente veio no JSON antes de qualquer limpeza
      rawRows.forEach((r: any) => {
          // Tenta achar a chave de várias formas, pois o DAX pode retornar '[SER_ST_CODIGO]' ou só 'SER_ST_CODIGO'
          let val = r['SER_ST_CODIGO'] || r['[SER_ST_CODIGO]'] || r['Table[SER_ST_CODIGO]'];
          // Se não achou pelo nome exato, procura nas chaves do objeto
          if (val === undefined) {
             const key = Object.keys(r).find(k => k.includes('SER_ST_CODIGO'));
             if (key) val = r[key];
          }
          const label = val === null || val === undefined ? 'NULL/UNDEFINED' : (val === '' ? 'VAZIO' : String(val));
          rawAnalysis[label] = (rawAnalysis[label] || 0) + 1;
      });
      
      console.group("🔎 [DIAGNOSTICO] POWER BI - DADOS BRUTOS (SEM FILTRO)");
      console.log(`Total de Linhas Recebidas: ${rawRows.length}`);
      console.log("Contagem por SER_ST_CODIGO (original):", rawAnalysis);
      console.groupEnd();


      // 2. PROCESSAMENTO E NORMALIZAÇÃO
      const rows = rawRows.map((row: any) => {
        const cleanRow: Record<string, any> = {};
        Object.keys(row).forEach(rawKey => {
          // Remove prefixo de tabela e colchetes: 'Tabela'[Coluna] -> Coluna
          let cleanRowKey = rawKey;
          const match = rawKey.match(/\[(.*?)\]/);
          if (match && match[1]) {
             cleanRowKey = match[1];
          } else {
             const parts = rawKey.split('[');
             if (parts.length > 1) cleanRowKey = parts[1].replace(']', '');
          }
          cleanRow[cleanRowKey] = row[rawKey];
        });
        
        // REMOÇÃO DE SOBRESCRITA:
        // Não forçamos mais SER_ST_CODIGO = filterCode. 
        // Deixamos o dado original do banco prevalecer.

        return cleanRow;
      });

      console.log(`Dados processados. Enviando ${rows.length} linhas para o Supabase...`);

      try {
         await syncSalesToSupabase(rows);
      } catch (err) {
         console.error("Erro ao persistir no Supabase:", err);
      }
      
      return rows;
    }
    return [];
  } catch (err: any) {
    console.error("Fetch Power BI Error:", err);
    throw err;
  }
};

export const fetchData = async (
  source: DataSource,
  token: string, 
  tableName: string,
  filterCode?: string
): Promise<Sale[]> => {
  if (source === 'powerbi' && token) {
    // Passamos undefined no filterCode para garantir fetch total
    return await fetchRealPowerBIData(token, tableName, undefined);
  }
  
  if (source === 'supabase') {
    return await fetchFromSupabase(filterCode);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockSales(50, filterCode));
    }, 600);
  });
};
