import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RefreshCw, Search, Database, Menu, Table as TableIcon, FileText, ShoppingBag, Hammer, 
  Filter, Hexagon, DollarSign, ChevronDown, TrendingUp, Receipt, Users, UserPlus, Trash2, 
  ShieldCheck, LogOut, CheckCircle2, Lock, ArrowRight, Layout, X, Calendar, Key, Columns, 
  Save, Download, FileSpreadsheet, FileType, ChevronUp, Target, BarChart3, ArrowUpRight,
  Edit2, Globe, DatabaseZap, Shield, User, AlertCircle, PieChart, Calculator, CheckSquare, Square,
  Package, Tag, Layers, ListTree
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Sale, ColumnConfig, DataSource, AppUser, FilterConfig, SortConfig, SalesGoal } from './types';
import { fetchData } from './services/dataService';
import { fetchAppUsers, upsertAppUser, deleteAppUser, fetchSalesGoals, upsertSalesGoal, deleteSalesGoal, fetchFromSupabase, fetchAllRepresentatives } from './services/supabaseService';
import { SalesTable } from './components/SalesTable';
import { StatCard } from './components/StatCard';
import { SERVICE_PRINCIPAL_CONFIG, POWERBI_CONFIG } from './config';
import { getServicePrincipalToken } from './services/authService';

// ATUALIZAÇÃO: Todos os módulos buscam na mesma tabela 'PEDIDOS_DETALHADOS'
const MODULES = [
  { id: 'OV', label: 'Orçamentos', icon: FileText, table: 'PEDIDOS_DETALHADOS' },
  { id: 'PD', label: 'Pedidos de Venda', icon: ShoppingBag, table: 'PEDIDOS_DETALHADOS' },
  { id: 'DV', label: 'Desenvolvimento', icon: Hammer, table: 'PEDIDOS_DETALHADOS' },
  { id: 'PERFORMANCE', label: 'Meta x Realizado', icon: BarChart3, adminOnly: false },
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

const numberFormat = (val: any) => {
  if (val === null || val === undefined) return '-';
  const num = parseBrNumber(val);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(num);
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
  const [isGroupedByOrder, setIsGroupedByOrder] = useState(false);
  
  const [perfYear, setPerfYear] = useState(new Date().getFullYear());
  const [perfMonth, setPerfMonth] = useState(new Date().getMonth() + 1);
  const [perfSelectedReps, setPerfSelectedReps] = useState<number[]>([]); 
  const [showPerfRepSelector, setShowPerfRepSelector] = useState(false);
  
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);

  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const perfRepSelectorRef = useRef<HTMLDivElement>(null);

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

  const getSharedLayoutKey = () => `airsales_global_layout_v3_${currentUser?.email}`;

  useEffect(() => {
    loadAppUsers();
    loadGoals();
    loadRepsForSelection();
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) setShowColumnSelector(false);
      if (perfRepSelectorRef.current && !perfRepSelectorRef.current.contains(event.target as Node)) setShowPerfRepSelector(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUser) loadData();
  }, [currentUser, activeModuleId]);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => {
        setNotification(prev => prev?.message === message ? null : prev);
    }, 5000);
  };

  const loadAppUsers = async () => { try { const users = await fetchAppUsers(); setAppUsers(users); } catch (e) {} };
  const loadGoals = async () => { try { const goals = await fetchSalesGoals(); setSalesGoals(goals); } catch (e) {} };
  
  const loadRepsForSelection = async () => {
    try {
      const data = await fetchAllRepresentatives();
      setFullRepsList(data);
    } catch (e) {
      console.error("Erro ao carregar representantes:", e);
    }
  };

  const loadData = async () => {
    if (!currentUser || activeModuleId === 'USERS' || activeModuleId === 'METAS') return;
    
    setLoading(true);
    try {
      const activeModule = MODULES.find(m => m.id === activeModuleId);
      const tableName = activeModule?.table || 'PEDIDOS_DETALHADOS';
      
      const repCode = currentUser.is_admin ? undefined : currentUser.rep_in_codigo;
      const filterToUse = activeModuleId === 'PERFORMANCE' ? 'PD' : activeModuleId;
      
      const data = await fetchData('supabase', "", tableName, filterToUse);
      const filtered = repCode ? data.filter(d => Number(d.REP_IN_CODIGO) === Number(repCode)) : data;
      setSalesData(filtered);
      
      if (activeModuleId !== 'PERFORMANCE') {
        generateColumns(filtered);
      }
    } catch (error) {} finally { setLoading(false); }
  };

  const handleManualSync = async () => {
    if (!pbiToken) return showNotification("Informe o token do Power BI.", "error");
    setSyncing(true);
    try {
      const activeModule = MODULES.find(m => m.id === activeModuleId);
      const tableName = activeModule?.table || 'PEDIDOS_DETALHADOS';
      await fetchData('powerbi', pbiToken, tableName, undefined);
      showNotification("Sincronização COMPLETA concluída!", "success");
      setShowTokenModal(false);
      setPbiToken('');
      await Promise.all([loadData(), loadRepsForSelection()]);
    } catch (error: any) {
      showNotification("Erro na sincronização manual: " + error.message, "error");
    } finally { setSyncing(false); }
  };

  const handleAutomatedSync = async () => {
    if (syncing) return;
    if (!POWERBI_CONFIG.workspaceId || POWERBI_CONFIG.workspaceId.includes("PREENCHA")) return showNotification("Configuração inválida.", "error");

    setSyncing(true);
    await new Promise(r => setTimeout(r, 300));

    try {
        const token = await getServicePrincipalToken(SERVICE_PRINCIPAL_CONFIG);
        const activeModule = MODULES.find(m => m.id === activeModuleId);
        const tableName = activeModule?.table || 'PEDIDOS_DETALHADOS';
        await fetchData('powerbi', token, tableName, undefined);
        showNotification("Base TOTAL atualizada com sucesso!", "success");
        await Promise.all([loadData(), loadRepsForSelection()]);
    } catch (error: any) {
        if (error.message.includes("CORS") || error.message.includes("Failed to fetch")) {
            showNotification("Bloqueio de Rede/CORS. Tentando modo manual...", "error");
            setShowTokenModal(true);
        } else {
            showNotification(`Erro Power BI: ${error.message}`, "error");
            loadData(); 
        }
    } finally { setSyncing(false); }
  };

  const generateColumns = (data: Sale[]) => {
    const savedLayout = localStorage.getItem(getSharedLayoutKey());
    const getFormatter = (key: string) => {
      if (key.includes('VALOR') || key.includes('VLMERCADORIA') || key.includes('PRECO')) return currencyFormat;
      if (key.includes('QUANTIDADE') || key.includes('QTD')) return numberFormat;
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

    const defaultOrder = [
      "PED_IN_CODIGO", 
      "FILIAL_NOME", 
      "REPRESENTANTE_NOME", 
      "PED_DT_EMISSAO", 
      "CLIENTE_NOME", 
      "PRO_ST_ALTERNATIVO", 
      "ITP_ST_DESCRICAO", 
      "ITP_RE_QUANTIDADE",
      "ITP_RE_VALORUNITARIO",
      "ITP_RE_VALORMERCADORIA", 
      "PED_ST_STATUS"
    ];
    
    const allPossibleKeys = [
        "SER_ST_CODIGO",
        "PED_IN_CODIGO",
        "CLI_IN_CODIGO",
        "CLIENTE_NOME",
        "FIL_IN_CODIGO",
        "FILIAL_NOME",
        "PED_DT_EMISSAO",
        "PED_CH_SITUACAO",
        "PED_ST_STATUS",
        "REP_IN_CODIGO",
        "REPRESENTANTE_NOME",
        "ITP_IN_SEQUENCIA",
        "ITP_ST_SITUACAO",
        "IT_ST_STATUS",
        "NF_NOT_IN_CODIGO",
        "NOT_DT_EMISSAO",
        "PRO_ST_ALTERNATIVO",
        "PRO_IN_CODIGO",
        "ITP_ST_DESCRICAO",
        "ITP_RE_QUANTIDADE",
        "ITP_RE_VALORUNITARIO",
        "ITP_RE_VALORMERCADORIA",
        "ITP_ST_PEDIDOCLIENTE"
    ];

    setSalesColumns(allPossibleKeys.map(key => ({ 
        key, 
        label: key.replace(/_/g, ' ').replace('ITP ST', '').replace('ITP RE', '').replace('PED RE', '').replace('PED ST', '').replace('IT ST', '').trim(), 
        visible: defaultOrder.includes(key), 
        format: getFormatter(key) 
    })));
  };

  const handleSaveGoal = async () => {
    if (!newGoal.rep_in_codigo || !newGoal.valor_meta) return showNotification("Preencha Representante e Valor.", "error");
    try {
      await upsertSalesGoal({ ...newGoal, id: editingGoalId || undefined });
      showNotification("Meta salva com sucesso.", "success");
      setNewGoal({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 });
      setEditingGoalId(null);
      loadGoals();
    } catch (e: any) { showNotification(`Erro: ${e.message}`, "error"); }
  };

  const handleEditGoal = (goal: SalesGoal) => {
    setNewGoal({ rep_in_codigo: goal.rep_in_codigo, rep_nome: goal.rep_nome, ano: goal.ano, mes: goal.mes, valor_meta: goal.valor_meta });
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
    if (!newUser.name || !newUser.email || !newUser.password) return showNotification("Dados incompletos.", "error");
    try { 
      await upsertAppUser(newUser); 
      setNewUser({ name: '', email: '', password: '', rep_in_codigo: null, is_admin: false }); 
      loadAppUsers(); 
      showNotification("Acesso criado.", "success");
    } catch (e: any) { showNotification(e.message, "error"); }
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

  // EXPORT FUNCTIONS
  const handleExportExcel = () => {
    const visibleCols = salesColumns.filter(c => c.visible);
    
    // Mapeia os dados formatados
    const dataToExport = processedData.map(row => {
      const newRow: Record<string, any> = {};
      visibleCols.forEach(col => {
        newRow[col.label] = col.format ? col.format(row[col.key]) : row[col.key];
      });
      return newRow;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    // Ajuste de largura das colunas (básico)
    const wscols = visibleCols.map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Relatório de Vendas");
    XLSX.writeFile(wb, `AirSales_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const visibleCols = salesColumns.filter(c => c.visible);
    
    const tableColumn = visibleCols.map(c => c.label);
    const tableRows = processedData.map(row => {
      return visibleCols.map(col => {
        return col.format ? col.format(row[col.key]) : String(row[col.key] || '');
      });
    });

    doc.setFontSize(10);
    doc.text(`Relatório Air Sales - ${MODULES.find(m => m.id === activeModuleId)?.label}`, 14, 15);
    doc.setFontSize(8);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 20);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [26, 33, 48] }, // Dark blue header
    });

    doc.save(`AirSales_Export_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const availableReps = useMemo(() => {
    if (currentUser && !currentUser.is_admin && currentUser.rep_in_codigo) return fullRepsList.filter(r => r.code === currentUser.rep_in_codigo);
    return fullRepsList;
  }, [fullRepsList, currentUser]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(s => { const status = String(s.PED_ST_STATUS || s.SITUACAO || ''); if (status) set.add(status.toUpperCase()); });
    return Array.from(set).sort();
  }, [salesData]);

  const availableFiliais = useMemo(() => {
    const set = new Set<string>();
    salesData.forEach(s => { const filial = String(s.FILIAL_NOME || ''); if (filial) set.add(filial.toUpperCase()); });
    return Array.from(set).sort();
  }, [salesData]);

  const filteredGoals = useMemo(() => {
    let goals = [...salesGoals];
    if (newGoal.rep_in_codigo !== 0 && !editingGoalId) goals = goals.filter(g => g.rep_in_codigo === newGoal.rep_in_codigo);
    return goals.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes));
  }, [salesGoals, newGoal.rep_in_codigo, editingGoalId]);

  const totalGoalsFiltered = useMemo(() => filteredGoals.reduce((acc, curr) => acc + curr.valor_meta, 0), [filteredGoals]);

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
      const v = parseBrNumber(d['ITP_RE_VALORMERCADORIA'] || 0);
      const s = String(d.PED_ST_STATUS || '').toLowerCase();
      total += v;
      if (s.includes('faturado')) faturado += v;
      if (s.includes('aprov')) emAprovacao += v;
      if (s.includes('aberto')) emAberto += v;
    });

    let currentGoalValue = 0;
    if (filters.startDate && filters.endDate) {
      const [startYear, startMonth] = filters.startDate.split('-').map(Number);
      const [endYear, endMonth] = filters.endDate.split('-').map(Number);
      const startAbs = startYear * 12 + startMonth;
      const endAbs = endYear * 12 + endMonth;

      const targetGoals = salesGoals.filter(g => {
        const goalAbs = g.ano * 12 + g.mes;
        const inRange = goalAbs >= startAbs && goalAbs <= endAbs;
        const repMatch = filters.representante ? String(g.rep_in_codigo) === filters.representante : true;
        return inRange && repMatch;
      });
      currentGoalValue = targetGoals.reduce((acc, curr) => acc + curr.valor_meta, 0);
    }

    const achievement = currentGoalValue > 0 ? (total / currentGoalValue) * 100 : 0;
    const uniqueOrders = new Set(processedData.map(d => `${d.FIL_IN_CODIGO}-${d.SER_ST_CODIGO}-${d.PED_IN_CODIGO}`)).size;

    return { total, faturado, emAprovacao, emAberto, count: uniqueOrders, goal: currentGoalValue, achievement };
  }, [processedData, salesGoals, filters.startDate, filters.endDate, filters.representante]);

  // Performance Report logic
  const performanceData = useMemo(() => {
      const relevantGoals = salesGoals.filter(g => g.ano === perfYear && g.mes === perfMonth);
      const relevantSales = salesData.filter(s => {
          if (!s.PED_DT_EMISSAO) return false;
          const dt = new Date(s.PED_DT_EMISSAO);
          return dt.getFullYear() === perfYear && (dt.getMonth() + 1) === perfMonth;
      });

      const repMap = new Map<number, { name: string, goal: number, realized: number }>();
      relevantGoals.forEach(g => {
          const current = repMap.get(g.rep_in_codigo) || { name: g.rep_nome, goal: 0, realized: 0 };
          current.goal += g.valor_meta;
          current.name = g.rep_nome; 
          repMap.set(g.rep_in_codigo, current);
      });

      relevantSales.forEach(s => {
          const code = Number(s.REP_IN_CODIGO);
          if (!code) return;
          const val = parseBrNumber(s['ITP_RE_VALORMERCADORIA'] || 0);
          const current = repMap.get(code) || { name: s.REPRESENTANTE_NOME, goal: 0, realized: 0 };
          current.realized += val;
          if (!current.name && s.REPRESENTANTE_NOME) current.name = s.REPRESENTANTE_NOME;
          repMap.set(code, current);
      });

      let result = Array.from(repMap.entries()).map(([code, data]) => ({
          code, name: data.name || `Rep ${code}`, goal: data.goal, realized: data.realized, percent: data.goal > 0 ? (data.realized / data.goal) * 100 : 0
      }));

      if (!currentUser?.is_admin && currentUser?.rep_in_codigo) result = result.filter(r => r.code === currentUser.rep_in_codigo);
      else if (perfSelectedReps.length > 0) result = result.filter(r => perfSelectedReps.includes(r.code));

      return result.sort((a, b) => b.percent - a.percent);
  }, [salesGoals, salesData, perfYear, perfMonth, currentUser, perfSelectedReps]);

  const perfMetrics = useMemo(() => {
      const totalGoal = performanceData.reduce((acc, curr) => acc + curr.goal, 0);
      const totalRealized = performanceData.reduce((acc, curr) => acc + curr.realized, 0);
      const totalPercent = totalGoal > 0 ? (totalRealized / totalGoal) * 100 : 0;
      return { totalGoal, totalRealized, totalPercent };
  }, [performanceData]);

  const togglePerfRepSelection = (repCode: number) => {
     setPerfSelectedReps(prev => prev.includes(repCode) ? prev.filter(c => c !== repCode) : [...prev, repCode]);
  };

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
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-2xl">
          <div className="p-8 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 flex items-center justify-center text-white font-bold text-xl">AS</div>
            <div><h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">AIR SALES</h1><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analytics 4.0</p></div>
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
    <div className="flex h-screen w-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      {/* Notifications and Modals */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[150] bg-white border-l-4 shadow-xl p-4 rounded-r flex items-center gap-3 transition-all duration-300 transform translate-x-0 opacity-100 max-w-sm ${notification.type === 'success' ? 'border-green-600' : notification.type === 'warning' ? 'border-amber-500' : 'border-red-600'}`}>
           <div className={`p-1 rounded-full ${notification.type === 'success' ? 'bg-green-100' : notification.type === 'warning' ? 'bg-amber-100' : 'bg-red-100'}`}>{notification.type === 'success' ? <CheckCircle2 size={16} className="text-green-600"/> : notification.type === 'warning' ? <AlertCircle size={16} className="text-amber-600"/> : <AlertCircle size={16} className="text-red-600"/>}</div>
           <div><h4 className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${notification.type === 'success' ? 'text-green-800' : notification.type === 'warning' ? 'text-amber-800' : 'text-red-800'}`}>{notification.type === 'success' ? 'Sucesso' : 'Erro'}</h4><p className="text-[10px] font-medium text-gray-600 leading-tight break-words">{notification.message}</p></div>
           <button onClick={() => setNotification(null)} className="ml-auto text-gray-400 hover:text-gray-900"><X size={12}/></button>
        </div>
      )}

      {showTokenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3"><Globe className="text-blue-600" size={20} /><h3 className="text-xs font-bold uppercase tracking-widest">Sincronizar Power BI</h3></div>
              <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Bearer Token de Acesso</label><textarea className="w-full p-4 bg-gray-50 border border-gray-200 text-xs font-mono min-h-[120px] outline-none focus:border-gray-900 transition-colors" placeholder="Cole aqui o token gerado no Power BI API..." value={pbiToken} onChange={e => setPbiToken(e.target.value)} autoFocus /></div>
              <div className="flex flex-col gap-3"><button onClick={handleManualSync} disabled={syncing} className="w-full py-4 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 transition-all disabled:opacity-50">{syncing ? <RefreshCw size={14} className="animate-spin" /> : <DatabaseZap size={14} />}{syncing ? 'Processando Sincronização...' : 'Iniciar Sincronização TOTAL'}</button><button onClick={loadData} className="w-full py-3 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">Apenas Atualizar Visualização Local</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop (Flex Item) / Mobile (Fixed + Overlay) */}
      <aside className={`
        flex flex-col border-r border-gray-200 bg-white transition-all duration-300 z-30 flex-shrink-0
        ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 shadow-2xl w-64 translate-x-0' : 'hidden lg:flex relative'}
        ${!mobileSidebarOpen && sidebarOpen ? 'w-56' : ''}
        ${!mobileSidebarOpen && !sidebarOpen ? 'w-16' : ''}
      `}>
        <div className="h-12 flex items-center px-4 border-b border-gray-100 bg-gray-50 shrink-0"><div className="flex items-center gap-2 text-gray-900"><Hexagon size={20}/><span className={`font-bold uppercase text-xs transition-opacity duration-200 ${!sidebarOpen && !mobileSidebarOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>AIR SALES</span></div></div>
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
           {MODULES.filter(m => !m.adminOnly || currentUser.is_admin).map(m => (
             <button 
                key={m.id} 
                onClick={() => { setActiveModuleId(m.id); setMobileSidebarOpen(false); }} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all rounded-sm whitespace-nowrap ${activeModuleId === m.id ? 'bg-[#1a2130] text-white' : 'text-gray-500 hover:bg-gray-50'} ${!sidebarOpen && !mobileSidebarOpen ? 'justify-center' : ''}`}
                title={!sidebarOpen && !mobileSidebarOpen ? m.label : ''}
             >
                <m.icon size={16} className="shrink-0" />
                {(sidebarOpen || mobileSidebarOpen) && <span className="text-[10px] uppercase font-semibold">{m.label}</span>}
             </button>
            ))}
        </nav>
        <div className="p-3 border-t border-gray-100 shrink-0">
           {(sidebarOpen || mobileSidebarOpen) && (
              <div className="px-3 py-2 mb-1">
                 <p className="text-[9px] font-bold text-gray-400 uppercase">Usuário</p>
                 <div className="flex items-center gap-2 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><p className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]">{currentUser.name}</p></div>
              </div>
           )}
           <button onClick={() => setCurrentUser(null)} className={`w-full flex items-center gap-2 p-2 text-gray-400 hover:text-red-600 text-[10px] font-bold uppercase ${!sidebarOpen && !mobileSidebarOpen ? 'justify-center' : ''}`}><LogOut size={14} />{(sidebarOpen || mobileSidebarOpen) && 'Sair'}</button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="h-12 bg-white border-b border-gray-200 px-4 flex justify-between items-center shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="lg:hidden"><Menu size={18}/></button>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block"><Menu size={18}/></button>
             <h2 className="text-[10px] font-bold uppercase tracking-widest truncate">{MODULES.find(m => m.id === activeModuleId)?.label}</h2>
          </div>
          {activeModuleId !== 'METAS' && activeModuleId !== 'USERS' && (<button onClick={handleAutomatedSync} className="px-3 py-1.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all active:scale-95 shadow-lg"><RefreshCw size={12} className={loading || syncing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Atualizar Base</span></button>)}
        </header>

        {/* Scrollable Main Content - Agora apenas a tabela e modais rolam individualmente se necessario */}
        <main className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4 w-full">
          {activeModuleId === 'METAS' ? (
             /* Metas Component - Rola individualmente */
             <div className="grid grid-cols-12 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full overflow-y-auto custom-scrollbar">
                <div className={`col-span-12 lg:col-span-4 bg-white border ${editingGoalId ? 'border-amber-500 shadow-amber-50' : 'border-gray-200 shadow-sm'} p-3 space-y-2 transition-all duration-300`}>
                   <div className="flex items-center justify-between border-b pb-2"><h3 className="text-[10px] font-bold uppercase tracking-widest">{editingGoalId ? 'Editando Meta' : 'Nova Meta de Vendas'}</h3>{editingGoalId && <div className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded-full">Modo de Edição</div>}</div>
                   <div className="space-y-2">
                      <div><label className="text-[9px] font-black uppercase text-gray-400">Representante</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] mt-0.5 outline-none focus:border-gray-900" value={newGoal.rep_in_codigo} onChange={e => {const code = Number(e.target.value); const name = availableReps.find(r => r.code === code)?.name || ''; setNewGoal(p => ({...p, rep_in_codigo: code, rep_nome: name}));}}><option value="0">Selecionar Representante</option>{availableReps.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}</select></div>
                      <div className="grid grid-cols-2 gap-2"><div><label className="text-[9px] font-black uppercase text-gray-400">Ano</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] mt-0.5 outline-none" value={newGoal.ano} onChange={e => setNewGoal(p => ({...p, ano: Number(e.target.value)}))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div><div><label className="text-[9px] font-black uppercase text-gray-400">Mês</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] mt-0.5 outline-none" value={newGoal.mes} onChange={e => setNewGoal(p => ({...p, mes: Number(e.target.value)}))}>{MONTHS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div></div>
                      <div><label className="text-[9px] font-black uppercase text-gray-400">Valor da Meta (R$)</label><div className="relative mt-0.5"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">R$</span><input type="number" className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] outline-none focus:border-gray-900" value={newGoal.valor_meta} onChange={e => setNewGoal(p => ({...p, valor_meta: Number(e.target.value)}))} placeholder="0.00" /></div></div>
                   </div>
                   <div className="space-y-1.5 pt-1"><button onClick={handleSaveGoal} className={`w-full py-2.5 text-white text-[9px] font-bold uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] ${editingGoalId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-900 hover:bg-black'}`}>{editingGoalId ? 'Confirmar Alterações' : 'Registrar Meta'}</button>{editingGoalId && (<button onClick={handleCancelEdit} className="w-full py-2 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar Edição</button>)}</div>
                </div>
                <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 overflow-hidden shadow-sm h-fit">
                   <div className="p-3 bg-gray-50 border-b flex justify-between items-center"><div className="flex flex-col"><span className="text-[10px] font-bold uppercase text-gray-500">Metas Registradas</span>{newGoal.rep_in_codigo !== 0 && !editingGoalId && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Filtrando por: {newGoal.rep_nome}</span>}</div><div className="relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 text-[10px] outline-none" placeholder="Busca rápida..."/></div></div>
                   {(newGoal.rep_in_codigo !== 0 || filteredGoals.length > 0) && (<div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1"><div className="flex items-center gap-2"><Calculator size={14} className="text-blue-600" /><span className="text-[9px] font-bold uppercase tracking-widest text-blue-800">Total Definido</span></div><span className="text-sm font-bold text-blue-900 font-mono tracking-tight">{currencyFormat(totalGoalsFiltered)}</span></div>)}
                   <div className="overflow-x-auto max-h-[500px] custom-scrollbar"><table className="w-full text-[10px]"><thead className="bg-gray-50 border-b sticky top-0 z-10"><tr className="text-gray-400 uppercase font-bold text-[8px]"><th className="px-4 py-2 text-left bg-gray-50">Representante</th><th className="px-4 py-2 text-center bg-gray-50">Período</th><th className="px-4 py-2 text-right bg-gray-50">Valor Meta</th><th className="px-4 py-2 text-center bg-gray-50">Ações</th></tr></thead><tbody className="divide-y">{filteredGoals.length === 0 ? (<tr><td colSpan={4} className="p-4 text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">Nenhum registro para este filtro</td></tr>) : (filteredGoals.map(g => (<tr key={g.id} className={`hover:bg-gray-50 transition-colors group ${editingGoalId === g.id ? 'bg-amber-50' : ''}`}><td className="px-4 py-2"><strong>{g.rep_nome}</strong><br/><span className="text-[8px] text-gray-400">COD: {g.rep_in_codigo}</span></td><td className="px-4 py-2 text-center font-bold text-gray-600">{MONTHS.find(m => m.id === g.mes)?.label} / {g.ano}</td><td className="px-4 py-2 text-right font-mono font-bold text-gray-900">{currencyFormat(g.valor_meta)}</td><td className="px-4 py-2 text-center"><div className="flex items-center justify-center gap-3"><button onClick={() => handleEditGoal(g)} className={`transition-colors ${editingGoalId === g.id ? 'text-amber-600' : 'text-gray-300 hover:text-blue-600'}`} title="Editar meta"><Edit2 size={14}/></button><button onClick={async () => { if(confirm('Tem certeza que deseja remover esta meta permanentemente?')) { await deleteSalesGoal(g.id!); loadGoals(); } }} className="text-gray-200 hover:text-red-500 transition-colors" title="Excluir meta"><Trash2 size={14}/></button></div></td></tr>)))}</tbody></table></div>
                </div>
             </div>
          ) : activeModuleId === 'PERFORMANCE' ? (
             /* Performance Component - Rola individualmente */
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full overflow-y-auto custom-scrollbar">
                <div className="bg-white border border-gray-200 p-3 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between sticky top-0 z-10">
                   {/* ... conteúdo performance ... */}
                   <div className="flex items-center gap-2"><div className="p-2 bg-gray-900 text-white"><BarChart3 size={16}/></div><div><h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-900">Relatório de Atingimento</h3><p className="text-[9px] text-gray-500 font-medium">Comparativo Meta x Realizado (Pedidos)</p></div></div>
                   <div className="flex items-center gap-2 w-full sm:w-auto">{currentUser.is_admin && (<div className="flex-1 sm:w-56 relative" ref={perfRepSelectorRef}><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter block mb-0.5">Filtrar Representantes</label><button onClick={() => setShowPerfRepSelector(!showPerfRepSelector)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold flex items-center justify-between hover:border-gray-400 transition-colors outline-none"><span className="truncate">{perfSelectedReps.length === 0 ? 'Todos os Representantes' : perfSelectedReps.length === 1 ? availableReps.find(r => r.code === perfSelectedReps[0])?.name || '1 Selecionado' : `${perfSelectedReps.length} Selecionados`}</span><ChevronDown size={12} className="text-gray-500"/></button>{showPerfRepSelector && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar rounded-sm animate-in fade-in zoom-in-95 duration-100"><div onClick={() => setPerfSelectedReps([])} className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 border-b border-gray-50"><div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-sm ${perfSelectedReps.length === 0 ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>{perfSelectedReps.length === 0 && <CheckCircle2 size={10} className="text-white"/>}</div><span className={`text-[9px] font-bold uppercase tracking-widest ${perfSelectedReps.length === 0 ? 'text-gray-900' : 'text-gray-500'}`}>Todos</span></div>{availableReps.map(r => {const isSelected = perfSelectedReps.includes(r.code); return (<div key={r.code} onClick={() => togglePerfRepSelection(r.code)} className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0 group"><div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-sm transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-gray-400'}`}>{isSelected && <CheckCircle2 size={10} className="text-white"/>}</div><div className="flex flex-col"><span className={`text-[9px] font-bold uppercase leading-none ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{r.name}</span><span className="text-[7px] text-gray-300 font-mono">{r.code}</span></div></div>);})}</div>)}</div>)}<div className="flex-1 sm:w-24"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter block mb-0.5">Ano</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] outline-none font-bold" value={perfYear} onChange={e => setPerfYear(Number(e.target.value))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div><div className="flex-1 sm:w-32"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter block mb-0.5">Mês</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] outline-none font-bold" value={perfMonth} onChange={e => setPerfMonth(Number(e.target.value))}>{MONTHS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><StatCard title="Total Meta Definida" value={currencyFormat(perfMetrics.totalGoal)} icon={Target} color="text-gray-400" /><StatCard title="Total Realizado (Itens)" value={currencyFormat(perfMetrics.totalRealized)} icon={ShoppingBag} color="text-blue-600" /><div className="bg-white p-3 border border-gray-200 shadow-sm flex flex-col justify-center relative overflow-hidden group"><div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><PieChart size={40}/></div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Atingimento Global</p><div className="flex items-end gap-2"><h3 className={`text-2xl font-black tracking-tighter ${perfMetrics.totalPercent >= 100 ? 'text-green-600' : perfMetrics.totalPercent >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{perfMetrics.totalPercent.toFixed(1)}%</h3></div></div></div>
                <div className="bg-white border border-gray-200 shadow-sm overflow-hidden"><div className="p-3 bg-gray-50 border-b flex justify-between items-center"><span className="text-[10px] font-bold uppercase text-gray-500">Performance por Representante</span></div><div className="overflow-x-auto"><table className="w-full text-[10px]"><thead className="bg-gray-50/50 border-b"><tr className="text-[9px] font-black uppercase text-gray-400"><th className="px-4 py-2 text-left">Representante</th><th className="px-4 py-2 text-left w-1/3">Progresso da Meta</th><th className="px-4 py-2 text-right">Meta (R$)</th><th className="px-4 py-2 text-right">Realizado (R$)</th><th className="px-4 py-2 text-center">% Ating.</th></tr></thead><tbody className="divide-y divide-gray-100">{performanceData.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sem dados para o período selecionado</td></tr>) : (performanceData.map((row) => (<tr key={row.code} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3"><div className="font-bold text-gray-900">{row.name}</div><div className="text-[8px] text-gray-400 font-mono">COD: {row.code}</div></td><td className="px-4 py-3 align-middle"><div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${row.percent >= 100 ? 'bg-green-500' : row.percent >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(row.percent, 100)}%` }}></div></div></td><td className="px-4 py-3 text-right font-mono text-gray-500">{currencyFormat(row.goal)}</td><td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{currencyFormat(row.realized)}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${row.percent >= 100 ? 'bg-green-100 text-green-700' : row.percent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.percent.toFixed(1)}%</span></td></tr>)))}</tbody></table></div></div>
             </div>
          ) : activeModuleId === 'USERS' ? (
             /* Users Component - Rola individualmente */
             <div className="grid grid-cols-12 gap-4 animate-in fade-in duration-300 h-full overflow-y-auto custom-scrollbar">
                <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200 p-3 space-y-2 shadow-sm"><h3 className="text-[10px] font-bold uppercase tracking-widest border-b pb-2">Novo Acesso</h3><div className="space-y-2"><div className="space-y-0.5"><label className="text-[9px] font-black uppercase text-gray-400">Nome Completo</label><input type="text" placeholder="Ex: João da Silva" className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} /></div><div className="space-y-0.5"><label className="text-[9px] font-black uppercase text-gray-400">E-mail Corporativo</label><input type="email" placeholder="usuario@empresa.com.br" className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} /></div><div className="space-y-0.5"><label className="text-[9px] font-black uppercase text-gray-400">Senha de Acesso</label><input type="password" placeholder="••••••••" className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.password || ''} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} /></div><div className="pt-1 flex items-center gap-2 p-2 bg-gray-50 border border-dashed border-gray-200"><input type="checkbox" id="is_admin" className="w-3 h-3 accent-gray-900" checked={newUser.is_admin} onChange={e => setNewUser(p => ({...p, is_admin: e.target.checked, rep_in_codigo: e.target.checked ? null : p.rep_in_codigo}))} /><label htmlFor="is_admin" className="text-[9px] font-bold uppercase text-gray-700 cursor-pointer">Acesso de Administrador</label></div>{!newUser.is_admin && (<div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200"><label className="text-[9px] font-black uppercase text-gray-400">Vincular Representante</label><select className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.rep_in_codigo || ''} onChange={e => setNewUser(p => ({...p, rep_in_codigo: e.target.value ? Number(e.target.value) : null}))}><option value="">Selecionar Representante</option>{fullRepsList.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}</select></div>)}</div><button onClick={handleSaveUser} className="w-full py-2.5 bg-[#1a2130] text-white text-[9px] font-bold uppercase tracking-widest shadow-xl hover:bg-black transition-all">Criar Acesso</button></div>
                <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 overflow-hidden shadow-sm"><div className="p-3 bg-gray-50 border-b flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-gray-500">Usuários Cadastrados</span></div><div className="overflow-x-auto"><table className="w-full text-[10px]"><thead className="bg-gray-50/50 border-b"><tr className="text-[9px] font-black uppercase text-gray-400"><th className="px-4 py-2 text-left">Usuário</th><th className="px-4 py-2 text-center">Nível / Vínculo</th><th className="px-4 py-2 text-right">Ação</th></tr></thead><tbody className="divide-y">{appUsers.map(u => (<tr key={u.id} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-2"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><User size={12} /></div><div><p className="font-bold text-gray-900">{u.name}</p><p className="text-[9px] text-gray-400">{u.email}</p></div></div></td><td className="px-4 py-2 text-center">{u.is_admin ? (<span className="px-2 py-0.5 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 w-fit mx-auto"><Shield size={8} /> Admin</span>) : (<span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 w-fit mx-auto">Rep: {u.rep_in_codigo || 'N/A'}</span>)}</td><td className="px-4 py-2 text-right"><button onClick={async () => { if(confirm(`Remover acesso de ${u.name}?`)) { await deleteAppUser(u.id!); loadAppUsers(); } }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button></td></tr>))}</tbody></table></div></div>
             </div>
          ) : (
            <div className="flex flex-col h-full gap-2 overflow-hidden">
              {/* PAINEL DE FILTROS OTIMIZADO */}
              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300 shrink-0">
                <div className="p-2 border-b bg-gray-50 flex items-center justify-between cursor-pointer" onClick={() => setFiltersExpanded(!filtersExpanded)}>
                  <div className="flex items-center gap-2"><Filter size={12} className="text-gray-900" /><span className="text-[9px] font-bold uppercase tracking-widest">Painel de Inteligência</span></div>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} />
                </div>
                {filtersExpanded && (
                  <div className="p-2 flex flex-wrap items-end gap-2">
                    <div className="w-48 space-y-0.5">
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Busca Global</label>
                      <div className="relative"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="ID, Cliente, Produto..." className="w-full pl-7 pr-2 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.globalSearch} onChange={e => setFilters({...filters, globalSearch: e.target.value})} /></div>
                    </div>
                    {/* ... (Filtros de Representante, Status, Filial, Data) ... */}
                    <div className="flex-1 space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Representante</label><select className="w-full px-1.5 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none disabled:bg-gray-100" value={filters.representante} onChange={e => setFilters({...filters, representante: e.target.value})} disabled={!currentUser.is_admin}><option value="">{currentUser.is_admin ? 'Todos' : 'Meu Cadastro'}</option>{availableReps.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}</select></div>
                    <div className="flex-1 space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Status</label><select className="w-full px-1.5 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="">Todos</option>{availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div className="flex-1 space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Filial</label><select className="w-full px-1.5 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.filial} onChange={e => setFilters({...filters, filial: e.target.value})}><option value="">Todas</option>{availableFiliais.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                    <div className="flex-1 min-w-[180px] space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Período de Emissão</label><div className="flex items-center gap-1"><input type="date" className="flex-1 px-1.5 py-1 bg-gray-50 border border-gray-200 text-[9px] outline-none focus:border-gray-900" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} title="Data Inicial" /><span className="text-gray-300 text-[9px]">-</span><input type="date" className="flex-1 px-1.5 py-1 bg-gray-50 border border-gray-200 text-[9px] outline-none focus:border-gray-900" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} title="Data Final" /></div></div>
                    <div className="w-20"><button onClick={clearFilters} className="w-full px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all text-center border border-gray-200">Resetar</button></div>
                  </div>
                )}
              </div>

              {/* DASHBOARD DE MÉTRICAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0">
                <StatCard title="Total Bruto (Itens)" value={currencyFormat(metrics.total)} icon={DollarSign} color="text-gray-900" />
                
                {activeModuleId !== 'OV' && activeModuleId !== 'DV' && (
                  <div className="bg-white p-3 border border-gray-200 shadow-sm hover:border-gray-900 transition-colors relative overflow-hidden group flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Meta</p><Target size={14} className="text-blue-500" /></div>
                    <div className="flex items-end justify-between"><h3 className="text-lg font-bold text-gray-900 tracking-tighter tabular-nums">{currencyFormat(metrics.goal)}</h3>{metrics.goal > 0 && (<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${metrics.achievement >= 100 ? 'bg-green-100 text-green-700' : metrics.achievement >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{metrics.achievement.toFixed(1)}%</span>)}</div>
                     {metrics.goal > 0 && (<div className="w-full h-1 bg-gray-100 mt-2 rounded-full overflow-hidden"><div className={`h-full ${metrics.achievement >= 100 ? 'bg-green-500' : metrics.achievement >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(metrics.achievement, 100)}%` }}></div></div>)}
                  </div>
                )}

                <StatCard title={activeModuleId === 'OV' ? "Em Aprovação" : "Faturado"} value={currencyFormat(activeModuleId === 'OV' ? metrics.emAprovacao : metrics.faturado)} icon={activeModuleId === 'OV' ? ShieldCheck : TrendingUp} color={activeModuleId === 'OV' ? "text-amber-600" : "text-green-600"} />
                <StatCard title="Aberto" value={currencyFormat(activeModuleId === 'OV' ? metrics.emAberto : (metrics.total - metrics.faturado))} icon={Receipt} color="text-blue-600" />
                <StatCard title="Pedidos Únicos" value={metrics.count.toString()} icon={Package} color="text-gray-400" />
              </div>

              {/* TABELA DE VENDAS FLEXÍVEL */}
              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                <div className="p-2 border-b bg-gray-50 flex flex-wrap gap-2 items-center justify-between shrink-0">
                   <div className="flex items-center gap-2"><TableIcon size={14}/><h3 className="text-[9px] font-bold uppercase tracking-widest">Visão Analítica (Detalhamento por Item)</h3></div>
                   <div className="flex items-center gap-2">
                     {/* Export Buttons */}
                     <button 
                       onClick={handleExportExcel} 
                       className="px-2 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm"
                       title="Exportar para Excel"
                     >
                       <FileSpreadsheet size={12}/> Excel
                     </button>
                     <button 
                       onClick={handleExportPDF} 
                       className="px-2 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm"
                       title="Exportar para PDF"
                     >
                       <FileType size={12}/> PDF
                     </button>

                     {/* Toggle de Agrupamento */}
                     <button 
                        onClick={() => setIsGroupedByOrder(!isGroupedByOrder)} 
                        className={`px-3 py-1.5 border text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isGroupedByOrder ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <ListTree size={12}/>
                        {isGroupedByOrder ? 'Agrupado por Pedido' : 'Lista Plana'}
                      </button>

                     <div className="relative" ref={columnSelectorRef}>
                        <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="px-3 py-1.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-sm"><Columns size={10}/>Colunas</button>
                        {showColumnSelector && (
                          <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-200 rounded-sm">
                            <div className="p-3 border-b flex justify-between items-center bg-gray-50"><span className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Layout</span><button onClick={() => setShowColumnSelector(false)}><X size={12} className="text-gray-400 hover:text-red-500"/></button></div>
                            <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">{salesColumns.map(col => (<button key={col.key} onClick={() => toggleColumnVisibility(col.key)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group text-left border-b border-gray-50 last:border-0"><div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${col.visible ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}>{col.visible && <CheckCircle2 size={10} className="text-white"/>}</div><span className={`text-[9px] font-bold uppercase tracking-widest flex-1 ${col.visible ? 'text-gray-900' : 'text-gray-300'}`}>{col.label}</span></button>))}</div>
                            <div className="p-3 border-t bg-gray-50"><button onClick={saveGlobalVision} className={`w-full py-2.5 text-[9px] font-bold uppercase tracking-widest text-white transition-all shadow-md active:scale-[0.98] ${layoutSaved ? 'bg-green-600' : 'bg-gray-900 hover:bg-black'}`}>{layoutSaved ? 'Salvo!' : 'Salvar Padrão'}</button></div>
                          </div>
                        )}
                     </div>
                   </div>
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <SalesTable 
                      data={processedData} 
                      columns={salesColumns} 
                      sortConfig={sortConfig} 
                      onSort={s => setSortConfig(p => p?.key === s ? {key:s, direction:p.direction==='asc'?'desc':'asc'} : {key:s, direction:'asc'})} 
                      onColumnReorder={(f, t) => { const newCols = [...salesColumns]; const [moved] = newCols.splice(f, 1); newCols.splice(t, 0, moved); setSalesColumns(newCols); }} 
                      isLoading={loading || syncing}
                      isGroupedByOrder={isGroupedByOrder}
                    />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}