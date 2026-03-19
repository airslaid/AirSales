import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Calendar, Clock, AlertCircle, AlertTriangle, User } from 'lucide-react';
import { AppUser, CRMTask, CRMAppointment, Ocorrencia } from '../types';
import { fetchCRMTasks, fetchCRMAppointments, fetchOcorrencias } from '../services/supabaseService';

interface NotificationsMenuProps {
  currentUser: AppUser | null;
  onNotificationClick?: (type: 'TASK' | 'APPOINTMENT' | 'OCORRENCIA', id: string) => void;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ currentUser, onNotificationClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [appointments, setAppointments] = useState<CRMAppointment[]>([]);
  const [ocorrenciaNotifs, setOcorrenciaNotifs] = useState<{id: string, ocorrenciaId: string, title: string, subtitle: string, type: 'AVISO' | 'PRAZO', date?: string}[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load dismissed notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('airsales_dismissed_notifications');
    if (saved) {
      try {
        setDismissedIds(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing dismissed notifications:", e);
      }
    }
  }, []);

  const dismissNotification = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('airsales_dismissed_notifications', JSON.stringify(newDismissed));
  };

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [allTasks, allAppointments, allOcorrencias] = await Promise.all([
        fetchCRMTasks(),
        fetchCRMAppointments(),
        fetchOcorrencias()
      ]);

      // Filter Tasks: Pending and assigned to current user
      const myTasks = allTasks.filter(t => 
        t.status === 'PENDENTE' && 
        Number(t.rep_in_codigo) === Number(currentUser.rep_in_codigo)
      );

      // Filter Appointments: Scheduled/Pending and assigned to current user
      // We can also filter by date if needed, but "Novos Follow Ups" implies all pending ones
      const myAppointments = allAppointments.filter(a => 
        (a.status === 'AGENDADO' || a.status === 'EM_ANDAMENTO') &&
        Number(a.rep_in_codigo) === Number(currentUser.rep_in_codigo)
      );

      // Filter Ocorrencias
      const myOcorrencias = allOcorrencias.filter(o => o.responsible === currentUser.name);
      const newOcorrenciaNotifs: typeof ocorrenciaNotifs = [];

      const isDeadlineApproaching = (deadlineStr: string | null | undefined, completedStr: string | null | undefined) => {
        if (!deadlineStr || completedStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(deadlineStr);
        deadline.setHours(0, 0, 0, 0);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
      };

      myOcorrencias.forEach(o => {
        if (o.opening_notice) {
          newOcorrenciaNotifs.push({
            id: `${o.id}-aviso`,
            ocorrenciaId: o.id,
            title: `Aviso de Abertura: RO ${o.ro_number}`,
            subtitle: o.description,
            type: 'AVISO'
          });
        }

        if (isDeadlineApproaching(o.immediate_action_deadline, o.immediate_action_completed)) {
          newOcorrenciaNotifs.push({
            id: `${o.id}-imediata`,
            ocorrenciaId: o.id,
            title: `Ação Imediata: RO ${o.ro_number}`,
            subtitle: 'Prazo vencendo ou vencido',
            type: 'PRAZO',
            date: o.immediate_action_deadline || undefined
          });
        }

        if (isDeadlineApproaching(o.cause_analysis_deadline, o.cause_analysis_completed)) {
          newOcorrenciaNotifs.push({
            id: `${o.id}-causa`,
            ocorrenciaId: o.id,
            title: `Análise de Causa: RO ${o.ro_number}`,
            subtitle: 'Prazo vencendo ou vencido',
            type: 'PRAZO',
            date: o.cause_analysis_deadline || undefined
          });
        }

        if (isDeadlineApproaching(o.corrective_action_deadline, o.corrective_action_completed)) {
          newOcorrenciaNotifs.push({
            id: `${o.id}-corretiva`,
            ocorrenciaId: o.id,
            title: `Ação Corretiva: RO ${o.ro_number}`,
            subtitle: 'Prazo vencendo ou vencido',
            type: 'PRAZO',
            date: o.corrective_action_deadline || undefined
          });
        }
      });

      setTasks(myTasks.filter(t => !dismissedIds.includes(t.id)));
      setAppointments(myAppointments.filter(a => !dismissedIds.includes(a.id)));
      setOcorrenciaNotifs(newOcorrenciaNotifs.filter(n => !dismissedIds.includes(n.id)));
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      // Poll every minute
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser, dismissedIds]); // Added dismissedIds to re-filter if something is dismissed

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCount = tasks.length + appointments.length + ocorrenciaNotifs.length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full relative transition-colors"
        title="Notificações"
      >
        <Bell size={20} />
        {totalCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Notificações</h3>
            <button 
              onClick={loadNotifications} 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Atualizar
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && tasks.length === 0 && appointments.length === 0 && ocorrenciaNotifs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Carregando...</div>
            ) : totalCount === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="opacity-20" />
                <span className="text-sm">Tudo em dia! Nenhuma pendência.</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Ocorrencias Section */}
                {ocorrenciaNotifs.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle size={12} /> Ocorrências ({ocorrenciaNotifs.length})
                    </div>
                    {ocorrenciaNotifs.map(notif => (
                      <div 
                        key={notif.id} 
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          onNotificationClick?.('OCORRENCIA', notif.ocorrenciaId);
                          dismissNotification(notif.id);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            notif.type === 'AVISO' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {notif.type}
                          </span>
                          {notif.date && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} /> {formatDate(notif.date)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{notif.title}</p>
                        <p className="text-xs text-gray-500 truncate">{notif.subtitle}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tasks Section */}
                {tasks.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={12} /> Tarefas Pendentes ({tasks.length})
                    </div>
                    {tasks.map(task => (
                      <div 
                        key={task.id} 
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          onNotificationClick?.('TASK', task.id);
                          dismissNotification(task.id);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            task.priority === 'ALTA' ? 'bg-red-100 text-red-700' : 
                            task.priority === 'MEDIA' ? 'bg-amber-100 text-amber-700' : 
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} /> {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{task.title}</p>
                        <div className="flex justify-between items-center mt-1">
                          {task.client_name && (
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{task.client_name}</p>
                          )}
                          {task.rep_nome && (
                            <span className="text-[9px] text-rose-600 font-bold flex items-center gap-1">
                              <User size={10} /> {task.rep_nome}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Appointments Section */}
                {appointments.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={12} /> Follow-ups / Agenda ({appointments.length})
                    </div>
                    {appointments.map(appt => (
                      <div 
                        key={appt.id} 
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          onNotificationClick?.('APPOINTMENT', appt.id);
                          dismissNotification(appt.id);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                            {appt.activity_type}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar size={10} /> {formatDate(appt.start_date)} {appt.start_time}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{appt.title}</p>
                        <div className="flex justify-between items-center mt-1">
                          {appt.client_name && (
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{appt.client_name}</p>
                          )}
                          {appt.rep_nome && (
                            <span className="text-[9px] text-rose-600 font-bold flex items-center gap-1">
                              <User size={10} /> {appt.rep_nome}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
