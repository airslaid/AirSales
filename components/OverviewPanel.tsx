
import React, { useMemo } from 'react';
import { 
  TrendingUp, DollarSign, ShoppingBag, FileText, 
  Hammer, CheckCircle2, AlertCircle, Clock, 
  Wallet, PieChart, ArrowUpRight, Target,
  Filter, Users, Calendar, ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart as RePieChart, Pie
} from 'recharts';
import { Sale, AppUser, SalesGoal } from '../types';

interface OverviewProps {
  user: AppUser | null;
  salesData: Sale[];
  commissionData: any[];
  goals: SalesGoal[];
  metrics: any;
  availableReps: { code: number, name: string }[];
  currentRep: string;
  onRepChange: (rep: string) => void;
  dateRange: { start: string, end: string };
  onDateRangeChange: (range: { start: string, end: string }) => void;
  isLoading?: boolean;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export const OverviewPanel: React.FC<OverviewProps> = ({ 
  user, salesData, commissionData, goals, metrics,
  availableReps, currentRep, onRepChange, dateRange, onDateRangeChange,
  isLoading = false
}) => {
  
  // --- Processamento de Dados ---
  
    const summary = useMemo(() => {
      // Filtro de Representante
      let dataByRep = salesData;
      if (currentRep) {
        dataByRep = dataByRep.filter(s => String(s.REP_IN_CODIGO) === currentRep);
      }

      // Filtro de Data (Agora respeitado em todos os cards para maior precisão)
      let filteredData = dataByRep;
      if (dateRange.start) {
        filteredData = filteredData.filter(s => (s.PED_DT_EMISSAO || '') >= dateRange.start);
      }
      if (dateRange.end) {
        filteredData = filteredData.filter(s => (s.PED_DT_EMISSAO || '') <= dateRange.end);
      }

      // Separação por Tipo (Série) - USANDO filteredData (RESPEITANDO DATA)
      const budgetItems = filteredData.filter(s => s.SER_ST_CODIGO === 'OV');
      const orderItems = filteredData.filter(s => s.SER_ST_CODIGO === 'PD');
      const devItems = filteredData.filter(s => s.SER_ST_CODIGO === 'DV');

      // Totais Monetários (Baseados em Emissão)
      const totalBudget = budgetItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
      const totalOrder = orderItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
      const totalDev = devItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);

      // Faturamento Real (Filtrado por Data de Faturamento/Nota - NOT_DT_EMISSAO)
      let billedData = dataByRep;
      if (dateRange.start) {
        billedData = billedData.filter(s => (s.NOT_DT_EMISSAO || '') >= dateRange.start);
      }
      if (dateRange.end) {
        billedData = billedData.filter(s => (s.NOT_DT_EMISSAO || '') <= dateRange.end);
      }
      const totalBilled = billedData
        .filter(s => s.SER_ST_CODIGO === 'PD' && (String(s.PED_ST_STATUS || '').toUpperCase().includes('FATURADO') || (s.NOT_DT_EMISSAO && s.NOT_DT_EMISSAO !== '')))
        .reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);

      // Contagem de Status
      const countStatus = (items: Sale[], statusPart: string) => 
        items.filter(i => String(i.PED_ST_STATUS || i.SITUACAO || '').toUpperCase().includes(statusPart)).length;

      // Para Orçamentos:
      // Em Aberto = 'ABERTO' + 'APROV' + 'NEGOCIACAO' + 'PROCESSO' (Basicamente tudo que não é ENCERRADO ou CANCELADO)
      // Mas vamos manter a lógica anterior e adicionar NEGOCIACAO se necessário
      const budgetsAberto = countStatus(budgetItems, 'ABERTO') + countStatus(budgetItems, 'APROV') + countStatus(budgetItems, 'NEGOCIA') + countStatus(budgetItems, 'PROCESSO');
      
      // Encerrados = APENAS 'ENCERRADO'
      const budgetsEncerrado = budgetItems.filter(i => String(i.PED_ST_STATUS || i.SITUACAO || '').toUpperCase() === 'ENCERRADO').length;
      
      const budgetsCancelado = countStatus(budgetItems, 'CANCELADO') + countStatus(budgetItems, 'PERDIDO');

      const ordersFaturado = countStatus(orderItems, 'FATURADO');
      const ordersAberto = countStatus(orderItems, 'ABERTO') + countStatus(orderItems, 'APROV');
      const devAberto = countStatus(devItems, 'ABERTO') + countStatus(devItems, 'APROV');
      
      // Comissões (Filtro separado pois commissionData pode ter estrutura diferente, mas assumindo que já vem filtrado do App ou precisa filtrar aqui)
      // O App.tsx já filtra commissionData? Sim, App.tsx passa commissionData já processado.
      const totalCommission = commissionData.reduce((acc, curr) => acc + (curr.VALOR_COMISSAO || 0), 0);
      const paidCommission = commissionData.filter(c => c.COMISSAO_PAGA).reduce((acc, curr) => acc + (curr.VALOR_COMISSAO || 0), 0);

      return {
        totalBudget,
        totalOrder,
        totalDev,
        totalBilled,
        countBudgets: budgetItems.length,
        budgetsAberto,
        budgetsEncerrado,
        budgetsCancelado,
        countOrders: orderItems.length,
        ordersFaturado,
        ordersAberto,
        countDev: devItems.length,
        devAberto,
        totalCommission,
        paidCommission,
        pendingCommission: totalCommission - paidCommission
      };
    }, [salesData, commissionData, currentRep, dateRange]);

  // Dados para Gráfico de Tendência (Respeitando filtros de Rep e Data)
  const trendData = useMemo(() => {
    const monthsMap = new Map<string, { name: string, Vendas: number, Orcamentos: number }>();
    
    // Filtrar dados para o gráfico
    let filteredForTrend = salesData;
    if (currentRep) {
      filteredForTrend = filteredForTrend.filter(s => String(s.REP_IN_CODIGO) === currentRep);
    }
    if (dateRange.start) {
      filteredForTrend = filteredForTrend.filter(s => (s.PED_DT_EMISSAO || '') >= dateRange.start);
    }
    if (dateRange.end) {
      filteredForTrend = filteredForTrend.filter(s => (s.PED_DT_EMISSAO || '') <= dateRange.end);
    }

    filteredForTrend.forEach(sale => {
       if (!sale.PED_DT_EMISSAO) return;
       const date = new Date(sale.PED_DT_EMISSAO);
       const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
       const label = date.toLocaleDateString('pt-BR', { month: 'short' }); // Ex: Jan
       
       if (!monthsMap.has(key)) {
           monthsMap.set(key, { name: label, Vendas: 0, Orcamentos: 0 });
       }
       
       const val = Number(sale.ITP_RE_VALORMERCADORIA) || 0;
       const current = monthsMap.get(key)!;
       
       if (sale.SER_ST_CODIGO === 'PD') current.Vendas += val;
       if (sale.SER_ST_CODIGO === 'OV') current.Orcamentos += val;
    });

    return Array.from(monthsMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // Ordena por chave YYYY-MM
        .slice(-6) // Pega os últimos 6
        .map(entry => entry[1]);
  }, [salesData, currentRep, dateRange]);

  // Dados para Gráfico de Pizza (Status Geral - Respeitando filtros)
  const statusData = useMemo(() => {
      const statusMap = new Map<string, number>();
      
      let filteredForStatus = salesData;
      if (currentRep) {
        filteredForStatus = filteredForStatus.filter(s => String(s.REP_IN_CODIGO) === currentRep);
      }
      if (dateRange.start) {
        filteredForStatus = filteredForStatus.filter(s => (s.PED_DT_EMISSAO || '') >= dateRange.start);
      }
      if (dateRange.end) {
        filteredForStatus = filteredForStatus.filter(s => (s.PED_DT_EMISSAO || '') <= dateRange.end);
      }

      filteredForStatus.filter(s => s.SER_ST_CODIGO === 'PD').forEach(s => {
          const st = String(s.PED_ST_STATUS || 'OUTROS').toUpperCase();
          let key = 'OUTROS';
          if (st.includes('FATURADO')) key = 'FATURADO';
          else if (st.includes('CANCEL')) key = 'CANCELADO';
          else if (st.includes('ABERTO')) key = 'EM ABERTO';
          else if (st.includes('APROV')) key = 'EM APROVAÇÃO';
          
          statusMap.set(key, (statusMap.get(key) || 0) + 1);
      });
      return Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
  }, [salesData, currentRep, dateRange]);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      
      {/* Barra de Filtros */}
      <div className="bg-white border-b border-gray-200 p-2 sm:p-3 shadow-sm shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-10 animate-in slide-in-from-top-1">
         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-gray-700">
               <Filter size={14} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Painel de Inteligência</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-gray-200 mx-1"></div>
            
            {/* Filtro de Representante */}
            <div className="flex flex-col w-full sm:w-auto">
               <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter mb-0.5">Representante</label>
               <div className="relative">
                  <select 
                     className="bg-gray-50 border border-gray-200 text-[10px] rounded-sm pl-2 pr-6 py-1.5 outline-none focus:border-gray-900 font-bold text-gray-700 w-full sm:w-56 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                     value={currentRep}
                     onChange={(e) => onRepChange(e.target.value)}
                  >
                     <option value="">Todos os Representantes</option>
                     {availableReps.map(r => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                     ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
               </div>
            </div>
         </div>

         {/* Indicador de Data */}
         <div className="flex items-center gap-2 bg-gray-100 px-2 py-1.5 rounded-sm border border-gray-200 opacity-80 w-full sm:w-auto overflow-x-auto">
             <Calendar size={12} className="text-gray-500 shrink-0" />
             <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Período:</span>
                <input 
                   type="date" 
                   value={dateRange.start}
                   onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                   className="bg-transparent text-[9px] font-bold text-gray-700 outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 transition-colors w-24"
                />
                <span className="text-[9px] text-gray-400">ATÉ</span>
                <input 
                   type="date" 
                   value={dateRange.end}
                   onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                   className="bg-transparent text-[9px] font-bold text-gray-700 outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-500 transition-colors w-24"
                />
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6 animate-in fade-in duration-500">
        
        {/* Header de Boas Vindas */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-sm p-4 sm:p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 hidden sm:block">
             <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
              <h1 className="text-xl sm:text-2xl font-bold mb-1">Olá, {user?.name.split(' ')[0]}! 👋</h1>
              <p className="text-xs sm:text-sm text-gray-300 mb-4 sm:mb-6">Aqui está o resumo executivo da sua operação hoje.</p>
              
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="bg-white/10 backdrop-blur-sm p-2 sm:p-3 rounded border border-white/10">
                      <p className="text-[8px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">Meta do Período</p>
                      <p className="text-sm sm:text-lg font-bold text-white truncate">{isLoading ? '...' : formatCurrency(metrics.goal)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-2 sm:p-3 rounded border border-white/10">
                      <p className="text-[8px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">Vendas Realizadas</p>
                      <p className="text-sm sm:text-lg font-bold text-emerald-400 truncate">{isLoading ? '...' : formatCurrency(metrics.realizedTotal || 0)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-2 sm:p-3 rounded border border-white/10">
                      <p className="text-[8px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">Atingimento</p>
                      <div className="flex items-center gap-1 sm:gap-2">
                          <p className={`text-sm sm:text-lg font-bold ${metrics.achievement >= 100 ? 'text-green-400' : metrics.achievement >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                              {isLoading ? '...' : `${metrics.achievement.toFixed(1)}%`}
                          </p>
                          {!isLoading && metrics.achievement >= 100 && <CheckCircle2 size={14} className="text-green-400 shrink-0"/>}
                      </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-2 sm:p-3 rounded border border-white/10">
                      <p className="text-[8px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">Faturamento</p>
                      <p className="text-sm sm:text-lg font-bold text-orange-400 truncate">{isLoading ? '...' : formatCurrency(summary.totalBilled)}</p>
                  </div>
                   <div className="bg-white/10 backdrop-blur-sm p-2 sm:p-3 rounded border border-white/10">
                      <p className="text-[8px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">Pipeline (OV)</p>
                      <p className="text-sm sm:text-lg font-bold text-blue-300 truncate">{isLoading ? '...' : formatCurrency(summary.totalBudget)}</p>
                  </div>
              </div>
          </div>
        </div>

        {/* Cards de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CRM / Orçamentos */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={48}/></div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded"><FileText size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-gray-700">Orçamentos</h3>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                        <span className="text-[10px] text-gray-500">Em Aberto</span>
                        <span className="text-xs font-bold text-blue-600">{isLoading ? '...' : summary.budgetsAberto}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                        <span className="text-[10px] text-gray-500">Encerrados</span>
                        <span className="text-xs font-bold text-green-600">{isLoading ? '...' : summary.budgetsEncerrado}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-[10px] text-gray-500">Cancelados</span>
                        <span className="text-xs font-bold text-red-600">{isLoading ? '...' : summary.budgetsCancelado}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right mt-2">Total: {isLoading ? '...' : formatCurrency(summary.totalBudget)}</p>
                </div>
            </div>

            {/* Vendas */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag size={48}/></div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded"><ShoppingBag size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-gray-700">Pedidos de Venda</h3>
                </div>
                 <div className="space-y-1">
                    <div className="flex justify-between items-center py-1 border-b border-gray-50">
                        <span className="text-[10px] text-gray-500">Faturados</span>
                        <span className="text-xs font-bold text-emerald-600">{isLoading ? '...' : summary.ordersFaturado}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-[10px] text-gray-500">Em Carteira</span>
                        <span className="text-xs font-bold text-amber-600">{isLoading ? '...' : summary.ordersAberto}</span>
                    </div>
                     <p className="text-[10px] text-gray-400 text-right mt-2">Total: {isLoading ? '...' : formatCurrency(summary.totalOrder)}</p>
                </div>
            </div>

            {/* Desenvolvimento */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Hammer size={48}/></div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded"><Hammer size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-gray-700">Desenvolvimento</h3>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-gray-500 font-medium">Pendentes</span>
                        <span className="text-sm font-bold text-gray-900">{isLoading ? '...' : summary.devAberto}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                          style={{width: `${!isLoading && summary.countDev > 0 ? (summary.devAberto / summary.countDev) * 100 : 0}%`}}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Comissões */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={48}/></div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded"><Wallet size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-gray-700">Comissões</h3>
                </div>
                <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500">Gerado</span>
                        <span className="text-xs font-bold text-gray-900">{isLoading ? '...' : formatCurrency(summary.totalCommission)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500">Pago</span>
                        <span className="text-xs font-bold text-green-600">{isLoading ? '...' : formatCurrency(summary.paidCommission)}</span>
                     </div>
                     <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">A Receber</span>
                        <span className="text-sm font-bold text-amber-600">{isLoading ? '...' : formatCurrency(summary.pendingCommission)}</span>
                     </div>
                </div>
            </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto lg:h-80">
            
            {/* Gráfico de Tendência */}
            <div className="lg:col-span-2 bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex flex-col h-64 lg:h-full">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase text-gray-700 mb-4 flex items-center gap-2">
                    <ArrowUpRight size={16} className="text-gray-400"/> Tendência de Vendas vs Orçamentos (6 Meses)
                </h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorOrc" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9ca3af'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9ca3af'}} tickFormatter={(val) => `R$ ${val/1000}k`} />
                            <RechartsTooltip 
                                contentStyle={{backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Area type="monotone" dataKey="Orcamentos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrc)" strokeWidth={2} name="Orçamentos" />
                            <Area type="monotone" dataKey="Vendas" stroke="#10b981" fillOpacity={1} fill="url(#colorVendas)" strokeWidth={2} name="Vendas Faturadas" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfico de Status */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex flex-col h-64 lg:h-full">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase text-gray-700 mb-4 flex items-center gap-2">
                    <PieChart size={16} className="text-gray-400"/> Distribuição de Pedidos
                </h3>
                <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{fontSize: '10px', borderRadius: '4px'}} />
                        </RePieChart>
                    </ResponsiveContainer>
                    {/* Centro do Donut */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-xl font-black text-gray-900">{isLoading ? '...' : summary.countOrders}</p>
                            <p className="text-[8px] uppercase font-bold text-gray-400">Total</p>
                        </div>
                    </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                            <p className="text-[8px] font-bold text-gray-500 uppercase truncate" title={entry.name}>{entry.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
