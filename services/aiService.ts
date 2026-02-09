
import { GoogleGenAI } from "@google/genai";
import { Sale } from '../types';

// Inicializa o cliente Gemini
// O process.env.API_KEY deve estar configurado no ambiente de execução
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      .slice(0, 10) // Aumentei para 10 para o chat ter mais contexto
      .map(([nome, val]) => `${nome} (${formatCurrency(val)})`)
      .join(', ');

    // Top Produtos
    const produtosMap = new Map<string, number>();
    salesData.forEach(s => {
      const nome = s.ITP_ST_DESCRICAO || s.PRO_ST_ALTERNATIVO || 'ITEM';
      const val = parseValue(s.ITP_RE_VALORMERCADORIA);
      produtosMap.set(nome, (produtosMap.get(nome) || 0) + val);
    });
    const topProdutos = Array.from(produtosMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nome, val]) => `${nome} (${formatCurrency(val)})`)
      .join(', ');

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
      DADOS ATUAIS (FILTRADOS):
      - Total Vendas: ${formatCurrency(totalVendas)}
      - Meta: ${formatCurrency(metrics.goal || 0)}
      - Atingimento Meta: ${metrics.achievement?.toFixed(1)}%
      - Qtd Pedidos: ${salesData.length}
      - Ticket Médio: ${formatCurrency(ticketMedio)}
      - Top Clientes: ${topClientes}
      - Top Produtos: ${topProdutos}
      - Status Pedidos: ${statusDist}
    `;
};

export const generateSalesInsights = async (
  salesData: Sale[], 
  context: string,
  metrics: any
): Promise<string> => {
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
    return "Ocorreu um erro ao comunicar com a Inteligência Artificial.";
  }
};

export const chatWithSalesData = async (
  history: { role: 'user' | 'model', text: string }[],
  salesData: Sale[],
  metrics: any,
  lastMessage: string
): Promise<string> => {
  try {
    const dataContext = buildDataContext(salesData, metrics);

    // Cria a sessão de chat
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `
          Você é o assistente virtual do Air Sales, um especialista em análise de dados comerciais.
          Você tem acesso aos dados resumidos de vendas listados abaixo.
          
          ${dataContext}
          
          REGRAS:
          1. Responda APENAS com base nos dados fornecidos acima. Se a pergunta for sobre algo que não está nos dados, diga que não tem essa informação.
          2. Seja prestativo, profissional e use formatação Markdown (negrito, listas) para facilitar a leitura.
          3. Se o usuário perguntar "quem é o melhor cliente", olhe para o "Top Clientes".
          4. Se o usuário pedir "estratégias", use seu conhecimento de vendas aplicado aos números fornecidos.
          5. Mantenha as respostas curtas e objetivas, estilo chat.
        `
      }
    });

    // Envia a mensagem (o SDK gerencia o histórico na sessão, mas aqui estamos fazendo stateless para simplificar o frontend, 
    // então passamos o histórico como contexto se necessário, mas para esse exemplo simples, vamos confiar no instruction + last prompt 
    // ou reconstruir o histórico se fosse complexo. Para manter simples e robusto, enviamos o contexto atualizado a cada turn).
    
    // NOTA: O SDK @google/genai gerencia history internamente se usarmos a instância 'chat'.
    // Como o componente React pode remontar, vamos passar o histórico anterior como mensagens prévias.
    
    const chatHistory = history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }));

    // Hack: Recriamos o chat com histórico
    const chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: chatHistory,
        config: {
            systemInstruction: `Você é o Air Sales AI. Dados atuais: ${dataContext}`
        }
    });

    const result = await chatSession.sendMessage({ message: lastMessage });
    return result.text || "Sem resposta.";

  } catch (error: any) {
    console.error("Erro no Chat IA:", error);
    return "Desculpe, tive um problema ao processar sua pergunta.";
  }
};
