
import React, { useMemo } from 'react';
import { 
  TrendingUp, DollarSign, ShoppingBag, FileText, 
  Hammer, CheckCircle2, AlertCircle, Clock, 
  Wallet, PieChart, ArrowUpRight, Target,
  Filter, Users, Calendar, ChevronDown, Receipt
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
  onDateRangeChange: (start: string, end: string) => void;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export const Overview: React.FC<OverviewProps> = ({ 
  user, salesData, commissionData, goals, metrics,
  availableReps, currentRep, onRepChange, dateRange, onDateRangeChange
}) => {
  
  // --- Processamento de Dados com Filtros Independentes ---
  
  const summary = useMemo(() => {
    const start = dateRange.start;
    const end = dateRange.end;

    // Helper de Verificação de Data
    const inRange = (dateStr?: string | null) => {
        if (!dateStr) return false;
        const d = dateStr.split('T')[0];
        return d >= start && d <= end;
    };

    // 1. Filtrar Vendas e Orçamentos pela DATA DE EMISSÃO DO PEDIDO
    const budgetItems = salesData.filter(s => s.SER_ST_CODIGO === 'OV' && inRange(s.PED_DT_EMISSAO));
    const orderItems = salesData.filter(s => s.SER_ST_CODIGO === 'PD' && inRange(s.PED_DT_EMISSAO));
    const devItems = salesData.filter(s => s.SER_ST_CODIGO === 'DV' && inRange(s.PED_DT_EMISSAO));

    // 2. Filtrar Valor Faturado pela DATA DE FATURAMENTO (NOTA), independente da emissão do pedido
    // A nota deve estar dentro do período selecionado.
    const faturadoItems = salesData.filter(s => {
        const invDate = s.NOT_DT_EMISSAO;
        const status = String(s.PED_ST_STATUS || '').toUpperCase();
        
        // Verifica se tem nota emitida dentro do range e não está cancelado
        if (invDate && inRange(invDate) && !status.includes('CANCEL')) {
            return true;
        }
        return false;
    });

    // Totais Monetários
    const totalBudget = budgetItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
    const totalOrder = orderItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
    const totalDev = devItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);
    
    // Total Faturado Independente
    const totalFaturado = faturadoItems.reduce((acc, curr) => acc + (Number(curr.ITP_RE_VALORMERCADORIA) || 0), 0);

    // Contagem de Status (baseado nos pedidos emitidos no período)
    const countStatus = (items: Sale[], statusPart: string) => 
      items.filter(i => String(i.PED_ST_STATUS || i.SITUACAO || '').toUpperCase().includes(statusPart)).length;

    const ordersFaturado = countStatus(orderItems, 'FATURADO');
    const ordersAberto = countStatus(orderItems, 'ABERTO') + countStatus(orderItems, 'APROV');
    
    // Comissões (mantém lógica global ou pode refinar se necessário, mas overview geralmente foca em vendas)
    const totalCommission = commissionData.reduce((acc, curr) => acc + (curr.VALOR_COMISSAO || 0), 0);
    const paidCommission = commissionData.filter(c => c.COMISSAO_PAGA).reduce((acc, curr) => acc + (curr.VALOR_COMISSAO || 0), 0);

    return {
      totalBudget,
      totalOrder,
      totalDev,
      totalFaturado,
      countBudgets: budgetItems.length,
      countOrders: orderItems.length,
      ordersFaturado,
      ordersAberto,
      totalCommission,
      paidCommission,
      pendingCommission: totalCommission - paidCommission,
      // Exportando para uso nos gráficos
      filteredOrders: orderItems
    };
  }, [salesData, commissionData, dateRange]);

  // Cálculo Local do Percentual de Atingimento (Baseado estritamente em PD vs Meta)
  const achievementPercent = useMemo(() => {
      if (!metrics.goal || metrics.goal === 0) return 0;
      return (summary.totalOrder / metrics.goal) * 100;
  }, [summary.totalOrder, metrics.goal]);

  // Dados para Gráfico de Tendência (Últimos 6 meses baseados nos dados disponíveis, independente do filtro de data curto)
  // Isso garante contexto histórico
  const trendData = useMemo(() => {
    const monthsMap = new Map<string, { name: string, Vendas: number, Orcamentos: number }>();
    
    salesData.forEach(sale => {
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
  }, [salesData]);

  // Dados para Gráfico de Pizza (Status Geral dos Pedidos EMITIDOS no período)
  const statusData = useMemo(() => {
      const statusMap = new Map<string, number>();
      // Usamos summary.filteredOrders para refletir o filtro de data selecionado
      summary.filteredOrders.forEach(s => {
          const st = String(s.PED_ST_STATUS || 'OUTROS').toUpperCase();
          let key = 'OUTROS';
          if (st.includes('FATURADO')) key = 'FATURADO';
          else if (st.includes('CANCEL')) key = 'CANCELADO';
          else if (st.includes('ABERTO')) key = 'EM ABERTO';
          else if (st.includes('APROV')) key = 'EM APROVAÇÃO';
          
          statusMap.set(key, (statusMap.get(key) || 0) + 1);
      });
      return Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));
  }, [summary.filteredOrders]);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      
      {/* Barra de Filtros */}
      <div className="bg-white border-b border-gray-200 p-2 shadow-sm shrink-0 flex flex-wrap items-center justify-between gap-3 z-10 animate-in slide-in-from-top-1">
         <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700">
               <Filter size={14} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Painel de Inteligência</span>
            </div>
            <div className="h-4 w-px bg-gray-200 mx-1"></div>
            
            {/* Filtro de Representante */}
            <div className="flex flex-col">
               <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter mb-0.5">Representante</label>
               <div className="relative">
                  <select 
                     className="bg-gray-50 border border-gray-200 text-[10px] rounded-sm pl-2 pr-6 py-1 outline-none focus:border-gray-900 font-bold text-gray-700 w-56 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
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

         {/* Seletor de Período Editável */}
         <div className="flex flex-col items-end">
             <label className="text-[8px] font-black uppercase text-gray-400 tracking-tighter mb-0.5">Período de Análise</label>
             <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-sm border border-gray-200 shadow-sm hover:border-gray-300 transition-colors">
                 <Calendar size={12} className="text-gray-500" />
                 <div className="flex items-center gap-1">
                    <input 
                        type="date" 
                        className="bg-transparent text-[10px] font-bold text-gray-600 outline-none uppercase w-[85px] cursor-pointer"
                        value={dateRange.start}
                        onChange={(e) => onDateRangeChange(e.target.value, dateRange.end)}
                        title="Data Inicial"
                    />
                    <span className="text-gray-300 text-[9px]">-</span>
                    <input 
                        type="date" 
                        className="bg-transparent text-[10px] font-bold text-gray-600 outline-none uppercase w-[85px] cursor-pointer"
                        value={dateRange.end}
                        onChange={(e) => onDateRangeChange(dateRange.start, e.target.value)}
                        title="Data Final"
                    />
                 </div>
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6 animate-in fade-in duration-500">
        
        {/* Header de Boas Vindas */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-sm p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <TrendingUp size={120} />
          </div>
          <div className="relative z-10">
              <h1 className="text-2xl font-bold mb-1">Olá, {user?.name.split(' ')[0]}! 👋</h1>
              <p className="text-sm text-gray-300 mb-6">Aqui está o resumo executivo da sua operação hoje.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Card 1: Meta */}
                  <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded border border-white/5 shadow-inner">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Meta do Período</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(metrics.goal)}</p>
                  </div>
                  
                  {/* Card 2: Vendas Realizadas (Pedidos) */}
                  <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded border border-white/5 shadow-inner">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Vendas Realizadas</p>
                      <p className="text-xl font-bold text-emerald-400">{formatCurrency(summary.totalOrder)}</p>
                  </div>

                  {/* Card 3: Valor Faturado (Notas) - Usa o cálculo independente de data de emissão */}
                  <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded border border-white/5 shadow-inner">
                      <div className="flex items-center gap-2 mb-1">
                         <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Valor Faturado</p>
                      </div>
                      <p className="text-xl font-bold text-teal-300">{formatCurrency(summary.totalFaturado)}</p>
                  </div>

                  {/* Card 4: % Atingimento */}
                  <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded border border-white/5 shadow-inner">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Percentual Meta</p>
                      <div className="flex items-center gap-2">
                          <p className={`text-xl font-bold ${achievementPercent >= 100 ? 'text-green-400' : achievementPercent >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                              {achievementPercent.toFixed(1)}%
                          </p>
                          {achievementPercent >= 100 && <CheckCircle2 size={18} className="text-green-400"/>}
                      </div>
                  </div>
                  
                  {/* Card 5: Pipeline */}
                   <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded border border-white/5 shadow-inner">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Pipeline (OV)</p>
                      <p className="text-xl font-bold text-blue-300">{formatCurrency(summary.totalBudget)}</p>
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
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-gray-500 font-medium">Em Aberto</span>
                        <span className="text-sm font-bold text-gray-900">{summary.countBudgets}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{width: '60%'}}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right mt-1">Total: {formatCurrency(summary.totalBudget)}</p>
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
                        <span className="text-xs font-bold text-emerald-600">{summary.ordersFaturado}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-[10px] text-gray-500">Em Carteira</span>
                        <span className="text-xs font-bold text-amber-600">{summary.ordersAberto}</span>
                    </div>
                     <p className="text-[10px] text-gray-400 text-right mt-2">Total: {formatCurrency(summary.totalOrder)}</p>
                </div>
            </div>

            {/* Desenvolvimento */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Hammer size={48}/></div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded"><Hammer size={18}/></div>
                    <h3 className="text-xs font-bold uppercase text-gray-700">Desenvolvimento</h3>
                </div>
                <div className="flex flex-col justify-between h-20">
                     <p className="text-[10px] text-gray-500 leading-relaxed">Projetos especiais e protótipos em andamento.</p>
                     <div>
                          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalDev)}</p>
                          <p className="text-[9px] text-purple-600 font-bold uppercase mt-1">Valor em Projetos</p>
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
                        <span className="text-xs font-bold text-gray-900">{formatCurrency(summary.totalCommission)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500">Pago</span>
                        <span className="text-xs font-bold text-green-600">{formatCurrency(summary.paidCommission)}</span>
                     </div>
                     <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">A Receber</span>
                        <span className="text-sm font-bold text-amber-600">{formatCurrency(summary.pendingCommission)}</span>
                     </div>
                </div>
            </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-80">
            
            {/* Gráfico de Tendência */}
            <div className="lg:col-span-2 bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex flex-col">
                <h3 className="text-xs font-bold uppercase text-gray-700 mb-4 flex items-center gap-2">
                    <ArrowUpRight size={16} className="text-gray-400"/> Tendência de Vendas vs Orçamentos (6 Meses)
                </h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} tickFormatter={(val) => `R$ ${val/1000}k`} />
                            <RechartsTooltip 
                                contentStyle={{backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Area type="monotone" dataKey="Orcamentos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOrc)" strokeWidth={2} name="Orçamentos" />
                            <Area type="monotone" dataKey="Vendas" stroke="#10b981" fillOpacity={1} fill="url(#colorVendas)" strokeWidth={2} name="Vendas Faturadas" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfico de Status */}
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex flex-col">
                <h3 className="text-xs font-bold uppercase text-gray-700 mb-4 flex items-center gap-2">
                    <PieChart size={16} className="text-gray-400"/> Distribuição de Pedidos
                </h3>
                <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{fontSize: '11px', borderRadius: '4px'}} />
                        </RePieChart>
                    </ResponsiveContainer>
                    {/* Centro do Donut */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-2xl font-black text-gray-900">{summary.countOrders}</p>
                            <p className="text-[9px] uppercase font-bold text-gray-400">Total</p>
                        </div>
                    </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase truncate" title={entry.name}>{entry.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
