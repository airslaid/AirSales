
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, Bot, Eraser } from 'lucide-react';
import { Sale } from '../types';
import { chatWithSalesData } from '../services/aiService';

interface AIChatViewProps {
  salesData: Sale[];
  metrics: any;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const AIChatView: React.FC<AIChatViewProps> = ({ salesData, metrics }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou sua inteligência artificial de vendas. Analisei os dados filtrados na tela. Como posso ajudar você a vender mais hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepara histórico para API (excluindo a msg de boas vindas se quiser, ou mantendo)
      const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await chatWithSalesData(historyForApi, salesData, metrics, userMsg.text);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Desculpe, ocorreu um erro ao conectar com o servidor.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Histórico limpo. Quais são suas dúvidas sobre os dados atuais?',
        timestamp: new Date()
      }]);
  };

  // Renderizador simples de Markdown para Negrito e Listas
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
        // Listas
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return <li key={i} className="ml-4 list-disc">{line.replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>;
        }
        // Títulos
        if (line.trim().startsWith('#')) {
            return <strong key={i} className="block mt-2 mb-1 text-gray-900">{line.replace(/^#+\s+/, '')}</strong>;
        }
        // Texto normal com negrito
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
            <p key={i} className="mb-1 min-h-[1.2em]">
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </p>
        );
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border border-gray-200 shadow-sm rounded-sm overflow-hidden animate-in fade-in duration-300">
      {/* Header do Chat */}
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-inner">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Chat Inteligente</h3>
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Online • Analisando {salesData.length} registros
            </p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-full transition-colors" title="Limpar conversa">
            <Eraser size={16} />
        </button>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#f0f2f5]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end max-w-[85%] sm:max-w-[70%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>

              {/* Balão */}
              <div className={`p-3 rounded-2xl shadow-sm text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-gray-900 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
              }`}>
                {msg.role === 'model' ? (
                    <div className="markdown-content">
                        {renderMessageText(msg.text)}
                    </div>
                ) : (
                    <p>{msg.text}</p>
                )}
                <span className={`text-[9px] block text-right mt-1 opacity-60 ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-white text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-sm">
                    <Sparkles size={14} className="animate-pulse" />
                </div>
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre seus dados (ex: Quais produtos vendem mais?)"
            disabled={isTyping}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 p-2 bg-gray-900 text-white rounded-full hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-2">
            A IA pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
};
