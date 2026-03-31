
async function listPbiStructure() {
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
    const { access_token: token } = await tokenResponse.json();

    const url = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}/datasets/${POWERBI_CONFIG.datasetId}/executeQueries`;
    
    console.log("--- LISTANDO TABELAS ---");
    const resTables = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ queries: [{ query: "EVALUATE INFO.TABLES()" }] })
    });
    
    if (resTables.ok) {
        const data = await resTables.json();
        const tables = data.results[0].tables[0].rows;
        console.log("Tabelas encontradas:");
        tables.forEach(t => console.log(`- ${t['Table[Name]'] || t['Name']}`));
    } else {
        console.log("Falha ao listar tabelas via INFO.TABLES(). Tentando INFO.COLUMNS()...");
        const resCols = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ queries: [{ query: "EVALUATE INFO.COLUMNS()" }] })
        });
        if (resCols.ok) {
            const data = await resCols.json();
            const cols = data.results[0].tables[0].rows;
            const tableSet = new Set(cols.map(c => c['Table[Name]'] || c['TableName']));
            console.log("Tabelas inferidas pelos colunas:");
            tableSet.forEach(t => console.log(`- ${t}`));
            
            console.log("\nColunas de exemplo:");
            console.log(cols.slice(0, 10).map(c => `${c['Table[Name]']}[${c['Name']}]`));
        } else {
            console.log("INFO.TABLES/COLUMNS não suportado.");
        }
    }
  } catch (err) { console.error(err); }
}
listPbiStructure();
