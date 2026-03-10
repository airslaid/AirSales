import React, { useState, useEffect } from 'react';
import { Ocorrencia, AppUser } from '../types';
import { fetchOcorrencias, upsertOcorrencia, deleteOcorrencia, fetchAppUsers } from '../services/supabaseService';
import { 
  AlertTriangle, Plus, Search, Edit2, Trash2, X, Save, CheckCircle2, 
  Clock, FileText, Building2, User, Check, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface OcorrenciasViewProps {
  user: AppUser | null;
}

const PROCESSOS = [
  'COMERCIAL', 'COMPRAS', 'FINANCEIRO', 'TI', 'RH', 
  'CONFECÇÃO', 'TECELAGEM', 'QUALIDADE', 'MARKETING', 'PCP', 'ENGENHARIA'
];

export const OcorrenciasView: React.FC<OcorrenciasViewProps> = ({ user }) => {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
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
        company: 'Air Slaid',
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
    return (
      o.ro_number?.toLowerCase().includes(searchLower) ||
      o.description?.toLowerCase().includes(searchLower) ||
      o.origin?.toLowerCase().includes(searchLower) ||
      o.requester?.toLowerCase().includes(searchLower)
    );
  });

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
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus size={14} /> Nova Ocorrência
          </button>
        </div>
      </div>

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
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                        value={formData.requester || ''}
                        onChange={e => setFormData({...formData, requester: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
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
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
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
