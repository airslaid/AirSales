
async function debug() {
  const SERVICE_PRINCIPAL_CONFIG = {
    tenantId: "91f13493-6dab-4a48-baed-2336fa7ea4a3",
    clientId: "be812a00-410c-466a-accc-06b22e3a8fb1",
    clientSecret: "Ba68Q~O2vS87GY_k9K5CTOnWVkrZRoynzJ5kzaMK"
  };
  
  const POWERBI_CONFIG = {
    workspaceId: "7e6c3164-4b3a-41e4-94b7-1fc3eb343f5e",
    datasetId: "486323a9-9a81-4a96-8519-1fdd5e175c62" 
  };

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', SERVICE_PRINCIPAL_CONFIG.clientId);
    params.append('client_secret', SERVICE_PRINCIPAL_CONFIG.clientSecret);
    params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${SERVICE_PRINCIPAL_CONFIG.tenantId}/oauth2/v2.0/token`, {
      method: 'POST', body: params
    });
    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    const url = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}/datasets/${POWERBI_CONFIG.datasetId}/executeQueries`;
    
    console.log("--- TESTE 1: EVALUATE {1} ---");
    const r1 = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ queries: [{ query: "EVALUATE {1}" }] })
    });
    console.log("Status E1:", r1.status);

    console.log("--- TESTE 2: VARIAÇÕES DE TABELA ---");
    const variants = ['PEDIDOS_DETALHADOS', 'PEDIDOS', 'f_Pedidos', 'F_PEDIDOS', 'Pedidos', 'PedidosDetalhados'];
    for (const v of variants) {
        const rv = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ queries: [{ query: `EVALUATE TOPN(1, '${v}')` }] })
        });
        if (rv.ok) {
            console.log(`✅ SUCESSO com tabela: ${v}`);
            const data = await rv.json();
            console.log("Colunas:", Object.keys(data.results[0].tables[0].rows[0]));
            return;
        } else {
            const err = await rv.json();
            console.log(`❌ Falha ${v}: ${err.error?.message || 'Erro'}`);
        }
    }
  } catch (err) { console.error(err); }
}
debug();
