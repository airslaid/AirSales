import React, { useState, useEffect, useMemo } from 'react';
import { Ocorrencia, AppUser } from '../types';
import { fetchOcorrencias, upsertOcorrencia, deleteOcorrencia, fetchAppUsers } from '../services/supabaseService';
import { 
  AlertTriangle, Plus, Search, Edit2, Trash2, X, Save, CheckCircle2, 
  Clock, FileText, Building2, User, Check, Calendar, ListTodo, Filter,
  LayoutGrid, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { toast } from 'sonner';
import { OcorrenciaAcoesModal } from './OcorrenciaAcoesModal';

interface OcorrenciasViewProps {
  user: AppUser | null;
}

const PROCESSOS = [
  'COMERCIAL', 'COMPRAS', 'FINANCEIRO', 'TI', 'RH', 
  'CONFECÇÃO', 'TECELAGEM', 'QUALIDADE', 'MARKETING', 'PCP', 'ENGENHARIA'
];

export const OcorrenciasView: React.FC<OcorrenciasViewProps> = ({ user }) => {
  const [viewMode, setViewMode] = useState<'GRID' | 'DASHBOARD'>('GRID');
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    responsible: '',
    type: '',
    process: '',
    status: '',
    dateStart: '',
    dateEnd: ''
  });
  
  const [showModal, setShowModal] = useState(false);
  const [showAcoesModal, setShowAcoesModal] = useState(false);
  const [selectedOcorrenciaId, setSelectedOcorrenciaId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Ocorrencia | null>(null);
  const [formData, setFormData] = useState<Partial<Ocorrencia>>({});
  const [itemToDelete, setItemToDelete] = useState<Ocorrencia | null>(null);

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchAppUsers();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchOcorrencias();
      setOcorrencias(data);
    } catch (error) {
      toast.error("Erro ao carregar ocorrências");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: Ocorrencia) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      setFormData({
        ro_number: '',
        requester: user?.name || '',
        type: 'Reclamação de cliente',
        origin: '',
        description: '',
        receipt_date: new Date().toISOString().split('T')[0],
        registration_date: new Date().toISOString().split('T')[0],
        company: '',
        process: 'Comercial',
        sub_process: 'Vendas',
        responsible: '',
        proceeds: true,
        opening_notice: true,
        immediate_action_deadline: '',
        immediate_action_completed: '',
        cause_analysis_deadline: '',
        cause_analysis_completed: '',
        corrective_action_deadline: '',
        corrective_action_completed: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.ro_number || !formData.description) {
      toast.error("Preencha o Nº RO e a Descrição");
      return;
    }
    
    try {
      await upsertOcorrencia(formData as Ocorrencia);
      toast.success(editingItem ? "Ocorrência atualizada!" : "Ocorrência registrada!");
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar ocorrência");
    }
  };

  const handleDelete = (item: Ocorrencia) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteOcorrencia(itemToDelete.id);
      toast.success("Ocorrência excluída!");
      setItemToDelete(null);
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir ocorrência");
    }
  };

  const filteredData = ocorrencias.filter(o => {
    // Permission check
    const isQualidade = user?.email?.toLowerCase() === 'qualidade@grupoairslaid.com.br';
    const isAdmin = user?.is_admin;
    const userProcess = user?.processo;

    const hasPermission = isAdmin || isQualidade || (userProcess && o.process === userProcess);

    if (!hasPermission) return false;

    // Search term filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      o.ro_number?.toLowerCase().includes(searchLower) ||
      o.description?.toLowerCase().includes(searchLower) ||
      o.origin?.toLowerCase().includes(searchLower) ||
      o.requester?.toLowerCase().includes(searchLower)
    );

    if (!matchesSearch) return false;

    // Advanced Filters
    if (filters.responsible && o.responsible !== filters.responsible) return false;
    if (filters.type && o.type !== filters.type) return false;
    if (filters.process && o.process !== filters.process) return false;
    
    if (filters.status) {
      const isCompleted = !!o.corrective_action_completed;
      if (filters.status === 'CONCLUIDA' && !isCompleted) return false;
      if (filters.status === 'PENDENTE' && isCompleted) return false;
    }
    
    if (filters.dateStart && o.registration_date && o.registration_date < filters.dateStart) return false;
    if (filters.dateEnd && o.registration_date && o.registration_date > filters.dateEnd) return false;

    return true;
  });

  const uniqueResponsibles = useMemo(() => {
    const resps = new Set(ocorrencias.map(o => o.responsible).filter(Boolean));
    return Array.from(resps).sort();
  }, [ocorrencias]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(ocorrencias.map(o => o.type).filter(Boolean));
    return Array.from(types).sort();
  }, [ocorrencias]);

  const dashboardData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    // Filter data for the current year, respecting permissions and other filters (except date range)
    const yearFiltered = ocorrencias.filter(o => {
      // Permission check
      const isQualidade = user?.email?.toLowerCase() === 'qualidade@grupoairslaid.com.br';
      const isAdmin = user?.is_admin;
      const userProcess = user?.processo;
      const hasPermission = isAdmin || isQualidade || (userProcess && o.process === userProcess);
      if (!hasPermission) return false;

      // Year check
      if (!o.registration_date) return false;
      const regYear = new Date(o.registration_date).getFullYear();
      if (regYear !== currentYear) return false;

      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        o.ro_number?.toLowerCase().includes(searchLower) ||
        o.description?.toLowerCase().includes(searchLower) ||
        o.origin?.toLowerCase().includes(searchLower) ||
        o.requester?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;

      // Advanced Filters (except date range)
      if (filters.responsible && o.responsible !== filters.responsible) return false;
      if (filters.type && o.type !== filters.type) return false;
      if (filters.process && o.process !== filters.process) return false;
      
      return true;
    });

    const opened = yearFiltered.length;
    const closed = yearFiltered.filter(o => o.corrective_action_completed).length;
    
    const comparisonData = [
      { name: 'Abertas', total: opened, color: '#e11d48' },
      { name: 'Fechadas', total: closed, color: '#10b981' }
    ];

    const processDistribution = PROCESSOS.map(p => ({
      name: p,
      total: yearFiltered.filter(o => o.process === p).length
    })).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

    return { comparisonData, processDistribution, currentYear };
  }, [ocorrencias, filters, searchTerm, user]);

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-in fade-in duration-300">
      <div className="p-4 bg-white border-b border-gray-200 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
            <AlertTriangle className="text-rose-600" />
            Controle de Ocorrências
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            Gestão de Reclamações e Não Conformidades
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar ocorrência..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-gray-900 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-sm border border-gray-200">
            <button 
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'GRID' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button 
              onClick={() => setViewMode('DASHBOARD')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'DASHBOARD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart3 size={14} /> Dashboard
            </button>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-sm transition-colors flex items-center gap-2 ${showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            title="Filtros Avançados"
          >
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus size={14} /> Nova Ocorrência
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-4 py-3 bg-white border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Responsável</label>
            <select 
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-[10px] outline-none focus:border-rose-500"
              value={filters.responsible}
              onChange={e => setFilters({...filters, responsible: e.target.value})}
            >
              <option value="">Todos</option>
              {uniqueResponsibles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tipo / Origem</label>
            <select 
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-[10px] outline-none focus:border-rose-500"
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value})}
            >
              <option value="">Todos</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Status</label>
            <select 
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-[10px] outline-none focus:border-rose-500"
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CONCLUIDA">Concluídas</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Processo</label>
            <select 
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-[10px] outline-none focus:border-rose-500"
              value={filters.process}
              onChange={e => setFilters({...filters, process: e.target.value})}
            >
              <option value="">Todos</option>
              {PROCESSOS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Data Registro (De)</label>
            <input 
              type="date" 
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-[10px] outline-none focus:border-rose-500"
              value={filters.dateStart}
              onChange={e => setFilters({...filters, dateStart: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Data Registro (Até)</label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-sm text-[10px] outline-none focus:border-rose-500"
                value={filters.dateEnd}
                onChange={e => setFilters({...filters, dateEnd: e.target.value})}
              />
              <button 
                onClick={() => setFilters({ responsible: '', type: '', process: '', status: '', dateStart: '', dateEnd: '' })}
                className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                title="Limpar Filtros"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AlertTriangle size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhuma ocorrência encontrada</p>
          </div>
        ) : viewMode === 'DASHBOARD' ? (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            {/* Gráfico 1: Abertas x Fechadas */}
            <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm flex flex-col h-[450px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Status das ROs (Abertas x Fechadas) - {dashboardData.currentYear}
                </h3>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Ano Corrente</div>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#6b7280' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#6b7280' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '4px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={80}>
                      {dashboardData.comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Abertas em {dashboardData.currentYear}</p>
                  <p className="text-3xl font-black text-rose-600">{dashboardData.comparisonData[0].total}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Fechadas em {dashboardData.currentYear}</p>
                  <p className="text-3xl font-black text-emerald-600">{dashboardData.comparisonData[1].total}</p>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Distribuição por Processo */}
            <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-sm flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" />
                  Distribuição por Processo - {dashboardData.currentYear}
                </h3>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Ano Corrente</div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={dashboardData.processDistribution} 
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#6b7280' }}
                      width={100}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '4px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                      {dashboardData.processDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(217, 91%, ${60 - (index * 3)}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">
                  Total de Processos com Ocorrências em {dashboardData.currentYear}: {dashboardData.processDistribution.length}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-[9px] uppercase font-black text-gray-500 tracking-widest">
                    <th className="p-3 border-r border-gray-200">Nº RO</th>
                    <th className="p-3 border-r border-gray-200">Solicitante</th>
                    <th className="p-3 border-r border-gray-200">Tipo / Origem</th>
                    <th className="p-3 border-r border-gray-200">Datas</th>
                    <th className="p-3 border-r border-gray-200 text-center">Dias</th>
                    <th className="p-3 border-r border-gray-200">Processo</th>
                    <th className="p-3 border-r border-gray-200 text-center">Procedente</th>
                    <th className="p-3 border-r border-gray-200">Ação Imediata</th>
                    <th className="p-3 border-r border-gray-200">Análise Causa</th>
                    <th className="p-3 border-r border-gray-200">Ação Corretiva</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors text-[10px]">
                      <td className="p-3 border-r border-gray-100 font-bold text-blue-600">
                        {item.ro_number}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        {item.requester}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <div className="font-bold text-gray-900">{item.type}</div>
                        <div className="text-gray-500">{item.origin}</div>
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <div><span className="text-gray-400">Rec:</span> {item.receipt_date ? new Date(item.receipt_date).toLocaleDateString('pt-BR') : '-'}</div>
                        <div><span className="text-gray-400">Reg:</span> {item.registration_date ? new Date(item.registration_date).toLocaleDateString('pt-BR') : '-'}</div>
                      </td>
                      <td className="p-3 border-r border-gray-100 text-center">
                        {(() => {
                          if (item.corrective_action_completed) return <span className="text-gray-300">-</span>;
                          const start = item.registration_date ? new Date(item.registration_date) : new Date();
                          const today = new Date();
                          const diffTime = Math.abs(today.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return (
                            <span className={`font-black ${diffDays > 15 ? 'text-rose-600' : diffDays > 7 ? 'text-amber-600' : 'text-gray-600'}`}>
                              {diffDays}d
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <div className="font-bold text-gray-900">{item.process}</div>
                        <div className="text-gray-500">{item.sub_process}</div>
                        <div className="text-gray-400 text-[9px] mt-0.5">{item.responsible}</div>
                      </td>
                      <td className="p-3 border-r border-gray-100 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${item.proceeds ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.proceeds ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500">P: {item.immediate_action_deadline ? new Date(item.immediate_action_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                          <span className={`font-bold ${item.immediate_action_completed ? 'text-green-600' : 'text-amber-600'}`}>
                            C: {item.immediate_action_completed ? new Date(item.immediate_action_completed).toLocaleDateString('pt-BR') : 'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500">P: {item.cause_analysis_deadline ? new Date(item.cause_analysis_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                          <span className={`font-bold ${item.cause_analysis_completed ? 'text-green-600' : 'text-amber-600'}`}>
                            C: {item.cause_analysis_completed ? new Date(item.cause_analysis_completed).toLocaleDateString('pt-BR') : 'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500">P: {item.corrective_action_deadline ? new Date(item.corrective_action_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                          <span className={`font-bold ${item.corrective_action_completed ? 'text-green-600' : 'text-amber-600'}`}>
                            C: {item.corrective_action_completed ? new Date(item.corrective_action_completed).toLocaleDateString('pt-BR') : 'Pendente'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" /> 
                {editingItem ? 'Editar Ocorrência' : 'Nova Ocorrência'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna 1: Recebimento e Registro */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Recebimento e Registro</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 uppercase">Nº RO *</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                        value={formData.ro_number || ''}
                        onChange={e => setFormData({...formData, ro_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 uppercase">Solicitante</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-sm text-xs outline-none cursor-not-allowed"
                        value={formData.requester || ''}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Tipo</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                      value={formData.type || ''}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="Reclamação de cliente">Reclamação de cliente</option>
                      <option value="Ocorrência de processo">Ocorrência de processo</option>
                      <option value="Não conformidade">Não conformidade</option>
                      <option value="Oportunidade de melhoria">Oportunidade de melhoria</option>
                      <option value="Fornecedor">Fornecedor</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Origem</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                      value={formData.origin || ''}
                      onChange={e => setFormData({...formData, origin: e.target.value})}
                      placeholder="Ex: Nome do Cliente, Auditoria..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 uppercase">Data Recebimento</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                        value={formData.receipt_date || ''}
                        onChange={e => setFormData({...formData, receipt_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-700 uppercase">Data Registro</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                        value={formData.registration_date || ''}
                        onChange={e => setFormData({...formData, registration_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Descrição da Ocorrência *</label>
                    <textarea 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500 min-h-[80px] resize-none"
                      value={formData.description || ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* Coluna 2: Relação com o Processo */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Relação com o Processo</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Empresa</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                      value={formData.company || ''}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Processo</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                      value={formData.process || ''}
                      onChange={e => setFormData({...formData, process: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {PROCESSOS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Sub-Processo</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                      value={formData.sub_process || ''}
                      onChange={e => setFormData({...formData, sub_process: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase">Responsável</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                      value={formData.responsible || ''}
                      onChange={e => setFormData({...formData, responsible: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                        checked={formData.proceeds || false}
                        onChange={e => setFormData({...formData, proceeds: e.target.checked})}
                      />
                      <span className="text-[10px] font-bold text-gray-700 uppercase">Procedente</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                        checked={formData.opening_notice || false}
                        onChange={e => setFormData({...formData, opening_notice: e.target.checked})}
                      />
                      <span className="text-[10px] font-bold text-gray-700 uppercase">Aviso de Abertura</span>
                    </label>
                  </div>
                </div>

                {/* Coluna 3: Gestão da Ocorrência */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-1">Gestão da Ocorrência</h4>
                  
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-3">
                    <h5 className="text-[10px] font-bold text-gray-900 uppercase">Ação Imediata</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Prazo</label>
                        <input 
                          type="date" 
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                          value={formData.immediate_action_deadline || ''}
                          onChange={e => setFormData({...formData, immediate_action_deadline: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Concluído</label>
                        <input 
                          type="date" 
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                          value={formData.immediate_action_completed || ''}
                          onChange={e => setFormData({...formData, immediate_action_completed: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-3">
                    <h5 className="text-[10px] font-bold text-gray-900 uppercase">Análise de Causa</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Prazo</label>
                        <input 
                          type="date" 
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                          value={formData.cause_analysis_deadline || ''}
                          onChange={e => setFormData({...formData, cause_analysis_deadline: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Concluído</label>
                        <input 
                          type="date" 
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                          value={formData.cause_analysis_completed || ''}
                          onChange={e => setFormData({...formData, cause_analysis_completed: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm space-y-3">
                    <h5 className="text-[10px] font-bold text-gray-900 uppercase">Ação Corretiva</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Prazo</label>
                        <input 
                          type="date" 
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                          value={formData.corrective_action_deadline || ''}
                          onChange={e => setFormData({...formData, corrective_action_deadline: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Concluído</label>
                        <input 
                          type="date" 
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                          value={formData.corrective_action_completed || ''}
                          onChange={e => setFormData({...formData, corrective_action_completed: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                {formData.id && (
                  <button 
                    onClick={() => {
                      setSelectedOcorrenciaId(formData.id!);
                      setShowAcoesModal(true);
                    }}
                    className="px-4 py-2 bg-gray-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-gray-900 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <ListTodo size={14} /> Ações
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Save size={14} /> Salvar Ocorrência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ações */}
      {showAcoesModal && selectedOcorrenciaId && (
        <OcorrenciaAcoesModal 
          ocorrenciaId={selectedOcorrenciaId}
          users={users}
          onClose={() => {
            setShowAcoesModal(false);
            setSelectedOcorrenciaId(null);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" /> 
                Confirmar Exclusão
              </h3>
              <button onClick={() => setItemToDelete(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">
                Tem certeza que deseja excluir a ocorrência <strong className="text-gray-900">{itemToDelete.ro_number}</strong>?
              </p>
              <p className="text-xs text-red-500 font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 size={14} /> Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
