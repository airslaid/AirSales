
import React, { useState } from 'react';
import { Sale, ColumnConfig, SortConfig } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, GripVertical } from 'lucide-react';

interface SalesTableProps {
  data: Sale[];
  columns: ColumnConfig[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Sale) => void;
  onColumnReorder: (fromIndex: number, toIndex: number) => void;
  isLoading: boolean;
}

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, 
  columns, 
  sortConfig, 
  onSort,
  onColumnReorder,
  isLoading 
}) => {
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

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

  const visibleColumns = columns.map((col, idx) => ({ ...col, originalIdx: idx })).filter(c => c.visible);

  // Função para determinar o alinhamento com base na chave da coluna
  const getAlignmentClass = (key: string) => {
    const leftAlignedKeys = ['CLIENTE_NOME', 'REPRESENTANTE_NOME', 'CLI_NOME', 'VENDEDOR_NOME', 'PRODUTO_DESCRICAO'];
    return leftAlignedKeys.includes(key) ? 'text-left' : 'text-center';
  };

  // Função para centralizar o conteúdo do cabeçalho quando necessário
  const getHeaderJustifyClass = (key: string) => {
    const leftAlignedKeys = ['CLIENTE_NOME', 'REPRESENTANTE_NOME', 'CLI_NOME', 'VENDEDOR_NOME', 'PRODUTO_DESCRICAO'];
    return leftAlignedKeys.includes(key) ? 'justify-start' : 'justify-center';
  };

  return (
    <div className="w-full bg-white overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100/50 border-b border-gray-200">
              {visibleColumns.map((col, idx) => (
                <th 
                  key={col.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.originalIdx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.originalIdx)}
                  className={`px-2 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest cursor-move hover:bg-gray-100 transition-colors border-r border-gray-100 last:border-0 ${getAlignmentClass(col.key)}`}
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
              data.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-0">
                  {visibleColumns.map(col => (
                    <td key={col.key} className={`px-2 py-1 text-[10px] font-medium text-gray-700 whitespace-nowrap border-r border-gray-50 last:border-0 ${getAlignmentClass(col.key)}`}>
                      {col.key.includes('STATUS') ? (
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
                      ) : (
                        <span className={typeof row[col.key] === 'number' ? 'font-mono' : ''}>
                          {col.format ? col.format(row[col.key]) : row[col.key]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
