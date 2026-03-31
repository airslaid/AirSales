import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, Download, FileSpreadsheet, RefreshCw, 
  User, MapPin, Phone, Mail, Calendar, ArrowUpRight,
  Building2, Hash, Globe, ExternalLink, ChevronRight,
  ChevronDown, ChevronUp, LayoutGrid, List, Columns,
  Users, Map as MapIcon, FileText, FileDown, X, Info,
  DollarSign, Briefcase, Activity
} from 'lucide-react';
import { Customer, Sale, CRMAppointment, CRMTask } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatCard } from './StatCard';
import { fetchCRMAppointments, fetchCRMTasks } from '../services/supabaseService';
import { CustomerTimeline } from './CustomerTimeline';

const normalizeString = (str?: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

interface CustomerWalletViewProps {
  customers: Customer[];
  salesHistory: Sale[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const CustomerWalletView: React.FC<CustomerWalletViewProps> = ({ 
  customers, 
  salesHistory,
  onRefresh, 
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUf, setSelectedUf] = useState<string>('ALL');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  
  // Advanced Filters State
  const [lastPurchaseStart, setLastPurchaseStart] = useState('');
  const [lastPurchaseEnd, setLastPurchaseEnd] = useState('');
  const [minOrders, setMinOrders] = useState<string>('');
  const [selectedRep, setSelectedRep] = useState<string>('ALL');
  
  // Detail Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [crmAppointments, setCrmAppointments] = useState<CRMAppointment[]>([]);
  const [crmTasks, setCrmTasks] = useState<CRMTask[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(false);

  // Load CRM Data (Appointments and Tasks)
  React.useEffect(() => {
    const loadCRMData = async () => {
      setLoadingCRM(true);
      try {
        const [appts, tks] = await Promise.all([
          fetchCRMAppointments(),
          fetchCRMTasks()
        ]);
        setCrmAppointments(appts || []);
        setCrmTasks(tks || []);
      } catch (err) {
        console.error('Error loading CRM data for wallet:', err);
      } finally {
        setLoadingCRM(false);
      }
    };
    loadCRMData();
  }, []);

  const ufs = useMemo(() => {
    const uniqueUfs = Array.from(new Set(customers.map(c => c.uf_st_sigla).filter(Boolean)));
    return ['ALL', ...uniqueUfs.sort()];
  }, [customers]);

  const representatives = useMemo(() => {
    const repsMap = new Map<string, string>();
    salesHistory.forEach(s => {
      if (s.REP_IN_CODIGO && s.REPRESENTANTE_NOME) {
        repsMap.set(String(s.REP_IN_CODIGO), s.REPRESENTANTE_NOME);
      }
    });
    return Array.from(repsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [salesHistory]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // 1. Search Logic
      const matchesSearch = 
        customer.agn_st_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.agn_st_cgc.includes(searchTerm) ||
        customer.agn_in_codigo.toString().includes(searchTerm);
      
      // 2. UF Logic
      const matchesUf = selectedUf === 'ALL' || customer.uf_st_sigla === selectedUf;

      // 3. Last Purchase Date Logic
      let matchesDate = true;
      if (lastPurchaseStart || lastPurchaseEnd) {
        const lastDate = customer.agn_dt_ultimaatucad ? new Date(customer.agn_dt_ultimaatucad) : null;
        if (!lastDate) {
          matchesDate = false;
        } else {
          if (lastPurchaseStart && lastDate < new Date(lastPurchaseStart)) matchesDate = false;
          if (lastPurchaseEnd && lastDate > new Date(lastPurchaseEnd)) matchesDate = false;
        }
      }

      // 4. Order Count Logic
      let matchesOrders = true;
      if (minOrders && minOrders !== '0') {
        const count = salesHistory.filter(s => Number(s.CLI_IN_CODIGO) === customer.agn_in_codigo).length;
        if (count < parseInt(minOrders)) matchesOrders = false;
      }

      // 5. Representative Logic
      const matchesRep = selectedRep === 'ALL' || String(customer.rep_agn_in_codigo || '') === selectedRep;
      
      return matchesSearch && matchesUf && matchesDate && matchesOrders && matchesRep;
    });
  }, [customers, searchTerm, selectedUf, lastPurchaseStart, lastPurchaseEnd, minOrders, salesHistory, selectedRep]);

  const handleExportExcel = () => {
    // Logic for Excel export could be added here
    console.log('Exporting to Excel...');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-y-auto custom-scrollbar p-1 bg-gray-50/50">
      {/* Consolidated Management Card */}
      <div className="bg-white border border-gray-200 shadow-xl overflow-hidden flex flex-col rounded-sm mx-auto w-full max-w-[1600px]">
        
        {/* SECTION 1: Header / Top Actions */}
        <div className="bg-gray-900 text-white p-2.5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded-sm">
              <LayoutGrid size={16} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Gestão da Carteira</h3>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Painel de Inteligência Comercial</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all rounded-sm border border-white/10"
            >
              <FileSpreadsheet size={14} className="text-green-400" />
              Excel
            </button>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 rounded-sm"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Sincronizar
            </button>
            <div className="h-6 w-px bg-white/10 mx-1" />
            <button 
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              className="p-1.5 hover:bg-white/10 rounded-sm transition-colors text-white"
              title={isPanelExpanded ? "Recolher Filtros" : "Expandir Filtros"}
            >
              {isPanelExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {/* SECTION 2: Filters (Toggleable) */}
        {isPanelExpanded && (
          <div className="p-4 bg-white border-b border-gray-100 space-y-4 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tight">Busca Inteligente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Nome, CNPJ ou Código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-blue-500 transition-colors rounded-sm"
                  />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tight">Filtrar por UF</label>
                <div className="relative">
                  <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <select
                    value={selectedUf}
                    onChange={(e) => setSelectedUf(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-blue-500 appearance-none cursor-pointer rounded-sm"
                  >
                    <option value="ALL">Brasil (Todos)</option>
                    {ufs.filter(uf => uf !== 'ALL').map(uf => (
                      <option key={uf} value={uf}>{uf} - Estado</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                </div>
              </div>

              <div className="md:col-span-5 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tight">Período de Atividade</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="date"
                      value={lastPurchaseStart}
                      onChange={(e) => setLastPurchaseStart(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-blue-500 rounded-sm"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">até</span>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                    <input
                      type="date"
                      value={lastPurchaseEnd}
                      onChange={(e) => setLastPurchaseEnd(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-blue-500 rounded-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tight">Representante Atribuído</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <select
                    value={selectedRep}
                    onChange={(e) => setSelectedRep(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-blue-500 appearance-none cursor-pointer rounded-sm"
                  >
                    <option value="ALL">Equipe Completa</option>
                    {representatives.map(rep => (
                      <option key={rep.id} value={rep.id}>{rep.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                </div>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-[8px] font-black uppercase text-gray-400 tracking-tight">Volume Mín. Pedidos</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="number"
                    min="0"
                    value={minOrders}
                    onChange={(e) => setMinOrders(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold outline-none focus:border-blue-500 rounded-sm"
                    placeholder="Qtd..."
                  />
                </div>
              </div>

              <div className="md:col-span-5 flex items-center justify-end gap-3">
                <button 
                  onClick={() => { 
                    setSearchTerm(''); 
                    setSelectedUf('ALL'); 
                    setSelectedRep('ALL');
                    setLastPurchaseStart('');
                    setLastPurchaseEnd('');
                    setMinOrders('');
                  }}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors uppercase"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Stats Bar */}
        <div className="p-2 px-4 bg-gray-50 flex items-center gap-8 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-gray-200">
           <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Total na Base</span>
                <span className="text-[11px] font-black text-gray-900">{customers.length}</span>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Regiões Ativas</span>
                <span className="text-[11px] font-black text-gray-900">{ufs.length - 1}</span>
              </div>
           </div>
           <div className="h-6 w-px bg-gray-200" />
           <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest leading-none">Resultado Filtrado</span>
                <span className="text-[11px] font-black text-blue-600">{filteredCustomers.length} Clientes</span>
              </div>
           </div>
        </div>

        {/* SECTION 4: Data Table */}
        <div className="overflow-x-auto custom-scrollbar flex-1 min-h-0 bg-white">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <th className="px-5 py-3 text-left text-[8px] font-black uppercase text-gray-400 tracking-widest">Código / Nome do Cliente</th>
                <th className="px-5 py-3 text-left text-[8px] font-black uppercase text-gray-400 tracking-widest">Documento / IE</th>
                <th className="px-5 py-3 text-left text-[8px] font-black uppercase text-gray-400 tracking-widest">Localização Principal</th>
                <th className="px-5 py-3 text-center text-[8px] font-black uppercase text-gray-400 tracking-widest">Últ. Atualização</th>
                <th className="px-5 py-3 text-right text-[8px] font-black uppercase text-gray-400 tracking-widest">Ações</th>
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
                      <button 
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-all active:scale-95"
                        title="Ver Detalhes"
                      >
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

      {/* Customer Details Slide-over Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedCustomer(null)}
          />
          
          {/* Content */}
          <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-gray-200">
            {/* Header */}
            <div className="p-6 bg-gray-900 text-white shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-sm flex items-center justify-center text-xl font-black border border-white/20">
                    {selectedCustomer.agn_st_nome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{selectedCustomer.agn_st_nome}</h2>
                    <p className="text-xs text-blue-300 font-mono tracking-widest mt-0.5">#{selectedCustomer.agn_in_codigo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase">Ativo</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">CNPJ</p>
                  <p className="text-[10px] font-mono font-bold tracking-tight">{selectedCustomer.agn_st_cgc}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Localização</p>
                  <p className="text-[10px] font-bold uppercase truncate">{selectedCustomer.agn_st_municipio} - {selectedCustomer.uf_st_sigla}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Desde</p>
                  <p className="text-[10px] font-bold">{selectedCustomer.created_at ? format(new Date(selectedCustomer.created_at), 'dd/MM/yyyy') : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-6 space-y-6">
              {/* Detailed Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                    <Info size={14} className="text-blue-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Informações Cadastrais</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-0.5">Endereço Completo</label>
                      <p className="text-[10px] font-bold text-gray-700 uppercase leading-relaxed">
                        {selectedCustomer.agn_st_logradouro}, {selectedCustomer.agn_st_numero}<br/>
                        {selectedCustomer.agn_st_bairro} - {selectedCustomer.agn_st_municipio} | {selectedCustomer.uf_st_sigla}
                      </p>
                    </div>
                    {selectedCustomer.agn_st_inscrestadual && (
                      <div>
                        <label className="text-[8px] font-black uppercase text-gray-400 tracking-widest block mb-0.5">Inscrição Estadual</label>
                        <p className="text-[10px] font-mono font-bold text-gray-700 uppercase">{selectedCustomer.agn_st_inscrestadual}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 border border-gray-100 shadow-sm rounded-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                    <DollarSign size={14} className="text-emerald-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Resumo Financeiro</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-sm">
                      <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Pedidos Totais</p>
                      <p className="text-sm font-black text-gray-900">
                        {salesHistory.filter(s => Number(s.CLI_IN_CODIGO) === selectedCustomer.agn_in_codigo).length}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-sm">
                      <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Valor Estimado</p>
                      <p className="text-sm font-black text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          salesHistory
                            .filter(s => Number(s.CLI_IN_CODIGO) === selectedCustomer.agn_in_codigo)
                            .reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interaction Timeline Integration */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-sm flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-purple-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Linha do Tempo de Interações</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Pedidos, Visitas e Tarefas</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                {(() => {
                    const customerAgn = selectedCustomer.agn_in_codigo;
                    const customerNameNorm = normalizeString(selectedCustomer.agn_st_nome);

                    // Histórico de vendas: só pelo agn_in_codigo (sem expansão por nome — evita contaminação entre filiais)
                    const customerSalesHistory = salesHistory.filter(s =>
                      Number(s.CLI_IN_CODIGO) === customerAgn
                    );

                    // === DIAGNÓSTICO ===
                    console.debug('[CRM-DEBUG] Cliente:', selectedCustomer.agn_st_nome, '| agn_in_codigo:', customerAgn);
                    console.debug('[CRM-DEBUG] Total appointments:', crmAppointments.length);
                    // ===================

                    const filteredAppointments = crmAppointments.filter(a => {
                      // Se tem client_id: usa SOMENTE o ID — strict match (evita contaminação entre filiais homônimas)
                      if (a.client_id != null && Number(a.client_id) !== 0) {
                        return Number(a.client_id) === customerAgn;
                      }
                      // Sem client_id: usa nome normalizado
                      return normalizeString(a.client_name) === customerNameNorm;
                    });

                    const filteredTasks = crmTasks.filter(t => {
                      // Se tem client_id: usa SOMENTE o ID
                      if (t.client_id != null && Number(t.client_id) !== 0) {
                        return Number(t.client_id) === customerAgn;
                      }
                      // Sem client_id: usa nome normalizado
                      return normalizeString(t.client_name) === customerNameNorm;
                    });

                    console.debug('[CRM-DEBUG] Appointments filtrados:', filteredAppointments.length);

                    return (
                      <CustomerTimeline 
                        clientName={selectedCustomer.agn_st_nome}
                        clientId={customerAgn}
                        salesHistory={customerSalesHistory}
                        appointments={filteredAppointments}
                        tasks={filteredTasks}
                        onClose={() => {}}
                        isEmbedded={true}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end shrink-0">
               <button 
                onClick={() => setSelectedCustomer(null)}
                className="px-6 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
               >
                 Fechar Detalhes
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
