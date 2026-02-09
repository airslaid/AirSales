
import React from 'react';
import { Sparkles, X, BrainCircuit, Lightbulb, TrendingUp, AlertTriangle, Target } from 'lucide-react';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  insights: string | null;
  onGenerate: () => void;
  contextName: string;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  insights,
  onGenerate,
  contextName
}) => {
  if (!isOpen) return null;

  // Função simples para formatar markdown básico para visualização
  const renderContent = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      // Títulos
      if (line.trim().startsWith('###') || line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.') || line.trim().startsWith('4.')) {
        return <h4 key={i} className="text-sm font-bold text-gray-900 mt-4 mb-2">{line.replace(/#/g, '').replace(/\*\*/g, '')}</h4>;
      }
      // Bullets
      if (line.trim().startsWith('- ')) {
        return <li key={i} className="ml-4 text-xs text-gray-600 mb-1 leading-relaxed">{line.replace('- ', '').replace(/\*\*/g, '')}</li>;
      }
      // Texto normal (com negrito simples)
      const parts = line.split('**');
      return (
        <p key={i} className="text-xs text-gray-600 mb-2 leading-relaxed">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-gray-800">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm relative">
        
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-gray-900 to-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
              <Sparkles className="text-amber-300" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">IA Business Analyst</h3>
              <p className="text-[10px] text-gray-300 font-medium">Análise inteligente do módulo: <span className="text-white font-bold">{contextName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainCircuit size={20} className="text-gray-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-widest animate-pulse">Analisando Dados...</p>
                <p className="text-[10px] text-gray-500">Identificando tendências, calculando pareto e gerando insights.</p>
              </div>
            </div>
          ) : insights ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-sm border border-gray-100 shadow-sm">
                {renderContent(insights)}
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                 <p className="text-[9px] text-gray-400 italic mt-2 mr-auto">Gerado por Google Gemini 3.0 Flash. Verifique os dados antes de tomar decisões críticas.</p>
                 <button onClick={onGenerate} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors flex items-center gap-2">
                    <RefreshCwIcon className="w-3 h-3" /> Regenerar
                 </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-10 space-y-6 opacity-80">
              <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100">
                <Lightbulb size={48} className="text-amber-400" />
              </div>
              <div className="text-center max-w-sm space-y-2">
                <h4 className="text-sm font-bold text-gray-900">Descubra Oportunidades Ocultas</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Utilize a Inteligência Artificial para analisar os dados filtrados na tela atual. 
                  A IA irá identificar clientes em risco, produtos em alta e sugerir ações para bater a meta.
                </p>
              </div>
              <button 
                onClick={onGenerate}
                className="px-6 py-3 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 rounded-sm"
              >
                <Sparkles size={14} className="text-amber-300" />
                Gerar Análise Agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RefreshCwIcon = ({className}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);
