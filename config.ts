
// Configuração Simplificada para Token Manual
export const POWERBI_CONFIG = {
  // IDs do Power BI
  // OBRIGATÓRIO para Automação Azure: Pegue o ID na URL do Power BI (app.powerbi.com/groups/{ID}/...)
  workspaceId: "7e6c3164-4b3a-41e4-94b7-1fc3eb343f5e", 
  
  // ID do Conjunto de Dados (Dataset)
  datasetId: "ed6c52cf-9183-4bb3-b6db-f9b74f3ead09",
  
  // Endpoint da API (Base)
  apiUrl: "https://api.powerbi.com/v1.0/myorg"
};

// Configuração de Automação Azure (Service Principal)
export const SERVICE_PRINCIPAL_CONFIG = {
  tenantId: "91f13493-6dab-4a48-baed-2336fa7ea4a3",
  clientId: "be812a00-410c-466a-accc-06b22e3a8fb1",
  clientSecret: "Ba68Q~O2vS87GY_k9K5CTOnWVkrZRoynzJ5kzaMK"
};

// Gera a query dinamicamente
export const getSalesDaxQuery = (tableName: string, filterCode?: string) => {
  // ATENÇÃO: SOLICITAÇÃO DE REMOÇÃO TOTAL DE FILTROS.
  // Estamos trazendo TOPN 5000 para garantir que pegue todas as 375 linhas (e mais).
  // Não aplicamos mais FILTER(..., [SER_ST_CODIGO] = "X").
  
  return `
    EVALUATE
    TOPN(
      5000,
      '${tableName}'
    )
  `;
};

// Query simples de fallback
export const getSimpleDaxQuery = (tableName: string) => `
EVALUATE TOPN(5000, '${tableName}')
`;
