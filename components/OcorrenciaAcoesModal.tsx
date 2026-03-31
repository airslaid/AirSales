import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { OcorrenciaAcao, AppUser } from '../types';
import { fetchOcorrenciaAcoes, upsertOcorrenciaAcao, deleteOcorrenciaAcao } from '../services/supabaseService';
import { toast } from 'sonner';

interface OcorrenciaAcoesModalProps {
  ocorrenciaId: string;
  users: AppUser[];
  onClose: () => void;
}

export const OcorrenciaAcoesModal: React.FC<OcorrenciaAcoesModalProps> = ({ ocorrenciaId, users, onClose }) => {
  const [acoes, setAcoes] = useState<OcorrenciaAcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAcao, setNewAcao] = useState<Partial<OcorrenciaAcao>>({
    description: '',
    responsible: '',
    deadline: ''
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadAcoes = async () => {
    setLoading(true);
    try {
      const data = await fetchOcorrenciaAcoes(ocorrenciaId);
      setAcoes(data);
    } catch (error) {
      toast.error("Erro ao carregar ações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcoes();
  }, [ocorrenciaId]);

  const handleAddAcao = async () => {
    if (!newAcao.description || !newAcao.responsible) {
      toast.error("Preencha a descrição e o responsável");
      return;
    }

    try {
      await upsertOcorrenciaAcao({
        ...newAcao,
        ocorrencia_id: ocorrenciaId,
        completed_at: null
      } as OcorrenciaAcao);
      
      setNewAcao({ description: '', responsible: '', deadline: '' });
      loadAcoes();
      toast.success("Ação adicionada com sucesso");
    } catch (error) {
      toast.error("Erro ao adicionar ação");
    }
  };

  const handleToggleComplete = async (acao: OcorrenciaAcao) => {
    try {
      const updatedAcao = {
        ...acao,
        completed_at: acao.completed_at ? null : new Date().toISOString().split('T')[0]
      };
      await upsertOcorrenciaAcao(updatedAcao);
      loadAcoes();
    } catch (error) {
      toast.error("Erro ao atualizar status da ação");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOcorrenciaAcao(id);
      setDeleteConfirmId(null);
      loadAcoes();
      toast.success("Ação excluída");
    } catch (error) {
      toast.error("Erro ao excluir ação");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col rounded-sm max-h-[90vh]">
        
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800">
            Ações da Ocorrência
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {/* Form to add new action */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
            <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Nova Ação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-gray-700 uppercase">Descrição *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                  value={newAcao.description || ''}
                  onChange={e => setNewAcao({...newAcao, description: e.target.value})}
                  placeholder="Descreva a ação a ser tomada..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-700 uppercase">Responsável *</label>
                <select 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                  value={newAcao.responsible || ''}
                  onChange={e => setNewAcao({...newAcao, responsible: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-700 uppercase">Prazo</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-sm text-xs outline-none focus:border-rose-500"
                  value={newAcao.deadline || ''}
                  onChange={e => setNewAcao({...newAcao, deadline: e.target.value})}
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleAddAcao}
                  className="w-full px-4 py-2 bg-gray-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* List of actions */}
          <div>
            <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3 border-b pb-1">Ações Cadastradas</h4>
            
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando ações...</div>
            ) : acoes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded border border-dashed border-gray-200">
                Nenhuma ação cadastrada para esta ocorrência.
              </div>
            ) : (
              <div className="space-y-2">
                {acoes.map(acao => (
                  <div key={acao.id} className={`flex items-center justify-between p-3 border rounded-sm transition-colors ${acao.completed_at ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start gap-3 flex-1">
                      <button 
                        onClick={() => handleToggleComplete(acao)}
                        className={`mt-0.5 shrink-0 transition-colors ${acao.completed_at ? 'text-green-500 hover:text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                        title={acao.completed_at ? "Marcar como pendente" : "Marcar como concluída"}
                      >
                        {acao.completed_at ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${acao.completed_at ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {acao.description}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                            Resp: {acao.responsible}
                          </span>
                          {acao.deadline && (
                            <span className={`text-[10px] font-medium ${acao.completed_at ? 'text-gray-400' : 'text-amber-600'}`}>
                              Prazo: {new Date(acao.deadline).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {acao.completed_at && (
                            <span className="text-[10px] text-green-600 font-medium">
                              Concluído em: {new Date(acao.completed_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {deleteConfirmId === acao.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 ml-2">
                        <span className="text-[10px] font-bold text-red-600 uppercase whitespace-nowrap">Excluir?</span>
                        <button 
                          onClick={() => handleDelete(acao.id)}
                          className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded-sm hover:bg-red-700 transition-colors"
                        >
                          Sim
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-bold uppercase rounded-sm hover:bg-gray-300 transition-colors"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirmId(acao.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0 ml-2"
                        title="Excluir ação"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
