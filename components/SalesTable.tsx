import React, { useState, useMemo } from 'react';
import { Sale, ColumnConfig, SortConfig } from '../types';
import { ArrowUp, ArrowDown, GripVertical, ChevronRight, ChevronDown, Package } from 'lucide-react';

interface SalesTableProps {
  data: Sale[];
  columns: ColumnConfig[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Sale) => void;
  onColumnReorder: (fromIndex: number, toIndex: number) => void;
  isLoading: boolean;
  isGroupedByOrder?: boolean;
}

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, 
  columns, 
  sortConfig, 
  onSort,
  onColumnReorder,
  isLoading,
  isGroupedByOrder = false
}) => {
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const handleDragStart = (e: React.DragEvent<HTMLTableCellElement>, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, index: number) => {
    e.preventDefault();
    if (draggedColIndex !== null && draggedColIndex !== index) {
      onColumnReorder(draggedColIndex, index);
    }
    setDraggedColIndex(null);
  };

  const toggleExpand = (orderId: number) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setExpandedOrders(newSet);
  };

  const visibleColumns = columns.map((col, idx) => ({ ...col, originalIdx: idx })).filter(c => c.visible);

  const getAlignmentClass = (key: string) => {
    const leftAlignedKeys = ['CLIENTE_NOME', 'REPRESENTANTE_NOME', 'CLI_NOME', 'VENDEDOR_NOME', 'PRODUTO_DESCRICAO', 'ITP_ST_DESCRICAO'];
    return leftAlignedKeys.includes(key) ? 'text-left' : 'text-center';
  };

  const getHeaderJustifyClass = (key: string) => {
    const leftAlignedKeys = ['CLIENTE_NOME', 'REPRESENTANTE_NOME', 'CLI_NOME', 'VENDEDOR_NOME', 'PRODUTO_DESCRICAO', 'ITP_ST_DESCRICAO'];
    return leftAlignedKeys.includes(key) ? 'justify-start' : 'justify-center';
  };

  // Lógica de Agrupamento
  const groupedData = useMemo(() => {
    if (!isGroupedByOrder) return null;

    const groups = new Map<number, { summary: Sale, items: Sale[] }>();

    data.forEach(item => {
      const orderId = Number(item.PED_IN_CODIGO);
      if (!groups.has(orderId)) {
        // Cria o registro pai (cópia do primeiro item, mas zerando valores que serão somados)
        groups.set(orderId, { 
          summary: { ...item }, 
          items: [] 
        });
      }
      
      const group = groups.get(orderId)!;
      group.items.push(item);
    });

    // Recalcula totais do pai
    const result = Array.from(groups.values()).map(g => {
       const totalVal = g.items.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
       const totalQtd = g.items.reduce((acc, curr) => acc + (Number(curr.ITP_RE_QUANTIDADE) || 0), 0);
       
       g.summary.ITP_RE_VALORMERCADORIA = totalVal;
       g.summary.ITP_RE_QUANTIDADE = totalQtd;
       g.summary.ITP_ST_DESCRICAO = `${g.items.length} Itens`; // Substitui nome do produto
       g.summary.PRO_ST_ALTERNATIVO = '-';
       g.summary.ITP_RE_VALORUNITARIO = 0; // Não faz sentido somar unitário no pai

       return g;
    });

    return result;
  }, [data, isGroupedByOrder]);


  // Renderização Padrão (Sem Agrupamento)
  const renderFlatRows = () => {
    return data.map((row, rIdx) => (
      <tr key={rIdx} className="hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-0">
        {visibleColumns.map(col => (
          <td key={col.key} className={`px-2 py-1 text-[10px] font-medium text-gray-700 whitespace-nowrap border-r border-gray-50 last:border-0 ${getAlignmentClass(col.key)}`}>
            {renderCellContent(row, col)}
          </td>
        ))}
      </tr>
    ));
  };

  // Renderização Agrupada (Com Expansão)
  const renderGroupedRows = () => {
    if (!groupedData) return null;

    return groupedData.map((group) => {
      const orderId = Number(group.summary.PED_IN_CODIGO);
      const isExpanded = expandedOrders.has(orderId);

      return (
        <React.Fragment key={orderId}>
          {/* Linha Pai (Resumo do Pedido) */}
          <tr 
            onClick={() => toggleExpand(orderId)}
            className={`cursor-pointer transition-colors border-b border-gray-100 ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
          >
            {visibleColumns.map((col, idx) => {
              // Adiciona ícone de expansão na primeira coluna visível
              const isFirstCol = idx === 0;
              return (
                <td key={col.key} className={`px-2 py-1.5 text-[10px] font-bold text-gray-800 whitespace-nowrap border-r border-gray-100 last:border-0 ${getAlignmentClass(col.key)}`}>
                   <div className={`flex items-center gap-2 ${getHeaderJustifyClass(col.key)}`}>
                      {isFirstCol && (
                        <div className="w-4 h-4 flex items-center justify-center text-gray-400">
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </div>
                      )}
                      {renderCellContent(group.summary, col, true)}
                   </div>
                </td>
              );
            })}
          </tr>

          {/* Linhas Filhas (Itens) */}
          {isExpanded && group.items.map((item, itemIdx) => (
            <tr key={`${orderId}-${itemIdx}`} className="bg-gray-50/50 border-b border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
              {visibleColumns.map((col, idx) => (
                 <td key={col.key} className={`px-2 py-1 text-[9px] text-gray-500 whitespace-nowrap border-r border-gray-100 last:border-0 ${getAlignmentClass(col.key)}`}>
                    {/* Indenta a primeira coluna para dar hierarquia visual */}
                    <div className={idx === 0 ? 'pl-6 flex items-center gap-1' : ''}>
                       {idx === 0 && <div className="w-1.5 h-px bg-gray-300"></div>}
                       {renderCellContent(item, col)}
                    </div>
                 </td>
              ))}
            </tr>
          ))}
        </React.Fragment>
      );
    });
  };

  const renderCellContent = (row: Sale, col: ColumnConfig, isParent = false) => {
    if (col.key.includes('STATUS')) {
      return (
        <div className="flex justify-center">
          <span className={`px-1.5 py-0.5 border text-[8px] font-bold uppercase tracking-widest ${
            String(row[col.key]).toLowerCase().includes('faturado') ? 'bg-green-50 text-green-600 border-green-100' : 
            String(row[col.key]).toLowerCase().includes('cancel') ? 'bg-red-50 text-red-600 border-red-100' :
            String(row[col.key]).toLowerCase().includes('aprov') ? 'bg-blue-50 text-blue-600 border-blue-100' :
            'bg-gray-50 text-gray-600 border-gray-100'
          }`}>
            {row[col.key]}
          </span>
        </div>
      );
    }
    
    // Tratamento especial para colunas que não fazem sentido no agrupamento pai
    if (isParent) {
       if (col.key === 'ITP_RE_VALORUNITARIO' || col.key === 'PRO_ST_ALTERNATIVO') return <span className="text-gray-300">-</span>;
       if (col.key === 'ITP_ST_DESCRICAO') return <span className="italic text-gray-500 flex items-center gap-1"><Package size={10}/> {row[col.key]}</span>;
    }

    return (
      <span className={typeof row[col.key] === 'number' ? 'font-mono' : ''}>
        {col.format ? col.format(row[col.key]) : row[col.key]}
      </span>
    );
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 shadow-sm">
            <tr>
              {visibleColumns.map((col, idx) => (
                <th 
                  key={col.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.originalIdx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.originalIdx)}
                  className={`px-2 py-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest cursor-move hover:bg-gray-100 transition-colors border-r border-gray-200 last:border-0 ${getAlignmentClass(col.key)}`}
                >
                  <div className={`flex items-center gap-1 ${getHeaderJustifyClass(col.key)}`}>
                    <GripVertical size={10} className="text-gray-300 shrink-0" />
                    <span onClick={() => onSort(col.key)} className="flex items-center gap-0.5 cursor-pointer truncate">
                      {col.label}
                      {sortConfig?.key === col.key && (sortConfig.direction === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
               <tr><td colSpan={visibleColumns.length} className="p-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">Processando...</td></tr>
            ) : data.length === 0 ? (
               <tr><td colSpan={visibleColumns.length} className="p-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Nenhum Registro</td></tr>
            ) : (
               isGroupedByOrder ? renderGroupedRows() : renderFlatRows()
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
