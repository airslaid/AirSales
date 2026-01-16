
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RefreshCw, Search, Database, Menu, Table as TableIcon, FileText, ShoppingBag, Hammer, 
  Filter, Hexagon, DollarSign, ChevronDown, TrendingUp, Receipt, Users, UserPlus, Trash2, 
  ShieldCheck, LogOut, CheckCircle2, Lock, ArrowRight, Layout, X, Calendar, Key, Columns, 
  Save, Download, FileSpreadsheet, FileType, ChevronUp, Target, BarChart3, ArrowUpRight,
  Edit2, Globe, DatabaseZap, Shield, User
} from 'lucide-react';

import { Sale, ColumnConfig, DataSource, AppUser, FilterConfig, SortConfig, SalesGoal } from './types';
import { fetchData } from './services/dataService';
import { fetchAppUsers, upsertAppUser, deleteAppUser, fetchSalesGoals, upsertSalesGoal, deleteSalesGoal, fetchFromSupabase } from './services/supabaseService';
import { SalesTable } from './components/SalesTable';
import { StatCard } from './components/StatCard';

const MODULES = [
  { id: 'OV', label: 'Orçamentos', icon: FileText },
  { id: 'PD', label: 'Pedidos de Venda', icon: ShoppingBag },
  { id: 'DV', label: 'Desenvolvimento', icon: Hammer },
  { id: 'METAS', label: 'Metas', icon: Target, adminOnly: true },
  { id: 'USERS', label: 'Gestão de Acessos', icon: Users, adminOnly: true },
];

const MONTHS = [
  { id: 1, label: 'Janeiro' }, { id: 2, label: 'Fevereiro' }, { id: 3, label: 'Março' },
  { id: 4, label: 'Abril' }, { id: 5, label: 'Maio' }, { id: 6, label: 'Junho' },
  { id: 7, label: 'Julho' }, { id: 8, label: 'Agosto' }, { id: 9, label: 'Setembro' },
  { id: 10, label: 'Outubro' }, { id: 11, label: 'Novembro' }, { id: 12, label: 'Dezembro' }
];

const parseBrNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const clean = val.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const currencyFormat = (val: any) => {
  if (val === null || val === undefined) return '-';
  const num = parseBrNumber(val);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

const dateFormat = (val: any) => {
  if (!val) return '-';
  try {
    const datePart = String(val).split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return datePart;
  } catch (e) { return String(val); }
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
};

export default function App() {
  const [activeModuleId, setActiveModuleId] = useState<string>('PD');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [salesGoals, setSalesGoals] = useState<SalesGoal[]>([]);
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [fullRepsList, setFullRepsList] = useState<{code: number, name: string}[]>([]);
  const [salesColumns, setSalesColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [pbiToken, setPbiToken] = useState('');
  const [layoutSaved, setLayoutSaved] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState<AppUser>({ name: '', email: '', password: '', rep_in_codigo: null, is_admin: false });
  const [newGoal, setNewGoal] = useState<SalesGoal>({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const monthRange = getCurrentMonthRange();
  const [filters, setFilters] = useState<FilterConfig>({ 
    globalSearch: '', 
    status: '', 
    filial: '', 
    representante: '', 
    startDate: monthRange.start, 
    endDate: monthRange.end 
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'PED_DT_EMISSAO', direction: 'desc' });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const getSharedLayoutKey = () => `airsales_global_layout_${currentUser?.email}`;

  useEffect(() => {
    loadAppUsers();
    loadGoals();
    loadRepsForSelection();
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) setShowColumnSelector(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser, activeModuleId]);

  const loadAppUsers = async () => { try { const users = await fetchAppUsers(); setAppUsers(users); } catch (e) {} };
  const loadGoals = async () => { try { const goals = await fetchSalesGoals(); setSalesGoals(goals); } catch (e) {} };
  
  const loadRepsForSelection = async () => {
    try {
      // Carrega uma amostra de vendas para extrair todos os representantes disponíveis
      const data = await fetchFromSupabase('PD');
      const map = new Map<number, string>();
      data.forEach(s => {
        const code = Number(s.REP_IN_CODIGO);
        const name = String(s.REPRESENTANTE_NOME);
        if (code && name && !map.has(code)) map.set(code, name);
      });
      setFullRepsList(Array.from(map.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {}
  };

  const loadData = async () => {
    if (!currentUser || activeModuleId === 'USERS' || activeModuleId === 'METAS') return;
    setLoading(true);
    try {
      const repCode = currentUser.is_admin ? undefined : currentUser.rep_in_codigo;
      const data = await fetchData('supabase', "", "PEDIDOS", activeModuleId);
      const filtered = repCode ? data.filter(d => Number(d.REP_IN_CODIGO) === Number(repCode)) : data;
      setSalesData(filtered);
      generateColumns(filtered);
    } catch (error) {} finally { setLoading(false); }
  };

  const handlePBISync = async () => {
    if (!pbiToken) return alert("Por favor, informe o token do Power BI.");
    setSyncing(true);
    try {
      await fetchData('powerbi', pbiToken, "PEDIDOS", activeModuleId);
      alert("Sincronização com Power BI concluída com sucesso!");
      setShowTokenModal(false);
      setPbiToken('');
      loadData();
    } catch (error: any) {
      alert("Erro na sincronização: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const generateColumns = (data: Sale[]) => {
    const savedLayout = localStorage.getItem(getSharedLayoutKey());
    const getFormatter = (key: string) => {
      if (key.includes('VALOR') || key.includes('VLMERCADORIA')) return currencyFormat;
      if (key.includes('DT_EMISSAO') || key.includes('DATA')) return dateFormat;
      return (val: any) => String(val || '-');
    };

    if (savedLayout) {
      try {
        const parsedLayout: ColumnConfig[] = JSON.parse(savedLayout);
        setSalesColumns(parsedLayout.map(col => ({ ...col, format: getFormatter(col.key) })));
        return;
      } catch (e) {}
    }

    const defaultOrder = ["SER_ST_CODIGO", "PED_ST_STATUS", "FILIAL_NOME", "REPRESENTANTE_NOME", "PED_DT_EMISSAO", "PED_IN_CODIGO", "CLIENTE_NOME", "PED_RE_VLMERCADORIA"];
    setSalesColumns(defaultOrder.map(key => ({ key, label: key.replace(/_/g, ' '), visible: true, format: getFormatter(key) })));
  };

  const handleSaveGoal = async () => {
    if (!newGoal.rep_in_codigo || !newGoal.valor_meta) return alert("Preencha Representante e Valor.");
    try {
      await upsertSalesGoal({ ...newGoal, id: editingGoalId || undefined });
      alert(editingGoalId ? "Meta atualizada com sucesso." : "Meta salva com sucesso.");
      setNewGoal({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 });
      setEditingGoalId(null);
      loadGoals();
    } catch (e: any) { alert(e.message); }
  };

  const handleEditGoal = (goal: SalesGoal) => {
    setNewGoal({
      rep_in_codigo: goal.rep_in_codigo,
      rep_nome: goal.rep_nome,
      ano: goal.ano,
      mes: goal.mes,
      valor_meta: goal.valor_meta
    });
    setEditingGoalId(goal.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewGoal({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 });
    setEditingGoalId(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = appUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword);
    if (user) setCurrentUser(user); else setLoginError("Acesso inválido.");
  };

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return alert("Preencha Nome, E-mail e Senha.");
    if (!newUser.is_admin && !newUser.rep_in_codigo) return alert("Vincule um representante para este usuário.");
    
    try { 
      await upsertAppUser(newUser); 
      setNewUser({ name: '', email: '', password: '', rep_in_codigo: null, is_admin: false }); 
      loadAppUsers(); 
      alert("Acesso criado/atualizado com sucesso."); 
    } catch (e: any) { alert(e.message); }
  };

  const toggleColumnVisibility = (key: string) => {
    setSalesColumns(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
  };

  const saveGlobalVision = () => { 
    if (!currentUser) return; 
    localStorage.setItem(getSharedLayoutKey(), JSON.stringify(salesColumns.map(({ key, label, visible }) => ({ key, label, visible })))); 
    setLayoutSaved(true); 
    setTimeout(() => setLayoutSaved(false), 2000); 
  };

  const availableReps = useMemo(() => {
    // Se for admin, mostra todos. Se for representante, apenas ele mesmo.
    if (currentUser && !currentUser.is_admin && currentUser.rep_in_codigo) {
        return fullRepsList.filter(r => r.code === currentUser.rep_in_codigo);
    }
    return fullRepsList;
  }, [fullRepsList, currentUser]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(s => {
      const status = String(s.PED_ST_STATUS || s.SITUACAO || '');
      if (status) set.add(status.toUpperCase());
    });
    return Array.from(set).sort();
  }, [salesData]);

  const availableFiliais = useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(s => {
      const filial = String(s.FILIAL_NOME || '');
      if (filial) set.add(filial.toUpperCase());
    });
    return Array.from(set).sort();
  }, [salesData]);

  const filteredGoals = useMemo(() => {
    if (newGoal.rep_in_codigo === 0 && !editingGoalId) return salesGoals;
    if (editingGoalId) return salesGoals;
    return salesGoals.filter(g => g.rep_in_codigo === newGoal.rep_in_codigo);
  }, [salesGoals, newGoal.rep_in_codigo, editingGoalId]);

  const processedData = useMemo(() => {
    let result = [...salesData];
    if (filters.globalSearch) {
      const s = filters.globalSearch.toLowerCase();
      result = result.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(s)));
    }
    if (filters.startDate) result = result.filter(item => item.PED_DT_EMISSAO >= filters.startDate);
    if (filters.endDate) result = result.filter(item => item.PED_DT_EMISSAO <= filters.endDate);
    if (filters.representante) result = result.filter(item => String(item.REP_IN_CODIGO) === filters.representante);
    if (filters.status) result = result.filter(item => String(item.PED_ST_STATUS || item.SITUACAO || '').toUpperCase() === filters.status.toUpperCase());
    if (filters.filial) result = result.filter(item => String(item.FILIAL_NOME || '').toUpperCase() === filters.filial.toUpperCase());
    
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key], valB = b[sortConfig.key];
        if (sortConfig.key.includes('VALOR') || sortConfig.key.includes('VLMERCADORIA')) { valA = parseBrNumber(valA); valB = parseBrNumber(valB); }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [salesData, filters, sortConfig]);

  const metrics = useMemo(() => {
    let total = 0, faturado = 0, emAprovacao = 0, emAberto = 0;
    processedData.forEach(d => {
      const v = parseBrNumber(d['PED_RE_VLMERCADORIA'] || 0);
      const s = String(d.PED_ST_STATUS || '').toLowerCase();
      total += v;
      if (s.includes('faturado')) faturado += v;
      if (s.includes('aprov')) emAprovacao += v;
      if (s.includes('aberto')) emAberto += v;
    });

    let currentGoalValue = 0;
    if (filters.startDate) {
      const dateObj = new Date(filters.startDate);
      const filterMonth = dateObj.getMonth() + 1;
      const filterYear = dateObj.getFullYear();
      
      const targetGoals = salesGoals.filter(g => 
        g.mes === filterMonth && 
        g.ano === filterYear &&
        (filters.representante ? String(g.rep_in_codigo) === filters.representante : true)
      );
      
      currentGoalValue = targetGoals.reduce((acc, curr) => acc + curr.valor_meta, 0);
    }

    const achievement = currentGoalValue > 0 ? (total / currentGoalValue) * 100 : 0;

    return { 
      total, 
      faturado, 
      emAprovacao, 
      emAberto, 
      count: processedData.length,
      goal: currentGoalValue,
      achievement
    };
  }, [processedData, salesGoals, filters.startDate, filters.representante]);

  const clearFilters = () => {
    const range = getCurrentMonthRange();
    setFilters({ 
      globalSearch: '', 
      status: '', 
      filial: '', 
      representante: currentUser?.is_admin ? '' : String(currentUser?.rep_in_codigo || ''), 
      startDate: range.start, 
      endDate: range.end 
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-2xl">
          <div className="p-8 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 flex items-center justify-center text-white font-bold text-xl">AS</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">AIR SALES</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analytics 4.0</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {loginError && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-[11px] font-bold text-red-600">{loginError}</div>}
            <div className="space-y-4">
              <input type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-sm focus:border-gray-900 outline-none" placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              <input type="password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-sm focus:border-gray-900 outline-none" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-4 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-black">Acessar Painel</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100 font-sans text-gray-900 overflow-x-hidden">
      {/* MODAL DE TOKEN POWER BI */}
      {showTokenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Globe className="text-blue-600" size={20} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Sincronizar Power BI</h3>
              </div>
              <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Bearer Token de Acesso</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-200 text-xs font-mono min-h-[120px] outline-none focus:border-gray-900 transition-colors"
                  placeholder="Cole aqui o token gerado no Power BI API..."
                  value={pbiToken}
                  onChange={e => setPbiToken(e.target.value)}
                  autoFocus
                />
                <p className="text-[9px] text-gray-400 leading-relaxed italic">* Este token é temporário e será utilizado apenas para extrair os dados mais recentes do dataset configurado.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePBISync} 
                  disabled={syncing}
                  className="w-full py-4 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  {syncing ? <RefreshCw size={14} className="animate-spin" /> : <DatabaseZap size={14} />}
                  {syncing ? 'Processando Sincronização...' : 'Iniciar Sincronização'}
                </button>
                <button 
                  onClick={loadData} 
                  className="w-full py-3 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Apenas Atualizar Visualização Local
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 bg-white border-r border-gray-200 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 text-gray-900"><Hexagon size={24}/><span className="font-bold uppercase text-sm">AIR SALES</span></div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {MODULES.filter(m => !m.adminOnly || currentUser.is_admin).map(m => (
            <button key={m.id} onClick={() => setActiveModuleId(m.id)} className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${activeModuleId === m.id ? 'bg-[#1a2130] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <m.icon size={18} />{(sidebarOpen || mobileSidebarOpen) && <span className="text-[10px] uppercase font-semibold">{m.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
            <div className="px-4 py-2 mb-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase">Usuário Logado</p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-[10px] font-bold text-gray-700 truncate">{currentUser.name}</p>
                </div>
            </div>
            <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-red-600 text-[10px] font-bold uppercase"><LogOut size={16} />Sair</button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={20}/></button><h2 className="text-xs font-bold uppercase tracking-widest">{MODULES.find(m => m.id === activeModuleId)?.label}</h2></div>
          {activeModuleId !== 'METAS' && activeModuleId !== 'USERS' && (
            <button onClick={() => setShowTokenModal(true)} className="px-4 py-2 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all active:scale-95 shadow-lg">
              <RefreshCw size={14} className={loading || syncing ? 'animate-spin' : ''} />
              Atualizar Base
            </button>
          )}
        </header>

        <main className="p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {activeModuleId === 'METAS' ? (
             <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`col-span-12 lg:col-span-4 bg-white border ${editingGoalId ? 'border-amber-500 shadow-amber-50' : 'border-gray-200 shadow-sm'} p-6 space-y-6 transition-all duration-300`}>
                   <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest">{editingGoalId ? 'Editando Meta' : 'Nova Meta de Vendas'}</h3>
                    {editingGoalId && <div className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded-full">Modo de Edição</div>}
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400">Representante</label>
                        <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-sm mt-1 outline-none focus:border-gray-900" value={newGoal.rep_in_codigo} onChange={e => {
                          const code = Number(e.target.value);
                          const name = availableReps.find(r => r.code === code)?.name || '';
                          setNewGoal(p => ({...p, rep_in_codigo: code, rep_nome: name}));
                        }}>
                          <option value="0">Selecionar Representante</option>
                          {availableReps.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-400">Ano</label>
                          <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-sm mt-1 outline-none" value={newGoal.ano} onChange={e => setNewGoal(p => ({...p, ano: Number(e.target.value)}))}>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-gray-400">Mês</label>
                          <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 text-sm mt-1 outline-none" value={newGoal.mes} onChange={e => setNewGoal(p => ({...p, mes: Number(e.target.value)}))}>
                            {MONTHS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400">Valor da Meta (R$)</label>
                        <div className="relative mt-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">R$</span>
                          <input type="number" className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 text-sm outline-none focus:border-gray-900" value={newGoal.valor_meta} onChange={e => setNewGoal(p => ({...p, valor_meta: Number(e.target.value)}))} placeholder="0.00" />
                        </div>
                      </div>
                   </div>
                   <div className="space-y-3 pt-4">
                     <button onClick={handleSaveGoal} className={`w-full py-4 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${editingGoalId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-900 hover:bg-black'}`}>
                        {editingGoalId ? 'Confirmar Alterações' : 'Registrar Meta'}
                     </button>
                     {editingGoalId && (
                       <button onClick={handleCancelEdit} className="w-full py-3 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">
                          Cancelar Edição
                       </button>
                     )}
                   </div>
                </div>
                <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 overflow-hidden shadow-sm">
                   <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase text-gray-500">Metas Registradas</span>
                        {newGoal.rep_in_codigo !== 0 && !editingGoalId && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Filtrando por: {newGoal.rep_nome}</span>}
                     </div>
                     <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" className="pl-10 pr-4 py-1.5 border border-gray-200 text-[10px] outline-none" placeholder="Busca rápida..."/></div>
                   </div>
                   <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-gray-50 border-b">
                        <tr className="text-gray-400 uppercase font-bold text-[9px]">
                          <th className="px-6 py-4 text-left">Representante</th>
                          <th className="px-6 py-4 text-center">Período</th>
                          <th className="px-6 py-4 text-right">Valor Meta</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredGoals.length === 0 ? (
                          <tr><td colSpan={4} className="p-10 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nenhum registro para este filtro</td></tr>
                        ) : (
                          filteredGoals.map(g => (
                            <tr key={g.id} className={`hover:bg-gray-50 transition-colors group ${editingGoalId === g.id ? 'bg-amber-50' : ''}`}>
                              <td className="px-6 py-4"><strong>{g.rep_nome}</strong><br/><span className="text-[9px] text-gray-400">COD: {g.rep_in_codigo}</span></td>
                              <td className="px-6 py-4 text-center font-bold text-gray-600">{MONTHS.find(m => m.id === g.mes)?.label} / {g.ano}</td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{currencyFormat(g.valor_meta)}</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-4">
                                  <button 
                                    onClick={() => handleEditGoal(g)} 
                                    className={`transition-colors ${editingGoalId === g.id ? 'text-amber-600' : 'text-gray-300 hover:text-blue-600'}`}
                                    title="Editar meta"
                                  >
                                    <Edit2 size={16}/>
                                  </button>
                                  <button 
                                    onClick={async () => { if(confirm('Tem certeza que deseja remover esta meta permanentemente?')) { await deleteSalesGoal(g.id!); loadGoals(); } }} 
                                    className="text-gray-200 hover:text-red-500 transition-colors"
                                    title="Excluir meta"
                                  >
                                    <Trash2 size={16}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                   </div>
                </div>
             </div>
          ) : activeModuleId === 'USERS' ? (
             <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-300">
                <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200 p-8 space-y-6 shadow-sm">
                   <h3 className="text-xs font-bold uppercase tracking-widest border-b pb-4">Novo Acesso</h3>
                   <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Nome Completo</label>
                        <input type="text" placeholder="Ex: João da Silva" className="w-full px-4 py-2.5 bg-gray-50 border text-sm outline-none focus:border-gray-900" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">E-mail Corporativo</label>
                        <input type="email" placeholder="usuario@empresa.com.br" className="w-full px-4 py-2.5 bg-gray-50 border text-sm outline-none focus:border-gray-900" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Senha de Acesso</label>
                        <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-gray-50 border text-sm outline-none focus:border-gray-900" value={newUser.password || ''} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} />
                     </div>
                     
                     <div className="pt-2 flex items-center gap-3 p-3 bg-gray-50 border border-dashed border-gray-200">
                        <input 
                            type="checkbox" 
                            id="is_admin" 
                            className="w-4 h-4 accent-gray-900" 
                            checked={newUser.is_admin} 
                            onChange={e => setNewUser(p => ({...p, is_admin: e.target.checked, rep_in_codigo: e.target.checked ? null : p.rep_in_codigo}))} 
                        />
                        <label htmlFor="is_admin" className="text-[10px] font-bold uppercase text-gray-700 cursor-pointer">Acesso de Administrador</label>
                     </div>

                     {!newUser.is_admin && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[9px] font-black uppercase text-gray-400">Vincular Representante</label>
                            <select 
                                className="w-full px-4 py-2.5 bg-gray-50 border text-sm outline-none focus:border-gray-900"
                                value={newUser.rep_in_codigo || ''}
                                onChange={e => setNewUser(p => ({...p, rep_in_codigo: e.target.value ? Number(e.target.value) : null}))}
                            >
                                <option value="">Selecionar Representante</option>
                                {fullRepsList.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
                            </select>
                        </div>
                     )}
                   </div>
                   <button onClick={handleSaveUser} className="w-full py-4 bg-[#1a2130] text-white text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-black transition-all">Criar Acesso</button>
                </div>
                <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 overflow-hidden shadow-sm">
                   <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-gray-500">Usuários Cadastrados</span>
                   </div>
                   <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50/50 border-b">
                            <tr className="text-[9px] font-black uppercase text-gray-400">
                                <th className="px-6 py-4 text-left">Usuário</th>
                                <th className="px-6 py-4 text-center">Nível / Vínculo</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {appUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{u.name}</p>
                                                <p className="text-[10px] text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {u.is_admin ? (
                                            <span className="px-3 py-1 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 w-fit mx-auto">
                                                <Shield size={10} /> Administrador
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 w-fit mx-auto">
                                                Rep: {u.rep_in_codigo || 'N/A'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={async () => { if(confirm(`Remover acesso de ${u.name}?`)) { await deleteAppUser(u.id!); loadAppUsers(); } }} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                   </div>
                </div>
             </div>
          ) : (
            <>
              {/* PAINEL DE FILTROS OTIMIZADO */}
              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer" onClick={() => setFiltersExpanded(!filtersExpanded)}>
                  <div className="flex items-center gap-2">
                    <Filter size={12} className="text-gray-900" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Painel de Inteligência</span>
                  </div>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} />
                </div>
                {filtersExpanded && (
                  <div className="p-4 flex flex-wrap lg:flex-nowrap items-end gap-3 overflow-x-auto custom-scrollbar">
                    <div className="w-72 min-w-[200px] space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Busca Global</label>
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="ID, Cliente, Produto..." className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.globalSearch} onChange={e => setFilters({...filters, globalSearch: e.target.value})} />
                      </div>
                    </div>
                    <div className="w-48 space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Representante</label>
                      <select 
                        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none disabled:bg-gray-100" 
                        value={filters.representante} 
                        onChange={e => setFilters({...filters, representante: e.target.value})}
                        disabled={!currentUser.is_admin}
                      >
                        <option value="">{currentUser.is_admin ? 'Todos os Representantes' : 'Meu Cadastro'}</option>
                        {availableReps.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="w-40 space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Status</label>
                      <select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                        <option value="">Todos os Status</option>
                        {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="w-40 space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Filial</label>
                      <select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.filial} onChange={e => setFilters({...filters, filial: e.target.value})}>
                        <option value="">Todas as Filiais</option>
                        {availableFiliais.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="w-64 space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Período de Emissão</label>
                      <div className="flex items-center gap-1">
                        <input type="date" className="flex-1 px-1.5 py-1.5 bg-gray-50 border border-gray-200 text-[9px] outline-none focus:border-gray-900" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} title="Data Inicial" />
                        <span className="text-gray-300 text-[9px]">-</span>
                        <input type="date" className="flex-1 px-1.5 py-1.5 bg-gray-50 border border-gray-200 text-[9px] outline-none focus:border-gray-900" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} title="Data Final" />
                      </div>
                    </div>
                    <div className="flex gap-1.5 pb-[2px] ml-auto">
                      <button onClick={() => setShowTokenModal(true)} className="px-5 py-1.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-sm">
                        <RefreshCw size={12} className={loading || syncing ? 'animate-spin' : ''} /> Sincronizar
                      </button>
                      <button onClick={clearFilters} className="px-4 py-1.5 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">
                         Resetar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* DASHBOARD DE MÉTRICAS COM PERFORMANCE META X REALIZADO */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Bruto (Realizado)" value={currencyFormat(metrics.total)} icon={DollarSign} color="text-gray-900" />
                
                <div className="bg-white p-6 border border-gray-200 shadow-sm hover:border-gray-900 transition-colors relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Meta Prevista</p>
                    <Target size={16} className="text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tighter tabular-nums mb-4">{currencyFormat(metrics.goal)}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                      <span className="text-gray-400">Atingimento</span>
                      <span className={metrics.achievement >= 100 ? 'text-green-600' : metrics.achievement >= 70 ? 'text-amber-500' : 'text-red-500'}>
                        {metrics.achievement.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${metrics.achievement >= 100 ? 'bg-green-500' : metrics.achievement >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(metrics.achievement, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <StatCard title={activeModuleId === 'OV' ? "Em Aprovação" : "Faturado"} value={currencyFormat(activeModuleId === 'OV' ? metrics.emAprovacao : metrics.faturado)} icon={activeModuleId === 'OV' ? ShieldCheck : TrendingUp} color={activeModuleId === 'OV' ? "text-amber-600" : "text-green-600"} />
                <StatCard title="Aberto" value={currencyFormat(activeModuleId === 'OV' ? metrics.emAberto : (metrics.total - metrics.faturado))} icon={Receipt} color="text-blue-600" />
                <StatCard title="Registros" value={metrics.count.toString()} icon={Database} color="text-gray-400" />
              </div>

              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-3"><TableIcon size={14}/><h3 className="text-[10px] font-bold uppercase tracking-widest">Visão Analítica de Dados</h3></div>
                   <div className="relative" ref={columnSelectorRef}>
                      <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="px-5 py-2.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-sm"><Columns size={12}/>Gerenciar Colunas</button>
                      {showColumnSelector && (
                        <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-200 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-200 rounded-sm">
                          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <span className="text-[10px] font-black uppercase text-gray-900 tracking-widest">Layout de Exibição</span>
                            <button onClick={() => setShowColumnSelector(false)}><X size={14} className="text-gray-400 hover:text-red-500"/></button>
                          </div>
                          <div className="py-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {salesColumns.map(col => (
                              <button key={col.key} onClick={() => toggleColumnVisibility(col.key)} className="w-full flex items-center gap-4 px-5 py-2.5 hover:bg-gray-50 transition-colors group text-left border-b border-gray-50 last:border-0">
                                <div className={`w-5 h-5 border rounded-sm flex items-center justify-center transition-all ${col.visible ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}>
                                  {col.visible && <CheckCircle2 size={12} className="text-white"/>}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest flex-1 ${col.visible ? 'text-gray-900' : 'text-gray-300'}`}>{col.label}</span>
                              </button>
                            ))}
                          </div>
                          <div className="p-4 border-t bg-gray-50"><button onClick={saveGlobalVision} className={`w-full py-3.5 text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-md active:scale-[0.98] ${layoutSaved ? 'bg-green-600' : 'bg-gray-900 hover:bg-black'}`}>{layoutSaved ? 'Visão Salva com Sucesso!' : 'Salvar como Padrão'}</button></div>
                        </div>
                      )}
                   </div>
                </div>
                <div className="flex-1">
                  <SalesTable 
                    data={processedData} 
                    columns={salesColumns} 
                    sortConfig={sortConfig} 
                    onSort={s => setSortConfig(p => p?.key === s ? {key:s, direction:p.direction==='asc'?'desc':'asc'} : {key:s, direction:'asc'})} 
                    onColumnReorder={(f, t) => {
                      const newCols = [...salesColumns];
                      const [moved] = newCols.splice(f, 1);
                      newCols.splice(t, 0, moved);
                      setSalesColumns(newCols);
                    }} 
                    isLoading={loading || syncing} 
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
