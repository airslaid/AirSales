
import React from 'react';
import { X, Package, User, Calendar, MapPin, Tag, Hash, FileText, ShoppingBag, Percent } from 'lucide-react';
import { Sale } from '../types';

interface SaleDetailModalProps {
  summary: Sale;
  items: Sale[];
  onClose: () => void;
  currencyFormat: (val: any) => string;
  numberFormat: (val: any) => string;
  dateFormat: (val: any) => string;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  summary,
  items,
  onClose,
  currencyFormat,
  numberFormat,
  dateFormat
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Detalhes do Pedido #{summary.PED_IN_CODIGO}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{summary.CLIENTE_NOME}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard icon={<User size={14}/>} label="Cliente" value={summary.CLIENTE_NOME} />
            <InfoCard icon={<Hash size={14}/>} label="Pedido" value={summary.PED_IN_CODIGO} />
            <InfoCard icon={<Calendar size={14}/>} label="Emissão Pedido" value={dateFormat(summary.PED_DT_EMISSAO)} />
            <InfoCard icon={<Tag size={14}/>} label="Status" value={
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                String(summary.PED_ST_STATUS).toLowerCase().includes('faturado') ? 'bg-green-100 text-green-700' : 
                String(summary.PED_ST_STATUS).toLowerCase().includes('cancel') ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {summary.PED_ST_STATUS}
              </span>
            } />
            <InfoCard icon={<MapPin size={14}/>} label="Filial" value={summary.FILIAL_NOME} />
            <InfoCard icon={<User size={14}/>} label="Vendedor/Rep" value={summary.REPRESENTANTE_NOME} />
            <InfoCard icon={<FileText size={14}/>} label="Notas Fiscais" value={summary.NF_NOT_IN_CODIGO || '-'} />
            <InfoCard icon={<Calendar size={14}/>} label="Emissão Nota" value={summary.NOT_DT_EMISSAO ? dateFormat(summary.NOT_DT_EMISSAO) : '-'} />
            <InfoCard icon={<Percent size={14}/>} label="Total Comissão" value={currencyFormat(summary.VALOR_COMISSAO)} valueClassName="text-amber-600" />
          </div>

          {/* Totals Banner */}
          <div className="bg-blue-600 rounded-xl p-6 text-white grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl shadow-blue-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Package size={120} />
             </div>
             <div className="relative z-10">
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">Valor Total</p>
                <p className="text-2xl font-black">{currencyFormat(summary.ITP_RE_VALORMERCADORIA)}</p>
             </div>
             <div className="relative z-10">
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">Quantidade Total</p>
                <p className="text-2xl font-black">{numberFormat(summary.ITP_RE_QUANTIDADE)} <span className="text-xs font-medium">Unidades</span></p>
             </div>
             <div className="relative z-10">
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-1">Total de Itens</p>
                <p className="text-2xl font-black">{items.length}</p>
             </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <Package size={16} className="text-gray-400" />
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Detalhamento dos Itens</h3>
             </div>
             <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left text-[11px] border-collapse">
                   <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter">Seq.</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter w-1/3">Descrição</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-center">Referência</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-center">NF</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-right">Qtd</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-right">Qt. Fat.</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-right">Saldo</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-right">Preço Unit.</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-right">Valor Merc.</th>
                         <th className="px-4 py-3 font-black text-gray-500 uppercase tracking-tighter text-right">Valor Total</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {items.map((item, idx) => (
                         <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-gray-400">#{item.ITP_IN_SEQUENCIA}</td>
                            <td className="px-4 py-3 font-bold text-gray-700">{item.ITP_ST_DESCRICAO}</td>
                            <td className="px-4 py-3 text-center font-mono text-gray-500">{item.PRO_ST_ALTERNATIVO || '-'}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-500">{item.NF_NOT_IN_CODIGO || '-'}</td>
                             <td className="px-4 py-3 text-right font-black text-gray-900">{numberFormat(item.ITP_RE_QUANTIDADE)}</td>
                             <td className="px-4 py-3 text-right font-bold text-blue-600">{numberFormat(item.ITN_RE_QUANTIDADE || 0)}</td>
                             <td className={`px-4 py-3 text-right font-black ${
                                (Number(item.ITP_RE_QUANTIDADE) - Number(item.ITN_RE_QUANTIDADE || 0)) > 0 
                                ? 'text-orange-600' 
                                : 'text-gray-400'
                             }`}>
                                {numberFormat(Number(item.ITP_RE_QUANTIDADE) - Number(item.ITN_RE_QUANTIDADE || 0))}
                             </td>
                             <td className="px-4 py-3 text-right font-medium text-gray-600">{currencyFormat(item.ITP_RE_VALORUNITARIO)}</td>
                             <td className="px-4 py-3 text-right font-black text-blue-600 bg-blue-50/30">{currencyFormat(item.ITP_RE_VALORMERCADORIA)}</td>
                             <td className="px-4 py-3 text-right font-black text-green-600 bg-green-50/30">{currencyFormat(item.ITP_RE_VALORTOTAL)}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-100 transition-all rounded shadow-sm"
           >
             Fechar
           </button>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ icon, label, value, valueClassName = "" }: { icon: React.ReactNode, label: string, value: any, valueClassName?: string }) => (
  <div className="p-3 border border-gray-100 rounded-lg bg-white shadow-sm flex items-start gap-3">
    <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <div className={`text-[11px] font-bold text-gray-700 truncate ${valueClassName}`}>
        {value}
      </div>
    </div>
  </div>
);
