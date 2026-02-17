
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RefreshCw, Search, Database, Menu, Table as TableIcon, FileText, ShoppingBag, Hammer, 
  Filter, Hexagon, DollarSign, ChevronDown, TrendingUp, Receipt, Users, UserPlus, Trash2, 
  ShieldCheck, LogOut, CheckCircle2, Lock, ArrowRight, Layout, X, Calendar, Key, Columns, 
  Save, Download, FileSpreadsheet, FileType, ChevronUp, Target, BarChart3, ArrowUpRight,
  Edit2, Globe, DatabaseZap, Shield, User, AlertCircle, PieChart, Calculator, CheckSquare, Square,
  Package, Tag, Layers, ListTree, Percent, Briefcase, Wallet, Banknote, HeartHandshake, Check,
  FileUp, UploadCloud, Database as DatabaseIcon, AlertTriangle, Sparkles, MessageSquare, Handshake,
  CheckSquare2, LayoutDashboard
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Sale, ColumnConfig, DataSource, AppUser, FilterConfig, SortConfig, SalesGoal } from './types';
import { fetchData } from './services/dataService';
import { fetchAppUsers, upsertAppUser, deleteAppUser, fetchSalesGoals, upsertSalesGoal, deleteSalesGoal, fetchFromSupabase, fetchAllRepresentatives, updateSaleCommissionStatus, syncSalesToSupabase, deleteSale, deleteAllSales } from './services/supabaseService';
import { generateSalesInsights } from './services/aiService';
import { SalesTable } from './components/SalesTable';
import { StatCard } from './components/StatCard';
import { AIInsightsModal } from './components/AIInsightsModal';
import { AIChatView } from './components/AIChatView';
import { CRMView } from './components/CRMView';
import { Overview } from './components/Overview'; // Importação do novo componente
import { SERVICE_PRINCIPAL_CONFIG, POWERBI_CONFIG } from './config';
import { getServicePrincipalToken } from './services/authService';

const MODULES = [
  { id: 'OVERVIEW', label: 'Visão Geral', icon: LayoutDashboard, adminOnly: false },
  { id: 'CRM', label: 'CRM Operacional', icon: Handshake, adminOnly: false },
  { id: 'OV', label: 'Orçamentos', icon: FileText, table: 'PEDIDOS_DETALHADOS' },
  { id: 'PD', label: 'Pedidos de Venda', icon: ShoppingBag, table: 'PEDIDOS_DETALHADOS' },
  { id: 'DV', label: 'Desenvolvimento', icon: Hammer, table: 'PEDIDOS_DETALHADOS' },
  { id: 'COMISSAO', label: 'Comissões', icon: Percent, adminOnly: false },
  { id: 'PAGAMENTOS', label: 'Controle Pagamentos', icon: Wallet, adminOnly: true },
  { id: 'PERFORMANCE', label: 'Meta x Realizado', icon: BarChart3, adminOnly: false },
  { id: 'METAS', label: 'Metas', icon: Target, adminOnly: true },
  { id: 'USERS', label: 'Gestão de Acessos', icon: Users, adminOnly: true },
  { id: 'IA_CHAT', label: 'Chat IA', icon: MessageSquare, adminOnly: false },
];

const COMMISSION_ROLES = [
  { id: 'ASSISTENTE', label: 'Orçamentista / Assistente' },
  { id: 'VENDEDOR', label: 'Representante' },
  { id: 'SUPERVISOR', label: 'Supervisor de Vendas' },
  { id: 'POSVENDA', label: 'Exec. Pós-Venda' },
  { id: 'GERENTE', label: 'Gerente Comercial' }
];

const MONTHS = [
  { id: 1, label: 'Janeiro' }, { id: 2, label: 'Fevereiro' }, { id: 3, label: 'Março' },
  { id: 4, label: 'Abril' }, { id: 5, label: 'Maio' }, { id: 6, label: 'Junho' },
  { id: 7, label: 'Julho' }, { id: 8, label: 'Agosto' }, { id: 9, label: 'Setembro' },
  { id: 10, label: 'Outubro' }, { id: 11, label: 'Novembro' }, { id: 12, label: 'Dezembro' }
];

interface PendingXmlItem {
  tempId: string;
  nfeNumber: string;
  emissionDate: string;
  clientName: string;
  totalValue: number;
  orderNumber: string;
  saleDate: string;
  repId: number | null;
  fileName: string;
  productCode: string;
  productDescription: string;
  isExisting?: boolean;
}

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

const percentFormat = (val: any) => {
  if (val === null || val === undefined) return '-';
  const num = parseBrNumber(val);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, style: 'percent', minimumFractionDigits: 2 }).format(num);
};

const dateFormat = (val: any) => {
  if (!val) return '-';
  const strVal = String(val);
  if (strVal.includes('/') && strVal.length === 10) return strVal;
  try {
    const datePart = strVal.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return datePart;
  } catch (e) { return strVal; }
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
};

export default function App() {
  const [activeModuleId, setActiveModuleId] = useState<string>('OVERVIEW');
  const [activeCommissionRole, setActiveCommissionRole] = useState<string>('ASSISTENTE');
  const [commissionViewMode, setCommissionViewMode] = useState<'FATURADO' | 'ABERTO'>('FATURADO');
  const [filterOnlyManual, setFilterOnlyManual] = useState(false);
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
  
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<Sale | null>(null);
  
  // AI States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  const [pendingXmls, setPendingXmls] = useState<PendingXmlItem[]>([]);
  const [perfYear, setPerfYear] = useState(new Date().getFullYear());
  const [perfMonth, setPerfMonth] = useState(new Date().getMonth() + 1);
  const [perfSelectedReps, setPerfSelectedReps] = useState<number[]>([]); 
  const [showPerfRepSelector, setShowPerfRepSelector] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);
  
  // Danger Zone States
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const perfRepSelectorRef = useRef<HTMLDivElement>(null);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState<AppUser>({ name: '', email: '', password: '', rep_in_codigo: null, is_admin: false, allowed_modules: [] });
  const [newGoal, setNewGoal] = useState<SalesGoal>({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  
  const monthRange = getCurrentMonthRange();
  const [filters, setFilters] = useState<FilterConfig>({ globalSearch: '', cliente: '', status: '', filial: '', representante: '', startDate: monthRange.start, endDate: monthRange.end });
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
    if (currentUser) {
        // Verifica se o módulo ativo ainda é válido para o usuário, senão redireciona
        const userModules = getAvailableModules();
        const hasAccess = userModules.some(m => m.id === activeModuleId);
        
        if (!hasAccess && userModules.length > 0) {
            setActiveModuleId(userModules[0].id);
        } else if (userModules.length > 0 && activeModuleId === '') {
            setActiveModuleId(userModules[0].id);
        }

        loadData();
    }
  }, [currentUser, activeModuleId]);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => { setNotification(prev => prev?.message === message ? null : prev); }, 5000);
  };

  const loadAppUsers = async () => { try { const users = await fetchAppUsers(); setAppUsers(users); } catch (e) {} };
  const loadGoals = async () => { try { const goals = await fetchSalesGoals(); setSalesGoals(goals); } catch (e) {} };
  const loadRepsForSelection = async () => { try { const data = await fetchAllRepresentatives(); setFullRepsList(data); } catch (e) {} };

  const loadData = async () => {
    if (!currentUser || activeModuleId === 'USERS' || activeModuleId === 'METAS' || activeModuleId === 'IA_CHAT') return;
    setLoading(true);
    try {
      const activeModule = MODULES.find(m => m.id === activeModuleId);
      const tableName = activeModule?.table || 'PEDIDOS_DETALHADOS';
      const repCode = currentUser?.is_admin ? undefined : currentUser?.rep_in_codigo;
      
      let filterToUse = activeModuleId;
      if (activeModuleId === 'CRM') filterToUse = ''; 
      if (activeModuleId === 'OVERVIEW') filterToUse = ''; // Traz tudo para o overview
      if (activeModuleId === 'PERFORMANCE' || activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') filterToUse = 'PD';
      
      const data = await fetchData('supabase', "", tableName, filterToUse);
      const filtered = repCode ? data.filter(d => Number(d.REP_IN_CODIGO) === Number(repCode)) : data;
      setSalesData(filtered);
      if (activeModuleId !== 'PERFORMANCE' && activeModuleId !== 'COMISSAO' && activeModuleId !== 'PAGAMENTOS' && activeModuleId !== 'CRM' && activeModuleId !== 'OVERVIEW') { generateColumns(filtered); }
    } catch (error) {} finally { setLoading(false); }
  };

  // ... (Handlers XML e Manual Edit omitidos para brevidade - inalterados) ...
  const handleXmlUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const newItems: PendingXmlItem[] = [];
    let processedCount = 0;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, "text/xml");
          const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
          const ide = xmlDoc.getElementsByTagName("ide")[0];
          const dest = xmlDoc.getElementsByTagName("dest")[0];
          const total = xmlDoc.getElementsByTagName("total")[0];
          const det = xmlDoc.getElementsByTagName("det")[0];
          
          if (infNFe && ide && dest) {
             const nNF = ide.getElementsByTagName("nNF")[0]?.textContent || "";
             const dhEmi = ide.getElementsByTagName("dhEmi")[0]?.textContent || ide.getElementsByTagName("dEmi")[0]?.textContent || "";
             const xNome = dest.getElementsByTagName("xNome")[0]?.textContent || "Cliente Desconhecido";
             const vProd = total?.getElementsByTagName("vProd")[0]?.textContent || "0";
             
             const productCode = det?.getElementsByTagName("cProd")[0]?.textContent || "";
             const productDescription = det?.getElementsByTagName("xProd")[0]?.textContent || "";
             
             const formattedDate = dhEmi.split('T')[0];
             newItems.push({
               tempId: Math.random().toString(36).substr(2, 9),
               nfeNumber: nNF, 
               emissionDate: formattedDate, 
               clientName: xNome,
               totalValue: parseFloat(vProd), 
               fileName: file.name, 
               orderNumber: "",
               saleDate: formattedDate, 
               repId: currentUser?.rep_in_codigo || null,
               productCode: productCode,
               productDescription: productDescription
             });
          }
        } catch (err) {} finally {
          processedCount++;
          if (processedCount === files.length) { setPendingXmls(prev => [...prev, ...newItems]); setShowXmlModal(true); event.target.value = ''; }
        }
      };
      reader.readAsText(file);
    });
  };

  const handleEditManual = (row: Sale) => {
     setPendingXmls([{
        tempId: Math.random().toString(36).substr(2, 9),
        nfeNumber: String(row.NF_NOT_IN_CODIGO || row.PRO_ST_ALTERNATIVO?.replace('NFE-', '')),
        emissionDate: row.NOT_DT_EMISSAO, 
        clientName: row.CLIENTE_NOME, 
        totalValue: parseBrNumber(row.ITP_RE_VALORMERCADORIA),
        orderNumber: String(row.PED_IN_CODIGO), 
        saleDate: row.PED_DT_EMISSAO, 
        repId: Number(row.REP_IN_CODIGO),
        productCode: row.PRO_ST_ALTERNATIVO || "",
        productDescription: row.ITP_ST_DESCRICAO || "",
        fileName: 'Edição de Lançamento', 
        isExisting: true
     }]);
     setShowXmlModal(true);
  };

  const handleDeleteManual = (row: Sale) => {
     setDeleteConfirmItem(row); 
  };

  const executeDeleteManual = async () => {
     if (!deleteConfirmItem) return;
     const row = deleteConfirmItem;
     setLoading(true);
     setDeleteConfirmItem(null);
     try {
        const keys = { fil: Number(row.FIL_IN_CODIGO), ser: String(row.SER_ST_CODIGO), ped: Number(row.PED_IN_CODIGO), seq: Number(row.ITP_IN_SEQUENCIA) };
        const result = await deleteSale(keys);
        if (result) {
          showNotification("Lançamento excluído com sucesso.", "success");
          loadData();
        } else {
          showNotification("Registro não encontrado ou já excluído.", "warning");
        }
     } catch (err: any) {
        showNotification("Erro ao excluir: " + err.message, "error");
     } finally {
        setLoading(false);
     }
  };

  const updatePendingItem = (id: string, field: keyof PendingXmlItem, value: any) => {
    setPendingXmls(prev => prev.map(item => item.tempId === id ? { ...item, [field]: value } : item));
  };

  const removePendingItem = (id: string) => { setPendingXmls(prev => prev.filter(item => item.tempId !== id)); };

  const confirmXmlImport = async () => {
     const invalid = pendingXmls.find(i => !i.orderNumber || !i.repId || !i.saleDate);
     if (invalid) { showNotification("Preencha Pedido, Data e Representante para todas as notas.", "error"); return; }
     setLoading(true);
     try {
       const orderSequenceMap = new Map<number, number>();

       const salesToSync: Sale[] = pendingXmls.map(item => {
          const repName = fullRepsList.find(r => r.code === item.repId)?.name || 'Rep Desconhecido';
          const orderId = parseInt(item.orderNumber);
          
          const currentSeq = orderSequenceMap.get(orderId) || 0;
          const nextSeq = currentSeq + 1;
          orderSequenceMap.set(orderId, nextSeq);

          return {
             "FIL_IN_CODIGO": 900, "FILIAL_NOME": "XML IMPORT", "SER_ST_CODIGO": "PD",
             "PED_IN_CODIGO": orderId, "ITP_IN_SEQUENCIA": nextSeq, 
             "CLI_IN_CODIGO": 99999, "CLIENTE_NOME": item.clientName.toUpperCase(),
             "PED_DT_EMISSAO": item.saleDate, "PED_CH_SITUACAO": "F", "PED_ST_STATUS": "FATURADO (XML)",
             "REP_IN_CODIGO": item.repId, "REPRESENTANTE_NOME": repName,
             "PRO_IN_CODIGO": 0, 
             "PRO_ST_ALTERNATIVO": item.productCode || ("NFE-" + item.nfeNumber),
             "ITP_ST_DESCRICAO": item.productDescription || `IMPORTAÇÃO XML NFE ${item.nfeNumber}`,
             "ITP_RE_QUANTIDADE": 1, "ITP_RE_VALORUNITARIO": item.totalValue, "ITP_RE_VALORMERCADORIA": item.totalValue,
             "ITP_ST_PEDIDOCLIENTE": "", "NF_NOT_IN_CODIGO": parseInt(item.nfeNumber),
             "NOT_DT_EMISSAO": item.emissionDate, "IPE_DT_DATAENTREGA": item.emissionDate
          };
       });
       const success = await syncSalesToSupabase(salesToSync);
       if (success) { showNotification(`${salesToSync.length} nota(s) processada(s) com sucesso!`, "success"); setPendingXmls([]); setShowXmlModal(false); setTimeout(() => loadData(), 500); }
       else { throw new Error("Erro ao salvar dados no Supabase."); }
     } catch (err: any) { showNotification("Erro ao salvar: " + err.message, "error"); } finally { setLoading(false); }
  };
  
  // ... (Sync Handlers e Auth omitidos para brevidade - inalterados) ...
  const handleManualSync = async () => {
    if (!pbiToken) return showNotification("Informe o token do Power BI.", "error");
    setSyncing(true);
    try {
      const activeModule = MODULES.find(m => m.id === activeModuleId);
      const tableName = activeModule?.table || 'PEDIDOS_DETALHADOS';
      await fetchData('powerbi', pbiToken, tableName, undefined);
      showNotification("Sincronização COMPLETA concluída!", "success");
      setShowTokenModal(false); setPbiToken(''); await Promise.all([loadData(), loadRepsForSelection()]);
    } catch (error: any) { showNotification("Erro na sincronização manual: " + error.message, "error"); } finally { setSyncing(false); }
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
        if (error.message.includes("CORS") || error.message.includes("Failed to fetch")) { setShowTokenModal(true); } 
        else { showNotification(`Erro Power BI: ${error.message}`, "error"); loadData(); }
    } finally { setSyncing(false); }
  };

  const handleTogglePayment = async (row: Sale) => {
    const keys = { fil: Number(row.FIL_IN_CODIGO), ser: String(row.SER_ST_CODIGO), ped: Number(row.PED_IN_CODIGO), seq: Number(row.ITP_IN_SEQUENCIA) };
    const newStatus = !row.COMISSAO_PAGA;
    const roleProp = `PAGO_${activeCommissionRole}`;
    setSalesData(prev => prev.map(item => { if (item.FIL_IN_CODIGO === keys.fil && item.SER_ST_CODIGO === keys.ser && item.PED_IN_CODIGO === keys.ped && item.ITP_IN_SEQUENCIA === keys.seq) { return { ...item, [roleProp]: newStatus }; } return item; }));
    try { await updateSaleCommissionStatus(keys, newStatus, roleProp); showNotification(newStatus ? "Pagamento confirmado!" : "Pagamento estornado.", "success"); } 
    catch (error: any) { setSalesData(prev => prev.map(item => { if (item.FIL_IN_CODIGO === keys.fil && item.SER_ST_CODIGO === keys.ser && item.PED_IN_CODIGO === keys.ped && item.ITP_IN_SEQUENCIA === keys.seq) { return { ...item, [roleProp]: !newStatus }; } return item; })); showNotification(`Erro: ${error.message}`, "error"); }
  };

  const generateColumns = (data: Sale[]) => {
    const savedLayout = localStorage.getItem(getSharedLayoutKey());
    const getFormatter = (key: string) => { if (key.includes('VALOR') || key.includes('VLMERCADORIA') || key.includes('PRECO')) return currencyFormat; if (key.includes('QUANTIDADE') || key.includes('QTD')) return numberFormat; if (key.includes('DT_EMISSAO') || key.includes('DATA')) return dateFormat; return (val: any) => String(val || '-'); };
    if (savedLayout) { try { const parsedLayout: ColumnConfig[] = JSON.parse(savedLayout); setSalesColumns(parsedLayout.map(col => ({ ...col, format: getFormatter(col.key) }))); return; } catch (e) {} }
    const defaultOrder = ["PED_IN_CODIGO", "FILIAL_NOME", "REPRESENTANTE_NOME", "PED_DT_EMISSAO", "CLIENTE_NOME", "PRO_ST_ALTERNATIVO", "ITP_ST_DESCRICAO", "ITP_RE_QUANTIDADE", "ITP_RE_VALORMERCADORIA", "PED_ST_STATUS"];
    const allPossibleKeys = ["SER_ST_CODIGO", "PED_IN_CODIGO", "CLI_IN_CODIGO", "CLIENTE_NOME", "FIL_IN_CODIGO", "FILIAL_NOME", "PED_DT_EMISSAO", "PED_CH_SITUACAO", "PED_ST_STATUS", "REP_IN_CODIGO", "REPRESENTANTE_NOME", "ITP_IN_SEQUENCIA", "ITP_ST_SITUACAO", "IT_ST_STATUS", "NF_NOT_IN_CODIGO", "NOT_DT_EMISSAO", "PRO_ST_ALTERNATIVO", "PRO_IN_CODIGO", "ITP_ST_DESCRICAO", "ITP_RE_QUANTIDADE", "ITP_RE_VALORUNITARIO", "ITP_RE_VALORMERCADORIA", "ITP_ST_PEDIDOCLIENTE", "IPE_DT_DATAENTREGA"];
    setSalesColumns(allPossibleKeys.map(key => ({ key, label: key.replace(/_/g, ' ').replace('ITP ST', '').replace('ITP RE', '').replace('PED RE', '').replace('PED ST', '').replace('IT ST', '').replace('IPE DT', '').replace('DT', 'DATA').trim(), visible: defaultOrder.includes(key), format: getFormatter(key) })));
  };

  const handleSaveGoal = async () => {
    if (!newGoal.rep_in_codigo || !newGoal.valor_meta) return showNotification("Preencha Representante e Valor.", "error");
    try { await upsertSalesGoal({ ...newGoal, id: editingGoalId || undefined }); showNotification("Meta salva com sucesso.", "success"); setNewGoal({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 }); setEditingGoalId(null); loadGoals(); } 
    catch (e: any) { showNotification(`Erro: ${e.message}`, "error"); }
  };

  const handleEditGoal = (goal: SalesGoal) => { setNewGoal({ rep_in_codigo: goal.rep_in_codigo, rep_nome: goal.rep_nome, ano: goal.ano, mes: goal.mes, valor_meta: goal.valor_meta }); setEditingGoalId(goal.id || null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleCancelEdit = () => { setNewGoal({ rep_in_codigo: 0, rep_nome: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, valor_meta: 0 }); setEditingGoalId(null); };

  const handleLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    const user = appUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword); 
    if (user) {
        setCurrentUser(user);
    } else {
        setLoginError("Acesso inválido."); 
    }
  };

  const handleEditUser = (user: AppUser) => {
    let initialModules = user.allowed_modules || [];
    if (!user.allowed_modules || user.allowed_modules.length === 0) {
        if (user.is_admin) {
            initialModules = MODULES.map(m => m.id);
        } else {
            initialModules = MODULES.filter(m => !m.adminOnly).map(m => m.id);
        }
    }
    setNewUser({ ...user, allowed_modules: initialModules });
  };

  const handleCancelEditUser = () => {
    setNewUser({ name: '', email: '', password: '', rep_in_codigo: null, is_admin: false, allowed_modules: [] });
  };

  const handleToggleModule = (moduleId: string) => {
      const currentModules = newUser.allowed_modules || [];
      if (currentModules.includes(moduleId)) {
          setNewUser({ ...newUser, allowed_modules: currentModules.filter(id => id !== moduleId) });
      } else {
          setNewUser({ ...newUser, allowed_modules: [...currentModules, moduleId] });
      }
  };

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return showNotification("Dados incompletos.", "error");
    try { 
      await upsertAppUser(newUser); 
      setNewUser({ name: '', email: '', password: '', rep_in_codigo: null, is_admin: false, allowed_modules: [] }); 
      loadAppUsers(); 
      showNotification(newUser.id ? "Acesso atualizado." : "Acesso criado.", "success"); 
    } 
    catch (e: any) { showNotification(e.message, "error"); }
  };

  const executeResetDatabase = async () => {
     setResetting(true);
     try {
        await deleteAllSales();
        showNotification("Banco de dados limpo com sucesso!", "success");
        setSalesData([]);
        setShowResetConfirm(false);
     } catch (err: any) {
        showNotification("Erro ao limpar banco: " + err.message, "error");
     } finally {
        setResetting(false);
     }
  };

  const handleColumnReorder = (fromIndex: number, toIndex: number) => { const newCols = [...salesColumns]; const [moved] = newCols.splice(fromIndex, 1); newCols.splice(toIndex, 0, moved); setSalesColumns(newCols); };
  const toggleColumnVisibility = (key: string) => { setSalesColumns(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col)); };
  const saveGlobalVision = () => { if (!currentUser) return; localStorage.setItem(getSharedLayoutKey(), JSON.stringify(salesColumns.map(({ key, label, visible }) => ({ key, label, visible })))); setLayoutSaved(true); setTimeout(() => setLayoutSaved(false), 2000); };

  const handleExportExcel = () => {
    let tableData = processedData; let tableCols = salesColumns;
    if (activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') { tableData = commissionData; tableCols = commissionColumns; }
    const visibleCols = tableCols.filter(c => c.visible);
    const dataToExport = tableData.map(row => { const newRow: Record<string, any> = {}; visibleCols.forEach(col => { if (col.key === 'CHECK_PAGAMENTO' || col.key === 'MANUAL_ACTIONS') return; newRow[col.label] = col.format ? col.format(row[col.key]) : row[col.key]; }); return newRow; });
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(dataToExport); const wscols = visibleCols.filter(c => c.key !== 'CHECK_PAGAMENTO' && c.key !== 'MANUAL_ACTIONS').map(() => ({ wch: 20 })); ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, `Relatório ${MODULES.find(m => m.id === activeModuleId)?.label}`); XLSX.writeFile(wb, `AirSales_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape'); let tableData = processedData; let tableCols = salesColumns;
    if (activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') { tableData = commissionData; tableCols = commissionColumns; }
    const visibleCols = tableCols.filter(c => c.visible && c.key !== 'CHECK_PAGAMENTO' && c.key !== 'MANUAL_ACTIONS');
    const tableColumn = visibleCols.map(c => c.label);
    const tableRows = tableData.map(row => { return visibleCols.map(col => { return col.format ? col.format(row[col.key]) : String(row[col.key] || ''); }); });
    doc.setFontSize(10); doc.text(`Relatório Air Sales - ${MODULES.find(m => m.id === activeModuleId)?.label}`, 14, 15); doc.setFontSize(8); doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 20);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 60, styles: { fontSize: 6, cellPadding: 1 }, headStyles: { fillColor: [26, 33, 48] }, });
    doc.save(`AirSales_Export_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const handleGenerateAIInsights = async () => {
    setAiLoading(true);
    setAiInsights(null);
    setShowAIModal(true);
    setTimeout(async () => {
      const activeModule = MODULES.find(m => m.id === activeModuleId)?.label || activeModuleId;
      const dataToAnalyze = (activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') ? commissionData : processedData;
      const insight = await generateSalesInsights(dataToAnalyze, activeModule, metrics);
      setAiInsights(insight);
      setAiLoading(false);
    }, 500);
  };

  const availableReps = useMemo(() => { if (currentUser && !currentUser?.is_admin && currentUser?.rep_in_codigo) return fullRepsList.filter(r => r.code === currentUser.rep_in_codigo); return fullRepsList; }, [fullRepsList, currentUser]);
  const availableStatuses = useMemo(() => { const set = new Set<string>(); salesData.forEach(s => { const status = String(s.PED_ST_STATUS || s.SITUACAO || ''); if (status) set.add(status.toUpperCase()); }); return Array.from(set).sort(); }, [salesData]);
  const availableFiliais = useMemo(() => { const set = new Set<string>(); salesData.forEach(s => { const filial = String(s.FILIAL_NOME || ''); if (filial) set.add(filial.toUpperCase()); }); return Array.from(set).sort(); }, [salesData]);
  const filteredGoals = useMemo(() => { let goals = [...salesGoals]; if (newGoal.rep_in_codigo !== 0 && !editingGoalId) goals = goals.filter(g => g.rep_in_codigo === newGoal.rep_in_codigo); return goals.sort((a, b) => (a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)); }, [salesGoals, newGoal.rep_in_codigo, editingGoalId]);
  const totalGoalsFiltered = useMemo(() => filteredGoals.reduce((acc, curr) => acc + curr.valor_meta, 0), [filteredGoals]);

  const processedData = useMemo(() => {
    let result = [...salesData];
    if (activeModuleId === 'PD') { result = result.filter(item => Number(item.FIL_IN_CODIGO) !== 900); }
    if (filters.globalSearch) { const s = filters.globalSearch.toLowerCase(); result = result.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(s))); }
    if (filters.cliente) { const c = filters.cliente.toLowerCase(); result = result.filter(item => String(item.CLIENTE_NOME || '').toLowerCase().includes(c)); }
    const isPaymentModule = activeModuleId === 'PAGAMENTOS'; const isCommissionModule = activeModuleId === 'COMISSAO';
    const dateFilterField = ((isPaymentModule || isCommissionModule) && commissionViewMode === 'FATURADO') ? 'NOT_DT_EMISSAO' : 'PED_DT_EMISSAO';
    if (filters.startDate) result = result.filter(item => (item[dateFilterField] || '') >= filters.startDate!);
    if (filters.endDate) result = result.filter(item => (item[dateFilterField] || '') <= filters.endDate!);
    if (filters.representante) result = result.filter(item => String(item.REP_IN_CODIGO) === filters.representante);
    if (filters.status) result = result.filter(item => String(item.PED_ST_STATUS || item.SITUACAO || '').toUpperCase() === filters.status.toUpperCase());
    if (filters.filial) result = result.filter(item => String(item.FILIAL_NOME || '').toUpperCase() === filters.filial.toUpperCase());
    if (sortConfig) { result.sort((a, b) => { let valA = a[sortConfig.key], valB = b[sortConfig.key]; if (sortConfig.key.includes('VALOR') || sortConfig.key.includes('VLMERCADORIA')) { valA = parseBrNumber(valA); valB = parseBrNumber(valB); } if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); }
    return result;
  }, [salesData, filters, sortConfig, activeModuleId, commissionViewMode]);

  // Novo Memo para Overview Data (Todos os dados, mas com filtros aplicados exceto data)
  const overviewData = useMemo(() => {
    let result = [...salesData];
    // Aplica filtros exceto data
    if (filters.globalSearch) { const s = filters.globalSearch.toLowerCase(); result = result.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(s))); }
    if (filters.cliente) { const c = filters.cliente.toLowerCase(); result = result.filter(item => String(item.CLIENTE_NOME || '').toLowerCase().includes(c)); }
    if (filters.representante) result = result.filter(item => String(item.REP_IN_CODIGO) === filters.representante);
    if (filters.status) result = result.filter(item => String(item.PED_ST_STATUS || item.SITUACAO || '').toUpperCase() === filters.status.toUpperCase());
    if (filters.filial) result = result.filter(item => String(item.FILIAL_NOME || '').toUpperCase() === filters.filial.toUpperCase());
    
    return result;
  }, [salesData, filters.globalSearch, filters.cliente, filters.representante, filters.status, filters.filial]);

  const commissionData = useMemo(() => {
    const monthlyMetrics = new Map<string, number>();
    salesData.forEach(sale => { const dt = sale['PED_DT_EMISSAO']; if (!dt) return; const d = new Date(dt); const year = d.getFullYear(); const month = d.getMonth() + 1; const repCode = Number(sale['REP_IN_CODIGO']); const val = parseBrNumber(sale['ITP_RE_VALORMERCADORIA']); const globalKey = `${year}-${month}-GLOBAL`; monthlyMetrics.set(globalKey, (monthlyMetrics.get(globalKey) || 0) + val); if (repCode) { const repKey = `${year}-${month}-${repCode}`; monthlyMetrics.set(repKey, (monthlyMetrics.get(repKey) || 0) + val); } });
    const getGoalContext = (emissionDateStr: string, repCode: number) => { if (!emissionDateStr) return { goal: 0, realized: 0, percent: 0 }; const d = new Date(emissionDateStr); const year = d.getFullYear(); const month = d.getMonth() + 1; if (activeCommissionRole === 'GERENTE') { const globalKey = `${year}-${month}-GLOBAL`; const realized = monthlyMetrics.get(globalKey) || 0; const goal = salesGoals.filter(g => g.ano === year && g.mes === month).reduce((acc, curr) => acc + curr.valor_meta, 0); return { goal, realized, percent: goal > 0 ? realized / goal : 0 }; } else { const repKey = `${year}-${month}-${repCode}`; const realized = monthlyMetrics.get(repKey) || 0; const goalObj = salesGoals.find(g => g.ano === year && g.mes === month && g.rep_in_codigo === repCode); const goal = goalObj?.valor_meta || 0; return { goal, realized, percent: goal > 0 ? realized / goal : 0 }; } };
    const isPaymentModule = activeModuleId === 'PAGAMENTOS'; const isCommissionModule = activeModuleId === 'COMISSAO';
    let dataToUse = processedData;
    if (activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS' || activeModuleId === 'OVERVIEW') { dataToUse = salesData; }
    let filteredByMode = dataToUse.filter(item => { 
        if (activeModuleId === 'OVERVIEW') return !String(item.PED_ST_STATUS || '').includes('CANCEL');
        const status = String(item.PED_ST_STATUS || '').toUpperCase(); const hasInvoice = !!item.NOT_DT_EMISSAO; 
        if (isPaymentModule) { if (commissionViewMode === 'FATURADO') return status.includes('FATURADO') || hasInvoice; return !status.includes('FATURADO') && !hasInvoice && !status.includes('CANCEL'); } 
        if (commissionViewMode === 'FATURADO') { return status.includes('FATURADO') || hasInvoice; } return !status.includes('FATURADO') && !hasInvoice && !status.includes('CANCEL'); 
    });
    if ((isCommissionModule || isPaymentModule) && filterOnlyManual) { filteredByMode = filteredByMode.filter(item => Number(item.FIL_IN_CODIGO) === 900); }
    return filteredByMode.map(item => { const valMercadoria = parseBrNumber(item['ITP_RE_VALORMERCADORIA']); const repCode = Number(item['REP_IN_CODIGO']); const emissionDate = item['PED_DT_EMISSAO']; let percentual = 0; let atingimentoMeta = 0; if (String(item.PED_ST_STATUS).toUpperCase().includes('CANCEL')) { return { ...item, PERCENTUAL_COMISSAO: 0, VALOR_COMISSAO: 0, ATINGIMENTO_META_ORIGEM: 0 }; } if (activeCommissionRole === 'ASSISTENTE') { percentual = 0.0005; } else { const { percent } = getGoalContext(emissionDate, repCode); atingimentoMeta = percent; if (activeCommissionRole === 'GERENTE') { percentual = percent <= 0.85 ? 0.0035 : 0.0050; } else if (activeCommissionRole === 'SUPERVISOR' || activeCommissionRole === 'POSVENDA') { percentual = percent <= 0.85 ? 0.0015 : 0.0025; } else if (activeCommissionRole === 'VENDEDOR') { if (percent <= 0.65) percentual = 0.01; else if (percent <= 0.85) percentual = 0.015; else percentual = 0.02; } } const valorComissao = valMercadoria * percentual; const rolePaymentKey = `PAGO_${activeCommissionRole}`; const isPaid = !!item[rolePaymentKey]; return { ...item, PERCENTUAL_COMISSAO: percentual, VALOR_COMISSAO: valorComissao, ATINGIMENTO_META_ORIGEM: atingimentoMeta, COMISSAO_PAGA: isPaid }; });
  }, [processedData, activeCommissionRole, commissionViewMode, salesGoals, salesData, activeModuleId, filterOnlyManual]);

  const commissionColumns = useMemo<ColumnConfig[]>(() => {
    const cols: ColumnConfig[] = [ 
      { key: 'MANUAL_ACTIONS', label: 'AÇÕES', visible: true }, 
      { key: 'NOT_DT_EMISSAO', label: 'DT FATURAMENTO', visible: true, format: dateFormat }, 
      { key: 'NF_NOT_IN_CODIGO', label: 'NOTA FISCAL', visible: true }, 
      { key: 'PED_IN_CODIGO', label: 'PEDIDO', visible: true }, 
      { key: 'CLIENTE_NOME', label: 'CLIENTE', visible: true }, 
      { key: 'PRO_ST_ALTERNATIVO', label: 'CÓD. ALTERNATIVO', visible: true }, 
      { key: 'ITP_ST_DESCRICAO', label: 'DESCRIÇÃO', visible: true },
      { key: 'REPRESENTANTE_NOME', label: 'REPRESENTANTE', visible: true }, 
      { key: 'ITP_RE_VALORMERCADORIA', label: 'VALOR VENDA', visible: true, format: currencyFormat }, 
      { key: 'PED_DT_EMISSAO', label: 'DT VENDA', visible: true, format: dateFormat }, 
    ];
    if (activeCommissionRole !== 'ASSISTENTE') { cols.push({ key: 'ATINGIMENTO_META_ORIGEM', label: '% META (MÊS VENDA)', visible: true, format: percentFormat }); }
    cols.push( { key: 'PERCENTUAL_COMISSAO', label: '% COMISSÃO', visible: true, format: percentFormat }, { key: 'VALOR_COMISSAO', label: 'R$ COMISSÃO', visible: true, format: currencyFormat }, );
    if (activeModuleId === 'PAGAMENTOS') { cols.unshift({ key: 'CHECK_PAGAMENTO', label: 'PAGO?', visible: true }); } else { cols.push({ key: 'PED_ST_STATUS', label: 'STATUS', visible: true }); }
    return cols;
  }, [activeCommissionRole, activeModuleId]);

  const metrics = useMemo(() => {
    let total = 0, faturado = 0, emAprovacao = 0, emAberto = 0;
    const sourceData = (activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') ? commissionData : processedData;
    sourceData.forEach(d => { const v = parseBrNumber(d['ITP_RE_VALORMERCADORIA'] || 0); const s = String(d.PED_ST_STATUS || '').toLowerCase(); const hasInvoice = (d['NOT_DT_EMISSAO'] && d['NOT_DT_EMISSAO'] !== '') || (d['NF_NOT_IN_CODIGO'] && Number(d['NF_NOT_IN_CODIGO']) > 0); total += v; if (s.includes('faturado') || hasInvoice) { faturado += v; } if (s.includes('aprov')) emAprovacao += v; if (s.includes('aberto') && !hasInvoice && !s.includes('faturado')) { emAberto += v; } });
    let currentGoalValue = 0; if (filters.startDate && filters.endDate) { const [startYear, startMonth] = filters.startDate.split('-').map(Number); const [endYear, endMonth] = filters.endDate.split('-').map(Number); const startAbs = startYear * 12 + startMonth; const endAbs = endYear * 12 + endMonth; const targetGoals = salesGoals.filter(g => { const goalAbs = g.ano * 12 + g.mes; const inRange = goalAbs >= startAbs && goalAbs <= endAbs; const repMatch = filters.representante ? String(g.rep_in_codigo) === filters.representante : true; return inRange && repMatch; }); currentGoalValue = targetGoals.reduce((acc, curr) => acc + curr.valor_meta, 0); }
    const achievement = currentGoalValue > 0 ? (total / currentGoalValue) * 100 : 0; const uniqueOrders = new Set(sourceData.map(d => `${d.FIL_IN_CODIGO}-${d.SER_ST_CODIGO}-${d.PED_IN_CODIGO}`)).size;
    return { total, faturado, emAprovacao, emAberto, count: uniqueOrders, goal: currentGoalValue, achievement };
  }, [processedData, commissionData, salesGoals, filters.startDate, filters.endDate, filters.representante, activeModuleId]);

  // ... (Demais Memos omitidos para brevidade - inalterados) ...
  const paymentMetrics = useMemo(() => { if (activeModuleId !== 'PAGAMENTOS') return { toPay: 0, paid: 0, projected: 0 }; let toPay = 0; let paid = 0; let projected = 0; commissionData.forEach((d: any) => { const val = d.VALOR_COMISSAO || 0; const status = String(d.PED_ST_STATUS || '').toUpperCase(); const hasInvoice = !!d.NOT_DT_EMISSAO; const isRealized = status.includes('FATURADO') || hasInvoice; if (isRealized) { if (d.COMISSAO_PAGA) { paid += val; } else { toPay += val; } } else { if (!status.includes('CANCEL')) { projected += val; } } }); return { toPay, paid, projected }; }, [commissionData, activeModuleId]);
  const performanceData = useMemo(() => { const relevantGoals = salesGoals.filter(g => g.ano === perfYear && g.mes === perfMonth); const relevantSales = salesData.filter(s => { if (!s.PED_DT_EMISSAO) return false; const dt = new Date(s.PED_DT_EMISSAO); return dt.getFullYear() === perfYear && (dt.getMonth() + 1) === perfMonth; }); const repMap = new Map(); relevantGoals.forEach(g => { const current = repMap.get(g.rep_in_codigo) || { name: g.rep_nome, goal: 0, realized: 0 }; current.goal += g.valor_meta; current.name = g.rep_nome; repMap.set(g.rep_in_codigo, current); }); relevantSales.forEach(s => { const code = Number(s.REP_IN_CODIGO); if (!code) return; const val = parseBrNumber(s['ITP_RE_VALORMERCADORIA'] || 0); const current = repMap.get(code) || { name: s.REPRESENTANTE_NOME, goal: 0, realized: 0 }; current.realized += val; if (!current.name && s.REPRESENTANTE_NOME) current.name = s.REPRESENTANTE_NOME; repMap.set(code, current); }); let result = Array.from(repMap.entries()).map(([code, data]) => ({ code, name: data.name || `Rep ${code}`, goal: data.goal, realized: data.realized, percent: data.goal > 0 ? (data.realized / data.goal) * 100 : 0 })); if (!currentUser?.is_admin && currentUser?.rep_in_codigo) result = result.filter(r => r.code === currentUser.rep_in_codigo); else if (perfSelectedReps.length > 0) result = result.filter(r => perfSelectedReps.includes(r.code)); return result.sort((a, b) => b.percent - a.percent); }, [salesGoals, salesData, perfYear, perfMonth, currentUser, perfSelectedReps]);
  const perfMetrics = useMemo(() => { const totalGoal = performanceData.reduce((acc, curr) => acc + curr.goal, 0); const totalRealized = performanceData.reduce((acc, curr) => acc + curr.realized, 0); const totalPercent = totalGoal > 0 ? (totalRealized / totalGoal) * 100 : 0; return { totalGoal, totalRealized, totalPercent }; }, [performanceData]);
  const togglePerfRepSelection = (repCode: number) => { setPerfSelectedReps(prev => prev.includes(repCode) ? prev.filter(c => c !== repCode) : [...prev, repCode]); };
  const clearFilters = () => { const range = getCurrentMonthRange(); setFilters({ globalSearch: '', cliente: '', status: '', filial: '', representante: currentUser?.is_admin ? '' : String(currentUser?.rep_in_codigo || ''), startDate: range.start, endDate: range.end }); setFilterOnlyManual(false); };

  const getAvailableModules = () => { if (!currentUser) return []; if (currentUser.is_admin) { if (currentUser.allowed_modules && currentUser.allowed_modules.length > 0) { return MODULES.filter(m => currentUser.allowed_modules?.includes(m.id)); } return MODULES; } if (currentUser.allowed_modules && currentUser.allowed_modules.length > 0) { return MODULES.filter(m => currentUser.allowed_modules?.includes(m.id)); } return MODULES.filter(m => !m.adminOnly); };
  const visibleModules = getAvailableModules();

  if (!currentUser) { return ( <div className="h-screen w-screen bg-gray-900 flex items-center justify-center p-4"> <div className="w-full max-w-md bg-white border border-gray-200 shadow-2xl"> <div className="p-8 border-b border-gray-100 bg-gray-50 flex items-center gap-4"> <div className="w-12 h-12 bg-gray-900 flex items-center justify-center text-white font-bold text-xl">AS</div> <div> <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">AIR SALES</h1> <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analytics 4.0</p> </div> </div> <form onSubmit={handleLogin} className="p-10 space-y-6"> {loginError && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-[11px] font-bold text-red-600">{loginError}</div>} <div className="space-y-4"> <input type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-sm focus:border-gray-900 outline-none" placeholder="E-mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} /> <input type="password" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-sm focus:border-gray-900 outline-none" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} /> </div> <button type="submit" className="w-full py-4 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-black">Acessar Painel</button> </form> </div> </div> ); }

  return ( 
    <div className="flex h-screen w-screen bg-gray-100 font-sans text-gray-900 overflow-hidden"> 
      {/* ... (Modais omitidos - inalterados) ... */}
      <AIInsightsModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} isLoading={aiLoading} insights={aiInsights} onGenerate={handleGenerateAIInsights} contextName={MODULES.find(m => m.id === activeModuleId)?.label || activeModuleId} />
      {notification && ( <div className={`fixed top-4 right-4 z-[150] bg-white border-l-4 shadow-xl p-4 rounded-r flex items-center gap-3 transition-all duration-300 transform translate-x-0 opacity-100 max-w-sm ${notification.type === 'success' ? 'border-green-600' : notification.type === 'warning' ? 'border-amber-500' : 'border-red-600'}`}> <div className={`p-1 rounded-full ${notification.type === 'success' ? 'bg-green-100' : notification.type === 'warning' ? 'bg-amber-100' : 'bg-red-100'}`}>{notification.type === 'success' ? <CheckCircle2 size={16} className="text-green-600"/> : notification.type === 'warning' ? <AlertCircle size={16} className="text-amber-600"/> : <AlertCircle size={16} className="text-red-600"/>}</div> <div><h4 className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${notification.type === 'success' ? 'text-green-800' : notification.type === 'warning' ? 'text-amber-800' : 'text-red-800'}`}>{notification.type === 'success' ? 'Sucesso' : 'Erro'}</h4><p className="text-[10px] font-medium text-gray-600 leading-tight break-words">{notification.message}</p></div> <button onClick={() => setNotification(null)} className="ml-auto text-gray-400 hover:text-gray-900"><X size={12}/></button> </div> )} 
      {/* ... (Modais de Reset/Danger omitidos - inalterados) ... */}
      {showResetConfirm && ( <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"> <div className="bg-white w-full max-w-sm shadow-2xl border border-red-200 overflow-hidden animate-in zoom-in-95 duration-200 rounded-sm"> <div className="p-6 text-center"> <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"> <AlertTriangle size={24} /> </div> <h3 className="text-sm font-black uppercase tracking-widest text-red-600 mb-2">Atenção: Ação Destrutiva</h3> <p className="text-[11px] text-gray-600 font-medium leading-relaxed px-4 mb-4"> Você está prestes a <strong>EXCLUIR TODAS AS VENDAS</strong> do banco de dados. Isso removerá Orçamentos, Pedidos e Histórico. </p> <p className="text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-100 font-mono"> Esta ação não pode ser desfeita. </p> </div> <div className="flex border-t border-gray-100"> <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">Cancelar</button> <button onClick={executeResetDatabase} disabled={resetting} className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-colors shadow-inner flex items-center justify-center gap-2"> {resetting ? <RefreshCw size={12} className="animate-spin"/> : <Trash2 size={12}/>} Confirmar Limpeza </button> </div> </div> </div> )}
      {deleteConfirmItem && ( <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"> <div className="bg-white w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 rounded-sm"> <div className="p-6 text-center"> <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"> <AlertTriangle size={24} /> </div> <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-2">Excluir Lançamento?</h3> <p className="text-[10px] text-gray-500 font-medium leading-relaxed px-4"> Deseja realmente excluir permanentemente o pedido <strong>{deleteConfirmItem.PED_IN_CODIGO}</strong> do cliente <strong>{deleteConfirmItem.CLIENTE_NOME}</strong>? </p> </div> <div className="flex border-t border-gray-100"> <button onClick={() => setDeleteConfirmItem(null)} className="flex-1 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors">Cancelar</button> <button onClick={executeDeleteManual} className="flex-1 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-colors shadow-inner">Confirmar Exclusão</button> </div> </div> </div> )}
      {showXmlModal && ( <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"> <div className="bg-white w-full max-w-4xl max-h-[90vh] shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm"> <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0"> <div className="flex items-center gap-3"> <FileUp className="text-green-600" size={20} /> <div> <h3 className="text-xs font-bold uppercase tracking-widest">{pendingXmls[0]?.isExisting ? 'Editar Lançamento Manual' : 'Importação de NFe (XML)'}</h3> <p className="text-[9px] text-gray-500 font-medium">Preencha os dados faltantes para calcular as comissões</p> </div> </div> <button onClick={() => {setShowXmlModal(false); setPendingXmls([]);}} className="text-gray-400 hover:text-red-500"><X size={18}/></button> </div> <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-100 space-y-3"> {pendingXmls.map(item => ( <div key={item.tempId} className="bg-white border border-gray-200 p-3 shadow-sm rounded-sm flex flex-col md:flex-row gap-4 items-start animate-in slide-in-from-bottom-2"> <div className="flex-1 min-w-[200px]"> <div className="flex items-center gap-2 mb-1"> <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-sm uppercase tracking-widest">NFe {item.nfeNumber}</span> <span className="text-[9px] text-gray-400">{item.fileName}</span> </div> <h4 className="text-xs font-bold text-gray-900 truncate">{item.clientName}</h4> <div className="mt-1 text-[10px] font-mono font-medium text-gray-600">Total: {currencyFormat(item.totalValue)}</div> </div> <div className="flex items-end gap-2 flex-wrap"> <div className="w-24"> <label className="text-[8px] font-black uppercase text-gray-400 block mb-0.5">Nº Pedido *</label> <input type="text" className={`w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900 ${!item.orderNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} placeholder="000" value={item.orderNumber} onChange={(e) => updatePendingItem(item.tempId, 'orderNumber', e.target.value)} /> </div> <div className="w-28"> <label className="text-[8px] font-black uppercase text-gray-400 block mb-0.5">Data Venda *</label> <input type="date" className={`w-full px-2 py-1.5 bg-gray-50 border text-[9px] outline-none focus:border-gray-900 ${!item.saleDate ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} value={item.saleDate} onChange={(e) => updatePendingItem(item.tempId, 'saleDate', e.target.value)} /> </div> <div className="w-48"> <label className="text-[8px] font-black uppercase text-gray-400 block mb-0.5">Representante *</label> <select className={`w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900 ${!item.repId ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} value={item.repId || ''} onChange={(e) => updatePendingItem(item.tempId, 'repId', Number(e.target.value))} > <option value="">Selecione...</option> {fullRepsList.map(r => <option key={r.code} value={r.code}>{r.name}</option>)} </select> </div> {!item.isExisting && ( <button onClick={() => removePendingItem(item.tempId)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"><Trash2 size={14}/></button> )} </div> </div> ))} </div> <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0"> <button onClick={() => {setShowXmlModal(false); setPendingXmls([]);}} className="px-4 py-2 border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors">Cancelar</button> <button onClick={confirmXmlImport} disabled={loading} className="px-6 py-2 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg"> {loading ? <RefreshCw size={14} className="animate-spin"/> : <CheckSquare size={14} />} {pendingXmls[0]?.isExisting ? 'Salvar Alterações' : 'Confirmar Importação'} </button> </div> </div> </div> )}
      {showTokenModal && ( <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"> <div className="bg-white w-full max-md shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200"> <div className="p-6 border-b bg-gray-50 flex justify-between items-center"> <div className="flex items-center gap-3"><Globe className="text-blue-600" size={20} /><h3 className="text-xs font-bold uppercase tracking-widest">Sincronizar Power BI</h3></div> <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-red-500"><X size={18}/></button> </div> <div className="p-8 space-y-6"> <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400">Bearer Token de Acesso</label><textarea className="w-full p-4 bg-gray-50 border border-gray-200 text-xs font-mono min-h-[120px] outline-none focus:border-gray-900 transition-colors" placeholder="Cole aqui o token gerado no Power BI API..." value={pbiToken} onChange={e => setPbiToken(e.target.value)} autoFocus /></div> <div className="flex flex-col gap-3"><button onClick={handleManualSync} disabled={syncing} className="w-full py-4 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center justify-center gap-3 transition-all disabled:opacity-50">{syncing ? <RefreshCw size={14} className="animate-spin" /> : <DatabaseZap size={14} />}{syncing ? 'Processando Sincronização...' : 'Iniciar Sincronização TOTAL'}</button><button onClick={loadData} className="w-full py-3 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">Apenas Atualizar Visualização Local</button></div> </div> </div> </div> )} 
      
      {/* ... (Sidebar e outros elementos omitidos - inalterados) ... */}
      <aside className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 z-30 flex-shrink-0 ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 shadow-2xl w-64 translate-x-0' : 'hidden lg:flex relative'} ${!mobileSidebarOpen && sidebarOpen ? 'w-56' : ''} ${!mobileSidebarOpen && !sidebarOpen ? 'w-16' : ''} `}> 
        <div className="h-12 flex items-center px-4 border-b border-gray-100 bg-gray-50 shrink-0"><div className="flex items-center gap-2 text-gray-900"><Hexagon size={20}/><span className={`font-bold uppercase text-xs transition-opacity duration-200 ${!sidebarOpen && !mobileSidebarOpen ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>AIR SALES</span></div></div> 
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar"> 
          {visibleModules.map(m => ( <button key={m.id} onClick={() => { setActiveModuleId(m.id); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all rounded-sm whitespace-nowrap ${activeModuleId === m.id ? 'bg-[#1a2130] text-white' : 'text-gray-500 hover:bg-gray-50'} ${!sidebarOpen && !mobileSidebarOpen ? 'justify-center' : ''}`} title={!sidebarOpen && !mobileSidebarOpen ? m.label : ''} > <m.icon size={16} className="shrink-0" /> {(sidebarOpen || mobileSidebarOpen) && <span className="text-[10px] uppercase font-semibold">{m.label}</span>} </button> ))} 
        </nav> 
        <div className="p-3 border-t border-gray-100 shrink-0"> 
          {(sidebarOpen || mobileSidebarOpen) && ( <div className="px-3 py-2 mb-1"> <p className="text-[9px] font-bold text-gray-400 uppercase">Usuário</p> <div className="flex items-center gap-2 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div><p className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]">{currentUser?.name}</p></div> </div> )} 
          <button onClick={() => { setCurrentUser(null); setLoginEmail(''); setLoginPassword(''); }} className={`w-full flex items-center gap-2 p-2 text-gray-400 hover:text-red-600 text-[10px] font-bold uppercase ${!sidebarOpen && !mobileSidebarOpen ? 'justify-center' : ''}`}><LogOut size={14} />{(sidebarOpen || mobileSidebarOpen) && 'Sair'}</button> 
        </div> 
      </aside> 
      {mobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />} 
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative"> 
        {/* Header */}
        <header className="h-12 bg-white border-b border-gray-200 px-4 flex justify-between items-center shrink-0 z-10 shadow-sm"> 
          <div className="flex items-center gap-4"> 
            <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="lg:hidden"><Menu size={18}/></button> 
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block"><Menu size={18}/></button> 
            <h2 className="text-[10px] font-bold uppercase tracking-widest truncate">{MODULES.find(m => m.id === activeModuleId)?.label}</h2> 
          </div> 
          <div className="flex items-center gap-2">
            {activeModuleId !== 'METAS' && activeModuleId !== 'USERS' && activeModuleId !== 'IA_CHAT' && activeModuleId !== 'CRM' && activeModuleId !== 'OVERVIEW' && (
              <>
                 <button onClick={handleGenerateAIInsights} className="px-3 py-1.5 bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 text-[9px] font-bold uppercase tracking-widest hover:brightness-105 flex items-center gap-2 transition-all active:scale-95 shadow-lg border border-amber-300">
                    <Sparkles size={12} />
                    <span className="hidden sm:inline">IA Insights</span>
                 </button>
                 <button onClick={handleAutomatedSync} className="px-3 py-1.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all active:scale-95 shadow-lg">
                    <RefreshCw size={12} className={loading || syncing ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Atualizar Base</span>
                 </button>
              </>
            )}
          </div>
        </header> 
        
        <main className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4 w-full"> 
          {/* Renderização Condicional dos Módulos */}
          {activeModuleId === 'OVERVIEW' ? (
             <Overview 
                user={currentUser} 
                salesData={overviewData} // Usamos dados SEM filtro de data global, para que o componente calcule "faturado" por data de nota
                commissionData={commissionData}
                goals={salesGoals}
                metrics={metrics}
                availableReps={availableReps}
                currentRep={filters.representante || ''}
                onRepChange={(val) => setFilters(prev => ({ ...prev, representante: val }))}
                dateRange={{ start: filters.startDate || '', end: filters.endDate || '' }}
                onDateRangeChange={(start, end) => setFilters(prev => ({ ...prev, startDate: start, endDate: end }))}
             />
          ) : activeModuleId === 'IA_CHAT' ? (
             <AIChatView 
                salesData={activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS' ? commissionData : processedData} 
                metrics={metrics} 
             />
          ) : activeModuleId === 'CRM' ? (
             <CRMView data={processedData} salesData={salesData} onRefresh={loadData} />
          ) : activeModuleId === 'METAS' ? ( 
             // ... (Conteúdo de Metas - Inalterado) ...
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
                <div className="p-3 bg-gray-50 border-b flex justify-between items-center"><div className="flex flex-col"><span className="text-[10px] font-bold uppercase text-gray-500">Metas Registradas</span></div><div className="relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 text-[10px] outline-none" placeholder="Busca rápida..."/></div></div> 
                {(newGoal.rep_in_codigo !== 0 || filteredGoals.length > 0) && (<div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1"><div className="flex items-center gap-2"><Calculator size={14} className="text-blue-600" /><span className="text-[9px] font-bold uppercase tracking-widest text-blue-800">Total Definido</span></div><span className="text-sm font-bold text-blue-900 font-mono tracking-tight">{currencyFormat(totalGoalsFiltered)}</span></div>)} 
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar"><table className="w-full text-[10px]"><thead className="bg-gray-50 border-b sticky top-0 z-10"><tr className="text-gray-400 uppercase font-bold text-[8px]"><th className="px-4 py-2 text-left bg-gray-50">Representante</th><th className="px-4 py-2 text-center bg-gray-50">Período</th><th className="px-4 py-2 text-right bg-gray-50">Valor Meta</th><th className="px-4 py-2 text-center bg-gray-50">Ações</th></tr></thead><tbody className="divide-y">{filteredGoals.length === 0 ? (<tr><td colSpan={4} className="p-4 text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">Nenhum registro para este filtro</td></tr>) : (filteredGoals.map(g => (<tr key={g.id} className={`hover:bg-gray-50 transition-colors group ${editingGoalId === g.id ? 'bg-amber-50' : ''}`}><td className="px-4 py-2"><strong>{g.rep_nome}</strong><br/><span className="text-[8px] text-gray-400">COD: {g.rep_in_codigo}</span></td><td className="px-4 py-2 text-center font-bold text-gray-600">{MONTHS.find(m => m.id === g.mes)?.label} / {g.ano}</td><td className="px-4 py-2 text-right font-mono font-bold text-gray-900">{currencyFormat(g.valor_meta)}</td><td className="px-4 py-2 text-center"><div className="flex items-center justify-center gap-3"><button onClick={() => handleEditGoal(g)} className={`transition-colors ${editingGoalId === g.id ? 'text-amber-600' : 'text-gray-300 hover:text-blue-600'}`} title="Editar meta"><Edit2 size={14}/></button><button onClick={async () => { if(confirm('Tem certeza que deseja remover esta meta permanentemente?')) { await deleteSalesGoal(g.id!); loadGoals(); } }} className="text-gray-200 hover:text-red-500 transition-colors" title="Excluir meta"><Trash2 size={14}/></button></div></td></tr>)))}</tbody></table></div> 
              </div> 
            </div> 
          ) : activeModuleId === 'PERFORMANCE' ? ( 
             // ... (Conteúdo Performance - Inalterado) ...
             <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full overflow-y-auto custom-scrollbar"> 
              <div className="bg-white border border-gray-200 p-3 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between sticky top-0 z-10"> 
                <div className="flex items-center gap-2"><div className="p-2 bg-gray-900 text-white"><BarChart3 size={16}/></div><div><h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-900">Relatório de Atingimento</h3><p className="text-[9px] text-gray-500 font-medium">Comparativo Meta x Realizado (Pedidos)</p></div></div> 
                <div className="flex items-center gap-2 w-full sm:w-auto">{currentUser?.is_admin && (<div className="flex-1 sm:w-56 relative" ref={perfRepSelectorRef}><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter block mb-0.5">Filtrar Representantes</label><button onClick={() => setShowPerfRepSelector(!showPerfRepSelector)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] font-bold flex items-center justify-between hover:border-gray-400 transition-colors outline-none"><span className="truncate">{perfSelectedReps.length === 0 ? 'Todos os Representantes' : perfSelectedReps.length === 1 ? availableReps.find(r => r.code === perfSelectedReps[0])?.name || '1 Selecionado' : `${perfSelectedReps.length} Selecionados`}</span><ChevronDown size={12} className="text-gray-500"/></button>{showPerfRepSelector && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar rounded-sm animate-in fade-in zoom-in-95 duration-100"><div onClick={() => setPerfSelectedReps([])} className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 border-b border-gray-50"><div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-sm ${perfSelectedReps.length === 0 ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>{perfSelectedReps.length === 0 && <CheckCircle2 size={10} className="text-white"/>}</div><span className={`text-[9px] font-bold uppercase tracking-widest ${perfSelectedReps.length === 0 ? 'text-gray-900' : 'text-gray-500'}`}>Todos</span></div>{availableReps.map(r => {const isSelected = perfSelectedReps.includes(r.code); return (<div key={r.code} onClick={() => togglePerfRepSelection(r.code)} className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0 group"><div className={`w-3.5 h-3.5 border flex items-center justify-center rounded-sm transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-gray-400'}`}>{isSelected && <CheckCircle2 size={10} className="text-white"/>}</div><div className="flex flex-col"><span className={`text-[9px] font-bold uppercase leading-none ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{r.name}</span><span className="text-[7px] text-gray-300 font-mono">{r.code}</span></div></div>);})}</div>)}</div>)}<div className="flex-1 sm:w-24"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter block mb-0.5">Ano</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] outline-none font-bold" value={perfYear} onChange={e => setPerfYear(Number(e.target.value))}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div><div className="flex-1 sm:w-32"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter block mb-0.5">Mês</label><select className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 text-[10px] outline-none font-bold" value={perfMonth} onChange={e => setPerfMonth(Number(e.target.value))}>{MONTHS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div></div></div> 
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><StatCard title="Total Meta Definida" value={currencyFormat(perfMetrics.totalGoal)} icon={Target} color="text-gray-400" /><StatCard title="Total Realizado (Itens)" value={currencyFormat(perfMetrics.totalRealized)} icon={ShoppingBag} color="text-blue-600" /><div className="bg-white p-3 border border-gray-200 shadow-sm flex flex-col justify-center relative overflow-hidden group"><div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><PieChart size={40}/></div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Atingimento Global</p><div className="flex items-end gap-2"><h3 className={`text-2xl font-black tracking-tighter ${perfMetrics.totalPercent >= 100 ? 'text-green-600' : perfMetrics.totalPercent >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{perfMetrics.totalPercent.toFixed(1)}%</h3></div></div></div> 
              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden"><div className="p-3 bg-gray-50 border-b flex justify-between items-center"><span className="text-[10px] font-bold uppercase text-gray-500">Performance por Representante</span></div><div className="overflow-x-auto"><table className="w-full text-[10px]"><thead className="bg-gray-50/50 border-b"><tr className="text-[9px] font-black uppercase text-gray-400"><th className="px-4 py-2 text-left">Representante</th><th className="px-4 py-2 text-left w-1/3">Progresso da Meta</th><th className="px-4 py-2 text-right">Meta (R$)</th><th className="px-4 py-2 text-right">Realizado (R$)</th><th className="px-4 py-2 text-center">% Ating.</th></tr></thead><tbody className="divide-y divide-gray-100">{performanceData.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sem dados para o período selecionado</td></tr>) : (performanceData.map((row) => (<tr key={row.code} className="hover:bg-gray-50 transition-colors"><td className="px-4 py-3"><div className="font-bold text-gray-900">{row.name}</div><div className="text-[8px] text-gray-400 font-mono">COD: {row.code}</div></td><td className="px-4 py-3 align-middle"><div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${row.percent >= 100 ? 'bg-green-500' : row.percent >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(row.percent, 100)}%` }}></div></div></td><td className="px-4 py-3 text-right font-mono text-gray-500">{currencyFormat(row.goal)}</td><td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{currencyFormat(row.realized)}</td><td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${row.percent >= 100 ? 'bg-green-100 text-green-700' : row.percent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.percent.toFixed(1)}%</span></td></tr>)))}</tbody></table></div></div> 
            </div> 
          ) : activeModuleId === 'USERS' ? ( 
             // ... (Conteúdo de Usuários - Inalterado) ...
             <div className="grid grid-cols-12 gap-4 animate-in fade-in duration-300 h-full overflow-y-auto custom-scrollbar"> 
              <div className={`col-span-12 lg:col-span-4 bg-white border ${newUser.id ? 'border-amber-500 shadow-amber-50' : 'border-gray-200 shadow-sm'} p-3 space-y-2 transition-all duration-300`}>
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">{newUser.id ? 'Editar Acesso' : 'Novo Acesso'}</h3>
                  {newUser.id && <div className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded-full">Modo de Edição</div>}
                </div>
                <div className="space-y-2">
                    <div className="space-y-0.5"><label className="text-[9px] font-black uppercase text-gray-400">Nome Completo</label><input type="text" placeholder="Ex: João da Silva" className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} /></div>
                    <div className="space-y-0.5"><label className="text-[9px] font-black uppercase text-gray-400">E-mail Corporativo</label><input type="email" placeholder="usuario@empresa.com.br" className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} /></div>
                    <div className="space-y-0.5"><label className="text-[9px] font-black uppercase text-gray-400">Senha de Acesso</label><input type="password" placeholder="••••••••" className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.password || ''} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} /></div>
                    
                    <div className="pt-1 flex items-center gap-2 p-2 bg-gray-50 border border-dashed border-gray-200">
                        <input type="checkbox" id="is_admin" className="w-3 h-3 accent-gray-900" checked={newUser.is_admin} onChange={e => setNewUser(p => ({...p, is_admin: e.target.checked, rep_in_codigo: e.target.checked ? null : p.rep_in_codigo}))} />
                        <label htmlFor="is_admin" className="text-[9px] font-bold uppercase text-gray-700 cursor-pointer">Acesso de Administrador</label>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <label className="text-[9px] font-black uppercase text-gray-400">Permissões de Acesso (Menus)</label>
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 border border-gray-100 rounded-sm">
                            {MODULES.map(module => (
                                <label key={module.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors">
                                    <input type="checkbox" className="w-3 h-3 accent-gray-900 rounded-sm" checked={newUser.allowed_modules?.includes(module.id)} onChange={() => handleToggleModule(module.id)} />
                                    <div className="flex items-center gap-1.5">
                                        <module.icon size={10} className="text-gray-500" />
                                        <span className={`text-[9px] font-bold uppercase ${newUser.allowed_modules?.includes(module.id) ? 'text-gray-900' : 'text-gray-400'}`}>{module.label}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    {!newUser.is_admin && (<div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200 pt-2"><label className="text-[9px] font-black uppercase text-gray-400">Vincular Representante</label><select className="w-full px-2 py-1.5 bg-gray-50 border text-[10px] outline-none focus:border-gray-900" value={newUser.rep_in_codigo || ''} onChange={e => setNewUser(p => ({...p, rep_in_codigo: e.target.value ? Number(e.target.value) : null}))}><option value="">Selecionar Representante</option>{fullRepsList.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}</select></div>)}
                </div>
                <div className="space-y-1.5 pt-1">
                  <button onClick={handleSaveUser} className={`w-full py-2.5 text-white text-[9px] font-bold uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] ${newUser.id ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#1a2130] hover:bg-black'}`}>{newUser.id ? 'Salvar Alterações' : 'Criar Acesso'}</button>
                  {newUser.id && <button onClick={handleCancelEditUser} className="w-full py-2 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar Edição</button>}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <h4 className="text-[9px] font-black uppercase text-red-400 tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={10} /> Zona de Perigo</h4>
                    <button onClick={() => setShowResetConfirm(true)} className="w-full py-2.5 border border-red-200 bg-red-50 text-red-600 text-[9px] font-bold uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2" > <Trash2 size={12} /> Limpar Todas as Vendas </button>
                    <p className="text-[8px] text-gray-400 mt-1 text-center">Use para resetar o banco antes de uma carga limpa.</p>
                </div>
              </div> 
              <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200 overflow-hidden shadow-sm"><div className="p-3 bg-gray-50 border-b flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-gray-500">Usuários Cadastrados</span></div><div className="overflow-x-auto"><table className="w-full text-[10px]"><thead className="bg-gray-50/50 border-b"><tr className="text-[9px] font-black uppercase text-gray-400"><th className="px-4 py-2 text-left">Usuário</th><th className="px-4 py-2 text-center">Nível / Vínculo</th><th className="px-4 py-2 text-center">Ações</th></tr></thead><tbody className="divide-y">{appUsers.map(u => (<tr key={u.id} className={`hover:bg-gray-50 transition-colors ${newUser.id === u.id ? 'bg-amber-50' : ''}`}><td className="px-4 py-2"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><User size={12} /></div><div><p className="font-bold text-gray-900">{u.name}</p><p className="text-[9px] text-gray-400">{u.email}</p></div></div></td><td className="px-4 py-2 text-center">{u.is_admin ? (<span className="px-2 py-0.5 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 w-fit mx-auto"><Shield size={8} /> Admin</span>) : (<span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 w-fit mx-auto">Rep: {u.rep_in_codigo || 'N/A'}</span>)}</td><td className="px-4 py-2 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => handleEditUser(u)} className={`p-1.5 transition-colors ${newUser.id === u.id ? 'text-amber-600' : 'text-gray-300 hover:text-blue-600'}`} title="Editar Usuário"><Edit2 size={14}/></button><button onClick={async () => { if(confirm(`Remover acesso de ${u.name}?`)) { await deleteAppUser(u.id!); loadAppUsers(); } }} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Excluir Usuário"><Trash2 size={14}/></button></div></td></tr>))}</tbody></table></div></div> 
            </div> 
          ) : ( 
            <div className="flex flex-col h-full gap-2 overflow-hidden"> 
              {/* ... (Filtros e Lista Padrão - Inalterados) ... */}
              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300 shrink-0"> 
                <div className="p-2 border-b bg-gray-50 flex items-center justify-between cursor-pointer" onClick={() => setFiltersExpanded(!filtersExpanded)}> 
                  <div className="flex items-center gap-2"><Filter size={12} className="text-gray-900" /><span className="text-[9px] font-bold uppercase tracking-widest">Painel de Inteligência</span></div> 
                  <ChevronDown size={12} className={`transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`} /> 
                </div> 
                {filtersExpanded && ( 
                  <div className="p-2 flex flex-wrap items-end gap-2"> 
                    <div className="w-44 space-y-0.5"> 
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Busca Global</label> 
                      <div className="relative"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="ID, Produto, Status..." className="w-full pl-7 pr-2 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.globalSearch} onChange={e => setFilters({...filters, globalSearch: e.target.value})} /></div> 
                    </div> 
                    <div className="flex-1 space-y-0.5"> 
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Cliente</label> 
                      <input type="text" placeholder="Nome do Cliente..." className="w-full px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.cliente || ''} onChange={e => setFilters({...filters, cliente: e.target.value})} /> 
                    </div> 
                    <div className="flex-1 space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Representante</label><select className="w-full px-1.5 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none disabled:bg-gray-100" value={filters.representante} onChange={e => setFilters({...filters, representante: e.target.value})} disabled={!currentUser?.is_admin}><option value="">{currentUser?.is_admin ? 'Todos' : 'Meu Cadastro'}</option>{availableReps.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}</select></div> 
                    <div className="flex-1 space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Status</label><select className="w-full px-1.5 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="">Todos</option>{availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div> 
                    <div className="flex-1 space-y-0.5"><label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Filial</label><select className="w-full px-1.5 py-1 bg-gray-50 border border-gray-200 text-[10px] focus:border-gray-900 outline-none" value={filters.filial} onChange={e => setFilters({...filters, filial: e.target.value})}><option value="">Todas</option>{availableFiliais.map(f => <option key={f} value={f}>{f}</option>)}</select></div> 
                    <div className="flex-1 min-w-[180px] space-y-0.5"> 
                      <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter"> {((activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') && commissionViewMode === 'FATURADO') ? 'Data Faturamento (Nota)' : 'Período de Emissão (Pedido)'} </label> 
                      <div className="flex items-center gap-1"><input type="date" className="flex-1 px-1.5 py-1 bg-gray-50 border border-gray-200 text-[9px] outline-none focus:border-gray-900" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} title="Data Inicial" /><span className="text-gray-300 text-[9px]">-</span><input type="date" className="flex-1 px-1.5 py-1 bg-gray-50 border border-gray-200 text-[9px] outline-none focus:border-gray-900" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} title="Data Final" /></div> 
                    </div> 
                    <div className="w-20"><button onClick={clearFilters} className="w-full px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all text-center border border-gray-200">Resetar</button></div> 
                  </div> 
                )} 
              </div> 
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 shrink-0"> 
                {activeModuleId === 'PAGAMENTOS' ? ( <> <StatCard title="Total a Pagar (Pendente)" value={currencyFormat(paymentMetrics.toPay)} icon={AlertCircle} color="text-red-500" /> <StatCard title="Total Pago (Baixado)" value={currencyFormat(paymentMetrics.paid)} icon={CheckCircle2} color="text-green-600" /> <StatCard title="Projeção (Carteira)" value={currencyFormat(paymentMetrics.projected)} icon={Wallet} color="text-blue-500" /> </> ) : activeModuleId === 'COMISSAO' ? ( <> <StatCard title={commissionViewMode === 'FATURADO' ? "Total Gerado" : "Previsão Gerada"} value={currencyFormat(commissionData.reduce((acc, curr) => acc + (curr.VALOR_COMISSAO || 0), 0))} icon={commissionViewMode === 'FATURADO' ? Banknote : Wallet} color={commissionViewMode === 'FATURADO' ? "text-green-600" : "text-amber-500"} /> <StatCard title="Total Faturado (Venda)" value={currencyFormat(metrics.faturado)} icon={TrendingUp} color="text-blue-600" /> </> ) : ( <StatCard title="Total Bruto (Itens)" value={currencyFormat(metrics.total)} icon={DollarSign} color="text-gray-900" /> )} 
                {activeModuleId !== 'OV' && activeModuleId !== 'DV' && activeModuleId !== 'COMISSAO' && activeModuleId !== 'PAGAMENTOS' && ( 
                  <div className="bg-white p-3 border border-gray-200 shadow-sm hover:border-gray-900 transition-colors relative overflow-hidden group flex flex-col justify-between"> 
                    <div className="flex items-center justify-between mb-1"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Meta</p><Target size={14} className="text-blue-500" /></div> 
                    <div className="flex items-end justify-between"><h3 className="text-lg font-bold text-gray-900 tracking-tighter tabular-nums">{currencyFormat(metrics.goal)}</h3>{metrics.goal > 0 && (<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${metrics.achievement >= 100 ? 'bg-green-100 text-green-700' : metrics.achievement >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{metrics.achievement.toFixed(1)}%</span>)}</div> 
                    {metrics.goal > 0 && (<div className="w-full h-1 bg-gray-100 mt-2 rounded-full overflow-hidden"><div className={`h-full ${metrics.achievement >= 100 ? 'bg-green-500' : metrics.achievement >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`} style={{ width: `${Math.min(metrics.achievement, 100)}%` }}></div></div>)} 
                  </div> 
                )} 
                {activeModuleId !== 'COMISSAO' && activeModuleId !== 'PAGAMENTOS' && ( <> <StatCard title={activeModuleId === 'OV' ? "Em Aprovação" : "Faturado"} value={currencyFormat(activeModuleId === 'OV' ? metrics.emAprovacao : metrics.faturado)} icon={activeModuleId === 'OV' ? ShieldCheck : TrendingUp} color={activeModuleId === 'OV' ? "text-amber-600" : "text-green-600"} /> <StatCard title="Aberto" value={currencyFormat(activeModuleId === 'OV' ? metrics.emAberto : (metrics.total - metrics.faturado))} icon={Receipt} color="text-blue-600" /> </> )} 
                {activeModuleId !== 'PAGAMENTOS' && ( <StatCard title="Pedidos Únicos" value={metrics.count.toString()} icon={Package} color="text-gray-400" /> )} 
              </div> 
              <div className="bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative"> 
                <div className="p-2 border-b bg-gray-50 flex flex-wrap gap-2 items-center justify-between shrink-0"> 
                  {activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS' ? ( 
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto"> 
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[50%] scrollbar-hide"> 
                        {COMMISSION_ROLES.map(role => ( <button key={role.id} onClick={() => setActiveCommissionRole(role.id)} className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border ${activeCommissionRole === role.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'}`} > {role.id === 'ASSISTENTE' ? <Calculator size={10} /> : role.id === 'VENDEDOR' ? <Briefcase size={10} /> : role.id === 'GERENTE' ? <TrendingUp size={10} /> : <HeartHandshake size={10} />} {role.label} </button> ))} 
                      </div> 
                      <div className="flex bg-gray-100 p-0.5 rounded-sm border border-gray-200"> 
                        <button onClick={() => setCommissionViewMode('FATURADO')} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-1.5 ${commissionViewMode === 'FATURADO' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-600'}`} > <Banknote size={12}/> Real (Faturado) </button> 
                        <button onClick={() => setCommissionViewMode('ABERTO')} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-1.5 ${commissionViewMode === 'ABERTO' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-400 hover:text-gray-600'}`} > <Wallet size={12}/> Projeção (Carteira) </button> 
                      </div> 
                    </div> 
                  ) : ( <div className="flex items-center gap-2"><TableIcon size={14}/><h3 className="text-[9px] font-bold uppercase tracking-widest">Visão Analítica (Detalhamento por Item)</h3></div> )} 
                  <div className="flex items-center gap-2 ml-auto"> 
                    {(activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS') && ( <button onClick={() => setFilterOnlyManual(!filterOnlyManual)} className={`px-3 py-1.5 border text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${filterOnlyManual ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`} title="Exibir apenas notas importadas manualmente" > <DatabaseIcon size={12}/> {filterOnlyManual ? 'Manual Ativado' : 'Apenas Manuais'} </button> )} 
                    {activeModuleId === 'COMISSAO' && ( <div className="relative"> <input type="file" id="xml-upload" multiple accept=".xml" className="hidden" onChange={handleXmlUpload} /> <label htmlFor="xml-upload" className="px-2 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm cursor-pointer"> <UploadCloud size={12}/> Importar XML </label> </div> )} 
                    <button onClick={handleExportExcel} className="px-2 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm" title="Exportar para Excel" > <FileSpreadsheet size={12}/> Excel </button> 
                    <button onClick={handleExportPDF} className="px-2 py-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm" title="Exportar para PDF" > <FileType size={12}/> PDF </button> 
                    <button onClick={() => setIsGroupedByOrder(!isGroupedByOrder)} className={`px-3 py-1.5 border text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isGroupedByOrder ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`} > <ListTree size={12}/> {isGroupedByOrder ? 'Agrupado por Pedido' : 'Lista Plana'} </button> 
                    <div className="relative" ref={columnSelectorRef}> 
                      <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="px-3 py-1.5 bg-gray-900 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-sm"><Columns size={10}/>Colunas</button> 
                      {showColumnSelector && ( <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-200 rounded-sm"> <div className="p-3 border-b flex justify-between items-center bg-gray-50"><span className="text-[9px] font-black uppercase text-gray-900 tracking-widest">Layout</span><button onClick={() => setShowColumnSelector(false)}><X size={12} className="text-gray-400 hover:text-red-500"/></button></div> <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">{(activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS' ? commissionColumns : salesColumns).map(col => (<button key={col.key} onClick={() => toggleColumnVisibility(col.key)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors group text-left border-b border-gray-50 last:border-0"><div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${col.visible ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}>{col.visible && <CheckCircle2 size={10} className="text-white"/>}</div><span className={`text-[9px] font-bold uppercase tracking-widest flex-1 ${col.visible ? 'text-gray-900' : 'text-gray-300'}`}>{col.label}</span></button>))}</div> <div className="p-3 border-t bg-gray-50"><button onClick={saveGlobalVision} className={`w-full py-2.5 text-[9px] font-bold uppercase tracking-widest text-white transition-all shadow-md active:scale-[0.98] ${layoutSaved ? 'bg-green-600' : 'bg-gray-900 hover:bg-black'}`}>{layoutSaved ? 'Salvo!' : 'Salvar Padrão'}</button></div> </div> )} 
                    </div> 
                  </div> 
                </div> 
                <div className="flex-1 overflow-hidden relative"> 
                  <SalesTable data={activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS' ? commissionData : processedData} columns={activeModuleId === 'COMISSAO' || activeModuleId === 'PAGAMENTOS' ? commissionColumns : salesColumns} sortConfig={sortConfig} onSort={s => setSortConfig(p => p?.key === s ? {key:s, direction:p.direction==='asc'?'desc':'asc'} : {key:s, direction:'asc'})} onColumnReorder={handleColumnReorder} isLoading={loading || syncing} isGroupedByOrder={isGroupedByOrder} onTogglePayment={handleTogglePayment} onEditManual={handleEditManual} onDeleteManual={handleDeleteManual} /> 
                </div> 
              </div> 
            </div> 
          )} 
        </main> 
      </div> 
    </div> 
  );
}
