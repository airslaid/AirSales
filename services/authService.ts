
import { ServicePrincipalConfig } from '../types';
import { SUPABASE_URL, SUPABASE_KEY } from './supabaseService';

export const getServicePrincipalToken = async (config: ServicePrincipalConfig): Promise<string> => {
  const { tenantId, clientId, clientSecret } = config;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Credenciais do Service Principal incompletas.");
  }

  console.log("🔐 Autenticando via Supabase Edge Function: 'dynamic-function'...");

  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/dynamic-function`;

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // CRÍTICO: Supabase exige ambos os headers para requisições externas via fetch
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ tenantId, clientId, clientSecret })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Erro HTTP ${response.status}`;
      
      try {
        const jsonError = JSON.parse(errorText);
        if (jsonError.error) errorMessage = jsonError.error;
        else if (jsonError.message) errorMessage = jsonError.message; // Captura msg do Supabase (ex: Invalid JWT)
        else errorMessage = errorText;
      } catch (e) {
        errorMessage = errorText.slice(0, 200); 
      }
      
      throw new Error(`Falha na Edge Function: ${errorMessage}`);
    }

    const data = await response.json();

    if (data.error) {
       throw new Error(`Erro retornado pela Microsoft: ${data.error_description || data.error}`);
    }

    if (data.access_token) {
      console.log("✅ Token Azure obtido com sucesso.");
      return data.access_token;
    }

    throw new Error("A resposta da função não contém o token de acesso.");

  } catch (err: any) {
    console.error("Falha Detalhada de Autenticação:", err);
    throw new Error(err.message || "Falha desconhecida ao conectar à função.");
  }
};
