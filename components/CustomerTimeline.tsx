import React from 'react';
import { Sale, CRMAppointment, CRMTask } from '../types';
import { Calendar, CheckCircle2, Clock, FileText, MessageSquare, Phone, User, XCircle } from 'lucide-react';

const normalizeString = (str?: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

interface CustomerTimelineProps {
  clientName: string;
  clientId: number;
  salesHistory: Sale[];
  appointments: CRMAppointment[];
  tasks: CRMTask[];
  onClose: () => void;
  isEmbedded?: boolean;
}

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({
  clientName,
  clientId,
  salesHistory,
  appointments,
  tasks,
  onClose,
  isEmbedded = false
}) => {
  // Combine and sort all events
  const events = React.useMemo(() => {
    const allEvents: any[] = [];

    // Sales (Orders)
    salesHistory.forEach(sale => {
      // Only add unique orders (since salesHistory has items)
      if (!allEvents.some(e => e.type === 'ORDER' && e.id === sale.PED_IN_CODIGO)) {
        allEvents.push({
          id: sale.PED_IN_CODIGO,
          type: 'ORDER',
          date: sale.PED_DT_EMISSAO,
          title: `Pedido #${sale.PED_IN_CODIGO}`,
          description: `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.ITN_RE_VALORTOTAL || sale.TOTAL_VALOR || 0)} - Status: ${sale.PED_ST_STATUS}`,
          status: sale.PED_ST_STATUS,
          icon: FileText,
          color: 'bg-blue-100 text-blue-600'
        });
      }
    });

    // Appointments (Follow-ups / Interações)
    appointments.forEach(appt => {
      // Se tem client_id: usa SOMENTE o ID (sem fallback de nome para evitar contaminar homônimos)
      if (appt.client_id != null && appt.client_id !== 0) {
        if (Number(appt.client_id) !== clientId) return; // não pertence a este cliente
      } else {
        // Sem client_id: usa nome normalizado
        if (normalizeString(appt.client_name) !== normalizeString(clientName)) {
          // Tenta fallback por tag de pedido
          if (appt.description?.includes('[FOLLOW-UP ORÇAMENTO #')) {
            const orderMatch = appt.description.match(/#(\d+)/);
            if (orderMatch) {
              const orderNum = Number(orderMatch[1]);
              const belongsToThisClient = salesHistory.some(s => Number(s.PED_IN_CODIGO) === orderNum);
              if (!belongsToThisClient) return;
            } else {
              return;
            }
          } else {
            return;
          }
        }
      }

      allEvents.push({
        id: appt.id,
        type: 'MEETING',
        date: appt.start_date,
        title: appt.title,
        description: appt.description || 'Sem descrição',
        status: appt.status,
        icon: Calendar,
        color: 'bg-purple-100 text-purple-600'
      });
    });

    // Tasks (Tarefas)
    tasks.forEach(task => {
      // Se tem client_id: usa SOMENTE o ID (sem fallback de nome)
      if (task.client_id != null && task.client_id !== 0) {
        if (Number(task.client_id) !== clientId) return;
      } else {
        // Sem client_id: usa nome normalizado
        if (normalizeString(task.client_name) !== normalizeString(clientName)) {
          // Tenta fallback por tag de pedido
          if (task.description?.includes('#')) {
            const orderMatch = task.description.match(/#(\d+)/);
            if (orderMatch) {
              const orderNum = Number(orderMatch[1]);
              const belongsToThisClient = salesHistory.some(s => Number(s.PED_IN_CODIGO) === orderNum);
              if (!belongsToThisClient) return;
            } else {
              return;
            }
          } else {
            return;
          }
        }
      }

      allEvents.push({
        id: task.id,
        type: 'TASK',
        date: task.due_date || (task.created_at ? task.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        title: task.title,
        description: task.description || 'Sem descrição',
        status: task.status,
        icon: CheckCircle2,
        color: 'bg-green-100 text-green-600'
      });
    });

    return allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesHistory, appointments, tasks, clientName, clientId]);

  const content = (
    <div className={`${isEmbedded ? 'h-full flex flex-col' : 'w-full max-w-md h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300'}`}>
      {!isEmbedded && (
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Linha do Tempo</h2>
            <p className="text-[10px] text-gray-500 font-medium">{clientName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <XCircle size={20} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
          {events.length === 0 ? (
            <div className="ml-6 text-center py-10">
              <p className="text-gray-400 text-xs">Nenhum histórico encontrado.</p>
            </div>
          ) : (
            events.map((event, idx) => (
              <div key={`${event.type}-${event.id}-${idx}`} className="relative ml-6">
                <span className={`absolute -left-[33px] top-0 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white ${event.color}`}>
                  <event.icon size={14} />
                </span>
                <div className="flex flex-col bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-bold text-gray-900">{event.title}</h3>
                    <span className="text-[9px] font-medium text-gray-400 whitespace-nowrap">
                      {new Date(event.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-bold rounded uppercase tracking-wider">
                      {event.type === 'ORDER' ? 'PEDIDO' : event.type === 'MEETING' ? 'REUNIÃO' : 'TAREFA'}
                    </span>
                    {event.status && (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[8px] font-bold rounded uppercase tracking-wider border border-gray-200">
                        {event.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (isEmbedded) return content;

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-end animate-in fade-in duration-200">
      {content}
    </div>
  );
};
