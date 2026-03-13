
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, FileSpreadsheet, RefreshCw, 
  User, MapPin, Phone, Mail, Calendar, ArrowUpRight,
  Building2, Hash, Globe, ExternalLink, ChevronRight,
  ChevronDown, ChevronUp, LayoutGrid, List, Columns,
  Users, Map as MapIcon, FileText, FileDown
} from 'lucide-react';
import { Customer } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatCard } from './StatCard';

interface CustomerWalletViewProps {
  customers: Customer[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const CustomerWalletView: React.FC<CustomerWalletViewProps> = ({ 
  customers, 
  onRefresh, 
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUf, setSelectedUf] = useState<string>('ALL');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const ufs = useMemo(() => {
    const uniqueUfs = Array.from(new Set(customers.map(c => c.uf_st_sigla).filter(Boolean)));
    return ['ALL', ...uniqueUfs.sort()];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.agn_st_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.agn_st_cgc.includes(searchTerm) ||
        customer.agn_in_codigo.toString().includes(searchTerm);
      
      const matchesUf = selectedUf === 'ALL' || customer.uf_st_sigla === selectedUf;
      
      return matchesSearch && matchesUf;
    });
  }, [customers, searchTerm, selectedUf]);

  const handleExportExcel = () => {
    // Logic for Excel export could be added here
    console.log('Exporting to Excel...');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      {/* Intelligence Panel */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          className="w-full px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Painel de Inteligência</span>
          </div>
          {isPanelExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {isPanelExpanded && (
          <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Busca Global</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="ID, Nome, CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-gray-900 transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Estado (UF)</label>
                <div className="relative">
                  <MapIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <select
                    value={selectedUf}
                    onChange={(e) => setSelectedUf(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-gray-900 appearance-none cursor-pointer"
                  >
                    <option value="ALL">Todos os Estados</option>
                    {ufs.filter(uf => uf !== 'ALL').map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                </div>
              </div>

              <div className="md:col-span-5 flex items-end justify-end gap-2">
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedUf('ALL'); }}
                  className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Resetar
                </button>
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all active:scale-95 shadow-lg disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  Sincronizar ERP
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <StatCard 
                title="Total de Clientes" 
                value={filteredCustomers.length.toString()} 
                icon={Users} 
                color="text-blue-600" 
              />
              <StatCard 
                title="Estados Atendidos" 
                value={(ufs.length - 1).toString()} 
                icon={MapIcon} 
                color="text-emerald-600" 
              />
              <StatCard 
                title="Clientes Ativos" 
                value={filteredCustomers.length.toString()} 
                icon={Building2} 
                color="text-amber-600" 
              />
              <div className="bg-white p-3 border border-gray-200 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FileText size={40}/>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Taxa de Conversão</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-black tracking-tighter text-gray-900">100%</h3>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analytical View Header */}
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className="text-gray-400" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600">Visão Analítica (Carteira de Clientes)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-white border border-gray-200 text-green-600 text-[9px] font-bold uppercase tracking-widest hover:bg-green-50 flex items-center gap-2 transition-all rounded-sm"
            >
              <FileSpreadsheet size={12} />
              Excel
            </button>
            <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>
            <div className="flex bg-gray-100 p-0.5 rounded-sm">
              <button className="p-1 px-2 bg-white shadow-sm text-gray-900 rounded-sm flex items-center gap-1.5">
                <List size={12} />
                <span className="text-[8px] font-black uppercase">Lista Plana</span>
              </button>
              <button className="p-1 px-2 text-gray-400 hover:text-gray-600 flex items-center gap-1.5">
                <Columns size={12} />
                <span className="text-[8px] font-black uppercase">Colunas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[8px] font-black uppercase text-gray-400 tracking-widest">Código / Cliente</th>
                <th className="px-4 py-3 text-left text-[8px] font-black uppercase text-gray-400 tracking-widest">CNPJ / CPF</th>
                <th className="px-4 py-3 text-left text-[8px] font-black uppercase text-gray-400 tracking-widest">Localização</th>
                <th className="px-4 py-3 text-center text-[8px] font-black uppercase text-gray-400 tracking-widest">Última Atualização</th>
                <th className="px-4 py-3 text-right text-[8px] font-black uppercase text-gray-400 tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id || customer.agn_in_codigo} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-[10px] shrink-0">
                          {customer.agn_st_nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 uppercase truncate">{customer.agn_st_nome}</p>
                          <p className="text-[9px] text-gray-400 font-mono">#{customer.agn_in_codigo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-600 font-mono">{customer.agn_st_cgc}</p>
                      {customer.agn_st_inscrestadual && (
                        <p className="text-[9px] text-gray-400 uppercase">IE: {customer.agn_st_inscrestadual}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-700 font-bold uppercase">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{customer.agn_st_municipio} - {customer.uf_st_sigla}</span>
                      </div>
                      <p className="text-[9px] text-gray-400 uppercase truncate max-w-[250px]">
                        {customer.agn_st_logradouro}, {customer.agn_st_numero}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <p className="font-bold text-gray-600">
                        {customer.agn_dt_ultimaatucad 
                          ? format(new Date(customer.agn_dt_ultimaatucad), 'dd/MM/yyyy', { locale: ptBR })
                          : 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-all active:scale-95">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300 space-y-3">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Building2 className="w-12 h-12 opacity-20" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum cliente encontrado</p>
                        <p className="text-[10px] font-medium">Tente ajustar seus filtros ou realize uma nova sincronização.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
