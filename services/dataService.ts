
import { Sale, DataSource } from '../types';
import { POWERBI_CONFIG, getSalesDaxQuery } from '../config';
import { syncSalesToSupabase, fetchFromSupabase } from './supabaseService';

// --- MOCK DATA GENERATION ---
const REGIONS = ['Norte', 'Sul', 'Leste', 'Oeste', 'Centro'];
const PRODUCTS = [
  { name: 'Laptop Pro X', category: 'Eletrônicos', price: 4500 },
  { name: 'Monitor 4K', category: 'Eletrônicos', price: 1200 },
  { name: 'Teclado Mecânico', category: 'Acessórios', price: 350 },
  { name: 'Mouse Gamer', category: 'Acessórios', price: 180 },
];
const REPS = ['Ana Silva', 'Carlos Souza', 'Mariana Lima', 'Roberto Alves'];
const CLIENT_NAMES = ['Tech Solutions Ltda', 'Comércio Silva', 'Indústria ABC', 'Varejo Express', 'Global Imports', 'Restaurante Sabor'];
const STATUSES = ['Completed', 'Pending', 'Cancelled'] as const;

export const generateMockSales = (count: number, filterCode: string = 'PD'): Sale[] => {
  const data: Sale[] = [];
  for (let i = 0; i < count; i++) {
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const quantity = Math.floor(Math.random() * 10) + 1;
    const date = new Date(2023, 0, 1 + Math.floor(Math.random() * 365));
    const totalVal = product.price * quantity;
    
    data.push({
      "ID_PEDIDO": 1000 + i, 
      "SER_ST_CODIGO": filterCode, 
      "DATA_EMISSAO": date.toISOString().split('T')[0],
      "PRODUTO_DESCRICAO": product.name,
      "FILIAL_NOME": REGIONS[Math.floor(Math.random() * REGIONS.length)],
      "VENDEDOR_NOME": REPS[Math.floor(Math.random() * REPS.length)],
      "CLI_NOME": CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
      "QTD_VENDA": quantity,
      "PED RE VLMERCADORIA": totalVal,
      "SITUACAO": STATUSES[Math.floor(Math.random() * STATUSES.length)],
    });
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
  const daxQuery = getSalesDaxQuery(tableName, filterCode);

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
      if (response.status === 404) {
         // Mensagem específica para ajudar o usuário a encontrar o erro de permissão do Robô
         throw new Error("Erro 404: O robô de automação (ID: be812a00-410c-466a-accc-06b22e3a8fb1) NÃO está na lista de acesso do Workspace. O usuário 'TI' está lá, mas o sistema usa o robô. Adicione o ID be812a00... como Membro.");
      }
      if (response.status === 403) {
         throw new Error("Erro 403: Permissão negada. Adicione o Service Principal (be812a00...) como Admin/Membro no Workspace.");
      }
      throw new Error(`Erro API Power BI: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.error) {
       throw new Error(`Erro Query DAX: ${JSON.stringify(json.error)}`);
    }

    if (json.results?.[0]?.tables?.[0]?.rows) {
      const rows = json.results[0].tables[0].rows.map((row: any) => {
        const cleanRow: Record<string, any> = {};
        Object.keys(row).forEach(rawKey => {
          let cleanKey = rawKey;
          const match = rawKey.match(/\[(.*?)\]/);
          if (match && match[1]) cleanKey = match[1];
          cleanRow[cleanKey] = row[rawKey];
        });
        return cleanRow;
      });

      syncSalesToSupabase(rows).catch(err => console.error("Erro em background na sincronização:", err));
      
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
    return await fetchRealPowerBIData(token, tableName, filterCode);
  }
  
  if (source === 'supabase') {
    return await fetchFromSupabase(filterCode);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockSales(150, filterCode));
    }, 600);
  });
};
