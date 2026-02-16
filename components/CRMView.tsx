import React, { useState, useMemo, useEffect } from 'react';
import { Sale, CRMAppointment } from '../types';
import { updateOrderStatus, updateOrderHotStatus, fetchCRMAppointments, upsertCRMAppointment, deleteCRMAppointment } from '../services/supabaseService';
import * as XLSX from 'xlsx';
import { 
  Kanban, Users, DollarSign, Calendar, TrendingUp, 
  ArrowRight, Search, Building2, Phone, Mail, 
  MoreHorizontal, AlertCircle, CheckCircle2, XCircle, Clock,
  LucideIcon, Package, ShoppingBag, Receipt, MapPin, 
  ArrowLeft, Send, Briefcase, FileText, Flame, Plus,
  Flag, Check, List, User, MessageCircle, Smartphone, History,
  LayoutList, Edit2, Trash2, AlertTriangle, LayoutGrid, FileSpreadsheet,
  Filter, X
} from 'lucide-react';

interface CRMViewProps {
  data: Sale[];
  salesData: Sale[]; // Dados completos para histórico
  onRefresh?: () => Promise<void>;
}

interface PipelineItem extends Sale {
  TOTAL_VALOR: number;
  ITENS_COUNT: number;
}

interface PipelineColumn {
  id: string;
  title: string;
  items: PipelineItem[];
  color: string;
  bg: string;
  icon: LucideIcon;
  text?: string;
}

interface ClientWalletItem {
  id: number;
  name: string;
  totalSpent: number;
  ordersCount: number;
  lastPurchaseDate: string;
  repName: string;
  history: Sale[];
}

type CRMTab = 'PIPELINE' | 'CLIENTES' | 'AGENDA' | 'FOLLOWUP';

const STAGES = [
  { id: 'PROCESSO_INTERNO', label: 'Processo Interno', icon: Clock, color: 'border-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  { id: 'ENVIO_PROPOSTA', label: 'Envio da Proposta', icon: Send, color: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'NEGOCIACAO', label: 'Negociação', icon: Briefcase, color: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  { id: 'GANHO', label: 'Fechado / Ganho', icon: CheckCircle2, color: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  { id: 'PERDIDO', label: 'Perdido / Cancelado', icon: XCircle, color: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' }
];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const CRMView: React.FC<CRMViewProps> = ({ data = [], salesData = [], onRefresh }) => {
  const [activeTab, setActiveTab] = useState<CRMTab>('PIPELINE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientWalletItem | null>(null);
  
  // Pipeline Filters
  const [pipelineFilters, setPipelineFilters] = useState({
      rep: '',
      startDate: '',
      endDate: '',
      onlyHot: false
  });

  // Follow-up View Mode
  const [followUpViewMode, setFollowUpViewMode] = useState<'OPPORTUNITIES' | 'HISTORY'>('OPPORTUNITIES');

  // Modal Pedido State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'ITENS' | 'HISTORICO'>('ITENS');
  const [movingOrder, setMovingOrder] = useState<string | null>(null);
  const [togglingHot, setTogglingHot] = useState(false);

  // Agenda State
  const [appointments, setAppointments] = useState<CRMAppointment[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CRMAppointment | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<CRMAppointment>>({
    req_confirmation: false, notify_email: true, hide_appointment: false,
    recurrence: 'UNICO', activity_type: 'REUNIAO', priority: 'MEDIA', status: 'AGENDADO',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:00', end_time: '10:00'
  });

  // Follow-up State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [deleteFollowUpId, setDeleteFollowUpId] = useState<string | null>(null);
  const [followUpData, setFollowUpData] = useState({
     type: 'TELEFONEMA' as 'TELEFONEMA' | 'EMAIL' | 'REUNIAO' | 'VISITA' | 'COMPROMISSO', 
     notes: '',
     date: new Date().toISOString().split('T')[0],
     time: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
     order: null as PipelineItem | null
  });

  useEffect(() => {
    // Carrega apontamentos se estiver na aba Agenda, Followup ou se abrir um pedido
    if (activeTab === 'AGENDA' || activeTab === 'FOLLOWUP' || selectedOrder) {
        loadAppointments();
    }
  }, [activeTab, selectedOrder]);

  const loadAppointments = async () => {
      const evts = await fetchCRMAppointments();
      setAppointments(evts);
  };

  const handleExportAppointments = (filenamePrefix: string = 'Relatorio_CRM') => {
      const historyData = appointments.map(a => ({
          'Data': formatDate(a.start_date),
          'Hora': a.start_time,
          'Cliente': a.client_name,
          'Tipo': a.activity_type,
          'Status': a.status,
          'Descricao': a.description || ''
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(historyData);
      const wscols = [{ wch: 12 }, { wch: 8 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 60 }];
      ws['!cols'] = wscols;
      XLSX.utils.book_append_sheet(wb, ws, "Dados");
      XLSX.writeFile(wb, `${filenamePrefix}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // --- UNIQUE REPS FOR FILTER ---
  const uniqueReps = useMemo(() => {
      const reps = new Map<string, string>();
      const safeData = Array.isArray(data) ? data : [];
      safeData.forEach(item => {
          if (item.REP_IN_CODIGO && item.REPRESENTANTE_NOME) {
              reps.set(String(item.REP_IN_CODIGO), item.REPRESENTANTE_NOME);
          }
      });
      return Array.from(reps.entries()).map(([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name));
  }, [data]);

  // --- LÓGICA DO PIPELINE (KANBAN) ---
  const pipelineColumns = useMemo(() => {
    // Agrupa por ID do Pedido para não repetir itens do mesmo pedido no card
    const uniqueOrdersMap = new Map<number, PipelineItem>();
    
    const safeData = Array.isArray(data) ? data : [];

    safeData.forEach(item => {
      // --- FILTROS DO PIPELINE ---
      if (pipelineFilters.onlyHot && !item.IS_HOT) return;
      if (pipelineFilters.rep && String(item.REP_IN_CODIGO) !== pipelineFilters.rep) return;
      if (pipelineFilters.startDate && (!item.PED_DT_EMISSAO || item.PED_DT_EMISSAO < pipelineFilters.startDate)) return;
      if (pipelineFilters.endDate && (!item.PED_DT_EMISSAO || item.PED_DT_EMISSAO > pipelineFilters.endDate)) return;
      // ---------------------------

      const id = item.PED_IN_CODIGO;
      if (!uniqueOrdersMap.has(id)) {
        uniqueOrdersMap.set(id, {
          ...item,
          TOTAL_VALOR: 0,
          ITENS_COUNT: 0,
          IS_HOT: item.IS_HOT // Garante que a propriedade seja copiada
        });
      }
      const current = uniqueOrdersMap.get(id)!;
      current.TOTAL_VALOR += Number(item.ITP_RE_VALORMERCADORIA || 0);
      current.ITENS_COUNT += 1;
    });

    const uniqueOrders = Array.from(uniqueOrdersMap.values());

    const cols: Record<string, PipelineColumn> = {
      PROCESSO_INTERNO: { id: 'PROCESSO_INTERNO', title: 'Processo Interno', items: [], color: 'border-gray-500', bg: 'bg-gray-50', icon: Clock },
      ENVIO_PROPOSTA: { id: 'ENVIO_PROPOSTA', title: 'Envio da Proposta', items: [], color: 'border-blue-500', bg: 'bg-blue-50', icon: Send },
      NEGOCIACAO: { id: 'NEGOCIACAO', title: 'Negociação', items: [], color: 'border-amber-500', bg: 'bg-amber-50', icon: Briefcase },
      GANHO: { id: 'GANHO', title: 'Fechado / Ganho', items: [], icon: CheckCircle2, color: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
      PERDIDO: { id: 'PERDIDO', title: 'Perdido / Cancelado', items: [], icon: XCircle, color: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
    };

    uniqueOrders.forEach(order => {
      const statusRaw = String(order.PED_ST_STATUS || order.SITUACAO || '').toUpperCase();
      
      // Lógica de Mapeamento de Status para Colunas
      if (statusRaw.includes('CANCEL') || statusRaw.includes('PERDIDO')) {
        cols.PERDIDO.items.push(order);
      } else if (statusRaw.includes('FATURADO') || statusRaw.includes('GANHO') || statusRaw.includes('TOTAL')) {
        cols.GANHO.items.push(order);
      } else if (statusRaw.includes('NEGOCIACAO') || statusRaw.includes('NEGOCIAÇÃO')) {
        cols.NEGOCIACAO.items.push(order);
      } else if (statusRaw.includes('PROPOSTA') || statusRaw.includes('ENVIADO')) {
        cols.ENVIO_PROPOSTA.items.push(order);
      } else {
        // Default bucket: Processo Interno (includes ABERTO, OV, ORC, APROVACAO, ANALISE etc if not specified above)
        cols.PROCESSO_INTERNO.items.push(order);
      }
    });

    return cols;
  }, [data, pipelineFilters]);

  const handleExportPipeline = () => {
      const flatData: any[] = [];
      
      STAGES.forEach(stage => {
          const col = pipelineColumns[stage.id];
          col.items.forEach(item => {
              flatData.push({
                  'Estagio': col.title,
                  'Pedido': item.PED_IN_CODIGO,
                  'Cliente': item.CLIENTE_NOME,
                  'Representante': item.REPRESENTANTE_NOME,
                  'Emissao': formatDate(item.PED_DT_EMISSAO),
                  'Valor Estimado': item.TOTAL_VALOR,
                  'Status Original': item.PED_ST_STATUS,
                  'Hot Lead': item.IS_HOT ? 'SIM' : 'NÃO',
                  'Itens': item.ITENS_COUNT
              });
          });
      });

      if (flatData.length === 0) {
          alert('Não há dados para exportar com os filtros atuais.');
          return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(flatData);
      
      // Ajustar largura colunas
      const wscols = [
          { wch: 20 }, { wch: 10 }, { wch: 40 }, { wch: 30 }, 
          { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 8 }
      ];
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, "Funil de Vendas");
      XLSX.writeFile(wb, `Pipeline_Funil_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Lista de OVs para Follow-up (exclui ganhos/perdidos)
  const followUpList = useMemo(() => {
     // Pega todos os itens que NÃO estão ganhos nem perdidos
     // Safeguard para garantir que items existam
     const processoInterno = pipelineColumns.PROCESSO_INTERNO?.items || [];
     const envioProposta = pipelineColumns.ENVIO_PROPOSTA?.items || [];
     const negociacao = pipelineColumns.NEGOCIACAO?.items || [];

     const activeItems = [...processoInterno, ...envioProposta, ...negociacao];
     
     if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return activeItems.filter(i => 
            String(i.CLIENTE_NOME).toLowerCase().includes(lower) || 
            String(i.PED_IN_CODIGO).includes(lower)
        );
     }
     return activeItems.sort((a,b) => b.TOTAL_VALOR - a.TOTAL_VALOR);
  }, [pipelineColumns, searchTerm]);

  // Filtra a lista de histórico (appointments) baseado na busca
  const historyList = useMemo(() => {
      if (!searchTerm) return appointments.sort((a,b) => new Date(b.start_date + 'T' + b.start_time).getTime() - new Date(a.start_date + 'T' + a.start_time).getTime());
      
      const lower = searchTerm.toLowerCase();
      return appointments.filter(a => 
          String(a.client_name).toLowerCase().includes(lower) ||
          String(a.description).toLowerCase().includes(lower) ||
          String(a.title).toLowerCase().includes(lower)
      ).sort((a,b) => new Date(b.start_date + 'T' + b.start_time).getTime() - new Date(a.start_date + 'T' + a.start_time).getTime());
  }, [appointments, searchTerm]);

  // Recupera os itens do pedido selecionado
  const selectedOrderItems = useMemo(() => {
    if (!selectedOrder) return [];
    return (data || []).filter(d => d.PED_IN_CODIGO === selectedOrder.PED_IN_CODIGO && d.SER_ST_CODIGO === selectedOrder.SER_ST_CODIGO);
  }, [selectedOrder, data]);

  // Recupera histórico de follow-ups do pedido selecionado
  const selectedOrderFollowUps = useMemo(() => {
      if (!selectedOrder) return [];
      const orderTag = `[FOLLOW-UP ORÇAMENTO #${selectedOrder.PED_IN_CODIGO}]`;
      return appointments.filter(appt => 
          (appt.description && appt.description.includes(orderTag)) ||
          (appt.client_name === selectedOrder.CLIENTE_NOME && appt.status === 'CONCLUIDO') // Fallback para cliente
      ).sort((a,b) => new Date(b.start_date + 'T' + b.start_time).getTime() - new Date(a.start_date + 'T' + a.start_time).getTime());
  }, [selectedOrder, appointments]);

  // Função para mover card entre etapas
  const handleMoveStage = async (order: any, newStageId: string) => {
    if (!order) return;
    
    // Mapeamento inverso: ID da Coluna -> Texto para salvar no Banco
    let newStatusText = '';
    switch (newStageId) {
        case 'PROCESSO_INTERNO': newStatusText = 'EM APROVAÇÃO (INTERNO)'; break;
        case 'ENVIO_PROPOSTA': newStatusText = 'PROPOSTA ENVIADA'; break;
        case 'NEGOCIACAO': newStatusText = 'EM NEGOCIAÇÃO'; break;
        case 'GANHO': newStatusText = 'GANHO / FATURADO'; break;
        case 'PERDIDO': newStatusText = 'CANCELADO / PERDIDO'; break;
        default: newStatusText = 'EM ABERTO';
    }

    setMovingOrder(String(order.PED_IN_CODIGO));
    
    try {
        const keys = { 
            fil: Number(order.FIL_IN_CODIGO), 
            ser: String(order.SER_ST_CODIGO).trim(), 
            ped: Number(order.PED_IN_CODIGO) 
        };
        
        await updateOrderStatus(keys, newStatusText);

        // --- GERAÇÃO AUTOMÁTICA DE FOLLOW-UP ---
        const oldStatus = order.PED_ST_STATUS || 'STATUS ANTERIOR';
        const now = new Date();
        const autoFollowUp: CRMAppointment = {
            id: '', // Supabase/Service gera o ID
            title: `Mudança de Status: ${newStatusText}`,
            client_name: order.CLIENTE_NOME,
            rep_in_codigo: Number(order.REP_IN_CODIGO),
            start_date: now.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
            start_time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            end_time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
            activity_type: 'COMPROMISSO', // Tipo neutro para log de sistema
            priority: 'BAIXA',
            status: 'CONCLUIDO',
            recurrence: 'UNICO',
            description: `[FOLLOW-UP ORÇAMENTO #${order.PED_IN_CODIGO}] Mudança de status de ${oldStatus} para ${newStatusText}`,
            req_confirmation: false,
            notify_email: false,
            hide_appointment: false
        };
        
        await upsertCRMAppointment(autoFollowUp);
        // ---------------------------------------
        
        if (onRefresh) {
            await onRefresh();
        }
        
        // Se estiver com modal aberto, atualiza o objeto local
        if (selectedOrder && selectedOrder.PED_IN_CODIGO === order.PED_IN_CODIGO) {
            setSelectedOrder({ ...selectedOrder, PED_ST_STATUS: newStatusText });
            // Recarrega appointments para aparecer no modal
            loadAppointments();
        }

    } catch (error) {
        alert('Erro ao mover etapa. Tente novamente.');
        console.error(error);
    } finally {
        setMovingOrder(null);
    }
  };

  const handleToggleHot = async (order: any) => {
      if (!order) return;
      const newVal = !order.IS_HOT;
      
      // ATUALIZAÇÃO OTIMISTA (Optimistic UI)
      // Atualiza visualmente imediatamente para melhor experiência
      if (selectedOrder) {
          setSelectedOrder({ ...selectedOrder, IS_HOT: newVal });
      }

      setTogglingHot(true);
      try {
          const keys = { 
            fil: Number(order.FIL_IN_CODIGO), 
            ser: String(order.SER_ST_CODIGO).trim(), 
            ped: Number(order.PED_IN_CODIGO) 
          };
          
          await updateOrderHotStatus(keys, newVal);
          
          if (onRefresh) {
              await onRefresh();
          }
          
      } catch (error: any) {
          console.error("Erro ao atualizar Hot Lead:", error);
          const msg = error.message || '';
          
          // Se o erro for de schema/coluna inexistente, mantemos o estado otimista
          // e apenas logamos o aviso (ou mostramos toast sutil) em vez de alert/revert.
          if (msg.includes('schema cache') || msg.includes('column') || msg.includes('is_hot')) {
             console.warn("Aviso: Coluna 'is_hot' ausente no DB. Estado mantido visualmente.");
          } else {
             // Se for outro erro (rede, etc), revertemos
             if (selectedOrder) {
                 setSelectedOrder({ ...selectedOrder, IS_HOT: !newVal });
             }
             alert('Erro ao salvar status: ' + msg);
          }
      } finally {
          setTogglingHot(false);
      }
  };

  const handleSaveEvent = async () => {
      if (!newEvent.title || !newEvent.start_date || !newEvent.start_time) {
          alert('Preencha os campos obrigatórios (*)');
          return;
      }
      
      const payload = { ...newEvent } as CRMAppointment;
      await upsertCRMAppointment(payload);
      setShowEventModal(false);
      loadAppointments();
      setNewEvent({
        req_confirmation: false, notify_email: true, hide_appointment: false,
        recurrence: 'UNICO', activity_type: 'REUNIAO', priority: 'MEDIA', status: 'AGENDADO',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        start_time: '09:00', end_time: '10:00'
      });
  };

  const handleRegisterFollowUp = async () => {
      if (!followUpData.order) return;
      if (!followUpData.notes) {
          alert("Digite uma nota sobre o follow-up.");
          return;
      }
      if (!followUpData.date || !followUpData.time) {
          alert("Data e hora são obrigatórios.");
          return;
      }

      const historyEntry: CRMAppointment = {
          id: editingFollowUpId || '', // Se tiver ID, usa ele para update
          title: `Follow-up: ${followUpData.order.CLIENTE_NOME}`,
          start_date: followUpData.date,
          end_date: followUpData.date,
          start_time: followUpData.time,
          end_time: followUpData.time,
          activity_type: followUpData.type,
          priority: 'MEDIA',
          status: 'CONCLUIDO', // Importante: Já nasce concluído
          recurrence: 'UNICO',
          description: `[FOLLOW-UP ORÇAMENTO #${followUpData.order.PED_IN_CODIGO}] ${followUpData.notes}`,
          client_name: followUpData.order.CLIENTE_NOME,
          rep_in_codigo: Number(followUpData.order.REP_IN_CODIGO),
          req_confirmation: false, 
          notify_email: false, 
          hide_appointment: false
      };

      try {
          await upsertCRMAppointment(historyEntry);
          setShowFollowUpModal(false);
          setFollowUpData({ 
              type: 'TELEFONEMA', 
              notes: '', 
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
              order: null 
          });
          setEditingFollowUpId(null);
          loadAppointments(); // Recarrega para aparecer na timeline
          alert(editingFollowUpId ? "Follow-up atualizado com sucesso!" : "Follow-up registrado com sucesso!");
      } catch (e) {
          alert("Erro ao salvar follow-up.");
      }
  };

  const handleEditFollowUp = (appt: CRMAppointment) => {
      if (selectedOrder) {
          // Edição via Modal do Pedido
          const cleanNotes = (appt.description || '').replace(`[FOLLOW-UP ORÇAMENTO #${selectedOrder.PED_IN_CODIGO}] `, '').trim();
          setFollowUpData({
              type: appt.activity_type as any,
              notes: cleanNotes,
              date: appt.start_date,
              time: appt.start_time,
              order: selectedOrder
          });
          setEditingFollowUpId(appt.id);
          setShowFollowUpModal(true);
      } else {
          // Edição via Lista Geral (Se necessário futuramente)
      }
  };

  const handleDeleteClick = (id: string) => {
      setDeleteFollowUpId(id);
  };

  const confirmDeleteFollowUp = async () => {
      if (!deleteFollowUpId) return;
      try {
          await deleteCRMAppointment(deleteFollowUpId);
          loadAppointments();
      } catch (e) {
          alert("Erro ao excluir registro.");
      } finally {
          setDeleteFollowUpId(null);
      }
  };

  const openFollowUpModal = (order: PipelineItem) => {
      const now = new Date();
      setFollowUpData({ 
          type: 'TELEFONEMA', 
          notes: '', 
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
          order 
      });
      setEditingFollowUpId(null); // Garante modo de criação
      setShowFollowUpModal(true);
  };

  // --- LÓGICA DA CARTEIRA DE CLIENTES ---
  const clientsWallet = useMemo(() => {
    const map = new Map<number, ClientWalletItem>();
    // Safeguard para evitar erro de leitura de length se salesData for undefined
    const safeSalesData = Array.isArray(salesData) ? salesData : [];
    const safeData = Array.isArray(data) ? data : [];
    const sourceData = safeSalesData.length > 0 ? safeSalesData : safeData;

    sourceData.forEach(sale => {
      const cliId = Number(sale.CLI_IN_CODIGO);
      if (!cliId) return;

      if (!map.has(cliId)) {
        map.set(cliId, {
          id: cliId,
          name: sale.CLIENTE_NOME || 'DESCONHECIDO',
          totalSpent: 0,
          ordersCount: 0,
          lastPurchaseDate: sale.PED_DT_EMISSAO,
          repName: sale.REPRESENTANTE_NOME,
          history: [] 
        });
      }

      const client = map.get(cliId)!;
      const val = Number(sale.ITP_RE_VALORMERCADORIA || 0);
      client.totalSpent += val;
      client.ordersCount += 1;
      
      if (sale.PED_DT_EMISSAO > client.lastPurchaseDate) {
        client.lastPurchaseDate = sale.PED_DT_EMISSAO;
      }
      client.history.push(sale);
    });

    let clientsList = Array.from(map.values());

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      clientsList = clientsList.filter(c => 
        String(c.name).toLowerCase().includes(lower) || 
        String(c.id).includes(lower)
      );
    }

    return clientsList.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [salesData, data, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-in fade-in duration-300">
      {/* Header CRM */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-rose-600 text-white rounded-lg shadow-sm">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">CRM Operacional</h2>
            <p className="text-[10px] text-gray-500">Gestão de Relacionamento e Oportunidades</p>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-md border border-gray-200">
          <button 
            onClick={() => setActiveTab('PIPELINE')}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all ${activeTab === 'PIPELINE' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Kanban size={14} /> Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('FOLLOWUP')}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all ${activeTab === 'FOLLOWUP' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <History size={14} /> Follow-up
          </button>
          <button 
            onClick={() => setActiveTab('CLIENTES')}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all ${activeTab === 'CLIENTES' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Building2 size={14} /> Carteira Clientes
          </button>
          <button 
            onClick={() => setActiveTab('AGENDA')}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all ${activeTab === 'AGENDA' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Calendar size={14} /> Agenda
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-hidden p-4">
        
        {activeTab === 'PIPELINE' && (
          <div className="h-full flex flex-col gap-2">
            {/* Toolbar de Filtros do Pipeline */}
            <div className="bg-white border border-gray-200 p-2 shadow-sm rounded-sm flex flex-wrap items-center gap-2 shrink-0 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 mr-2">
                    <Filter size={14} className="text-gray-400" />
                    <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Filtros</span>
                </div>
                
                <select 
                    className="bg-gray-50 border border-gray-200 text-[10px] rounded-sm px-2 py-1 outline-none focus:border-rose-500 w-48"
                    value={pipelineFilters.rep}
                    onChange={(e) => setPipelineFilters({...pipelineFilters, rep: e.target.value})}
                >
                    <option value="">Todos Representantes</option>
                    {uniqueReps.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>

                <div className="flex items-center gap-1 border border-gray-200 rounded-sm bg-gray-50 px-2 py-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Emissão:</span>
                    <input 
                        type="date" 
                        className="bg-transparent text-[10px] outline-none w-24"
                        value={pipelineFilters.startDate}
                        onChange={(e) => setPipelineFilters({...pipelineFilters, startDate: e.target.value})}
                    />
                    <span className="text-gray-300">-</span>
                    <input 
                        type="date" 
                        className="bg-transparent text-[10px] outline-none w-24"
                        value={pipelineFilters.endDate}
                        onChange={(e) => setPipelineFilters({...pipelineFilters, endDate: e.target.value})}
                    />
                </div>

                <button 
                    onClick={() => setPipelineFilters({...pipelineFilters, onlyHot: !pipelineFilters.onlyHot})}
                    className={`flex items-center gap-1 px-3 py-1 rounded-sm border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        pipelineFilters.onlyHot 
                        ? 'bg-orange-50 border-orange-200 text-orange-600' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <Flame size={12} className={pipelineFilters.onlyHot ? 'fill-orange-600' : ''} />
                    Só Quentes
                </button>

                <button 
                    onClick={handleExportPipeline}
                    className="flex items-center gap-1 px-3 py-1 rounded-sm border border-green-200 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest hover:bg-green-100 transition-colors ml-auto md:ml-0"
                    title="Exportar Funil para Excel"
                >
                    <FileSpreadsheet size={12} />
                    Exportar Funil
                </button>

                {(pipelineFilters.rep || pipelineFilters.startDate || pipelineFilters.endDate || pipelineFilters.onlyHot) && (
                    <button 
                        onClick={() => setPipelineFilters({ rep: '', startDate: '', endDate: '', onlyHot: false })}
                        className="ml-auto text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        title="Limpar Filtros"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              {STAGES.map((stage, stageIndex) => {
                const col = pipelineColumns[stage.id];
                return (
                  <div key={stage.id} className="flex-1 min-w-[280px] max-w-[350px] flex flex-col h-full">
                    <div className={`p-3 rounded-t-md border-t-4 bg-white border-x border-b border-gray-200 shadow-sm mb-3 flex justify-between items-center ${col.color}`}>
                      <div className="flex items-center gap-2">
                        <col.icon size={14} className="text-gray-400" />
                        <h3 className="text-[11px] font-bold uppercase text-gray-700">{col.title}</h3>
                      </div>
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {col.items.length}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                      {col.items.map((item, idx) => (
                        <div 
                          key={`${item.PED_IN_CODIGO}-${idx}`} 
                          onClick={() => { setSelectedOrder(item); setModalTab('ITENS'); }}
                          className={`p-3 rounded shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden
                            ${movingOrder === String(item.PED_IN_CODIGO) ? 'opacity-50 pointer-events-none' : ''}
                            ${item.IS_HOT ? 'bg-orange-50/30 border-2 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-white border border-gray-200'}
                          `}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${col.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                          <div className="pl-2">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[9px] font-mono text-gray-400">#{item.PED_IN_CODIGO}</span>
                              <div className="flex items-center gap-2">
                                  {item.IS_HOT && <Flame size={12} className="text-orange-500 fill-orange-500 animate-pulse" title="Orçamento Quente" />}
                                  <span className="text-[9px] font-bold text-gray-400">{formatDate(item.PED_DT_EMISSAO)}</span>
                              </div>
                            </div>
                            <h4 className="text-[11px] font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{item.CLIENTE_NOME}</h4>
                            <p className="text-[10px] text-gray-500 mb-3 truncate">{item.REPRESENTANTE_NOME}</p>
                            
                            <div className="flex justify-between items-end border-t border-gray-50 pt-2">
                              <div>
                                <p className="text-[9px] text-gray-400 uppercase">Valor Est.</p>
                                <p className="text-sm font-bold text-gray-800">{formatCurrency(item.TOTAL_VALOR)}</p>
                              </div>
                              
                              {/* Quick Move Arrows */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                  {stageIndex > 0 && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleMoveStage(item, STAGES[stageIndex - 1].id); }}
                                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900" 
                                          title="Mover para Anterior"
                                      >
                                          <ArrowLeft size={12} />
                                      </button>
                                  )}
                                  {stageIndex < STAGES.length - 1 && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleMoveStage(item, STAGES[stageIndex + 1].id); }}
                                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900" 
                                          title="Mover para Próximo"
                                      >
                                          <ArrowRight size={12} />
                                      </button>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {col.items.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-gray-200 rounded-md flex items-center justify-center text-gray-300 text-[10px] uppercase font-bold">
                          Vazio
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 p-2 bg-white border border-gray-200 rounded shadow-sm text-center">
                      <p className="text-[9px] text-gray-400 uppercase">Total na Coluna</p>
                      <p className="text-xs font-bold text-gray-700">
                        {formatCurrency(col.items.reduce((acc, curr) => acc + curr.TOTAL_VALOR, 0))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- FOLLOW UP TAB --- */}
        {activeTab === 'FOLLOWUP' && (
            <div className="h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden animate-in fade-in">
                <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder={followUpViewMode === 'OPPORTUNITIES' ? "Buscar Orçamento..." : "Buscar no Histórico..."}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500 transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Toggle View Mode */}
                        <div className="flex bg-gray-100 p-0.5 rounded-sm border border-gray-200">
                            <button 
                                onClick={() => setFollowUpViewMode('OPPORTUNITIES')}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all ${followUpViewMode === 'OPPORTUNITIES' ? 'bg-white shadow-sm text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LayoutGrid size={12} /> Oportunidades
                            </button>
                            <button 
                                onClick={() => setFollowUpViewMode('HISTORY')}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all ${followUpViewMode === 'HISTORY' ? 'bg-white shadow-sm text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <List size={12} /> Histórico Geral
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {followUpViewMode === 'OPPORTUNITIES' ? (
                            <div className="text-[10px] text-gray-500">
                                Oportunidades em aberto: <strong>{followUpList.length}</strong>
                            </div>
                        ) : (
                            <button 
                                onClick={() => handleExportAppointments('Relatorio_FollowUp')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-green-100 transition-colors"
                            >
                                <FileSpreadsheet size={14} /> Exportar Relatório
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-gray-50">
                    {followUpViewMode === 'OPPORTUNITIES' ? (
                        // MODO: Oportunidades (Cards)
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in">
                            {followUpList.map((order, idx) => (
                                <div key={idx} className="bg-white border border-gray-200 rounded shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                                    {order.IS_HOT && <div className="absolute top-0 right-0 p-1.5"><Flame size={14} className="text-orange-500 fill-orange-500 animate-pulse" /></div>}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase">#{order.PED_IN_CODIGO}</span>
                                            <span className="text-[9px] font-bold text-gray-400">{formatDate(order.PED_DT_EMISSAO)}</span>
                                        </div>
                                        <h4 className="text-xs font-bold text-gray-900 mb-1 line-clamp-2" title={order.CLIENTE_NOME}>{order.CLIENTE_NOME}</h4>
                                        <p className="text-[10px] text-gray-500 mb-4">{order.REPRESENTANTE_NOME}</p>
                                        
                                        <div className="flex justify-between items-center py-2 border-t border-gray-50">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Valor</span>
                                            <span className="text-sm font-bold text-gray-800">{formatCurrency(order.TOTAL_VALOR)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-2">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Status</span>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase">{order.PED_ST_STATUS || 'ABERTO'}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openFollowUpModal(order)}
                                        className="w-full mt-2 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 hover:border-rose-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <History size={14} /> Registrar Follow-up
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // MODO: Histórico (Tabela)
                        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden animate-in fade-in">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Data / Hora</th>
                                        <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Cliente</th>
                                        <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">Tipo</th>
                                        <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Descrição</th>
                                        <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {historyList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-gray-400 text-xs uppercase font-bold">Nenhum registro encontrado.</td>
                                        </tr>
                                    ) : (
                                        historyList.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-900">{formatDate(item.start_date)}</span>
                                                        <span className="text-[9px] text-gray-400">{item.start_time}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-xs font-bold text-gray-800">{item.client_name}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded-full border ${
                                                        item.activity_type === 'TELEFONEMA' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        item.activity_type === 'EMAIL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                        item.activity_type === 'REUNIAO' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                        'bg-gray-50 text-gray-700 border-gray-100'
                                                    }`}>
                                                        {item.activity_type}
                                                    </span>
                                                </td>
                                                <td className="p-3 max-w-md">
                                                    <p className="text-[10px] text-gray-600 line-clamp-2" title={item.description}>{item.description}</p>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteClick(item.id)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                        title="Excluir Registro"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* ... (Lógica da Tab Clientes permanece igual) ... */}
        {activeTab === 'CLIENTES' && (
          <div className="h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
            {/* Toolbar Clientes */}
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar Cliente ou CNPJ..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4 text-[10px] text-gray-500">
                <span>Total Clientes: <strong>{clientsWallet.length}</strong></span>
                <span>Ticket Médio Geral: <strong>{formatCurrency(clientsWallet.reduce((acc, c) => acc + c.totalSpent, 0) / (clientsWallet.reduce((acc, c) => acc + c.ordersCount, 0) || 1))}</strong></span>
              </div>
            </div>

            {/* Tabela de Clientes */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b">Cliente / Razão Social</th>
                    <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b text-center">Última Compra</th>
                    <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b text-center">Pedidos</th>
                    <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b text-right">LTV (Total Gasto)</th>
                    <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b text-right">Ticket Médio</th>
                    <th className="p-3 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientsWallet.slice(0, 100).map((client) => (
                    <tr key={client.id} className="hover:bg-rose-50/30 transition-colors group">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                            {client.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{client.name}</p>
                            <p className="text-[9px] text-gray-400 flex items-center gap-1">
                              ID: {client.id} • Rep: {client.repName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[10px] font-medium text-gray-700">{formatDate(client.lastPurchaseDate)}</span>
                          {/* Badge de Recência */}
                          {new Date().getTime() - new Date(client.lastPurchaseDate).getTime() > 1000 * 60 * 60 * 24 * 90 && (
                            <span className="text-[8px] text-red-500 font-bold uppercase">Inativo +90d</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center text-xs font-mono text-gray-600">{client.ordersCount}</td>
                      <td className="p-3 text-right">
                        <span className="text-xs font-bold text-gray-900">{formatCurrency(client.totalSpent)}</span>
                      </td>
                      <td className="p-3 text-right">
                         <span className="text-xs font-medium text-gray-500">{formatCurrency(client.totalSpent / client.ordersCount)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => setSelectedClient(client)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Ver Detalhes do Cliente"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clientsWallet.length > 100 && (
                <div className="p-4 text-center text-[10px] text-gray-400 uppercase font-bold border-t">
                  Exibindo top 100 de {clientsWallet.length} clientes. Use a busca para encontrar outros.
                </div>
              )}
            </div>
          </div>
        )}

        {/* AGENDA TAB */}
        {activeTab === 'AGENDA' && (
            <div className="h-full flex flex-col bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden animate-in fade-in">
                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-700 flex items-center gap-2">
                        <Calendar size={14} /> Próximos Compromissos
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleExportAppointments('Relatorio_Agenda')}
                            className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-green-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <FileSpreadsheet size={14} /> Exportar
                        </button>
                        <button 
                            onClick={() => setShowEventModal(true)}
                            className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={14} /> Novo Compromisso
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-100">
                    <div className="space-y-3">
                        {appointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Calendar size={48} className="mb-2 opacity-50" />
                                <p className="text-xs font-medium">Nenhum compromisso agendado.</p>
                            </div>
                        ) : (
                            appointments.map(evt => (
                                <div key={evt.id} className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${evt.priority === 'CRITICA' ? 'bg-red-500' : evt.priority === 'ALTA' ? 'bg-orange-500' : evt.priority === 'MEDIA' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-gray-100 pr-4">
                                        <span className="text-xs font-bold text-gray-500 uppercase">{new Date(evt.start_date).toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                        <span className="text-2xl font-black text-gray-900">{new Date(evt.start_date).getDate()}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(evt.start_date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-sm font-bold text-gray-900">{evt.title}</h4>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${evt.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {evt.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 mb-2 flex items-center gap-1"><Building2 size={12} className="text-gray-400"/> {evt.client_name || 'Cliente Geral'}</p>
                                        <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {evt.start_time} - {evt.end_time}</span>
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {evt.location || 'Sem local definido'}</span>
                                            <span className="flex items-center gap-1"><Flag size={12} /> Prioridade: {evt.priority}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteCRMAppointment(evt.id).then(loadAppointments)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><XCircle size={18}/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Modal Registro de Follow-up (Z-INDEX AUMENTADO para 200) */}
      {showFollowUpModal && followUpData.order && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                            <History size={16} /> {editingFollowUpId ? 'Editar Follow-up' : 'Registrar Follow-up'}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">Orçamento #{followUpData.order.PED_IN_CODIGO} - {followUpData.order.CLIENTE_NOME}</p>
                      </div>
                      <button onClick={() => setShowFollowUpModal(false)} className="text-gray-400 hover:text-red-500"><XCircle size={20}/></button>
                  </div>
                  
                  <div className="p-6 bg-white space-y-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tipo de Contato</label>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                              <button onClick={() => setFollowUpData({...followUpData, type: 'TELEFONEMA'})} className={`flex items-center gap-2 p-3 border rounded text-xs font-bold transition-all ${followUpData.type === 'TELEFONEMA' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                  <Phone size={16} /> Telefone
                              </button>
                              <button onClick={() => setFollowUpData({...followUpData, type: 'EMAIL'})} className={`flex items-center gap-2 p-3 border rounded text-xs font-bold transition-all ${followUpData.type === 'EMAIL' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                  <Mail size={16} /> E-mail
                              </button>
                              <button onClick={() => setFollowUpData({...followUpData, type: 'COMPROMISSO'})} className={`flex items-center gap-2 p-3 border rounded text-xs font-bold transition-all ${followUpData.type === 'COMPROMISSO' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                  <MessageCircle size={16} /> WhatsApp
                              </button>
                              <button onClick={() => setFollowUpData({...followUpData, type: 'REUNIAO'})} className={`flex items-center gap-2 p-3 border rounded text-xs font-bold transition-all ${followUpData.type === 'REUNIAO' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                  <Users size={16} /> Reunião
                              </button>
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Data e Hora da Interação</label>
                          <div className="flex gap-3">
                              <input 
                                  type="date" 
                                  className="flex-1 p-2 border border-gray-300 rounded text-xs outline-none focus:border-rose-500 transition-colors"
                                  value={followUpData.date}
                                  onChange={e => setFollowUpData({...followUpData, date: e.target.value})}
                              />
                              <input 
                                  type="time" 
                                  className="w-32 p-2 border border-gray-300 rounded text-xs outline-none focus:border-rose-500 transition-colors"
                                  value={followUpData.time}
                                  onChange={e => setFollowUpData({...followUpData, time: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Resumo da Conversa <span className="text-red-500">*</span></label>
                          <textarea 
                            className="w-full p-3 border border-gray-300 rounded text-xs outline-none h-32 resize-none focus:border-rose-500 transition-colors" 
                            placeholder="Descreva o que foi conversado com o cliente..." 
                            value={followUpData.notes} 
                            onChange={e => setFollowUpData({...followUpData, notes: e.target.value})} 
                            autoFocus
                          />
                      </div>
                  </div>

                  <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowFollowUpModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold uppercase rounded hover:bg-gray-100 transition-colors">Cancelar</button>
                      <button onClick={handleRegisterFollowUp} className="px-6 py-2 bg-rose-600 text-white text-xs font-bold uppercase rounded hover:bg-rose-700 transition-colors shadow-md flex items-center gap-2">
                          <Check size={14} /> {editingFollowUpId ? 'Salvar Alterações' : 'Registrar Interação'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Criar Evento Agenda */}
      {showEventModal && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-3xl max-h-[90vh] shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                          <Calendar size={16} /> Novo Compromisso
                      </h3>
                      <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-red-500"><XCircle size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white space-y-6">
                      {/* Responsável */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Responsável <span className="text-red-500">*</span></label>
                          <div className="flex items-center gap-2 p-2 border border-gray-200 bg-gray-50 rounded text-xs text-gray-700">
                              <User size={14} /> Usuário Atual (Representante)
                          </div>
                      </div>

                      {/* Assunto */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Assunto <span className="text-red-500">*</span></label>
                          <input type="text" className="w-full p-2 border border-gray-300 rounded text-xs outline-none focus:border-rose-500 transition-colors" placeholder="Ex: Visita Técnica Mensal" value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                      </div>

                      {/* Datas e Horas */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded border border-gray-100">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Data de Início <span className="text-red-500">*</span></label>
                              <input type="date" className="w-full p-1.5 border border-gray-300 rounded text-xs" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hora de Início <span className="text-red-500">*</span></label>
                              <input type="time" className="w-full p-1.5 border border-gray-300 rounded text-xs" value={newEvent.start_time} onChange={e => setNewEvent({...newEvent, start_time: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Hora de Término <span className="text-red-500">*</span></label>
                              <input type="time" className="w-full p-1.5 border border-gray-300 rounded text-xs" value={newEvent.end_time} onChange={e => setNewEvent({...newEvent, end_time: e.target.value})} />
                          </div>
                      </div>

                      {/* Atividade */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Atividade <span className="text-red-500">*</span></label>
                          <div className="flex flex-wrap gap-4 mt-1">
                              {['REUNIAO', 'TELEFONEMA', 'COMPROMISSO', 'VISITA', 'EMAIL'].map(act => (
                                  <label key={act} className="flex items-center gap-1 cursor-pointer text-xs">
                                      <input type="radio" name="activity" value={act} checked={newEvent.activity_type === act} onChange={() => setNewEvent({...newEvent, activity_type: act as any})} className="accent-rose-600" />
                                      {act.charAt(0) + act.slice(1).toLowerCase()}
                                  </label>
                              ))}
                          </div>
                      </div>

                      {/* Prioridade */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Prioridade <span className="text-red-500">*</span></label>
                          <div className="flex flex-wrap gap-4 mt-1">
                              {[
                                  {val: 'BAIXA', color: 'bg-green-500'}, 
                                  {val: 'MEDIA', color: 'bg-yellow-500'}, 
                                  {val: 'ALTA', color: 'bg-orange-500'}, 
                                  {val: 'CRITICA', color: 'bg-red-500'}
                              ].map(p => (
                                  <label key={p.val} className="flex items-center gap-1 cursor-pointer text-xs">
                                      <input type="radio" name="priority" value={p.val} checked={newEvent.priority === p.val} onChange={() => setNewEvent({...newEvent, priority: p.val as any})} className="accent-rose-600" />
                                      <span className={`w-2 h-2 rounded-full ${p.color}`}></span>
                                      {p.val.charAt(0) + p.val.slice(1).toLowerCase()}
                                  </label>
                              ))}
                          </div>
                      </div>

                      {/* Conta (Cliente) e Local */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Conta (Cliente)</label>
                              <select 
                                  className="w-full p-2 border border-gray-300 rounded text-xs outline-none bg-white"
                                  value={newEvent.client_name || ''}
                                  onChange={e => setNewEvent({...newEvent, client_name: e.target.value})}
                              >
                                  <option value="">Selecione um cliente...</option>
                                  {clientsWallet.map(c => (
                                      <option key={c.id} value={c.name}>{c.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Local</label>
                              <input type="text" className="w-full p-2 border border-gray-300 rounded text-xs outline-none" placeholder="Endereço ou Link Reunião" value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                          </div>
                      </div>

                      {/* Descrição */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Descrição</label>
                          <textarea className="w-full p-2 border border-gray-300 rounded text-xs outline-none h-24 resize-none" placeholder="Detalhes do compromisso..." value={newEvent.description || ''} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                      </div>
                  </div>

                  <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setShowEventModal(false)} className="px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold uppercase rounded hover:bg-gray-100 transition-colors">Cancelar</button>
                      <button onClick={handleSaveEvent} className="px-6 py-2 bg-rose-600 text-white text-xs font-bold uppercase rounded hover:bg-rose-700 transition-colors shadow-md">Salvar Compromisso</button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Detalhe Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 bg-gray-900 text-white shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-rose-600 rounded-lg flex items-center justify-center text-xl font-bold">
                  {selectedClient.name.substring(0, 2)}
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
              <h2 className="text-lg font-bold leading-tight mb-1">{selectedClient.name}</h2>
              <p className="text-xs text-gray-400 font-mono">ID: {selectedClient.id}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-[9px] uppercase text-gray-500 font-bold">LTV (Total Gasto)</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(selectedClient.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-gray-500 font-bold">Última Compra</p>
                  <p className="text-sm font-bold text-white mt-1">{formatDate(selectedClient.lastPurchaseDate)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Histórico de Transações</h3>
              <div className="space-y-3 relative">
                 {/* Linha do tempo simples */}
                 <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                 {selectedClient.history.sort((a: any, b: any) => b.PED_IN_CODIGO - a.PED_IN_CODIGO).map((sale: any, idx: number) => (
                   <div key={idx} className="relative pl-8">
                     <div className={`absolute left-2 top-2 w-3.5 h-3.5 rounded-full border-2 border-white ${String(sale.PED_ST_STATUS).includes('FATURADO') ? 'bg-green-500' : String(sale.PED_ST_STATUS).includes('CANCEL') ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                     <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm">
                       <div className="flex justify-between items-start mb-1">
                         <span className="text-[10px] font-bold text-gray-900">Pedido #{sale.PED_IN_CODIGO}</span>
                         <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${String(sale.PED_ST_STATUS).includes('FATURADO') ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                           {sale.PED_ST_STATUS || sale.SITUACAO}
                         </span>
                       </div>
                       <p className="text-[10px] text-gray-500 mb-2">{formatDate(sale.PED_DT_EMISSAO)}</p>
                       <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                         <span className="text-[9px] text-gray-400 font-mono truncate max-w-[150px]">{sale.ITP_ST_DESCRICAO}</span>
                         <span className="text-xs font-bold text-gray-900">{formatCurrency(Number(sale.ITP_RE_VALORMERCADORIA))}</span>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
               <button className="w-full py-3 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-2">
                 <Mail size={14} /> Enviar Email
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe Pedido/Oportunidade (CRM Pipeline) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm">
             
             {/* Header do Pedido */}
             <div className="p-5 border-b bg-gray-900 text-white flex justify-between items-start shrink-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-black uppercase tracking-widest">
                      {selectedOrder.SER_ST_CODIGO === 'OV' ? 'Orçamento' : 'Pedido Venda'}
                    </span>
                    <h2 className="text-lg font-bold">#{selectedOrder.PED_IN_CODIGO}</h2>
                    {selectedOrder.IS_HOT && (
                        <span className="flex items-center gap-1 bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/50 text-orange-200 text-[10px] font-bold uppercase tracking-widest">
                            <Flame size={12} className="fill-orange-500 text-orange-500" /> Hot
                        </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-300">{selectedOrder.CLIENTE_NOME}</h3>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {formatDate(selectedOrder.PED_DT_EMISSAO)}</span>
                    <span className="flex items-center gap-1"><MapPin size={12}/> {selectedOrder.FILIAL_NOME || `Filial ${selectedOrder.FIL_IN_CODIGO}`}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
             </div>

             {/* Status Bar & Action Move */}
             <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${String(selectedOrder.PED_ST_STATUS).includes('FATURADO') ? 'bg-green-500' : String(selectedOrder.PED_ST_STATUS).includes('CANCEL') ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                  <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase">Status Atual</span>
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{selectedOrder.PED_ST_STATUS || 'STATUS DESCONHECIDO'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Hot Toggle */}
                    <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="peer sr-only" 
                                    checked={!!selectedOrder.IS_HOT} 
                                    onChange={() => handleToggleHot(selectedOrder)}
                                    disabled={togglingHot}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${selectedOrder.IS_HOT ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                <Flame size={12} className={selectedOrder.IS_HOT ? "fill-orange-500" : ""} />
                                {togglingHot ? '...' : 'Hot Lead'}
                            </span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-2 py-1 border border-gray-200 rounded-sm shadow-sm">
                        <span className="text-[9px] font-bold text-gray-500 uppercase mr-2">Mover Para:</span>
                        <select 
                            disabled={!!movingOrder}
                            className="bg-transparent text-[10px] font-bold uppercase text-gray-900 outline-none cursor-pointer hover:bg-gray-50 rounded px-1"
                            onChange={(e) => {
                                if (e.target.value) handleMoveStage(selectedOrder, e.target.value);
                            }}
                            value=""
                        >
                            <option value="" disabled>Selecionar Etapa...</option>
                            {STAGES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                        {movingOrder && <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>}
                    </div>
                </div>
             </div>

             {/* Abas */}
             <div className="px-5 border-b border-gray-200 bg-white flex gap-6">
                <button 
                  onClick={() => setModalTab('ITENS')}
                  className={`py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${modalTab === 'ITENS' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  <Package size={14} /> Itens do Pedido
                </button>
                <button 
                  onClick={() => setModalTab('HISTORICO')}
                  className={`py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${modalTab === 'HISTORICO' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  <History size={14} /> Histórico / Follow-up
                </button>
             </div>

             {/* Lista de Itens */}
             {modalTab === 'ITENS' && (
                 <div className="flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-gray-100 sticky top-0 z-10">
                       <tr>
                         <th className="px-4 py-2 text-[9px] font-black uppercase text-gray-500 tracking-widest border-b">Produto</th>
                         <th className="px-4 py-2 text-[9px] font-black uppercase text-gray-500 tracking-widest border-b text-center">Qtd.</th>
                         <th className="px-4 py-2 text-[9px] font-black uppercase text-gray-500 tracking-widest border-b text-right">Unitário</th>
                         <th className="px-4 py-2 text-[9px] font-black uppercase text-gray-500 tracking-widest border-b text-right">Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {selectedOrderItems.map((item, idx) => (
                         <tr key={idx} className="hover:bg-gray-50">
                           <td className="px-4 py-3">
                             <div className="flex items-center gap-2">
                                <Package size={14} className="text-gray-300" />
                                <div>
                                   <p className="text-[10px] font-bold text-gray-900">{item.ITP_ST_DESCRICAO}</p>
                                   <p className="text-[9px] text-gray-400 font-mono">{item.PRO_ST_ALTERNATIVO || item.PRO_IN_CODIGO}</p>
                                </div>
                             </div>
                           </td>
                           <td className="px-4 py-3 text-center text-xs font-mono text-gray-600">{Number(item.ITP_RE_QUANTIDADE)}</td>
                           <td className="px-4 py-3 text-right text-xs font-mono text-gray-600">{formatCurrency(Number(item.ITP_RE_VALORUNITARIO))}</td>
                           <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">{formatCurrency(Number(item.ITP_RE_VALORMERCADORIA))}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
             )}

             {/* Histórico / Timeline */}
             {modalTab === 'HISTORICO' && (
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Linha do Tempo</h4>
                       <button 
                         onClick={() => openFollowUpModal(selectedOrder)}
                         className="px-3 py-1.5 bg-rose-600 text-white text-[9px] font-bold uppercase tracking-widest rounded hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
                       >
                         <Plus size={12} /> Novo Registro
                       </button>
                    </div>
                    
                    <div className="relative space-y-6 pl-2">
                        {/* Linha Vertical */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200"></div>

                        {selectedOrderFollowUps.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <History size={32} className="mx-auto mb-2 opacity-50"/>
                                <p className="text-[10px] uppercase font-bold">Nenhum histórico registrado</p>
                            </div>
                        ) : (
                            selectedOrderFollowUps.map((event, idx) => (
                                <div key={idx} className="relative flex gap-4 group">
                                    <div className={`w-10 h-10 rounded-full border-4 border-gray-50 flex items-center justify-center shrink-0 z-10 shadow-sm ${
                                        event.activity_type === 'TELEFONEMA' ? 'bg-blue-100 text-blue-600' :
                                        event.activity_type === 'EMAIL' ? 'bg-indigo-100 text-indigo-600' :
                                        event.activity_type === 'REUNIAO' ? 'bg-purple-100 text-purple-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {event.activity_type === 'TELEFONEMA' ? <Phone size={16} /> :
                                         event.activity_type === 'EMAIL' ? <Mail size={16} /> :
                                         event.activity_type === 'REUNIAO' ? <Users size={16} /> :
                                         <MessageCircle size={16} />}
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow relative pr-12">
                                        <div className="absolute top-3 right-3 text-[9px] font-bold text-gray-400 flex flex-col items-end">
                                            <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                            <span>{event.start_time}</span>
                                        </div>
                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{event.activity_type}</p>
                                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description?.replace(/\[.*?\]/, '').trim()}</p>
                                        
                                        {/* Ações de Edição/Exclusão */}
                                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleEditFollowUp(event)} 
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" 
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(event.id)} 
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" 
                                                title="Excluir"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                 </div>
             )}

             {/* Footer Totais (Só aparece na Tab Itens) */}
             {modalTab === 'ITENS' && (
                 <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-6 shrink-0">
                    <div className="text-right">
                       <p className="text-[9px] font-black uppercase text-gray-400">Total Itens</p>
                       <p className="text-sm font-medium text-gray-600">{selectedOrderItems.reduce((acc, curr) => acc + Number(curr.ITP_RE_QUANTIDADE), 0)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black uppercase text-gray-400">Valor Total Pedido</p>
                       <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedOrder.TOTAL_VALOR)}</p>
                    </div>
                 </div>
             )}
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {deleteFollowUpId && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl border border-gray-200 p-6 text-center animate-in zoom-in-95 duration-200">
               <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
               </div>
               <h3 className="text-sm font-bold uppercase tracking-widest mb-2 text-gray-900">Confirmar Exclusão</h3>
               <p className="text-xs text-gray-500 mb-6 font-medium">Tem certeza que deseja remover este registro do histórico?</p>
               <div className="flex gap-3 justify-center">
                  <button onClick={() => setDeleteFollowUpId(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-xs font-bold uppercase rounded hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={confirmDeleteFollowUp} className="flex-1 px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase rounded hover:bg-red-700 transition-colors shadow-sm">Excluir</button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};