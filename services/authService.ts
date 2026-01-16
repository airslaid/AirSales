import { ServicePrincipalConfig } from '../types';

export const getServicePrincipalToken = async (config: ServicePrincipalConfig): Promise<string> => {
  const { tenantId, clientId, clientSecret } = config;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Credenciais do Service Principal incompletas.");
  }

  // Endpoint de token da Microsoft (v2.0)
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  // Escopo necessário para Power BI
  const scope = "https://analysis.windows.net/powerbi/api/.default";

  const body = new URLSearchParams();
  body.append("grant_type", "client_credentials");
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("scope", scope);

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro OAuth:", errorData);
      
      // Tratamento específico para erro de CORS (comum em frontend-only)
      if (response.status === 0 || response.type === 'opaque') {
        throw new Error("Erro de CORS ou Rede. Se estiver rodando localmente, tente usar um plugin de 'CORS Unblock' ou mova essa lógica para o backend.");
      }
      
      throw new Error(`Falha na autenticação: ${errorData.error_description || errorData.error}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    console.error("Erro ao obter token:", error);
    throw new Error(error.message || "Erro desconhecido ao obter token.");
  }
};