
import { ServicePrincipalConfig } from '../types';
import { supabase } from './supabaseService';

export const getServicePrincipalToken = async (config: ServicePrincipalConfig): Promise<string> => {
  const { tenantId, clientId, clientSecret } = config;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Credenciais do Service Principal incompletas.");
  }

  // 1. TENTATIVA VIA SUPABASE BACKEND (Recomendado)
  // Tenta invocar uma Edge Function chamada 'powerbi-auth'.
  // Se você criar essa função no Supabase, o CORS é resolvido nativamente.
  try {
    const { data, error } = await supabase.functions.invoke('powerbi-auth', {
      body: { tenantId, clientId, clientSecret }
    });

    if (!error && data && data.access_token) {
      console.log("Token obtido via Supabase Edge Function.");
      return data.access_token;
    }
    
    // Se a função não existir ou der erro, apenas logamos e seguimos para o fallback
    if (error) {
        console.warn("Supabase Edge Function falhou ou não existe. Usando fallback Proxy.", error);
    }
  } catch (err) {
    console.warn("Erro ao conectar com Supabase Functions. Usando fallback Proxy.");
  }

  // 2. FALLBACK: PROXY CLIENT-SIDE (Para funcionar enquanto o backend não é deployado)
  // Endpoint de token da Microsoft (v2.0)
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  // Usamos um proxy público para contornar o CORS em desenvolvimento/demonstração.
  const proxyUrl = "https://corsproxy.io/?";
  const finalUrl = proxyUrl + encodeURIComponent(tokenEndpoint);

  const scope = "https://analysis.windows.net/powerbi/api/.default";

  const body = new URLSearchParams();
  body.append("grant_type", "client_credentials");
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("scope", scope);

  try {
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
         errorData = JSON.parse(errorText);
      } catch (e) {
         errorData = { error: errorText };
      }
      
      console.error("Erro OAuth (Proxy):", errorData);
      throw new Error(`Falha Azure: ${errorData.error_description || errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    console.error("Erro ao obter token:", error);
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Bloqueio de CORS ou Rede. Verifique sua conexão ou adblockers.");
    }
    throw error;
  }
};
