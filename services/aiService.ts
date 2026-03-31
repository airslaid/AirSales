
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Sale } from '../types';

// Função robusta para obter a API Key em diferentes ambientes (Vite, Process, etc)
const getApiKey = (): string => {
  try {
    // Tentativa 1: Padrão Vite (mais provável para este projeto)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) { console.debug('Vite env not found'); }

  try {
    // Tentativa 2: Padrão Node/Webpack (process.env)
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_API_KEY || process.env.API_KEY || '';
    }
  } catch (e) { console.debug('Process env not found'); }

  return '';
};

const API_KEY = getApiKey();

// Configuração para LLM Local (LM Studio / Ollama)
const LOCAL_LLM_CONFIG = {
  enabled: false, // Pode ser alterado via localStorage ou UI
  baseUrl: 'http://127.0.0.1:1234/v1', // Padrão LM Studio (conforme seu acesso)
  model: 'google/gemma-3n-e4b' // Nome do modelo no LM Studio
};

// Função para verificar se deve usar LLM Local
export const isUsingLocalAI = () => {
  const saved = localStorage.getItem('AIR_SALES_LLM_CONFIG');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      return config.useLocal;
    } catch (e) { return false; }
  }
  return LOCAL_LLM_CONFIG.enabled;
};

const getLocalConfig = () => {
  const saved = localStorage.getItem('AIR_SALES_LLM_CONFIG');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) { return LOCAL_LLM_CONFIG; }
  }
  return LOCAL_LLM_CONFIG;
};

// Inicializa o cliente Gemini
const ai = new GoogleGenAI({ apiKey: API_KEY || 'MISSING_KEY' });

const parseValue = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// Função auxiliar para gerar o contexto de dados (reutilizável)
const buildDataContext = (salesData: Sale[], metrics: any) => {
    if (salesData.length === 0) return "Não há dados disponíveis no filtro atual.";

    let totalVendas = 0;
    const clientesMap = new Map<string, number>();
    const produtosMap = new Map<string, number>();
    const statusMap = new Map<string, number>();

    // Single pass for all metrics
    for (const s of salesData) {
        const val = parseValue(s.ITP_RE_VALORMERCADORIA);
        totalVendas += val;

        // Clientes
        const clienteNome = s.CLIENTE_NOME || 'DESCONHECIDO';
        clientesMap.set(clienteNome, (clientesMap.get(clienteNome) || 0) + val);

        // Produtos
        const codigo = s.PRO_ST_ALTERNATIVO || s.PRO_IN_CODIGO || '?';
        const desc = s.ITP_ST_DESCRICAO || 'ITEM';
        const productLabel = `[Cód: ${codigo}] ${desc}`;
        produtosMap.set(productLabel, (produtosMap.get(productLabel) || 0) + val);

        // Status
        const st = s.PED_ST_STATUS || 'OUTROS';
        statusMap.set(st, (statusMap.get(st) || 0) + 1);
    }

    const ticketMedio = totalVendas / salesData.length;

    // Top Clientes
    const topClientes = Array.from(clientesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, metrics.useLocal ? 5 : 10) // Reduzido para IA Local
      .map(([nome, val]) => `${nome} (${formatCurrency(val)})`)
      .join(', ');

    // Top Produtos
    const topProdutos = Array.from(produtosMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, metrics.useLocal ? 5 : 10) // Reduzido para IA Local
      .map(([nome, val]) => `${nome} - Total: ${formatCurrency(val)}`)
      .join('\n');

    // Status
    const statusDist = Array.from(statusMap.entries())
      .map(([st, count]) => `${st}: ${count}`)
      .join(', ');

    return `
      DADOS ATUAIS (FILTRADOS NA TELA):
      - Total Geral Vendas: ${formatCurrency(totalVendas)}
      - Meta do Período: ${formatCurrency(metrics.goal || 0)}
      - Atingimento Meta: ${metrics.achievement?.toFixed(1)}%
      - Quantidade de Pedidos: ${salesData.length}
      - Ticket Médio: ${formatCurrency(ticketMedio)}
      
      TOP PRODUTOS (Mais Vendidos):
      ${topProdutos}
      
      TOP CLIENTES (Maiores Compradores):
      ${topClientes}
      
      DISTRIBUIÇÃO DE STATUS:
      ${statusDist}
    `;
};

export const generateSalesInsights = async (
  salesData: Sale[], 
  context: string,
  metrics: any
): Promise<string> => {
  const useLocal = isUsingLocalAI();
  const localConfig = getLocalConfig();

  if (!useLocal && !API_KEY) {
    return "⚠️ **Erro de Configuração**: Chave de API não encontrada.\n\nPor favor, adicione a variável `VITE_API_KEY` nas configurações do Vercel com sua chave do Google Gemini.";
  }

  try {
    const dataContext = buildDataContext(salesData, { ...metrics, useLocal });
    
    const prompt = `
      Você é um Especialista Sênior em Inteligência de Vendas (Business Intelligence Analyst).
      Analise o seguinte resumo do módulo "${context}":
      
      ${dataContext}

      **Sua Missão**:
      Forneça uma análise executiva, direta e estratégica em Português (Brasil).
      Use formatação Markdown simples.
      
      Estrutura da resposta:
      1. 🔍 **Diagnóstico Rápido**
      2. 🏆 **Destaques** (Quem carrega o resultado)
      3. ⚠️ **Pontos de Atenção** (Riscos, gargalos)
      4. 🚀 **Ação Recomendada** (2 sugestões práticas)

      Seja conciso.
    `;

    if (useLocal) {
      const response = await fetch(`${localConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: localConfig.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3 // Reduzido para ser mais determinístico e rápido
        })
      });
      const json = await response.json();
      return json.choices[0].message.content || "Sem resposta do modelo local.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        temperature: 0.3,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // Otimização de performance
      }
    });

    return response.text || "Não foi possível gerar a análise no momento.";

  } catch (error: any) {
    // ... (error handling remains the same)
    console.error("Erro na IA:", error);
    
    if (useLocal && (error.message?.includes('fetch') || error.name === 'TypeError' || error.message?.includes('NetworkError'))) {
      console.log("Tentando conectar em:", localConfig.baseUrl);
      return `⚠️ **Erro de Conexão Local**: Não foi possível alcançar o seu modelo em \`${localConfig.baseUrl}\`.
      
**Como resolver agora:**
1. Verifique se o IP no menu **Configurações IA** é o mesmo que aparece no seu LM Studio (ex: \`192.168.15.85\`).
2. No Chrome/Edge, clique no **Cadeado** ao lado da URL {'>'} **Configurações do site** {'>'} **Conteúdo Inseguro** {'>'} **Permitir**.
3. Recarregue a página e tente novamente.`;
    }

    if (error.message?.includes('API_KEY')) {
        return "Erro de autenticação com a IA. Verifique se a chave API está correta.";
    }
    return `Ocorreu um erro ao comunicar com a Inteligência Artificial. (${error.message || 'Erro desconhecido'})`;
  }
};

export const chatWithSalesData = async (
  history: { role: 'user' | 'model', text: string }[],
  salesData: Sale[],
  metrics: any,
  lastMessage: string
): Promise<string> => {
  const useLocal = isUsingLocalAI();
  const localConfig = getLocalConfig();

  if (!useLocal && !API_KEY) {
    return "Erro: Chave de API (VITE_API_KEY) não configurada no servidor.";
  }

  try {
    const dataContext = buildDataContext(salesData, { ...metrics, useLocal });

    if (useLocal) {
      console.log("Chat Local - Enviando para:", localConfig.baseUrl);
      const messages = [
        {
          role: 'user',
          content: `INSTRUÇÃO DE SISTEMA: Você é o assistente virtual do Air Sales, um especialista em análise de dados comerciais.
          CONTEXTO DE DADOS ATUALIZADO:
          ${dataContext}
          REGRAS:
          1. Responda APENAS com base nos dados fornecidos acima.
          2. Seja prestativo, profissional e use formatação Markdown.
          3. Se o usuário perguntar sobre códigos de produtos, use a informação que está entre colchetes [Cód: ...].
          4. Mantenha as respostas curtas e objetivas.
          
          PERGUNTA DO USUÁRIO: ${lastMessage}`
        }
      ];

      // Se houver histórico, podemos tentar enviar, mas para modelos locais simples, 
      // enviar o contexto + a última mensagem em um único prompt de 'user' é mais garantido.
      
      const response = await fetch(`${localConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: localConfig.model,
          messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro do Servidor Local (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      return json.choices?.[0]?.message?.content || "Sem resposta do modelo local.";
    }

    const chatHistory = history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }));

    const chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: chatHistory,
        config: {
            systemInstruction: `
              Você é o assistente virtual do Air Sales, um especialista em análise de dados comerciais.
              
              CONTEXTO DE DADOS ATUALIZADO:
              ${dataContext}
              
              REGRAS:
              1. Responda APENAS com base nos dados fornecidos acima.
              2. Seja prestativo, profissional e use formatação Markdown.
              3. Se o usuário perguntar sobre códigos de produtos, use a informação que está entre colchetes [Cód: ...].
              4. Mantenha as respostas curtas e objetivas.
            `
        }
    });

    const result = await chatSession.sendMessage({ message: lastMessage });
    return result.text || "Sem resposta.";

  } catch (error: any) {
    console.error("Erro no Chat IA:", error);

    if (useLocal && (error.message?.includes('fetch') || error.name === 'TypeError' || error.message?.includes('NetworkError'))) {
      return "⚠️ **Erro de Conexão Local**: Não consegui falar com o seu PC. Verifique o IP nas configurações e certifique-se de que permitiu 'Conteúdo Inseguro' no cadeado do navegador.";
    }

    return "Desculpe, tive um problema ao processar sua pergunta. Tente novamente.";
  }
};
