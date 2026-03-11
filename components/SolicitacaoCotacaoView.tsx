import React, { useState, useEffect } from 'react';
import { SolicitacaoCotacao, AppUser } from '../types';
import { fetchSolicitacoesCotacao, upsertSolicitacaoCotacao, deleteSolicitacaoCotacao } from '../services/supabaseService';
import { 
  Plus, Search, Edit2, Trash2, X, Save, 
  FileText, User, Calendar, Filter,
  LayoutGrid, ClipboardList, AlertCircle, CheckCircle2,
  Paperclip, Upload
} from 'lucide-react';
import { toast } from 'sonner';

interface SolicitacaoCotacaoViewProps {
  user: AppUser | null;
}

export const SolicitacaoCotacaoView: React.FC<SolicitacaoCotacaoViewProps> = ({ user }) => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SolicitacaoCotacao | null>(null);
  const [formData, setFormData] = useState<Partial<SolicitacaoCotacao>>({});
  const [itemToDelete, setItemToDelete] = useState<SolicitacaoCotacao | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedItemForUpdate, setSelectedItemForUpdate] = useState<SolicitacaoCotacao | null>(null);
  const [updateValue, setUpdateValue] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSolicitacoesCotacao();
      setSolicitacoes(data);
    } catch (error) {
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: SolicitacaoCotacao) => {
    if (item) {
      setEditingItem(item);
      setFormData({ ...item });
    } else {
      setEditingItem(null);
      setFormData({
        cliente: '',
        tipo_solicitacao: 'Orçamento',
        prioridade: 'Normal',
        observacao: '',
        status_produto: 'Novo',
        status_orcamento: 'Novo',
        data_entrega: null,
        arquivos: []
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.cliente || !formData.prioridade || !formData.status_produto) {
      toast.error("Preencha todos os campos obrigatórios (*)");
      return;
    }
    
    try {
      const now = new Date().toISOString();
      const payload = {
        ...formData,
        created_by_id: user?.id || 'unknown',
        created_by_name: user?.name || 'unknown'
      } as SolicitacaoCotacao;

      // Track status changes
      if (editingItem) {
        if (formData.status_orcamento !== editingItem.status_orcamento) {
          payload.data_ultima_alteracao_status = now;
        }
        if (formData.data_entrega !== editingItem.data_entrega) {
          payload.data_ultima_alteracao_pcp = now;
        }
      } else {
        // Initial values for new items
        payload.data_ultima_alteracao_status = now;
        if (payload.data_entrega) {
          payload.data_ultima_alteracao_pcp = now;
        }
      }

      await upsertSolicitacaoCotacao(payload);
      toast.success(editingItem ? "Solicitação atualizada!" : "Solicitação registrada!");
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar solicitação");
    }
  };

  const handleDelete = (item: SolicitacaoCotacao) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteSolicitacaoCotacao(itemToDelete.id);
      toast.success("Solicitação excluída!");
      setItemToDelete(null);
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir solicitação");
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedItemForUpdate) return;
    try {
      const now = new Date().toISOString();
      const payload: SolicitacaoCotacao = {
        ...selectedItemForUpdate,
        status_orcamento: updateValue as any,
        data_ultima_alteracao_status: now
      };
      await upsertSolicitacaoCotacao(payload);
      toast.success("Status atualizado!");
      setShowStatusModal(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleUpdateDelivery = async () => {
    if (!selectedItemForUpdate) return;
    try {
      const now = new Date().toISOString();
      const payload: SolicitacaoCotacao = {
        ...selectedItemForUpdate,
        data_entrega: updateValue,
        data_ultima_alteracao_pcp: now
      };
      await upsertSolicitacaoCotacao(payload);
      toast.success("Data de entrega atualizada!");
      setShowDeliveryModal(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar entrega");
    }
  };

  const filteredData = solicitacoes.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    return (
      s.cliente?.toLowerCase().includes(searchLower) ||
      s.observacao?.toLowerCase().includes(searchLower) ||
      s.created_by_name?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: solicitacoes.length,
    novo: solicitacoes.filter(s => s.status_orcamento === 'Novo').length,
    execucao: solicitacoes.filter(s => s.status_orcamento === 'Em execução').length,
    concluido: solicitacoes.filter(s => s.status_orcamento === 'Concluído').length,
    critico: solicitacoes.filter(s => s.prioridade === 'Crítico').length
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 animate-in fade-in duration-300">
      <div className="p-4 bg-white border-b border-gray-200 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Solicitação de Cotação
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
            Gestão de Orçamentos e Amostras
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar solicitação..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-gray-900 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus size={14} /> Inserir Solicitação
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                <p className="text-xl font-black text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm border-l-4 border-l-gray-400">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Novos</p>
                <p className="text-xl font-black text-gray-900">{stats.novo}</p>
              </div>
              <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm border-l-4 border-l-amber-500">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Em Execução</p>
                <p className="text-xl font-black text-gray-900">{stats.execucao}</p>
              </div>
              <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm border-l-4 border-l-emerald-500">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Concluídos</p>
                <p className="text-xl font-black text-gray-900">{stats.concluido}</p>
              </div>
              <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm border-l-4 border-l-red-500">
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Críticos</p>
                <p className="text-xl font-black text-gray-900">{stats.critico}</p>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ClipboardList size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Nenhuma solicitação encontrada</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-1"></th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Prioridade</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status Prod.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status Orç.</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Últ. Alt. Status</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Entrega</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Últ. Alt. PCP</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Observação</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Criado Por</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Criação</th>
                        <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredData.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className={`w-1 p-0 ${item.prioridade === 'Crítico' ? 'bg-red-500' : 'bg-transparent'}`}></td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{item.cliente}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              item.tipo_solicitacao === 'Orçamento' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {item.tipo_solicitacao}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle size={10} className={item.prioridade === 'Crítico' ? 'text-red-500' : 'text-amber-500'} />
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${item.prioridade === 'Crítico' ? 'text-red-600' : 'text-gray-600'}`}>
                                {item.prioridade}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={10} className="text-emerald-500" />
                              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{item.status_produto}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                              item.status_orcamento === 'Novo' ? 'bg-gray-50 text-gray-600 border-gray-200' : 
                              item.status_orcamento === 'Em execução' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {item.status_orcamento}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {item.data_ultima_alteracao_status ? new Date(item.data_ultima_alteracao_status).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${item.data_entrega ? 'text-blue-600' : 'text-gray-300'}`}>
                              {item.data_entrega ? new Date(item.data_entrega).toLocaleDateString('pt-BR') : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {item.data_ultima_alteracao_pcp ? new Date(item.data_ultima_alteracao_pcp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-[10px] text-gray-500 truncate italic" title={item.observacao}>
                              {item.observacao ? `"${item.observacao}"` : '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.created_by_name}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {item.created_at ? new Date(item.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {user?.email && ['comercial8@grupoairslaid.com.br', 'mbatista@grupoairslaid.com.br', 'ti@grupoairslaid.com.br'].includes(user.email) && (
                                <button 
                                  onClick={() => {
                                    setSelectedItemForUpdate(item);
                                    setUpdateValue(item.status_orcamento);
                                    setShowStatusModal(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-sm transition-all"
                                  title="Alterar Status Orçamento"
                                >
                                  <ClipboardList size={14} />
                                </button>
                              )}
                              {user?.email && ['pcp@grupoairslaid.com.br', 'ti@grupoairslaid.com.br'].includes(user.email) && (
                                <button 
                                  onClick={() => {
                                    setSelectedItemForUpdate(item);
                                    setUpdateValue(item.data_entrega || '');
                                    setShowDeliveryModal(true);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-sm transition-all"
                                  title="Alterar Data de Entrega"
                                >
                                  <Calendar size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => handleOpenModal(item)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-all"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-all"
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
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md max-h-[90vh] shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <ClipboardList size={16} className="text-blue-600" /> 
                {editingItem ? 'Editar Solicitação' : 'Nova Solicitação de Cotação'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Cliente */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                  <LayoutGrid size={14} className="text-gray-400" />
                  Cliente
                </label>
                <input 
                  type="text" 
                  placeholder="Insira o valor aqui"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500 transition-all"
                  value={formData.cliente || ''}
                  onChange={e => setFormData({...formData, cliente: e.target.value})}
                />
              </div>

              {/* Tipo de Solicitação */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                  <CheckCircle2 size={14} className="text-gray-400" />
                  Tipo de Solicitação
                </label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={formData.tipo_solicitacao || ''}
                  onChange={e => setFormData({...formData, tipo_solicitacao: e.target.value as any})}
                >
                  <option value="Orçamento">Orçamento</option>
                  <option value="Amostra">Amostra</option>
                </select>
              </div>

              {/* Prioridade */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                  <AlertCircle size={14} className="text-gray-400" />
                  Prioridade <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={formData.prioridade || ''}
                  onChange={e => setFormData({...formData, prioridade: e.target.value as any})}
                >
                  <option value="Normal">Normal</option>
                  <option value="Crítico">Crítico</option>
                </select>
              </div>

              {/* Observação */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                  <FileText size={14} className="text-gray-400" />
                  Observação
                </label>
                <textarea 
                  placeholder="Insira o valor aqui"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500 transition-all min-h-[80px] resize-none"
                  value={formData.observacao || ''}
                  onChange={e => setFormData({...formData, observacao: e.target.value})}
                />
              </div>

              {/* Status Produto */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                  <CheckCircle2 size={14} className="text-gray-400" />
                  Status Produto <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={formData.status_produto || ''}
                  onChange={e => setFormData({...formData, status_produto: e.target.value as any})}
                >
                  <option value="Novo">Novo</option>
                  <option value="Recorrente">Recorrente</option>
                </select>
              </div>

              {/* Arquivos associados */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                  <Paperclip size={14} className="text-gray-400" />
                  Arquivos associados <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-sm p-4 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                  <Upload size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Adicionar anexos</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <Save size={14} /> Salvar Solicitação
              </button>
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm p-6 rounded-sm shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter mb-2">Excluir Solicitação?</h3>
            <p className="text-xs text-gray-500 mb-6 font-medium">Esta ação não pode ser desfeita. Deseja realmente remover a solicitação de <span className="font-bold text-gray-900">{itemToDelete.cliente}</span>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setItemToDelete(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors shadow-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alterar Status */}
      {showStatusModal && selectedItemForUpdate && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm p-6 rounded-sm shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800">Alterar Status Orçamento</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Novo Status</label>
                <select 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                >
                  <option value="Novo">Novo</option>
                  <option value="Em execução">Em execução</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={handleUpdateStatus} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-700 shadow-sm flex items-center gap-2">
                  <Save size={14} /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alterar Entrega */}
      {showDeliveryModal && selectedItemForUpdate && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm p-6 rounded-sm shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800">Alterar Data de Entrega</h3>
              <button onClick={() => setShowDeliveryModal(false)} className="text-gray-400 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nova Data de Entrega</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-blue-500"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowDeliveryModal(false)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={handleUpdateDelivery} className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-blue-700 shadow-sm flex items-center gap-2">
                  <Save size={14} /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
