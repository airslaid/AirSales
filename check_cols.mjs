
async function debug() {
  const SERVICE_PRINCIPAL_CONFIG = {
     tenantId: "91f13493-6dab-4a48-baed-2336fa7ea4a3",
     clientId: "be812a00-410c-466a-accc-06b22e3a8fb1",
     clientSecret: "Ba68Q~O2vS87GY_k9K5CTOnWVkrZRoynzJ5kzaMK"
  };
  const datasetId = "ed6c52cf-9183-4bb3-b6db-f9b74f3ead09";
  const workspaceId = "7e6c3164-4b3a-41e4-94b7-1fc3eb343f5e";

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', SERVICE_PRINCIPAL_CONFIG.clientId);
    params.append('client_secret', SERVICE_PRINCIPAL_CONFIG.clientSecret);
    params.append('scope', 'https://analysis.windows.net/powerbi/api/.default');

    const tr = await fetch(`https://login.microsoftonline.com/${SERVICE_PRINCIPAL_CONFIG.tenantId}/oauth2/v2.0/token`, { method: 'POST', body: params });
    const { access_token: token } = await tr.json();
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/executeQueries`;
    
    const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ queries: [{ query: "EVALUATE TOPN(1, 'PEDIDOS_DETALHADOS')" }] })
    });
    
    if (res.ok) {
        const data = await res.json();
        const row = data.results[0].tables[0].rows[0];
        console.log("COLUNAS ENCONTRADAS:");
        Object.keys(row).forEach(k => console.log(`- ${k}`));
    } else {
        console.log("Falha ao ler colunas");
    }
  } catch (err) { console.error(err); }
}
debug();
