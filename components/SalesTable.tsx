
import React, { useState, useMemo } from 'react';
import { Sale, ColumnConfig, SortConfig } from '../types';
import { ArrowUp, ArrowDown, GripVertical, ChevronRight, ChevronDown, Package, Check, X as XIcon, Trash2, Edit2, Bookmark } from 'lucide-react';

interface SalesTableProps {
  data: Sale[];
  columns: ColumnConfig[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Sale) => void;
  onColumnReorder: (fromIndex: number, toIndex: number) => void;
  isLoading: boolean;
  isGroupedByOrder?: boolean;
  onTogglePayment?: (row: Sale) => Promise<void>;
  onEditManual?: (row: Sale) => void;
  onDeleteManual?: (row: Sale) => void;
  onUpdateDelayReason?: (row: Sale, reason: string) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({ 
  data, 
  columns, 
  sortConfig, 
  onSort,
  onColumnReorder,
  isLoading,
  isGroupedByOrder = false,
  onTogglePayment,
  onEditManual,
  onDeleteManual,
  onUpdateDelayReason
}) => {
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [editingDelayReason, setEditingDelayReason] = useState<string | null>(null);
  const [tempReason, setTempReason] = useState("");

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveReason = (row: Sale) => {
      if (onUpdateDelayReason) {
          onUpdateDelayReason(row, tempReason);
      }
      setEditingDelayReason(null);
  };

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

  const toggleExpand = (groupKey: string) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(groupKey)) {
      newSet.delete(groupKey);
    } else {
      newSet.add(groupKey);
    }
    setExpandedOrders(newSet);
  };

  const handlePaymentToggle = async (e: React.MouseEvent, row: Sale) => {
     e.stopPropagation();
     if (!onTogglePayment) return;
     
     const uniqueId = `${row.FIL_IN_CODIGO}-${row.SER_ST_CODIGO}-${row.PED_IN_CODIGO}-${row.ITP_IN_SEQUENCIA}`;
     setProcessingPayment(uniqueId);

      try {
          await onTogglePayment(row);
      } catch (err) {
          // Erro já tratado no pai
      } finally {
          setProcessingPayment(null);
      }
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

  const groupedData = useMemo(() => {
    if (!isGroupedByOrder) return null;

    const groups = new Map<string, { summary: Sale, items: Sale[] }>();

    data.forEach(item => {
      // Agrupa por Pedido E Nota Fiscal (se houver) para separar faturamentos parciais
      let groupKey = `${item.FIL_IN_CODIGO}-${item.SER_ST_CODIGO}-${item.PED_IN_CODIGO}`;
      if (item.NF_NOT_IN_CODIGO) {
          groupKey += `-${item.NF_NOT_IN_CODIGO}`;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { 
          summary: { ...item }, 
          items: [] 
        });
      }
      
      const group = groups.get(groupKey)!;
      group.items.push(item);
    });

    const result = Array.from(groups.entries()).map(([key, g]) => {
       const totalVal = g.items.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
       const totalQtd = g.items.reduce((acc, curr) => acc + (Number(curr.ITP_RE_QUANTIDADE) || 0), 0);
       const totalComissao = g.items.reduce((acc, curr) => acc + (Number(curr.VALOR_COMISSAO) || 0), 0);
       
       // Soma também os valores da nota fiscal para exibição correta nas colunas novas
       const totalNotaMerc = g.items.reduce((acc, curr) => acc + (Number(curr.ITN_RE_VALORMERCADORIA) || 0), 0);
       const totalNotaTotal = g.items.reduce((acc, curr) => acc + (Number(curr.ITN_RE_VALORTOTAL) || 0), 0);
       
       g.summary.ITP_RE_VALORMERCADORIA = totalVal;
       g.summary.ITP_RE_QUANTIDADE = totalQtd;
       g.summary.VALOR_COMISSAO = totalComissao;
       g.summary.ITN_RE_VALORMERCADORIA = totalNotaMerc;
       g.summary.ITN_RE_VALORTOTAL = totalNotaTotal;

       g.summary.ITP_ST_DESCRICAO = `${g.items.length} Itens`;
       g.summary.PRO_ST_ALTERNATIVO = '-';
       g.summary.ITP_RE_VALORUNITARIO = 0;
       g.summary.COMISSAO_PAGA = g.items.every(i => i.COMISSAO_PAGA);
       g.summary.__groupKey = key;

       return g;
    });

    return result;
  }, [data, isGroupedByOrder]);

  const renderFlatRows = () => {
    return data.map((row, rIdx) => {
      const isManual = Number(row.FIL_IN_CODIGO) === 900;
      
      return (
        <tr 
          key={rIdx} 
          className={`
            hover:bg-gray-100/80 transition-colors border-b border-gray-100 last:border-0 relative
            ${isManual ? 'bg-indigo-50/50' : row.COMISSAO_PAGA ? 'bg-green-50/30' : ''}
          `}
        >
          {visibleColumns.map((col, cIdx) => (
            <td 
              key={col.key} 
              className={`
                px-2 py-1.5 text-[10px] font-medium text-gray-700 whitespace-nowrap border-r border-gray-50 last:border-0 
                ${getAlignmentClass(col.key)}
                ${isManual && cIdx === 0 ? 'border-l-4 border-l-indigo-500' : ''}
              `}
            >
              {renderCellContent(row, col)}
            </td>
          ))}
        </tr>
      );
    });
  };

  const renderGroupedRows = () => {
    if (!groupedData) return null;

    return groupedData.map((group) => {
      const groupKey = group.summary.__groupKey as string;
      const isExpanded = expandedOrders.has(groupKey);
      const isManual = Number(group.summary.FIL_IN_CODIGO) === 900;

      return (
        <React.Fragment key={groupKey}>
          <tr 
            onClick={() => toggleExpand(groupKey)}
            className={`
              cursor-pointer transition-colors border-b border-gray-100 relative
              ${isManual ? 'bg-indigo-100/30 hover:bg-indigo-100/50' : isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}
            `}
          >
            {visibleColumns.map((col, idx) => {
              const isFirstCol = idx === 0;
              return (
                <td 
                  key={col.key} 
                  className={`
                    px-2 py-1.5 text-[10px] font-bold text-gray-800 whitespace-nowrap border-r border-gray-100 last:border-0 
                    ${getAlignmentClass(col.key)}
                    ${isManual && idx === 0 ? 'border-l-4 border-l-indigo-500' : ''}
                  `}
                >
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

          {isExpanded && group.items.map((item, itemIdx) => (
            <tr 
              key={`${groupKey}-${itemIdx}`} 
              className={`
                bg-gray-50/50 border-b border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200 
                ${isManual ? 'bg-indigo-50/20' : item.COMISSAO_PAGA ? 'bg-green-50/50' : ''}
              `}
            >
              {visibleColumns.map((col, idx) => (
                 <td 
                   key={col.key} 
                   className={`
                     px-2 py-1 text-[9px] text-gray-500 whitespace-nowrap border-r border-gray-100 last:border-0 
                     ${getAlignmentClass(col.key)}
                     ${isManual && idx === 0 ? 'border-l-4 border-l-indigo-300' : ''}
                   `}
                 >
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
    const isManual = Number(row.FIL_IN_CODIGO) === 900;

    if (col.key === 'CHECK_PAGAMENTO') {
        if (isParent) return null;
        
        const uniqueId = `${row.FIL_IN_CODIGO}-${row.SER_ST_CODIGO}-${row.PED_IN_CODIGO}-${row.ITP_IN_SEQUENCIA}`;
        const isProcessing = processingPayment === uniqueId;

        return (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={(e) => handlePaymentToggle(e, row)}
                    disabled={isProcessing}
                    className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all shadow-sm ${
                        row.COMISSAO_PAGA 
                        ? 'bg-green-500 border-green-600 text-white hover:bg-green-600' 
                        : 'bg-white border-gray-300 text-gray-200 hover:border-gray-400'
                    }`}
                    title={row.COMISSAO_PAGA ? "Pago (Clique para desfazer)" : "Marcar como Pago"}
                >
                    {isProcessing ? (
                        <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        row.COMISSAO_PAGA && <Check size={12} strokeWidth={4} />
                    )}
                </button>
            </div>
        );
    }

    if (col.key === 'MANUAL_ACTIONS') {
      if (isParent || !isManual) return null;
      
      return (
        <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
           <button 
              onClick={() => onEditManual?.(row)}
              className="p-1.5 bg-white border border-gray-200 rounded shadow-sm text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all"
              title="Editar lançamento manual"
           >
              <Edit2 size={12}/>
           </button>
           <button 
              onClick={() => onDeleteManual?.(row)}
              className="p-1.5 bg-white border border-gray-200 rounded shadow-sm text-gray-400 hover:text-red-600 hover:border-red-200 transition-all"
              title="Excluir lançamento manual"
           >
              <Trash2 size={12}/>
           </button>
        </div>
      );
    }

    if (col.key === 'PED_IN_CODIGO' && isManual) {
       return (
         <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold">{row[col.key]}</span>
            <span className="bg-indigo-600 text-white text-[7px] font-black px-1 py-0.5 rounded flex items-center gap-0.5">
               <Bookmark size={8} fill="currentColor" /> MANUAL
            </span>
         </div>
       );
    }

    if (col.key === 'MOTIVO_ATRASO') {
        const uniqueId = `${row.FIL_IN_CODIGO}-${row.SER_ST_CODIGO}-${row.PED_IN_CODIGO}`;
        const isEditing = editingDelayReason === uniqueId;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input 
                        type="text" 
                        className="border rounded px-1 py-0.5 text-[10px] w-full min-w-[100px] shadow-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        value={tempReason}
                        onChange={e => setTempReason(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveReason(row);
                            if (e.key === 'Escape') setEditingDelayReason(null);
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                    <button onClick={() => handleSaveReason(row)} className="text-green-600 hover:text-green-800 p-0.5 bg-green-50 rounded border border-green-200"><Check size={10}/></button>
                    <button onClick={() => setEditingDelayReason(null)} className="text-red-600 hover:text-red-800 p-0.5 bg-red-50 rounded border border-red-200"><XIcon size={10}/></button>
                </div>
            );
        }

        return (
            <div className="group flex items-center justify-between gap-2 min-w-[100px] min-h-[20px]" onClick={e => e.stopPropagation()}>
                <span className="truncate max-w-[150px] text-gray-600" title={row[col.key]}>{row[col.key] || <span className="text-gray-300 italic">Sem motivo</span>}</span>
                {onUpdateDelayReason && (
                    <button 
                        onClick={() => {
                            setEditingDelayReason(uniqueId);
                            setTempReason(row[col.key] || '');
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1 hover:bg-blue-50 rounded"
                    >
                        <Edit2 size={10} />
                    </button>
                )}
            </div>
        );
    }

    if (col.key === 'DIAS_ATRASO') {
        const days = Number(row[col.key]);
        if (!days) return <span className="text-gray-300">-</span>;
        return (
            <div className="flex justify-center">
                <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    {days} dias
                </span>
            </div>
        );
    }

    if (col.key === 'STATUS_ENTREGA') {
      const status = String(row[col.key]);
      let colorClass = 'bg-gray-50 text-gray-600 border-gray-100';
      
      if (status === 'ENTREGUE NO PRAZO') colorClass = 'bg-green-50 text-green-600 border-green-100';
      else if (status === 'ENTREGUE FORA DO PRAZO') colorClass = 'bg-amber-50 text-amber-600 border-amber-100';
      else if (status === 'ATRASADO') colorClass = 'bg-red-50 text-red-600 border-red-100';
      
      return (
        <div className="flex justify-center">
          <span className={`px-1.5 py-0.5 border text-[8px] font-bold uppercase tracking-widest w-[150px] block text-center ${colorClass}`}>
            {status}
          </span>
        </div>
      );
    }

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
    
    if (isParent) {
       if (col.key === 'ITP_RE_VALORUNITARIO' || col.key === 'PRO_ST_ALTERNATIVO' || col.key === 'ATINGIMENTO_META_ORIGEM') return <span className="text-gray-300">-</span>;
       if (col.key === 'ITP_ST_DESCRICAO') return <span className="italic text-gray-500 flex items-center gap-1"><Package size={10}/> {row[col.key]}</span>;
    }

    return (
      <span className={typeof row[col.key] === 'number' ? 'font-mono' : ''}>
        {col.format ? col.format(row[col.key]) : row[col.key]}
      </span>
    );
  };

  const renderMobileCards = () => {
    if (isGroupedByOrder && groupedData) {
      return groupedData.map((group) => {
        const groupKey = group.summary.__groupKey as string;
        const isExpanded = expandedOrders.has(groupKey);
        const isManual = Number(group.summary.FIL_IN_CODIGO) === 900;

        return (
          <div key={groupKey} className={`mb-3 border rounded-sm overflow-hidden ${isManual ? 'border-indigo-200' : 'border-gray-200'} bg-white shadow-sm`}>
            <div 
              onClick={() => toggleExpand(groupKey)}
              className={`p-3 flex flex-col gap-2 cursor-pointer ${isManual ? 'bg-indigo-50/50' : isExpanded ? 'bg-blue-50/30' : 'bg-white'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900">PED: {group.summary.PED_IN_CODIGO}</span>
                    {isManual && (
                      <span className="bg-indigo-600 text-white text-[7px] font-black px-1 py-0.5 rounded flex items-center gap-0.5">
                        <Bookmark size={8} fill="currentColor" /> MANUAL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase truncate max-w-[200px]">{group.summary.CLIENTE_NOME}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-gray-900">{columns.find(c => c.key === 'ITP_RE_VALORMERCADORIA')?.format?.(group.summary.ITP_RE_VALORMERCADORIA) || group.summary.ITP_RE_VALORMERCADORIA}</span>
                  <span className="text-[9px] text-gray-400 font-bold">{columns.find(c => c.key === 'PED_DT_EMISSAO')?.format?.(group.summary.PED_DT_EMISSAO) || group.summary.PED_DT_EMISSAO}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 border text-[8px] font-bold uppercase tracking-widest ${
                    String(group.summary.PED_ST_STATUS).toLowerCase().includes('faturado') ? 'bg-green-50 text-green-600 border-green-100' : 
                    String(group.summary.PED_ST_STATUS).toLowerCase().includes('cancel') ? 'bg-red-50 text-red-600 border-red-100' :
                    String(group.summary.PED_ST_STATUS).toLowerCase().includes('aprov') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {group.summary.PED_ST_STATUS}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium italic">{group.items.length} Itens</span>
                </div>
                <div className="flex items-center gap-2">
                  {onTogglePayment && columns.some(c => c.key === 'CHECK_PAGAMENTO' && c.visible) && (
                    <div onClick={e => e.stopPropagation()}>
                      {renderCellContent(group.summary, { key: 'CHECK_PAGAMENTO', label: '', visible: true }, false)}
                    </div>
                  )}
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
                {group.items.map((item, idx) => (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-700 leading-tight">{item.ITP_ST_DESCRICAO}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{item.PRO_ST_ALTERNATIVO}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-[10px] font-bold text-gray-900">{columns.find(c => c.key === 'ITP_RE_VALORMERCADORIA')?.format?.(item.ITP_RE_VALORMERCADORIA) || item.ITP_RE_VALORMERCADORIA}</p>
                        <p className="text-[9px] text-gray-400 font-medium">Qtd: {item.ITP_RE_QUANTIDADE}</p>
                      </div>
                    </div>
                    {columns.some(c => c.key === 'VALOR_COMISSAO' && c.visible) && (
                      <div className="flex justify-between items-center bg-white/50 p-1.5 rounded-sm border border-gray-100">
                        <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Comissão</span>
                        <span className="text-[10px] font-bold text-amber-600">{columns.find(c => c.key === 'VALOR_COMISSAO')?.format?.(item.VALOR_COMISSAO) || item.VALOR_COMISSAO}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      });
    }

    return data.map((row, idx) => {
      const isManual = Number(row.FIL_IN_CODIGO) === 900;
      return (
        <div key={idx} className={`mb-3 p-3 border rounded-sm ${isManual ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white'} shadow-sm space-y-3`}>
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900">PED: {row.PED_IN_CODIGO}</span>
                {isManual && (
                  <span className="bg-indigo-600 text-white text-[7px] font-black px-1 py-0.5 rounded flex items-center gap-0.5">
                    <Bookmark size={8} fill="currentColor" /> MANUAL
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase truncate max-w-[200px]">{row.CLIENTE_NOME}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-gray-900">{columns.find(c => c.key === 'ITP_RE_VALORMERCADORIA')?.format?.(row.ITP_RE_VALORMERCADORIA) || row.ITP_RE_VALORMERCADORIA}</span>
              <span className="text-[9px] text-gray-400 font-bold">{columns.find(c => c.key === 'PED_DT_EMISSAO')?.format?.(row.PED_DT_EMISSAO) || row.PED_DT_EMISSAO}</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-700 leading-tight">{row.ITP_ST_DESCRICAO}</p>
            <p className="text-[9px] text-gray-400 font-mono">{row.PRO_ST_ALTERNATIVO}</p>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 border text-[8px] font-bold uppercase tracking-widest ${
                String(row.PED_ST_STATUS).toLowerCase().includes('faturado') ? 'bg-green-50 text-green-600 border-green-100' : 
                String(row.PED_ST_STATUS).toLowerCase().includes('cancel') ? 'bg-red-50 text-red-600 border-red-100' :
                String(row.PED_ST_STATUS).toLowerCase().includes('aprov') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                'bg-gray-50 text-gray-600 border-gray-100'
              }`}>
                {row.PED_ST_STATUS}
              </span>
              {row.REPRESENTANTE_NOME && (
                <span className="text-[8px] text-gray-400 font-bold uppercase truncate max-w-[100px]">{row.REPRESENTANTE_NOME}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onTogglePayment && columns.some(c => c.key === 'CHECK_PAGAMENTO' && c.visible) && renderCellContent(row, { key: 'CHECK_PAGAMENTO', label: '', visible: true }, false)}
              {isManual && columns.some(c => c.key === 'MANUAL_ACTIONS' && c.visible) && renderCellContent(row, { key: 'MANUAL_ACTIONS', label: '', visible: true }, false)}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="flex-1 overflow-auto custom-scrollbar p-2 sm:p-0">
        {isMobile ? (
          <div className="animate-in fade-in duration-500">
            {isLoading ? (
              <div className="p-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">Processando...</div>
            ) : data.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Nenhum Registro</div>
            ) : (
              renderMobileCards()
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};
