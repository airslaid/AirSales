
import { GoogleGenAI } from "@google/genai";
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

// Inicializa o cliente Gemini
// Se a chave não existir, passamos uma string vazia para não quebrar a inicialização, 
// mas validamos antes de chamar os métodos.
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

    const totalVendas = salesData.reduce((acc, curr) => acc + parseValue(curr.ITP_RE_VALORMERCADORIA), 0);
    const ticketMedio = totalVendas / salesData.length;

    // Top Clientes
    const clientesMap = new Map<string, number>();
    salesData.forEach(s => {
      const nome = s.CLIENTE_NOME || 'DESCONHECIDO';
      const val = parseValue(s.ITP_RE_VALORMERCADORIA);
      clientesMap.set(nome, (clientesMap.get(nome) || 0) + val);
    });
    const topClientes = Array.from(clientesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) 
      .map(([nome, val]) => `${nome} (${formatCurrency(val)})`)
      .join(', ');

    // Top Produtos (AGORA COM CÓDIGO)
    const produtosMap = new Map<string, number>();
    salesData.forEach(s => {
      const codigo = s.PRO_ST_ALTERNATIVO || s.PRO_IN_CODIGO || '?';
      const desc = s.ITP_ST_DESCRICAO || 'ITEM';
      // Cria uma chave composta para garantir que a IA veja o código
      const label = `[Cód: ${codigo}] ${desc}`;
      
      const val = parseValue(s.ITP_RE_VALORMERCADORIA);
      produtosMap.set(label, (produtosMap.get(label) || 0) + val);
    });
    
    const topProdutos = Array.from(produtosMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) // Aumentei para 15 para dar mais contexto
      .map(([nome, val]) => `${nome} - Total: ${formatCurrency(val)}`)
      .join('\n'); // Usando quebra de linha para ficar mais claro para a IA

    // Status
    const statusMap = new Map<string, number>();
    salesData.forEach(s => {
      const st = s.PED_ST_STATUS || 'OUTROS';
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    });
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
  if (!API_KEY) {
    return "⚠️ **Erro de Configuração**: Chave de API não encontrada.\n\nPor favor, adicione a variável `VITE_API_KEY` nas configurações do Vercel com sua chave do Google Gemini.";
  }

  try {
    const dataContext = buildDataContext(salesData, metrics);
    
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.4 }
    });

    return response.text || "Não foi possível gerar a análise no momento.";

  } catch (error: any) {
    console.error("Erro na IA:", error);
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
  if (!API_KEY) {
    return "Erro: Chave de API (VITE_API_KEY) não configurada no servidor.";
  }

  try {
    const dataContext = buildDataContext(salesData, metrics);

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
    return "Desculpe, tive um problema ao processar sua pergunta. Tente novamente.";
  }
};
