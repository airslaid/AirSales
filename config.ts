// Configuração Simplificada para Token Manual
export const POWERBI_CONFIG = {
  // IDs do Power BI
  // Deixe workspaceId vazio ("") se o dataset estiver em "My Workspace"
  workspaceId: "", 
  datasetId: "067f8162-2f44-4f54-a0b1-e1e951e3891c",
  
  // Endpoint da API
  apiUrl: "https://api.powerbi.com/v1.0/myorg"
};

// Gera a query dinamicamente aplicando FILTRO na coluna SER_ST_CODIGO
export const getSalesDaxQuery = (tableName: string, filterCode?: string) => {
  // Se houver um código de filtro (OV, PD, DV), aplicamos o FILTER
  if (filterCode) {
    return `
      EVALUATE
      TOPN(
        500,
        FILTER(
          '${tableName}',
          '${tableName}'[SER_ST_CODIGO] = "${filterCode}"
        )
      )
    `;
  }

  // Fallback: traz tudo se não tiver filtro
  return `
    EVALUATE
    TOPN(
      500,
      '${tableName}'
    )
  `;
};

// Query simples de fallback
export const getSimpleDaxQuery = (tableName: string) => `
EVALUATE TOPN(100, '${tableName}')
`;